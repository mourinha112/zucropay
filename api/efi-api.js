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

// URLs da API EfiBank
const getApiUrl = (sandbox) => {
  return sandbox 
    ? 'https://pix-h.api.efipay.com.br' // Homologação
    : 'https://pix.api.efipay.com.br';  // Produção
};

const getCobrancaUrl = (sandbox) => {
  return sandbox
    ? 'https://cobrancas-h.api.efipay.com.br' // Homologação
    : 'https://cobrancas.api.efipay.com.br';  // Produção
};

// ========================================
// AUTENTICAÇÃO OAUTH2
// ========================================

let accessToken = null;
let tokenExpiry = null;

const getAccessToken = async (config, scope = 'cob.write cob.read pix.write pix.read') => {
  // Verificar se token ainda é válido
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const url = config.sandbox 
    ? 'https://pix-h.api.efipay.com.br/oauth/token'
    : 'https://pix.api.efipay.com.br/oauth/token';

  // Decodificar certificado Base64
  const certBuffer = Buffer.from(config.certificate, 'base64');

  const agent = new https.Agent({
    pfx: certBuffer,
    passphrase: '', // Senha do certificado se houver
  });

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
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Renovar 1 min antes
    return accessToken;
  }

  throw new Error('Falha ao obter token de acesso EfiBank');
};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

const makeEfiRequest = async (config, method, endpoint, data = null, usePixApi = true) => {
  const token = await getAccessToken(config);
  const baseUrl = usePixApi ? getApiUrl(config.sandbox) : getCobrancaUrl(config.sandbox);
  const url = `${baseUrl}${endpoint}`;

  const certBuffer = Buffer.from(config.certificate, 'base64');
  const agent = new https.Agent({
    pfx: certBuffer,
    passphrase: '',
  });

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    agent,
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const responseText = await response.text();

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    result = { raw: responseText };
  }

  return {
    success: response.ok,
    status: response.status,
    data: result,
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

    const result = await makeEfiRequest(config, 'PUT', `/v2/cob/${txid}`, chargeData, true);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        message: result.data?.mensagem || 'Erro ao criar cobrança PIX',
        error: result.data,
      });
    }

    // Buscar QR Code
    const locationId = result.data.loc?.id;
    let qrCode = null;

    if (locationId) {
      const qrResult = await makeEfiRequest(config, 'GET', `/v2/loc/${locationId}/qrcode`, null, true);
      if (qrResult.success) {
        qrCode = qrResult.data;
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

    const result = await makeEfiRequest(config, 'GET', `/v2/cob/${txid}`, null, true);

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

    const result = await makeEfiRequest(config, 'GET', `/v2/loc/${locationId}/qrcode`, null, true);

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

    // 1. Criar transação (charge)
    const chargeData = {
      items: [{
        name: description || 'Pagamento ZucroPay',
        value: Math.round(value * 100), // Valor em centavos
        amount: 1,
      }],
    };

    const chargeResult = await makeEfiRequest(config, 'POST', '/v1/charge', chargeData, false);

    if (!chargeResult.success || !chargeResult.data?.data?.charge_id) {
      return res.status(200).json({
        success: false,
        message: chargeResult.data?.message || 'Erro ao criar cobrança',
        error: chargeResult.data,
      });
    }

    const chargeId = chargeResult.data.data.charge_id;

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

    const payResult = await makeEfiRequest(config, 'POST', `/v1/charge/${chargeId}/pay`, paymentData, false);

    if (!payResult.success) {
      return res.status(200).json({
        success: false,
        message: payResult.data?.message || 'Erro ao processar pagamento com cartão',
        error: payResult.data,
      });
    }

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

    const result = await makeEfiRequest(config, 'GET', `/v1/charge/${chargeId}`, null, false);

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

    // Data de vencimento padrão: 3 dias
    const expireAt = dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 1. Criar transação
    const chargeData = {
      items: [{
        name: description || 'Pagamento ZucroPay',
        value: Math.round(value * 100), // Valor em centavos
        amount: 1,
      }],
    };

    const chargeResult = await makeEfiRequest(config, 'POST', '/v1/charge', chargeData, false);

    if (!chargeResult.success || !chargeResult.data?.data?.charge_id) {
      return res.status(200).json({
        success: false,
        message: chargeResult.data?.message || 'Erro ao criar cobrança',
        error: chargeResult.data,
      });
    }

    const chargeId = chargeResult.data.data.charge_id;

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

    const payResult = await makeEfiRequest(config, 'POST', `/v1/charge/${chargeId}/pay`, boletoData, false);

    if (!payResult.success) {
      return res.status(200).json({
        success: false,
        message: payResult.data?.message || 'Erro ao gerar boleto',
        error: payResult.data,
      });
    }

    const boletoInfo = payResult.data?.data?.payment?.banking_billet;

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

    const result = await makeEfiRequest(config, 'GET', `/v1/charge/${chargeId}`, null, false);

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

    if (paymentType === 'PIX') {
      return await getPixCharge(config, paymentId, res);
    } else {
      return await getCardCharge(config, paymentId, res);
    }

  } catch (error) {
    console.error('getPaymentStatus error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

