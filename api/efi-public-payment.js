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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  
  if (!url) {
    throw new Error('SUPABASE_URL não configurado. Adicione nas variáveis de ambiente da Vercel.');
  }
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY não configurado. Adicione nas variáveis de ambiente da Vercel.');
  }
  
  return createClient(url, key, { auth: { persistSession: false } });
};

// URLs da API
// PIX usa mTLS (com certificado) - novos domínios EfiPay
const getPixApiUrl = (sandbox) => sandbox ? 'pix-h.api.efipay.com.br' : 'pix.api.efipay.com.br';
// Cobranças (cartão/boleto) - usar domínios antigos Gerencianet (mais estáveis)
const getCobrancaApiUrl = (sandbox) => sandbox ? 'sandbox.gerencianet.com.br' : 'api.gerencianet.com.br';

// ========================================
// REQUISIÇÃO HTTPS COM CERTIFICADO (mTLS) - Para PIX
// ========================================

const httpsRequestWithCert = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`[EFI mTLS] Response ${res.statusCode}:`, data.substring(0, 500));
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
        console.log(`[EFI Cobranca] Response ${res.statusCode}:`, data.substring(0, 500));
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

let pixTokenCache = { token: null, expiry: null };

const getPixAccessToken = async (config) => {
  if (pixTokenCache.token && pixTokenCache.expiry && Date.now() < pixTokenCache.expiry) {
    return pixTokenCache.token;
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
    pixTokenCache.token = response.data.access_token;
    pixTokenCache.expiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    console.log('[EFI PIX] Token obtido com sucesso');
    return pixTokenCache.token;
  }

  console.error('[EFI PIX] Auth failed:', response);
  throw new Error(response.data?.error_description || 'Falha na autenticação EfiBank PIX');
};

// ========================================
// AUTENTICAÇÃO - Cobranças (SEM certificado)
// API de Cobranças usa OAuth2 padrão via Gerencianet
// ========================================

let cobrancaTokenCache = { token: null, expiry: null };

const getCobrancaAccessToken = async (config) => {
  if (cobrancaTokenCache.token && cobrancaTokenCache.expiry && Date.now() < cobrancaTokenCache.expiry) {
    return cobrancaTokenCache.token;
  }

  console.log('[EFI Cobranca] Obtendo novo token...');
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

  console.log('[EFI Cobranca] Auth URL:', `https://${options.hostname}${options.path}`);
  const response = await httpsRequestNoCert(options, postData);

  console.log('[EFI Cobranca] Auth Response:', JSON.stringify(response.data).substring(0, 200));

  if (response.data?.access_token) {
    cobrancaTokenCache.token = response.data.access_token;
    cobrancaTokenCache.expiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    console.log('[EFI Cobranca] Token obtido com sucesso');
    return cobrancaTokenCache.token;
  }

  console.error('[EFI Cobranca] Auth failed:', response);
  throw new Error(response.data?.error_description || response.data?.message || 'Falha na autenticação EfiBank Cobranças');
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
    data: response.data 
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
    data: response.data 
  };
};

const generateTxId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 35 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// Detectar bandeira do cartão
const detectCardBrand = (number) => {
  const cleanNumber = (number || '').replace(/\D/g, '');
  
  if (/^4/.test(cleanNumber)) return 'visa';
  if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
  if (/^3[47]/.test(cleanNumber)) return 'amex';
  if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
  if (/^(?:2131|1800|35)/.test(cleanNumber)) return 'jcb';
  if (/^3(?:0[0-5]|[68])/.test(cleanNumber)) return 'diners';
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011|506699)/.test(cleanNumber)) return 'elo';
  if (/^(606282|3841)/.test(cleanNumber)) return 'hipercard';
  
  return 'visa'; // Default
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
    
    // Verificar configuração do Supabase primeiro
    let supabase;
    try {
      supabase = getSupabase();
    } catch (supabaseError) {
      return res.status(200).json({
        success: false,
        message: supabaseError.message,
        configError: 'supabase',
      });
    }

    if (!config.clientId || !config.clientSecret || !config.certificate) {
      return res.status(200).json({
        success: false,
        message: 'EfiBank não configurado. Configure EFI_CLIENT_ID, EFI_CLIENT_SECRET e EFI_CERTIFICATE nas variáveis de ambiente da Vercel.',
        configError: 'efibank',
      });
    }
    
    if (!config.pixKey) {
      return res.status(200).json({
        success: false,
        message: 'Chave PIX não configurada. Configure EFI_PIX_KEY nas variáveis de ambiente da Vercel.',
        configError: 'efibank_pix',
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
      // Dados do cartão direto (sem token)
      cardNumber,
      cardName,
      cardExpiryMonth,
      cardExpiryYear,
      cardCvv,
      cardBrand,
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
      console.log('[PIX] Criando cobrança PIX com txid:', txid);

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

      console.log('[PIX] Dados da cobrança:', JSON.stringify(pixData));
      const result = await makePixRequest(config, 'PUT', `/v2/cob/${txid}`, pixData);

      if (!result.success) {
        console.error('[PIX] Erro ao criar cobrança:', result.data);
        return res.status(200).json({
          success: false,
          message: result.data?.mensagem || result.data?.message || 'Erro ao criar cobrança PIX',
          debug: result.data,
        });
      }

      console.log('[PIX] Cobrança criada:', result.data);

      // Buscar QR Code
      let qrCode = null;
      if (result.data.loc?.id) {
        console.log('[PIX] Buscando QR Code, location:', result.data.loc.id);
        const qrResult = await makePixRequest(config, 'GET', `/v2/loc/${result.data.loc.id}/qrcode`, null);
        if (qrResult.success) {
          qrCode = qrResult.data;
          console.log('[PIX] QR Code obtido com sucesso');
        } else {
          console.error('[PIX] Erro ao obter QR Code:', qrResult.data);
        }
      }

      // O QR Code da EfiBank vem como base64 puro (sem prefixo data:image)
      const pixCopyPaste = result.data.pixCopiaECola || qrCode?.qrcode || '';
      const pixQrCodeBase64 = qrCode?.imagemQrcode || '';

      // Salvar no banco
      const paymentData = {
        user_id: link.user_id,
        billing_type: 'PIX',
        value: value,
        status: 'PENDING',
        description: description,
        due_date: new Date().toISOString().split('T')[0],
        efi_txid: txid,
        pix_qrcode: pixQrCodeBase64,
        pix_copy_paste: pixCopyPaste,
        payment_link_id: linkId,
        asaas_payment_id: txid, // Usar para compatibilidade
      };

      const { data: savedPayment, error: saveError } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (saveError) {
        console.error('[PIX] Erro ao salvar pagamento:', saveError);
        // Tentar salvar sem payment_link_id se a coluna não existir
        if (saveError.message?.includes('payment_link_id')) {
          delete paymentData.payment_link_id;
          const { data: retryPayment, error: retryError } = await supabase
            .from('payments')
            .insert(paymentData)
            .select()
            .single();
          if (retryError) {
            console.error('[PIX] Erro ao salvar (retry):', retryError);
          }
        }
      }

      // Incrementar contador do link
      await supabase
        .from('payment_links')
        .update({ payments_count: (link.payments_count || 0) + 1 })
        .eq('id', linkId);

      payment = {
        id: savedPayment?.id,
        txid: txid,
        status: 'PENDING',
        pixCode: pixCopyPaste,
        pixQrCode: pixQrCodeBase64,
      };
      
      console.log('[PIX] Pagamento processado com sucesso');
    }

    // ========== CARTÃO ==========
    else if (billingType === 'CREDIT_CARD') {
      console.log('[CARTAO] Iniciando pagamento com cartão...');
      
      // Para pagamentos com cartão na EfiBank, precisamos usar a tokenização
      // Porém, como não temos SDK no frontend, vamos criar a cobrança e gerar um link de pagamento
      
      // Criar cobrança
      const chargeData = {
        items: [{
          name: description,
          value: Math.round(value * 100), // Valor em centavos
          amount: 1,
        }],
      };

      console.log('[CARTAO] Criando cobrança:', JSON.stringify(chargeData));
      const chargeResult = await makeCobrancaRequest(config, 'POST', '/v1/charge', chargeData);

      if (!chargeResult.success || !chargeResult.data?.data?.charge_id) {
        console.error('[CARTAO] Erro ao criar cobrança:', chargeResult.data);
        return res.status(200).json({
          success: false,
          message: chargeResult.data?.message || chargeResult.data?.error_description || 'Erro ao criar cobrança',
          debug: chargeResult.data,
        });
      }

      const chargeId = chargeResult.data.data.charge_id;
      console.log('[CARTAO] Cobrança criada:', chargeId);

      // Se temos token do cartão, pagar diretamente
      if (cardPaymentToken) {
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

        console.log('[CARTAO] Processando pagamento com token...');
        const payResult = await makeCobrancaRequest(config, 'POST', `/v1/charge/${chargeId}/pay`, payData);

        if (!payResult.success) {
          console.error('[CARTAO] Erro ao processar pagamento:', payResult.data);
          return res.status(200).json({
            success: false,
            message: payResult.data?.message || payResult.data?.error_description || 'Erro ao processar pagamento com cartão',
            debug: payResult.data,
          });
        }

        const status = payResult.data?.data?.status === 'approved' ? 'RECEIVED' : 'PENDING';
        console.log('[CARTAO] Status do pagamento:', status);

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
            efi_charge_id: chargeId.toString(),
            payment_link_id: linkId,
            asaas_payment_id: chargeId.toString(),
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
      } else if (cardNumber && cardCvv) {
        // Sem token, mas com dados do cartão - pagar diretamente
        console.log('[CARTAO] Processando com dados do cartão...');
        
        // Detectar bandeira se não informada
        const brand = cardBrand || detectCardBrand(cardNumber);
        
        const payData = {
          payment: {
            credit_card: {
              installments: cardInstallments || 1,
              customer: {
                name: customerName,
                email: customerEmail,
                cpf: customerCpfCnpj?.replace(/\D/g, ''),
                birth: '1990-01-01',
                phone_number: customerPhone?.replace(/\D/g, ''),
              },
              billing_address: billingAddress || {
                street: 'Rua Principal',
                number: '100',
                neighborhood: 'Centro',
                zipcode: '01310100',
                city: 'Sao Paulo',
                state: 'SP',
              },
              payment_token: null, // Sem token
              credit_card: {
                brand: brand,
                number: cardNumber?.replace(/\D/g, ''),
                cvv: cardCvv,
                expiration_month: cardExpiryMonth?.padStart(2, '0'),
                expiration_year: cardExpiryYear?.length === 2 ? `20${cardExpiryYear}` : cardExpiryYear,
              },
            },
          },
        };

        console.log('[CARTAO] Dados do pagamento:', JSON.stringify({
          ...payData,
          payment: {
            ...payData.payment,
            credit_card: {
              ...payData.payment.credit_card,
              credit_card: { ...payData.payment.credit_card.credit_card, number: '****', cvv: '***' }
            }
          }
        }));

        const payResult = await makeCobrancaRequest(config, 'POST', `/v1/charge/${chargeId}/pay`, payData);

        if (!payResult.success) {
          console.error('[CARTAO] Erro ao processar:', payResult.data);
          
          // Verificar se é erro de dados do cartão
          const errorMsg = payResult.data?.error_description?.message || 
                          payResult.data?.message || 
                          payResult.data?.error_description ||
                          'Erro ao processar cartão';
          
          return res.status(200).json({
            success: false,
            message: `Cartão recusado: ${errorMsg}`,
            debug: payResult.data,
          });
        }

        const payStatus = payResult.data?.data?.status;
        const status = payStatus === 'approved' || payStatus === 'paid' ? 'RECEIVED' : 'PENDING';
        console.log('[CARTAO] Status:', status, '(API status:', payStatus, ')');

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
            efi_charge_id: chargeId.toString(),
            payment_link_id: linkId,
            asaas_payment_id: chargeId.toString(),
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
      } else {
        // Sem dados do cartão - erro
        return res.status(200).json({
          success: false,
          message: 'Dados do cartão são obrigatórios',
        });
      }
      
      console.log('[CARTAO] Processo finalizado');
    }

    // ========== BOLETO ==========
    else if (billingType === 'BOLETO') {
      console.log('[BOLETO] Iniciando geração de boleto...');
      const expireAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Criar cobrança
      const chargeData = {
        items: [{
          name: description,
          value: Math.round(value * 100), // Valor em centavos
          amount: 1,
        }],
      };

      console.log('[BOLETO] Criando cobrança:', JSON.stringify(chargeData));
      const chargeResult = await makeCobrancaRequest(config, 'POST', '/v1/charge', chargeData);

      if (!chargeResult.success || !chargeResult.data?.data?.charge_id) {
        console.error('[BOLETO] Erro ao criar cobrança:', chargeResult.data);
        return res.status(200).json({
          success: false,
          message: chargeResult.data?.message || chargeResult.data?.error_description || 'Erro ao criar cobrança',
          debug: chargeResult.data,
        });
      }

      const chargeId = chargeResult.data.data.charge_id;
      console.log('[BOLETO] Cobrança criada:', chargeId);

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

      console.log('[BOLETO] Gerando boleto...');
      const payResult = await makeCobrancaRequest(config, 'POST', `/v1/charge/${chargeId}/pay`, boletoData);

      if (!payResult.success) {
        console.error('[BOLETO] Erro ao gerar boleto:', payResult.data);
        return res.status(200).json({
          success: false,
          message: payResult.data?.message || payResult.data?.error_description || 'Erro ao gerar boleto',
          debug: payResult.data,
        });
      }

      const boletoInfo = payResult.data?.data?.payment?.banking_billet;
      console.log('[BOLETO] Boleto gerado:', boletoInfo);

      // Salvar no banco
      const { data: savedPayment, error: saveError } = await supabase
        .from('payments')
        .insert({
          user_id: link.user_id,
          billing_type: 'BOLETO',
          value: value,
          status: 'PENDING',
          description: description,
          due_date: expireAt,
          efi_charge_id: chargeId.toString(),
          bank_slip_url: boletoInfo?.link,
          payment_link_id: linkId,
          asaas_payment_id: chargeId.toString(),
        })
        .select()
        .single();

      if (saveError) {
        console.error('[BOLETO] Erro ao salvar:', saveError);
      }

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
      
      console.log('[BOLETO] Processo finalizado');
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

