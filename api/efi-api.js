// Vercel Serverless Function - EfiBank API (Proxy)
// Integração completa com EfiBank/EfiPay para PIX, Cartão e Boleto

import https from 'https';

// ========================================
// CONFIGURAÇÃO EFIBANK
// ========================================

const getEfiConfig = () => {
  return {
    clientId: process.env.EFI_CLIENT_ID,
    clientSecret: process.env.EFI_CLIENT_SECRET,
    certificate: process.env.EFI_CERTIFICATE, // Base64 do certificado .p12
    sandbox: process.env.EFI_SANDBOX === 'true',
    pixKey: process.env.EFI_PIX_KEY, // Chave PIX cadastrada na EfiBank
  };
};

// URLs da API EfiBank (apenas hostname, sem https://)
// PIX usa mTLS (com certificado)
const getPixApiUrl = (sandbox) => {
  return sandbox 
    ? 'pix-h.api.efipay.com.br' // Homologação
    : 'pix.api.efipay.com.br';  // Produção
};

// Cobranças (cartão/boleto) NÃO usa certificado - apenas Basic Auth
const getCobrancaApiUrl = (sandbox) => {
  return sandbox
    ? 'cobrancas-h.api.efipay.com.br' // Homologação
    : 'cobrancas.api.efipay.com.br';  // Produção
};

// ========================================
// REQUISIÇÃO HTTPS COM CERTIFICADO (mTLS) - Para PIX
// ========================================

const httpsRequestWithCert = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`[EFI mTLS] Response ${res.statusCode}:`, data.substring(0, 300));
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', (error) => {
      console.error('[EFI mTLS] Request Error:', error);
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
};

// ========================================
// REQUISIÇÃO HTTPS SEM CERTIFICADO - Para Cobranças (Cartão/Boleto)
// ========================================

const httpsRequestNoCert = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`[EFI Cobranca] Response ${res.statusCode}:`, data.substring(0, 300));
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', (error) => {
      console.error('[EFI Cobranca] Request Error:', error);
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
};

// ========================================
// AUTENTICAÇÃO - PIX (com certificado mTLS)
// ========================================

let pixAccessToken = null;
let pixTokenExpiry = null;

const getPixAccessToken = async (config) => {
  if (pixAccessToken && pixTokenExpiry && Date.now() < pixTokenExpiry) {
    return pixAccessToken;
  }

  console.log('[EFI PIX] Obtendo novo token...');
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
    pixAccessToken = response.data.access_token;
    pixTokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    console.log('[EFI PIX] Token obtido com sucesso');
    return pixAccessToken;
  }

  console.error('[EFI PIX] Auth failed:', response);
  throw new Error(response.data?.error_description || 'Falha ao obter token de acesso EfiBank PIX');
};

// ========================================
// AUTENTICAÇÃO - Cobranças (SEM certificado)
// ========================================

let cobrancaAccessToken = null;
let cobrancaTokenExpiry = null;

const getCobrancaAccessToken = async (config) => {
  if (cobrancaAccessToken && cobrancaTokenExpiry && Date.now() < cobrancaTokenExpiry) {
    return cobrancaAccessToken;
  }

  console.log('[EFI Cobranca] Obtendo novo token...');
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const postData = JSON.stringify({ grant_type: 'client_credentials' });

  const options = {
    hostname: getCobrancaApiUrl(config.sandbox),
    port: 443,
    path: '/oauth/token',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
    // SEM certificado para API de Cobranças
  };

  const response = await httpsRequestNoCert(options, postData);

  if (response.data?.access_token) {
    cobrancaAccessToken = response.data.access_token;
    cobrancaTokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    console.log('[EFI Cobranca] Token obtido com sucesso');
    return cobrancaAccessToken;
  }

  console.error('[EFI Cobranca] Auth failed:', response);
  throw new Error(response.data?.error_description || 'Falha ao obter token de acesso EfiBank Cobranças');
};

// ========================================
// REQUISIÇÕES API
// ========================================

// Requisição PIX (com certificado mTLS)
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

  console.log(`[EFI PIX] ${method} ${endpoint}`);
  const response = await httpsRequestWithCert(options, postData);

  return {
    success: response.status >= 200 && response.status < 300,
    status: response.status,
    data: response.data,
  };
};

// Requisição Cobranças (SEM certificado)
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
    // SEM certificado para API de Cobranças
  };

  if (postData) {
    options.headers['Content-Length'] = Buffer.byteLength(postData);
  }

  console.log(`[EFI Cobranca] ${method} ${endpoint}`);
  const response = await httpsRequestNoCert(options, postData);

  return {
    success: response.status >= 200 && response.status < 300,
    status: response.status,
    data: response.data,
  };
};

// Gerar txid único para cobranças
const generateTxId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let txid = '';
  for (let i = 0; i < 35; i++) {
    txid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return txid;
};

// ========================================
// HANDLER PRINCIPAL
// ========================================

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET para verificar status da API
  if (req.method === 'GET') {
    const config = getEfiConfig();
    return res.status(200).json({
      success: true,
      message: 'EfiBank API funcionando',
      configured: !!(config.clientId && config.clientSecret && config.certificate),
      sandbox: config.sandbox,
      hasPixKey: !!config.pixKey,
    });
  }

  try {
    const config = getEfiConfig();

    // Verificar configuração
    if (!config.clientId || !config.clientSecret) {
      return res.status(200).json({
        success: false,
        message: 'EfiBank não configurado. Adicione EFI_CLIENT_ID e EFI_CLIENT_SECRET nas variáveis de ambiente.',
      });
    }

    if (!config.certificate) {
      return res.status(200).json({
        success: false,
        message: 'Certificado EfiBank não configurado. Adicione EFI_CERTIFICATE (Base64 do .p12) nas variáveis de ambiente.',
      });
    }

    const { action, ...params } = req.body || {};

    switch (action) {
      // ========== PIX ==========
      case 'createPixCharge':
        return await createPixCharge(config, params, res);
      
      case 'getPixCharge':
        return await getPixCharge(config, params.txid, res);
      
      case 'getPixQrCode':
        return await getPixQrCode(config, params.locationId, res);

      // ========== CARTÃO DE CRÉDITO ==========
      case 'createCardCharge':
        return await createCardCharge(config, params, res);
      
      case 'getCardCharge':
        return await getCardCharge(config, params.chargeId, res);

      // ========== BOLETO ==========
      case 'createBoletoCharge':
        return await createBoletoCharge(config, params, res);
      
      case 'getBoletoCharge':
        return await getBoletoCharge(config, params.chargeId, res);

      // ========== GENÉRICO ==========
      case 'getPaymentStatus':
        return await getPaymentStatus(config, params, res);

      default:
        return res.status(400).json({ success: false, message: 'Ação inválida' });
    }

  } catch (error) {
    console.error('[EfiBank API] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor',
    });
  }
}

// ========================================
// PIX - COBRANÇA IMEDIATA
// ========================================

async function createPixCharge(config, params, res) {
  try {
    const { value, description, customerName, customerCpf, expiration = 3600 } = params;

    if (!value || value <= 0) {
      return res.status(400).json({ success: false, message: 'Valor inválido' });
    }

    const txid = generateTxId();
    console.log('[PIX] Criando cobrança com txid:', txid);

    // Criar cobrança PIX imediata
    const chargeData = {
      calendario: {
        expiracao: expiration, // Segundos até expirar (padrão 1 hora)
      },
      devedor: customerCpf ? {
        cpf: customerCpf.replace(/\D/g, ''),
        nome: customerName || 'Cliente',
      } : undefined,
      valor: {
        original: value.toFixed(2),
      },
      chave: config.pixKey, // Chave PIX da conta EfiBank
      solicitacaoPagador: description || 'Pagamento ZucroPay',
    };

    const result = await makePixRequest(config, 'PUT', `/v2/cob/${txid}`, chargeData);

    if (!result.success) {
      console.error('[PIX] Erro ao criar cobrança:', result.data);
      return res.status(200).json({
        success: false,
        message: result.data?.mensagem || 'Erro ao criar cobrança PIX',
        error: result.data,
      });
    }

    console.log('[PIX] Cobrança criada com sucesso');

    // Buscar QR Code
    const locationId = result.data.loc?.id;
    let qrCode = null;

    if (locationId) {
      console.log('[PIX] Buscando QR Code, location:', locationId);
      const qrResult = await makePixRequest(config, 'GET', `/v2/loc/${locationId}/qrcode`, null);
      if (qrResult.success) {
        qrCode = qrResult.data;
        console.log('[PIX] QR Code obtido');
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Cobrança PIX criada com sucesso',
      payment: {
        txid: result.data.txid,
        status: result.data.status,
        value: parseFloat(result.data.valor.original),
        pixCopyPaste: result.data.pixCopiaECola || qrCode?.qrcode,
        pixQrCode: qrCode?.imagemQrcode, // Base64 da imagem
        locationId: locationId,
        expiration: result.data.calendario?.expiracao,
        createdAt: result.data.calendario?.criacao,
      },
    });

  } catch (error) {
    console.error('createPixCharge error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getPixCharge(config, txid, res) {
  try {
    if (!txid) {
      return res.status(400).json({ success: false, message: 'txid é obrigatório' });
    }

    const result = await makePixRequest(config, 'GET', `/v2/cob/${txid}`, null);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        message: result.data?.mensagem || 'Erro ao buscar cobrança',
        error: result.data,
      });
    }

    return res.status(200).json({
      success: true,
      payment: {
        txid: result.data.txid,
        status: result.data.status, // ATIVA, CONCLUIDA, REMOVIDA_PELO_USUARIO_RECEBEDOR, REMOVIDA_PELO_PSP
        value: parseFloat(result.data.valor?.original || 0),
        paidValue: result.data.pix?.[0]?.valor ? parseFloat(result.data.pix[0].valor) : null,
        paidAt: result.data.pix?.[0]?.horario || null,
      },
    });

  } catch (error) {
    console.error('getPixCharge error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getPixQrCode(config, locationId, res) {
  try {
    if (!locationId) {
      return res.status(400).json({ success: false, message: 'locationId é obrigatório' });
    }

    const result = await makePixRequest(config, 'GET', `/v2/loc/${locationId}/qrcode`, null);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        message: result.data?.mensagem || 'Erro ao buscar QR Code',
      });
    }

    return res.status(200).json({
      success: true,
      qrCode: {
        qrcode: result.data.qrcode, // Código PIX copia e cola
        imagemQrcode: result.data.imagemQrcode, // Base64 da imagem
      },
    });

  } catch (error) {
    console.error('getPixQrCode error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========================================
// CARTÃO DE CRÉDITO
// ========================================

async function createCardCharge(config, params, res) {
  try {
    const {
      value,
      description,
      installments = 1,
      customer,
      card,
      billingAddress,
    } = params;

    if (!value || value <= 0) {
      return res.status(400).json({ success: false, message: 'Valor inválido' });
    }

    if (!customer || !card) {
      return res.status(400).json({ success: false, message: 'Dados do cliente e cartão são obrigatórios' });
    }

    console.log('[CARTAO] Criando cobrança...');

    // 1. Criar transação (charge) - SEM certificado
    const chargeData = {
      items: [{
        name: description || 'Pagamento ZucroPay',
        value: Math.round(value * 100), // Valor em centavos
        amount: 1,
      }],
    };

    const chargeResult = await makeCobrancaRequest(config, 'POST', '/v1/charge', chargeData);

    if (!chargeResult.success || !chargeResult.data?.data?.charge_id) {
      console.error('[CARTAO] Erro ao criar cobrança:', chargeResult.data);
      return res.status(200).json({
        success: false,
        message: chargeResult.data?.message || chargeResult.data?.error_description || 'Erro ao criar cobrança',
        error: chargeResult.data,
      });
    }

    const chargeId = chargeResult.data.data.charge_id;
    console.log('[CARTAO] Cobrança criada:', chargeId);

    // 2. Pagar com cartão
    const paymentData = {
      payment: {
        credit_card: {
          installments: installments,
          payment_token: card.paymentToken, // Token gerado pelo frontend
          billing_address: billingAddress || {
            street: 'Não informado',
            number: '0',
            neighborhood: 'Não informado',
            zipcode: customer.zipcode || '00000000',
            city: 'Não informado',
            state: 'SP',
          },
          customer: {
            name: customer.name,
            email: customer.email,
            cpf: customer.cpf?.replace(/\D/g, ''),
            birth: customer.birth || '1990-01-01',
            phone_number: customer.phone?.replace(/\D/g, ''),
          },
        },
      },
    };

    console.log('[CARTAO] Processando pagamento...');
    const payResult = await makeCobrancaRequest(config, 'POST', `/v1/charge/${chargeId}/pay`, paymentData);

    if (!payResult.success) {
      console.error('[CARTAO] Erro ao processar:', payResult.data);
      return res.status(200).json({
        success: false,
        message: payResult.data?.message || payResult.data?.error_description || 'Erro ao processar pagamento com cartão',
        error: payResult.data,
      });
    }

    console.log('[CARTAO] Pagamento processado:', payResult.data?.data?.status);

    return res.status(200).json({
      success: true,
      message: 'Pagamento com cartão processado',
      payment: {
        chargeId: chargeId,
        status: payResult.data?.data?.status, // approved, waiting, unpaid, refunded, etc.
        total: payResult.data?.data?.total,
        installments: installments,
        installmentValue: Math.round(value / installments * 100) / 100,
      },
    });

  } catch (error) {
    console.error('createCardCharge error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getCardCharge(config, chargeId, res) {
  try {
    if (!chargeId) {
      return res.status(400).json({ success: false, message: 'chargeId é obrigatório' });
    }

    const result = await makeCobrancaRequest(config, 'GET', `/v1/charge/${chargeId}`, null);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        message: result.data?.message || 'Erro ao buscar cobrança',
      });
    }

    return res.status(200).json({
      success: true,
      payment: result.data?.data,
    });

  } catch (error) {
    console.error('getCardCharge error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========================================
// BOLETO
// ========================================

async function createBoletoCharge(config, params, res) {
  try {
    const {
      value,
      description,
      customer,
      dueDate, // YYYY-MM-DD
      message,
    } = params;

    if (!value || value <= 0) {
      return res.status(400).json({ success: false, message: 'Valor inválido' });
    }

    if (!customer) {
      return res.status(400).json({ success: false, message: 'Dados do cliente são obrigatórios' });
    }

    console.log('[BOLETO] Criando cobrança...');

    // Data de vencimento padrão: 3 dias
    const expireAt = dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 1. Criar transação - SEM certificado
    const chargeData = {
      items: [{
        name: description || 'Pagamento ZucroPay',
        value: Math.round(value * 100), // Valor em centavos
        amount: 1,
      }],
    };

    const chargeResult = await makeCobrancaRequest(config, 'POST', '/v1/charge', chargeData);

    if (!chargeResult.success || !chargeResult.data?.data?.charge_id) {
      console.error('[BOLETO] Erro ao criar cobrança:', chargeResult.data);
      return res.status(200).json({
        success: false,
        message: chargeResult.data?.message || chargeResult.data?.error_description || 'Erro ao criar cobrança',
        error: chargeResult.data,
      });
    }

    const chargeId = chargeResult.data.data.charge_id;
    console.log('[BOLETO] Cobrança criada:', chargeId);

    // 2. Gerar boleto
    const boletoData = {
      payment: {
        banking_billet: {
          expire_at: expireAt,
          customer: {
            name: customer.name,
            email: customer.email,
            cpf: customer.cpf?.replace(/\D/g, ''),
            phone_number: customer.phone?.replace(/\D/g, ''),
          },
          message: message || 'Não aceitar após o vencimento',
        },
      },
    };

    console.log('[BOLETO] Gerando boleto...');
    const payResult = await makeCobrancaRequest(config, 'POST', `/v1/charge/${chargeId}/pay`, boletoData);

    if (!payResult.success) {
      console.error('[BOLETO] Erro ao gerar:', payResult.data);
      return res.status(200).json({
        success: false,
        message: payResult.data?.message || payResult.data?.error_description || 'Erro ao gerar boleto',
        error: payResult.data,
      });
    }

    const boletoInfo = payResult.data?.data?.payment?.banking_billet;
    console.log('[BOLETO] Boleto gerado com sucesso');

    return res.status(200).json({
      success: true,
      message: 'Boleto gerado com sucesso',
      payment: {
        chargeId: chargeId,
        status: payResult.data?.data?.status,
        barcode: boletoInfo?.barcode,
        boletoUrl: boletoInfo?.link,
        boletoPdf: boletoInfo?.pdf?.charge,
        expireAt: boletoInfo?.expire_at,
      },
    });

  } catch (error) {
    console.error('createBoletoCharge error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getBoletoCharge(config, chargeId, res) {
  try {
    if (!chargeId) {
      return res.status(400).json({ success: false, message: 'chargeId é obrigatório' });
    }

    const result = await makeCobrancaRequest(config, 'GET', `/v1/charge/${chargeId}`, null);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        message: result.data?.message || 'Erro ao buscar cobrança',
      });
    }

    return res.status(200).json({
      success: true,
      payment: result.data?.data,
    });

  } catch (error) {
    console.error('getBoletoCharge error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========================================
// STATUS GENÉRICO
// ========================================

async function getPaymentStatus(config, params, res) {
  try {
    const { paymentType, paymentId } = params;

    if (!paymentType || !paymentId) {
      return res.status(400).json({ success: false, message: 'paymentType e paymentId são obrigatórios' });
    }

    console.log(`[STATUS] Verificando pagamento ${paymentType}:`, paymentId);

    if (paymentType === 'PIX') {
      return await getPixCharge(config, paymentId, res);
    } else {
      // Cartão e Boleto usam a mesma API de cobranças
      return await getCardCharge(config, paymentId, res);
    }

  } catch (error) {
    console.error('getPaymentStatus error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

