// Vercel Serverless Function - Verificar Status de Cobrança (Boleto/Cartão)
// Endpoint: GET /api/check-charge-status?chargeId=xxx ou ?paymentId=xxx

import { createClient } from '@supabase/supabase-js';
import https from 'https';

// Configuração
const getEfiConfig = () => ({
  clientId: process.env.EFI_CLIENT_ID,
  clientSecret: process.env.EFI_CLIENT_SECRET,
  sandbox: process.env.EFI_SANDBOX === 'true',
});

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase não configurado');
  }
  
  return createClient(url, key, { auth: { persistSession: false } });
};

// API de Cobranças - usar domínios antigos Gerencianet (mais estáveis)
const getCobrancaApiUrl = (sandbox) => sandbox ? 'sandbox.gerencianet.com.br' : 'api.gerencianet.com.br';

// Requisição HTTPS sem certificado
const httpsRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', (error) => reject(error));
    if (postData) req.write(postData);
    req.end();
  });
};

// Cache de token
let tokenCache = { token: null, expiry: null };

const getAccessToken = async (config) => {
  if (tokenCache.token && tokenCache.expiry && Date.now() < tokenCache.expiry) {
    return tokenCache.token;
  }

  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  
  // Gerencianet usa JSON para autenticação
  const postData = JSON.stringify({ grant_type: 'client_credentials' });

  const options = {
    hostname: getCobrancaApiUrl(config.sandbox),
    port: 443,
    path: '/v1/authorize',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const response = await httpsRequest(options, postData);

  if (response.data?.access_token) {
    tokenCache.token = response.data.access_token;
    tokenCache.expiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    return tokenCache.token;
  }

  throw new Error(response.data?.error_description || 'Falha na autenticação EfiBank');
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const { chargeId, paymentId } = req.query;

    if (!chargeId && !paymentId) {
      return res.status(400).json({ success: false, message: 'chargeId ou paymentId é obrigatório' });
    }

    const config = getEfiConfig();
    const supabase = getSupabase();

    // Se temos paymentId, buscar chargeId do banco
    let actualChargeId = chargeId;
    let dbPayment = null;

    if (paymentId) {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error || !payment) {
        return res.status(404).json({ success: false, message: 'Pagamento não encontrado' });
      }

      dbPayment = payment;
      actualChargeId = payment.efi_charge_id;

      // Se já está confirmado no banco, retornar direto
      if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' || payment.status === 'paid') {
        return res.status(200).json({
          success: true,
          status: 'CONFIRMED',
          payment: {
            id: payment.id,
            status: payment.status,
            value: payment.value,
            paymentDate: payment.payment_date,
            boletoUrl: payment.bank_slip_url,
            barcode: payment.metadata?.barcode,
          },
        });
      }
    }

    if (!actualChargeId) {
      return res.status(400).json({ success: false, message: 'chargeId não encontrado' });
    }

    // Buscar status na EfiBank
    const token = await getAccessToken(config);

    const options = {
      hostname: getCobrancaApiUrl(config.sandbox),
      port: 443,
      path: `/v1/charge/${actualChargeId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    const response = await httpsRequest(options);

    console.log('[Check Charge] Response:', JSON.stringify(response.data).substring(0, 500));

    if (response.status !== 200) {
      return res.status(200).json({
        success: false,
        message: 'Erro ao consultar cobrança',
        status: 'PENDING',
      });
    }

    const chargeData = response.data?.data || response.data;

    // Mapear status da EfiBank
    // new, waiting = pendente; paid, approved = pago; unpaid = vencido; canceled, refunded = cancelado
    let mappedStatus = 'PENDING';
    let isPaid = false;

    const efiStatus = chargeData.status?.toLowerCase();
    
    if (efiStatus === 'paid' || efiStatus === 'approved' || efiStatus === 'settled') {
      mappedStatus = 'CONFIRMED';
      isPaid = true;
    } else if (efiStatus === 'waiting' || efiStatus === 'new' || efiStatus === 'generated') {
      mappedStatus = 'PENDING';
    } else if (efiStatus === 'unpaid' || efiStatus === 'expired') {
      mappedStatus = 'OVERDUE';
    } else if (efiStatus === 'canceled' || efiStatus === 'refunded') {
      mappedStatus = 'CANCELLED';
    }

    // Se foi pago e temos o payment no banco, atualizar
    if (isPaid && dbPayment && dbPayment.status !== 'RECEIVED') {
      const paidValue = chargeData.total ? chargeData.total / 100 : dbPayment.value;
      const paymentDate = new Date().toISOString();

      // Atualizar pagamento
      await supabase
        .from('payments')
        .update({
          status: 'RECEIVED',
          payment_date: paymentDate,
          net_value: paidValue,
        })
        .eq('id', dbPayment.id);

      // Creditar saldo do vendedor (com taxas e reserva)
      if (dbPayment.user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('balance, reserved_balance')
          .eq('id', dbPayment.user_id)
          .single();

        if (user) {
          // ===== TAXAS DA PLATAFORMA =====
          const PLATFORM_FEE_PERCENT = 0.0599; // 5.99%
          const PLATFORM_FEE_FIXED = 2.50;     // R$2.50 por venda
          const RESERVE_PERCENT = 0.05;        // 5% reserva
          const RESERVE_DAYS = 30;
          
          const platformFee = (paidValue * PLATFORM_FEE_PERCENT) + PLATFORM_FEE_FIXED;
          const valueAfterFees = paidValue - platformFee;
          const reserveAmount = valueAfterFees * RESERVE_PERCENT;
          const netAmount = valueAfterFees - reserveAmount;
          
          const releaseDate = new Date();
          releaseDate.setDate(releaseDate.getDate() + RESERVE_DAYS);
          
          console.log(`[Check Charge] Valor bruto: R$${paidValue.toFixed(2)}, Taxa: R$${platformFee.toFixed(2)}, Reserva: R$${reserveAmount.toFixed(2)}, Líquido: R$${netAmount.toFixed(2)}`);
          
          const newBalance = parseFloat(user.balance || 0) + netAmount;
          const newReserved = parseFloat(user.reserved_balance || 0) + reserveAmount;
          
          await supabase
            .from('users')
            .update({ 
              balance: newBalance,
              reserved_balance: newReserved
            })
            .eq('id', dbPayment.user_id);

          // Criar registro de reserva
          await supabase.from('balance_reserves').insert({
            user_id: dbPayment.user_id,
            payment_id: dbPayment.id,
            original_amount: paidValue,
            reserve_amount: reserveAmount,
            status: 'held',
            release_date: releaseDate.toISOString(),
            description: `Reserva 5% - ${dbPayment.description || 'Venda'}`,
            metadata: { gross_value: paidValue, platform_fee: platformFee, value_after_fees: valueAfterFees }
          });

          // Criar transação
          const transactionType = dbPayment.billing_type === 'BOLETO' ? 'Boleto' : 'Cartão';
          await supabase.from('transactions').insert({
            user_id: dbPayment.user_id,
            type: 'payment_received',
            amount: paidValue,
            status: 'completed',
            description: `${transactionType} recebido - ${dbPayment.description || 'Venda'} (Taxa: R$${platformFee.toFixed(2)} | Reserva: R$${reserveAmount.toFixed(2)})`,
            metadata: { 
              payment_id: dbPayment.id, 
              charge_id: actualChargeId,
              gross_value: paidValue,
              platform_fee: platformFee,
              net_amount: netAmount,
              reserve_amount: reserveAmount,
              reserve_release_date: releaseDate.toISOString()
            },
          });
          
          // Registrar taxa da plataforma
          await supabase.from('transactions').insert({
            user_id: dbPayment.user_id,
            type: 'platform_fee',
            amount: -platformFee,
            status: 'completed',
            description: `Taxa da plataforma (5.99% + R$2.50) - ${dbPayment.description || 'Venda'}`,
            metadata: { 
              payment_id: dbPayment.id,
              charge_id: actualChargeId,
              gross_value: paidValue,
              fee_percent: PLATFORM_FEE_PERCENT,
              fee_fixed: PLATFORM_FEE_FIXED
            },
          });
        }
      }

      // Atualizar payment_link se existir
      const linkId = dbPayment.payment_link_id || dbPayment.metadata?.link_id;
      if (linkId) {
        const { data: link } = await supabase
          .from('payment_links')
          .select('total_received')
          .eq('id', linkId)
          .single();

        if (link) {
          await supabase
            .from('payment_links')
            .update({ 
              total_received: (link.total_received || 0) + paidValue 
            })
            .eq('id', linkId);
        }
      }

      console.log(`[Check Charge] Pagamento confirmado e processado: ${actualChargeId}`);
    }

    return res.status(200).json({
      success: true,
      status: mappedStatus,
      efiStatus: chargeData.status,
      payment: {
        chargeId: actualChargeId,
        value: chargeData.total ? chargeData.total / 100 : null,
        status: chargeData.status,
        boletoUrl: chargeData.payment?.banking_billet?.link || dbPayment?.bank_slip_url,
        barcode: chargeData.payment?.banking_billet?.barcode || dbPayment?.metadata?.barcode,
      },
    });

  } catch (error) {
    console.error('[Check Charge Status] Error:', error);
    return res.status(200).json({
      success: false,
      status: 'ERROR',
      message: error.message,
    });
  }
}

