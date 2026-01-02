// Vercel Serverless Function - Pagamento Público EfiBank
// Processa pagamentos do checkout público usando EfiBank

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
  pixKey: process.env.EFI_PIX_KEY,
});

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  return createClient(url, key, { auth: { persistSession: false } });
};

// URLs da API
const getPixApiUrl = (sandbox) => sandbox ? 'https://pix-h.api.efipay.com.br' : 'https://pix.api.efipay.com.br';
const getCobrancaApiUrl = (sandbox) => sandbox ? 'https://cobrancas-h.api.efipay.com.br' : 'https://cobrancas.api.efipay.com.br';

// ========================================
// AUTENTICAÇÃO
// ========================================

let tokenCache = { token: null, expiry: null };

const getAccessToken = async (config) => {
  if (tokenCache.token && tokenCache.expiry && Date.now() < tokenCache.expiry) {
    return tokenCache.token;
  }

  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const url = `${getPixApiUrl(config.sandbox)}/oauth/token`;
  const certBuffer = Buffer.from(config.certificate, 'base64');

  const agent = new https.Agent({ pfx: certBuffer, passphrase: '' });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
    agent,
  });

  const data = await response.json();

  if (data.access_token) {
    tokenCache.token = data.access_token;
    tokenCache.expiry = Date.now() + (data.expires_in * 1000) - 60000;
    return tokenCache.token;
  }

  throw new Error('Falha na autenticação EfiBank');
};

const makeRequest = async (config, method, endpoint, data = null, isPix = true) => {
  const token = await getAccessToken(config);
  const baseUrl = isPix ? getPixApiUrl(config.sandbox) : getCobrancaApiUrl(config.sandbox);
  const certBuffer = Buffer.from(config.certificate, 'base64');
  const agent = new https.Agent({ pfx: certBuffer, passphrase: '' });

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    agent,
  };

  if (data) options.body = JSON.stringify(data);

  const response = await fetch(`${baseUrl}${endpoint}`, options);
  const text = await response.text();
  
  try {
    return { success: response.ok, status: response.status, data: JSON.parse(text) };
  } catch {
    return { success: response.ok, status: response.status, data: { raw: text } };
  }
};

const generateTxId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 35 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ========================================
// HANDLER
// ========================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, message: 'EfiBank Public Payment API' });
  }

  try {
    const config = getEfiConfig();
    const supabase = getSupabase();

    if (!config.clientId || !config.clientSecret || !config.certificate) {
      return res.status(200).json({
        success: false,
        message: 'EfiBank não configurado. Configure as variáveis de ambiente.',
      });
    }

    const {
      linkId,
      billingType,
      customerName,
      customerEmail,
      customerCpfCnpj,
      customerPhone,
      // Dados do cartão (se aplicável)
      cardPaymentToken,
      cardInstallments,
      // Dados de endereço (para cartão)
      billingAddress,
    } = req.body;

    // Buscar dados do link de pagamento
    const { data: link, error: linkError } = await supabase
      .from('payment_links')
      .select('*, products(*), users(*)')
      .eq('id', linkId)
      .eq('active', true)
      .single();

    if (linkError || !link) {
      return res.status(200).json({ success: false, message: 'Link de pagamento não encontrado ou inativo' });
    }

    const value = parseFloat(link.amount);
    const description = link.products?.name || link.name || 'Pagamento ZucroPay';

    let payment;

    // ========== PIX ==========
    if (billingType === 'PIX') {
      const txid = generateTxId();

      const pixData = {
        calendario: { expiracao: 3600 },
        devedor: customerCpfCnpj ? {
          cpf: customerCpfCnpj.replace(/\D/g, '').slice(0, 11),
          nome: customerName,
        } : undefined,
        valor: { original: value.toFixed(2) },
        chave: config.pixKey,
        solicitacaoPagador: description,
      };

      const result = await makeRequest(config, 'PUT', `/v2/cob/${txid}`, pixData, true);

      if (!result.success) {
        return res.status(200).json({
          success: false,
          message: result.data?.mensagem || 'Erro ao criar cobrança PIX',
        });
      }

      // Buscar QR Code
      let qrCode = null;
      if (result.data.loc?.id) {
        const qrResult = await makeRequest(config, 'GET', `/v2/loc/${result.data.loc.id}/qrcode`, null, true);
        if (qrResult.success) qrCode = qrResult.data;
      }

      // Salvar no banco
      const { data: savedPayment } = await supabase
        .from('payments')
        .insert({
          user_id: link.user_id,
          billing_type: 'PIX',
          value: value,
          status: 'PENDING',
          description: description,
          due_date: new Date().toISOString().split('T')[0],
          efi_txid: txid,
          pix_qrcode: qrCode?.imagemQrcode,
          pix_copy_paste: result.data.pixCopiaECola || qrCode?.qrcode,
          metadata: {
            link_id: linkId,
            customer: { name: customerName, email: customerEmail, cpf: customerCpfCnpj, phone: customerPhone },
            efi_location_id: result.data.loc?.id,
          },
        })
        .select()
        .single();

      // Incrementar contador do link
      await supabase
        .from('payment_links')
        .update({ payments_count: (link.payments_count || 0) + 1 })
        .eq('id', linkId);

      payment = {
        id: savedPayment?.id,
        txid: txid,
        status: 'PENDING',
        pixCode: result.data.pixCopiaECola || qrCode?.qrcode,
        pixQrCode: qrCode?.imagemQrcode,
      };
    }

    // ========== CARTÃO ==========
    else if (billingType === 'CREDIT_CARD') {
      if (!cardPaymentToken) {
        return res.status(200).json({ success: false, message: 'Token do cartão é obrigatório' });
      }

      // Criar cobrança
      const chargeData = {
        items: [{
          name: description,
          value: Math.round(value * 100),
          amount: 1,
        }],
      };

      const chargeResult = await makeRequest(config, 'POST', '/v1/charge', chargeData, false);

      if (!chargeResult.success || !chargeResult.data?.data?.charge_id) {
        return res.status(200).json({
          success: false,
          message: chargeResult.data?.message || 'Erro ao criar cobrança',
        });
      }

      const chargeId = chargeResult.data.data.charge_id;

      // Pagar com cartão
      const payData = {
        payment: {
          credit_card: {
            installments: cardInstallments || 1,
            payment_token: cardPaymentToken,
            billing_address: billingAddress || {
              street: 'Não informado',
              number: '0',
              neighborhood: 'Não informado',
              zipcode: '00000000',
              city: 'Não informado',
              state: 'SP',
            },
            customer: {
              name: customerName,
              email: customerEmail,
              cpf: customerCpfCnpj?.replace(/\D/g, ''),
              birth: '1990-01-01',
              phone_number: customerPhone?.replace(/\D/g, ''),
            },
          },
        },
      };

      const payResult = await makeRequest(config, 'POST', `/v1/charge/${chargeId}/pay`, payData, false);

      const status = payResult.data?.data?.status === 'approved' ? 'RECEIVED' : 'PENDING';

      // Salvar no banco
      const { data: savedPayment } = await supabase
        .from('payments')
        .insert({
          user_id: link.user_id,
          billing_type: 'CREDIT_CARD',
          value: value,
          status: status,
          description: description,
          due_date: new Date().toISOString().split('T')[0],
          payment_date: status === 'RECEIVED' ? new Date().toISOString() : null,
          efi_charge_id: chargeId,
          metadata: {
            link_id: linkId,
            customer: { name: customerName, email: customerEmail, cpf: customerCpfCnpj, phone: customerPhone },
            installments: cardInstallments || 1,
          },
        })
        .select()
        .single();

      // Atualizar link e saldo se aprovado
      await supabase
        .from('payment_links')
        .update({
          payments_count: (link.payments_count || 0) + 1,
          total_received: status === 'RECEIVED' ? (link.total_received || 0) + value : link.total_received,
        })
        .eq('id', linkId);

      if (status === 'RECEIVED') {
        const { data: user } = await supabase.from('users').select('balance').eq('id', link.user_id).single();
        if (user) {
          await supabase.from('users').update({ balance: (user.balance || 0) + value }).eq('id', link.user_id);
          await supabase.from('transactions').insert({
            user_id: link.user_id,
            type: 'payment_received',
            amount: value,
            status: 'completed',
            description: `Venda com cartão - ${description}`,
          });
        }
      }

      payment = {
        id: savedPayment?.id,
        chargeId: chargeId,
        status: status,
        installments: cardInstallments || 1,
      };
    }

    // ========== BOLETO ==========
    else if (billingType === 'BOLETO') {
      const expireAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Criar cobrança
      const chargeData = {
        items: [{
          name: description,
          value: Math.round(value * 100),
          amount: 1,
        }],
      };

      const chargeResult = await makeRequest(config, 'POST', '/v1/charge', chargeData, false);

      if (!chargeResult.success || !chargeResult.data?.data?.charge_id) {
        return res.status(200).json({
          success: false,
          message: chargeResult.data?.message || 'Erro ao criar cobrança',
        });
      }

      const chargeId = chargeResult.data.data.charge_id;

      // Gerar boleto
      const boletoData = {
        payment: {
          banking_billet: {
            expire_at: expireAt,
            customer: {
              name: customerName,
              email: customerEmail,
              cpf: customerCpfCnpj?.replace(/\D/g, ''),
              phone_number: customerPhone?.replace(/\D/g, ''),
            },
            message: 'Não aceitar após o vencimento',
          },
        },
      };

      const payResult = await makeRequest(config, 'POST', `/v1/charge/${chargeId}/pay`, boletoData, false);

      if (!payResult.success) {
        return res.status(200).json({
          success: false,
          message: payResult.data?.message || 'Erro ao gerar boleto',
        });
      }

      const boletoInfo = payResult.data?.data?.payment?.banking_billet;

      // Salvar no banco
      const { data: savedPayment } = await supabase
        .from('payments')
        .insert({
          user_id: link.user_id,
          billing_type: 'BOLETO',
          value: value,
          status: 'PENDING',
          description: description,
          due_date: expireAt,
          efi_charge_id: chargeId,
          bank_slip_url: boletoInfo?.link,
          metadata: {
            link_id: linkId,
            customer: { name: customerName, email: customerEmail, cpf: customerCpfCnpj, phone: customerPhone },
            barcode: boletoInfo?.barcode,
            boleto_pdf: boletoInfo?.pdf?.charge,
          },
        })
        .select()
        .single();

      await supabase
        .from('payment_links')
        .update({ payments_count: (link.payments_count || 0) + 1 })
        .eq('id', linkId);

      payment = {
        id: savedPayment?.id,
        chargeId: chargeId,
        status: 'PENDING',
        barcode: boletoInfo?.barcode,
        boletoUrl: boletoInfo?.link,
        boletoPdf: boletoInfo?.pdf?.charge,
        expireAt: expireAt,
      };
    }

    else {
      return res.status(200).json({ success: false, message: 'Tipo de pagamento inválido' });
    }

    return res.status(200).json({
      success: true,
      message: 'Pagamento processado com sucesso',
      payment,
    });

  } catch (error) {
    console.error('[EfiBank Public Payment] Error:', error);
    return res.status(200).json({
      success: false,
      message: error.message || 'Erro ao processar pagamento',
    });
  }
}

