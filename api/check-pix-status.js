// Vercel Serverless Function - Verificar Status PIX EfiBank
// Endpoint: GET /api/check-pix-status?txid=xxx

import { createClient } from '@supabase/supabase-js';
import https from 'https';

// Configuração
const getEfiConfig = () => ({
  clientId: process.env.EFI_CLIENT_ID,
  clientSecret: process.env.EFI_CLIENT_SECRET,
  certificate: process.env.EFI_CERTIFICATE,
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

const getPixApiUrl = (sandbox) => sandbox ? 'pix-h.api.efipay.com.br' : 'pix.api.efipay.com.br';

// Requisição HTTPS com certificado
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

  const response = await httpsRequest(options, postData);

  if (response.data?.access_token) {
    tokenCache.token = response.data.access_token;
    tokenCache.expiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    return tokenCache.token;
  }

  throw new Error('Falha na autenticação EfiBank');
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
    const { txid, paymentId } = req.query;

    if (!txid && !paymentId) {
      return res.status(400).json({ success: false, message: 'txid ou paymentId é obrigatório' });
    }

    const config = getEfiConfig();
    const supabase = getSupabase();

    // Se temos paymentId, buscar txid do banco
    let actualTxid = txid;
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
      actualTxid = payment.efi_txid;

      // Se já está confirmado no banco, retornar direto
      if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') {
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

    if (!actualTxid) {
      return res.status(400).json({ success: false, message: 'txid não encontrado' });
    }

    // Buscar status na EfiBank
    const token = await getAccessToken(config);
    const certBuffer = Buffer.from(config.certificate, 'base64');

    const options = {
      hostname: getPixApiUrl(config.sandbox),
      port: 443,
      path: `/v2/cob/${actualTxid}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      pfx: certBuffer,
      passphrase: '',
    };

    const response = await httpsRequest(options);

    if (response.status !== 200) {
      return res.status(200).json({
        success: false,
        message: 'Erro ao consultar PIX',
        status: 'PENDING',
      });
    }

    const pixData = response.data;

    // Mapear status da EfiBank
    // ATIVA = pendente, CONCLUIDA = pago, REMOVIDA_PELO_USUARIO_RECEBEDOR = cancelada
    let mappedStatus = 'PENDING';
    let isPaid = false;

    if (pixData.status === 'CONCLUIDA') {
      mappedStatus = 'CONFIRMED';
      isPaid = true;
    } else if (pixData.status === 'ATIVA') {
      mappedStatus = 'PENDING';
    } else if (pixData.status === 'REMOVIDA_PELO_USUARIO_RECEBEDOR' || pixData.status === 'REMOVIDA_PELO_PSP') {
      mappedStatus = 'CANCELLED';
    }

    // Se foi pago e temos o payment no banco, atualizar
    if (isPaid && dbPayment && dbPayment.status !== 'RECEIVED') {
      const paidValue = pixData.pix?.[0]?.valor ? parseFloat(pixData.pix[0].valor) : dbPayment.value;
      const paymentDate = pixData.pix?.[0]?.horario || new Date().toISOString();

      // Atualizar pagamento
      await supabase
        .from('payments')
        .update({
          status: 'RECEIVED',
          payment_date: paymentDate,
          net_value: paidValue,
        })
        .eq('id', dbPayment.id);

      // Creditar saldo do vendedor
      if (dbPayment.user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('balance')
          .eq('id', dbPayment.user_id)
          .single();

        if (user) {
          const newBalance = parseFloat(user.balance || 0) + paidValue;
          await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', dbPayment.user_id);

          // Criar transação
          await supabase.from('transactions').insert({
            user_id: dbPayment.user_id,
            type: 'payment_received',
            amount: paidValue,
            status: 'completed',
            description: `PIX recebido - ${dbPayment.description || 'Venda'}`,
            metadata: { payment_id: dbPayment.id, txid: actualTxid },
          });
        }
      }

      // Atualizar payment_link se existir
      if (dbPayment.metadata?.link_id) {
        const { data: link } = await supabase
          .from('payment_links')
          .select('total_received')
          .eq('id', dbPayment.metadata.link_id)
          .single();

        if (link) {
          await supabase
            .from('payment_links')
            .update({ 
              total_received: (link.total_received || 0) + paidValue 
            })
            .eq('id', dbPayment.metadata.link_id);
        }
      }

      console.log(`[Check PIX] Pagamento confirmado e processado: ${actualTxid}`);
    }

    return res.status(200).json({
      success: true,
      status: mappedStatus,
      efiStatus: pixData.status,
      payment: {
        txid: pixData.txid,
        value: parseFloat(pixData.valor?.original || 0),
        paidValue: pixData.pix?.[0]?.valor ? parseFloat(pixData.pix[0].valor) : null,
        paymentDate: pixData.pix?.[0]?.horario || null,
      },
    });

  } catch (error) {
    console.error('[Check PIX Status] Error:', error);
    return res.status(200).json({
      success: false,
      status: 'ERROR',
      message: error.message,
    });
  }
}

