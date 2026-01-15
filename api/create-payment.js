// Vercel Serverless Function - Create Payment API
// Endpoint: POST /api/create-payment
// API para integracoes externas - Cria pagamentos PIX/Boleto/Cartao via EfiBank

import { createClient } from '@supabase/supabase-js';
import https from 'https';

// ========================================
// CONFIGURACAO
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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase nao configurado');
  return createClient(url, key, { auth: { persistSession: false } });
};

const getPixApiUrl = (sandbox) => sandbox ? 'pix-h.api.efipay.com.br' : 'pix.api.efipay.com.br';
const getCobrancaApiUrl = (sandbox) => sandbox ? 'sandbox.gerencianet.com.br' : 'api.gerencianet.com.br';

// ========================================
// REQUISICOES HTTPS
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
// AUTENTICACAO
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

  throw new Error('Falha na autenticacao EfiBank PIX');
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

  throw new Error('Falha na autenticacao EfiBank Cobrancas');
};

// ========================================
// REQUISICOES API
// ========================================

const makePixRequest = async (config, method, endpoint, data = null) => {
  const token = await getPixAccessToken(config);
  const certBuffer = Buffer.from(config.certificate, 'base64');
  const postData = data ? JSON.stringify(data) : null;

  const options = {
    hostname: getPixApiUrl(config.sandbox),
    port: 443,
    path: endpoint,
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    pfx: certBuffer,
    passphrase: '',
  };

  if (postData) {
    options.headers['Content-Length'] = Buffer.byteLength(postData);
  }

  const response = await httpsRequestWithCert(options, postData);
  return { success: response.status >= 200 && response.status < 300, status: response.status, data: response.data };
};

const makeCobrancaRequest = async (config, method, endpoint, data = null) => {
  const token = await getCobrancaAccessToken(config);
  const postData = data ? JSON.stringify(data) : null;

  const options = {
    hostname: getCobrancaApiUrl(config.sandbox),
    port: 443,
    path: endpoint,
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  if (postData) {
    options.headers['Content-Length'] = Buffer.byteLength(postData);
  }

  const response = await httpsRequestNoCert(options, postData);
  return { success: response.status >= 200 && response.status < 300, status: response.status, data: response.data };
};

const generateTxId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 35 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ========================================
// HANDLER PRINCIPAL
// ========================================

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - Retorna info da API
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      api: 'ZucroPay Payment API',
      version: '1.0',
      endpoints: {
        createPayment: 'POST /api/create-payment',
        checkStatus: 'GET /api/check-payment-status?paymentId=xxx',
      },
      billingTypes: ['PIX', 'BOLETO', 'CREDIT_CARD'],
    });
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    // 1. Validar API Key
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API Key obrigatoria. Use header X-API-Key ou Authorization: Bearer <key>',
      });
    }

    const supabase = getSupabase();

    // Buscar API Key no banco
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('user_id, name, is_active')
      .eq('api_key', apiKey)
      .single();

    if (keyError || !keyData) {
      return res.status(401).json({ success: false, error: 'API Key invalida' });
    }

    if (!keyData.is_active) {
      return res.status(401).json({ success: false, error: 'API Key desativada' });
    }

    const userId = keyData.user_id;

    // 2. Parse request body
    const {
      amount,
      value,
      customer,
      description,
      billingType = 'PIX',
      externalReference,
      external_reference,
      dueDate,
      // Campos para cartao de credito
      creditCard,
      card,
      installments = 1,
    } = req.body;

    const paymentAmount = parseFloat(amount || value);
    const extRef = externalReference || external_reference || `API-${Date.now()}`;

    // 3. Validacoes
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Valor (amount) obrigatorio e deve ser maior que 0' });
    }

    if (!customer || !customer.name || !customer.email) {
      return res.status(400).json({ success: false, error: 'customer.name e customer.email sao obrigatorios' });
    }

    // 4. Configuracao EfiBank
    const config = getEfiConfig();

    if (!config.clientId || !config.clientSecret || !config.certificate) {
      return res.status(500).json({ success: false, error: 'Gateway de pagamento nao configurado' });
    }

    const paymentDescription = description || 'Pagamento via ZucroPay API';
    let payment = null;

    // ========== PIX ==========
    if (billingType.toUpperCase() === 'PIX') {
      if (!config.pixKey) {
        return res.status(500).json({ success: false, error: 'Chave PIX nao configurada no gateway' });
      }

      const txid = generateTxId();
      console.log(`[API] Criando PIX: ${txid} | Valor: R$${paymentAmount} | User: ${userId}`);

      const pixData = {
        calendario: { expiracao: 3600 }, // 1 hora
        devedor: customer.cpfCnpj ? {
          cpf: customer.cpfCnpj.replace(/\D/g, '').slice(0, 11),
          nome: customer.name,
        } : undefined,
        valor: { original: paymentAmount.toFixed(2) },
        chave: config.pixKey,
        solicitacaoPagador: paymentDescription,
        infoAdicionais: extRef ? [{ nome: 'Referencia', valor: extRef }] : undefined,
      };

      const result = await makePixRequest(config, 'PUT', `/v2/cob/${txid}`, pixData);

      if (!result.success) {
        console.error('[API] Erro PIX:', result.data);
        return res.status(400).json({
          success: false,
          error: result.data?.mensagem || 'Erro ao criar cobranca PIX',
          details: result.data,
        });
      }

      // Buscar QR Code
      let qrCode = null;
      if (result.data.loc?.id) {
        const qrResult = await makePixRequest(config, 'GET', `/v2/loc/${result.data.loc.id}/qrcode`, null);
        if (qrResult.success) {
          qrCode = qrResult.data;
        }
      }

      const pixCopyPaste = result.data.pixCopiaECola || qrCode?.qrcode || '';
      const pixQrCodeBase64 = qrCode?.imagemQrcode || '';

      // Salvar no banco
      const { data: savedPayment, error: saveError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          billing_type: 'PIX',
          value: paymentAmount,
          status: 'PENDING',
          description: paymentDescription,
          customer_name: customer.name,
          customer_email: customer.email,
          due_date: new Date().toISOString().split('T')[0],
          efi_txid: txid,
          pix_qrcode: pixQrCodeBase64,
          pix_copy_paste: pixCopyPaste,
          external_reference: extRef,
        })
        .select()
        .single();

      if (saveError) {
        console.error('[API] Erro ao salvar:', saveError);
      }

      payment = {
        id: savedPayment?.id || txid,
        txid: txid,
        status: 'PENDING',
        value: paymentAmount,
        billingType: 'PIX',
        dueDate: new Date().toISOString().split('T')[0],
        externalReference: extRef,
        customer: { name: customer.name, email: customer.email },
      };

      // Retornar com dados do PIX
      return res.status(200).json({
        success: true,
        message: 'Pagamento PIX criado com sucesso',
        payment,
        pix: {
          qrCode: pixQrCodeBase64,
          qrCodeBase64: pixQrCodeBase64,
          copyPaste: pixCopyPaste,
          expirationDate: new Date(Date.now() + 3600000).toISOString(),
        },
        checkStatusUrl: `https://dashboard.appzucropay.com/api/check-payment-status?paymentId=${savedPayment?.id || txid}&type=pix&txid=${txid}`,
      });
    }

    // ========== BOLETO ==========
    else if (billingType.toUpperCase() === 'BOLETO') {
      const expireAt = dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      console.log(`[API] Criando Boleto | Valor: R$${paymentAmount} | Vencimento: ${expireAt} | User: ${userId}`);

      // Criar cobranca
      const chargeData = {
        items: [{
          name: paymentDescription.substring(0, 255),
          value: Math.round(paymentAmount * 100), // Centavos
          amount: 1,
        }],
      };

      const chargeResult = await makeCobrancaRequest(config, 'POST', '/v1/charge', chargeData);

      if (!chargeResult.success || !chargeResult.data?.data?.charge_id) {
        console.error('[API] Erro ao criar cobranca:', chargeResult.data);
        return res.status(400).json({
          success: false,
          error: chargeResult.data?.message || 'Erro ao criar cobranca',
          details: chargeResult.data,
        });
      }

      const chargeId = chargeResult.data.data.charge_id;

      // Gerar boleto
      const boletoData = {
        payment: {
          banking_billet: {
            expire_at: expireAt,
            customer: {
              name: customer.name,
              email: customer.email,
              cpf: customer.cpfCnpj?.replace(/\D/g, '') || '00000000000',
              phone_number: customer.phone?.replace(/\D/g, ''),
            },
            message: `Ref: ${extRef}`,
          },
        },
      };

      const payResult = await makeCobrancaRequest(config, 'POST', `/v1/charge/${chargeId}/pay`, boletoData);

      if (!payResult.success) {
        console.error('[API] Erro ao gerar boleto:', payResult.data);
        return res.status(400).json({
          success: false,
          error: payResult.data?.message || 'Erro ao gerar boleto',
          details: payResult.data,
        });
      }

      const boletoInfo = payResult.data?.data?.payment?.banking_billet;

      // Salvar no banco
      const { data: savedPayment, error: saveError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          billing_type: 'BOLETO',
          value: paymentAmount,
          status: 'PENDING',
          description: paymentDescription,
          customer_name: customer.name,
          customer_email: customer.email,
          due_date: expireAt,
          efi_charge_id: chargeId.toString(),
          bank_slip_url: boletoInfo?.link,
          external_reference: extRef,
        })
        .select()
        .single();

      if (saveError) {
        console.error('[API] Erro ao salvar:', saveError);
      }

      payment = {
        id: savedPayment?.id || chargeId,
        chargeId: chargeId,
        status: 'PENDING',
        value: paymentAmount,
        billingType: 'BOLETO',
        dueDate: expireAt,
        externalReference: extRef,
        customer: { name: customer.name, email: customer.email },
      };

      return res.status(200).json({
        success: true,
        message: 'Boleto criado com sucesso',
        payment,
        boleto: {
          barcode: boletoInfo?.barcode,
          barcodeData: boletoInfo?.barcode,
          url: boletoInfo?.link,
          pdfUrl: boletoInfo?.pdf?.charge,
          dueDate: expireAt,
        },
        checkStatusUrl: `https://dashboard.appzucropay.com/api/check-payment-status?paymentId=${savedPayment?.id}&type=charge&chargeId=${chargeId}`,
      });
    }

    // ========== CARTAO DE CREDITO ==========
    else if (billingType.toUpperCase() === 'CREDIT_CARD' || billingType.toUpperCase() === 'CARTAO') {
      console.log(`[API] Criando pagamento Cartao | Valor: R$${paymentAmount} | User: ${userId}`);

      // Dados do cartao podem vir em creditCard ou card
      const cardData = creditCard || card;

      if (!cardData) {
        return res.status(400).json({
          success: false,
          error: 'Dados do cartao (creditCard ou card) sao obrigatorios para pagamento com cartao',
          example: {
            creditCard: {
              number: '4012001038443335',
              cvv: '123',
              expiration_month: '12',
              expiration_year: '2028',
              holder_name: 'JOAO DA SILVA',
            },
            billingAddress: {
              street: 'Rua Exemplo',
              number: '123',
              neighborhood: 'Centro',
              city: 'Sao Paulo',
              state: 'SP',
              zipcode: '01001000',
            },
          },
        });
      }

      // Validar campos obrigatorios do cartao
      if (!cardData.number || !cardData.cvv || !cardData.expiration_month || !cardData.expiration_year || !cardData.holder_name) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatorios do cartao: number, cvv, expiration_month, expiration_year, holder_name',
        });
      }

      // CPF obrigatorio para cartao
      if (!customer.cpfCnpj) {
        return res.status(400).json({
          success: false,
          error: 'customer.cpfCnpj e obrigatorio para pagamento com cartao',
        });
      }

      // 1. Criar cobranca
      const chargeData = {
        items: [{
          name: paymentDescription.substring(0, 255),
          value: Math.round(paymentAmount * 100), // Centavos
          amount: 1,
        }],
      };

      const chargeResult = await makeCobrancaRequest(config, 'POST', '/v1/charge', chargeData);

      if (!chargeResult.success || !chargeResult.data?.data?.charge_id) {
        console.error('[API] Erro ao criar cobranca:', chargeResult.data);
        return res.status(400).json({
          success: false,
          error: chargeResult.data?.message || 'Erro ao criar cobranca',
          details: chargeResult.data,
        });
      }

      const chargeId = chargeResult.data.data.charge_id;

      // 2. Pagar com cartao
      const creditCardPaymentData = {
        payment: {
          credit_card: {
            installments: parseInt(installments) || 1,
            payment_token: cardData.payment_token, // Se usar tokenizacao
            billing_address: cardData.billingAddress || customer.billingAddress || {
              street: customer.address?.street || 'Nao informado',
              number: customer.address?.number || '0',
              neighborhood: customer.address?.neighborhood || 'Centro',
              city: customer.address?.city || 'Sao Paulo',
              state: customer.address?.state || 'SP',
              zipcode: (customer.address?.zipcode || customer.zipcode || '01001000').replace(/\D/g, ''),
            },
            customer: {
              name: customer.name,
              email: customer.email,
              cpf: customer.cpfCnpj.replace(/\D/g, '').slice(0, 11),
              birth: customer.birth || '1990-01-01',
              phone_number: (customer.phone || '11999999999').replace(/\D/g, ''),
            },
          },
        },
      };

      // Se nao tem payment_token, usar dados do cartao diretamente
      if (!cardData.payment_token) {
        creditCardPaymentData.payment.credit_card.card = {
          number: cardData.number.replace(/\D/g, ''),
          cvv: cardData.cvv,
          expiration_month: cardData.expiration_month.toString().padStart(2, '0'),
          expiration_year: cardData.expiration_year.toString(),
          holder_name: cardData.holder_name.toUpperCase(),
        };
      }

      const payResult = await makeCobrancaRequest(config, 'POST', `/v1/charge/${chargeId}/pay`, creditCardPaymentData);

      if (!payResult.success) {
        console.error('[API] Erro ao processar cartao:', payResult.data);
        return res.status(400).json({
          success: false,
          error: payResult.data?.message || 'Erro ao processar pagamento com cartao',
          details: payResult.data,
          code: payResult.data?.code,
        });
      }

      const cardInfo = payResult.data?.data;
      const cardStatus = cardInfo?.status || 'waiting';

      // Mapear status do cartao
      let paymentStatus = 'PENDING';
      if (cardStatus === 'approved' || cardStatus === 'paid') {
        paymentStatus = 'CONFIRMED';
      } else if (cardStatus === 'refused' || cardStatus === 'canceled') {
        paymentStatus = 'FAILED';
      }

      // Salvar no banco
      const { data: savedPayment, error: saveError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          billing_type: 'CREDIT_CARD',
          value: paymentAmount,
          status: paymentStatus,
          description: paymentDescription,
          customer_name: customer.name,
          customer_email: customer.email,
          due_date: new Date().toISOString().split('T')[0],
          efi_charge_id: chargeId.toString(),
          external_reference: extRef,
          payment_method: 'credit_card',
          installments: parseInt(installments) || 1,
        })
        .select()
        .single();

      if (saveError) {
        console.error('[API] Erro ao salvar:', saveError);
      }

      payment = {
        id: savedPayment?.id || chargeId,
        chargeId: chargeId,
        status: paymentStatus,
        value: paymentAmount,
        billingType: 'CREDIT_CARD',
        installments: parseInt(installments) || 1,
        externalReference: extRef,
        customer: { name: customer.name, email: customer.email },
      };

      return res.status(200).json({
        success: true,
        message: paymentStatus === 'CONFIRMED' 
          ? 'Pagamento com cartao aprovado!' 
          : 'Pagamento com cartao em processamento',
        payment,
        creditCard: {
          status: cardStatus,
          installments: parseInt(installments) || 1,
          total: paymentAmount,
          installmentValue: paymentAmount / (parseInt(installments) || 1),
        },
        checkStatusUrl: `https://dashboard.appzucropay.com/api/check-payment-status?paymentId=${savedPayment?.id}&type=charge&chargeId=${chargeId}`,
      });
    }

    // Tipo invalido
    else {
      return res.status(400).json({
        success: false,
        error: `Tipo de pagamento invalido: ${billingType}. Use PIX, BOLETO ou CREDIT_CARD.`,
      });
    }

  } catch (error) {
    console.error('[API Create Payment] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message,
    });
  }
}
