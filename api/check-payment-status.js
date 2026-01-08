// Vercel Serverless Function - Verificar Status de Pagamento (PIX, Boleto, Cartão)
// Endpoint: GET /api/check-payment-status?type=pix&txid=xxx
// Endpoint: GET /api/check-payment-status?type=charge&chargeId=xxx
// Endpoint: GET /api/check-payment-status?paymentId=xxx

import { createClient } from '@supabase/supabase-js';
import https from 'https';

// ========================================
// CONFIGURAÇÃO
// ========================================

const getEfiConfig = () => ({
  clientId: process.env.EFI_CLIENT_ID,
  clientSecret: process.env.EFI_CLIENT_SECRET,
  certificate: process.env.EFI_CERTIFICATE,
  sandbox: process.env.EFI_SANDBOX === 'true',
});

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase não configurado');
  return createClient(url, key, { auth: { persistSession: false } });
};

const getPixApiUrl = (sandbox) => sandbox ? 'pix-h.api.efipay.com.br' : 'pix.api.efipay.com.br';
const getCobrancaApiUrl = (sandbox) => sandbox ? 'sandbox.gerencianet.com.br' : 'api.gerencianet.com.br';

// ========================================
// REQUISIÇÕES HTTPS
// ========================================

const httpsRequestWithCert = (options, postData = null) => {
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
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
};

const httpsRequestNoCert = (options, postData = null) => {
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
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
};

// ========================================
// AUTENTICAÇÃO
// ========================================

let pixTokenCache = { token: null, expiry: null };
let cobrancaTokenCache = { token: null, expiry: null };

const getPixAccessToken = async (config) => {
  if (pixTokenCache.token && pixTokenCache.expiry && Date.now() < pixTokenCache.expiry) {
    return pixTokenCache.token;
  }

  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const certBuffer = Buffer.from(config.certificate, 'base64');
  const postData = JSON.stringify({ grant_type: 'client_credentials' });

  const options = {
    hostname: getPixApiUrl(config.sandbox),
    port: 443,
    path: '/oauth/token',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
    pfx: certBuffer,
    passphrase: '',
  };

  const response = await httpsRequestWithCert(options, postData);

  if (response.data?.access_token) {
    pixTokenCache.token = response.data.access_token;
    pixTokenCache.expiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    return pixTokenCache.token;
  }

  throw new Error('Falha na autenticação PIX');
};

const getCobrancaAccessToken = async (config) => {
  if (cobrancaTokenCache.token && cobrancaTokenCache.expiry && Date.now() < cobrancaTokenCache.expiry) {
    return cobrancaTokenCache.token;
  }

  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
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

  const response = await httpsRequestNoCert(options, postData);

  if (response.data?.access_token) {
    cobrancaTokenCache.token = response.data.access_token;
    cobrancaTokenCache.expiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    return cobrancaTokenCache.token;
  }

  throw new Error('Falha na autenticação Cobrança');
};

// ========================================
// TAXAS E RESERVA
// ========================================

const PLATFORM_FEE_PERCENT = 0.0599;
const PLATFORM_FEE_FIXED = 2.50;
const MIN_VALUE_FOR_FEES = 5.00;
const RESERVE_PERCENT = 0.05;
const RESERVE_DAYS = 30;

const calculateFees = (grossValue) => {
  let platformFee = grossValue * PLATFORM_FEE_PERCENT;
  if (grossValue >= MIN_VALUE_FOR_FEES) {
    platformFee += PLATFORM_FEE_FIXED;
  }
  if (platformFee > grossValue * 0.5) {
    platformFee = grossValue * 0.5;
  }
  
  const valueAfterFees = Math.max(0, grossValue - platformFee);
  const reserveAmount = Math.max(0, valueAfterFees * RESERVE_PERCENT);
  const netAmount = Math.max(0, valueAfterFees - reserveAmount);
  
  const releaseDate = new Date();
  releaseDate.setDate(releaseDate.getDate() + RESERVE_DAYS);
  
  return { platformFee, valueAfterFees, reserveAmount, netAmount, releaseDate };
};

// ========================================
// PROCESSAR PAGAMENTO CONFIRMADO
// ========================================

const processConfirmedPayment = async (supabase, dbPayment, paidValue, txidOrChargeId, type) => {
  console.log(`[Check Payment] Processando ${type} confirmado:`, dbPayment.id);
  
  const { platformFee, valueAfterFees, reserveAmount, netAmount, releaseDate } = calculateFees(paidValue);
  
  console.log(`[Check Payment] Bruto: R$${paidValue.toFixed(2)} | Taxa: R$${platformFee.toFixed(2)} | Reserva: R$${reserveAmount.toFixed(2)} | Líquido: R$${netAmount.toFixed(2)}`);

  // Atualizar pagamento
  await supabase
    .from('payments')
    .update({
      status: 'RECEIVED',
      payment_date: new Date().toISOString(),
      net_value: netAmount,
    })
    .eq('id', dbPayment.id);

  // Creditar saldo do vendedor
  if (dbPayment.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('balance, reserved_balance')
      .eq('id', dbPayment.user_id)
      .single();

    if (user) {
      const newBalance = parseFloat(user.balance || 0) + netAmount;
      const newReserved = parseFloat(user.reserved_balance || 0) + reserveAmount;
      
      await supabase
        .from('users')
        .update({ balance: newBalance, reserved_balance: newReserved })
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
      const paymentType = type === 'pix' ? 'PIX' : (dbPayment.billing_type === 'BOLETO' ? 'Boleto' : 'Cartão');
      await supabase.from('transactions').insert({
        user_id: dbPayment.user_id,
        type: 'payment_received',
        amount: paidValue,
        status: 'completed',
        description: `${paymentType} recebido - ${dbPayment.description || 'Venda'} (Taxa: R$${platformFee.toFixed(2)} | Reserva: R$${reserveAmount.toFixed(2)})`,
        metadata: { 
          payment_id: dbPayment.id, 
          [type === 'pix' ? 'txid' : 'charge_id']: txidOrChargeId,
          gross_value: paidValue,
          platform_fee: platformFee,
          net_amount: netAmount,
          reserve_amount: reserveAmount,
        },
      });
      
      // Registrar taxa
      await supabase.from('transactions').insert({
        user_id: dbPayment.user_id,
        type: 'platform_fee',
        amount: -platformFee,
        status: 'completed',
        description: `Taxa da plataforma - ${dbPayment.description || 'Venda'}`,
        metadata: { payment_id: dbPayment.id, gross_value: paidValue },
      });
    }
  }

  // Atualizar payment_link
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
        .update({ total_received: (link.total_received || 0) + paidValue })
        .eq('id', linkId);
    }
  }

  console.log(`[Check Payment] ✅ ${type.toUpperCase()} processado: ${txidOrChargeId}`);
};

// ========================================
// CHECK PIX STATUS
// ========================================

const checkPixStatus = async (config, supabase, txid, dbPayment) => {
  const token = await getPixAccessToken(config);
  const certBuffer = Buffer.from(config.certificate, 'base64');

  const options = {
    hostname: getPixApiUrl(config.sandbox),
    port: 443,
    path: `/v2/cob/${txid}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    pfx: certBuffer,
    passphrase: '',
  };

  const response = await httpsRequestWithCert(options);

  if (response.status !== 200) {
    return { success: false, status: 'PENDING', message: 'Erro ao consultar PIX' };
  }

  const pixData = response.data;
  let mappedStatus = 'PENDING';
  let isPaid = false;

  if (pixData.status === 'CONCLUIDA') {
    mappedStatus = 'CONFIRMED';
    isPaid = true;
  } else if (pixData.status === 'ATIVA') {
    mappedStatus = 'PENDING';
  } else if (pixData.status?.includes('REMOVIDA')) {
    mappedStatus = 'CANCELLED';
  }

  if (isPaid && dbPayment && dbPayment.status !== 'RECEIVED') {
    const paidValue = pixData.pix?.[0]?.valor ? parseFloat(pixData.pix[0].valor) : parseFloat(dbPayment.value);
    await processConfirmedPayment(supabase, dbPayment, paidValue, txid, 'pix');
  }

  return {
    success: true,
    status: mappedStatus,
    efiStatus: pixData.status,
    payment: {
      txid: pixData.txid,
      value: parseFloat(pixData.valor?.original || 0),
      paidValue: pixData.pix?.[0]?.valor ? parseFloat(pixData.pix[0].valor) : null,
    },
  };
};

// ========================================
// CHECK CHARGE STATUS
// ========================================

const checkChargeStatus = async (config, supabase, chargeId, dbPayment) => {
  const token = await getCobrancaAccessToken(config);

  const options = {
    hostname: getCobrancaApiUrl(config.sandbox),
    port: 443,
    path: `/v1/charge/${chargeId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const response = await httpsRequestNoCert(options);

  if (response.status !== 200) {
    return { success: false, status: 'PENDING', message: 'Erro ao consultar cobrança' };
  }

  const chargeData = response.data?.data || response.data;
  let mappedStatus = 'PENDING';
  let isPaid = false;

  const efiStatus = chargeData.status?.toLowerCase();
  
  if (['paid', 'approved', 'settled'].includes(efiStatus)) {
    mappedStatus = 'CONFIRMED';
    isPaid = true;
  } else if (['waiting', 'new', 'generated'].includes(efiStatus)) {
    mappedStatus = 'PENDING';
  } else if (['unpaid', 'expired'].includes(efiStatus)) {
    mappedStatus = 'OVERDUE';
  } else if (['canceled', 'refunded'].includes(efiStatus)) {
    mappedStatus = 'CANCELLED';
  }

  if (isPaid && dbPayment && dbPayment.status !== 'RECEIVED') {
    const paidValue = chargeData.total ? chargeData.total / 100 : dbPayment.value;
    await processConfirmedPayment(supabase, dbPayment, paidValue, chargeId, 'charge');
  }

  return {
    success: true,
    status: mappedStatus,
    efiStatus: chargeData.status,
    payment: {
      chargeId,
      value: chargeData.total ? chargeData.total / 100 : null,
      boletoUrl: chargeData.payment?.banking_billet?.link || dbPayment?.bank_slip_url,
      barcode: chargeData.payment?.banking_billet?.barcode,
    },
  };
};

// ========================================
// HANDLER PRINCIPAL
// ========================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const { type, txid, chargeId, paymentId } = req.query;
    const config = getEfiConfig();
    const supabase = getSupabase();

    let dbPayment = null;

    // Buscar payment do banco se temos paymentId
    if (paymentId) {
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (payment) {
        dbPayment = payment;

        // Se já confirmado, retornar direto
        if (['RECEIVED', 'CONFIRMED', 'paid'].includes(payment.status)) {
          return res.status(200).json({
            success: true,
            status: 'CONFIRMED',
            payment: {
              id: payment.id,
              status: payment.status,
              value: payment.value,
              paymentDate: payment.payment_date,
            },
          });
        }
      }
    }

    // Determinar tipo de verificação
    const checkType = type || (txid ? 'pix' : 'charge');

    if (checkType === 'pix') {
      const actualTxid = txid || dbPayment?.efi_txid;
      if (!actualTxid) {
        return res.status(400).json({ success: false, message: 'txid é obrigatório para PIX' });
      }
      
      // Buscar payment pelo txid se não temos
      if (!dbPayment) {
        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('efi_txid', actualTxid)
          .single();
        dbPayment = payment;
      }

      const result = await checkPixStatus(config, supabase, actualTxid, dbPayment);
      return res.status(200).json(result);

    } else {
      const actualChargeId = chargeId || dbPayment?.efi_charge_id;
      if (!actualChargeId) {
        return res.status(400).json({ success: false, message: 'chargeId é obrigatório para Boleto/Cartão' });
      }

      const result = await checkChargeStatus(config, supabase, actualChargeId, dbPayment);
      return res.status(200).json(result);
    }

  } catch (error) {
    console.error('[Check Payment Status] Error:', error);
    return res.status(200).json({
      success: false,
      status: 'ERROR',
      message: error.message,
    });
  }
}

