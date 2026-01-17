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

        // Verificar se o cartão foi recusado
        const paymentData = payResult.data?.data;
        const refusal = paymentData?.refusal;
        
        if (refusal || paymentData?.status === 'unpaid') {
          console.log('[CARTAO] Cartão recusado:', refusal);
          return res.status(200).json({
            success: false,
            message: refusal?.reason || 'Transação não autorizada. Tente outro cartão ou método de pagamento.',
            cardRefused: true,
            canRetry: refusal?.retry || true,
          });
        }

        const status = paymentData?.status === 'approved' ? 'RECEIVED' : 'PENDING';
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
          const { data: user } = await supabase.from('users').select('balance, reserved_balance').eq('id', link.user_id).single();
          if (user) {
            // ===== TAXAS DA PLATAFORMA =====
            const PLATFORM_FEE_PERCENT = 0.0599;      // 5.99% base
            const INSTALLMENT_FEE_PERCENT = 0.0249;   // 2.49% por parcela (Cartão)
            const RESERVE_PERCENT = 0.05;             // 5% reserva
            const RESERVE_DAYS = 30;
            
            // Cartão de crédito: 5.99% + (2.49% × parcelas)
            const installments = cardInstallments || 1;
            let platformFee = value * PLATFORM_FEE_PERCENT;
            platformFee += value * INSTALLMENT_FEE_PERCENT * installments;
            
            // Garantir que taxa não seja maior que 50% do valor
            if (platformFee > value * 0.5) {
              platformFee = value * 0.5;
            }
            const valueAfterFees = Math.max(0, value - platformFee);
            const reserveAmount = Math.max(0, valueAfterFees * RESERVE_PERCENT);
            const netAmount = Math.max(0, valueAfterFees - reserveAmount);
            
            const releaseDate = new Date();
            releaseDate.setDate(releaseDate.getDate() + RESERVE_DAYS);
            
            console.log(`[CARTAO] Valor bruto: R$${value.toFixed(2)}, Parcelas: ${installments}, Taxa: R$${platformFee.toFixed(2)}, Reserva: R$${reserveAmount.toFixed(2)}, Líquido: R$${netAmount.toFixed(2)}`);
            
            await supabase.from('users').update({ 
              balance: (user.balance || 0) + netAmount,
              reserved_balance: (user.reserved_balance || 0) + reserveAmount
            }).eq('id', link.user_id);
            
            // Criar registro de reserva
            await supabase.from('balance_reserves').insert({
              user_id: link.user_id,
              payment_id: savedPayment?.id,
              original_amount: value,
              reserve_amount: reserveAmount,
              status: 'held',
              release_date: releaseDate.toISOString(),
              description: `Reserva 5% - ${description}`,
              metadata: { gross_value: value, platform_fee: platformFee, value_after_fees: valueAfterFees, installments }
            });
            
            await supabase.from('transactions').insert({
              user_id: link.user_id,
              type: 'payment_received',
              amount: value,
              status: 'completed',
              description: `Venda com cartão ${installments}x - ${description} (Taxa: R$${platformFee.toFixed(2)} | Reserva: R$${reserveAmount.toFixed(2)})`,
              metadata: { gross_value: value, platform_fee: platformFee, net_amount: netAmount, reserve_amount: reserveAmount, installments }
            });
            
            // Registrar taxa da plataforma
            await supabase.from('transactions').insert({
              user_id: link.user_id,
              type: 'platform_fee',
              amount: -platformFee,
              status: 'completed',
              description: `Taxa da plataforma (5.99% + ${installments}x 2.49%) - ${description}`,
              metadata: { gross_value: value, fee_percent: PLATFORM_FEE_PERCENT, installment_fee_percent: INSTALLMENT_FEE_PERCENT, installments }
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
        // Sem token - gerar link de pagamento EfiBank
        // A API EfiBank NÃO aceita dados do cartão diretamente (PCI compliance)
        console.log('[CARTAO] Gerando link de pagamento EfiBank...');
        
        const linkData = {
          message: description || 'Pagamento via cartão',
          expire_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          request_delivery_address: false,
          payment_method: 'credit_card',
        };

        const linkResult = await makeCobrancaRequest(config, 'POST', `/v1/charge/${chargeId}/link`, linkData);
        
        if (!linkResult.success) {
          console.error('[CARTAO] Erro ao gerar link:', linkResult.data);
          return res.status(200).json({
            success: false,
            message: 'Erro ao gerar link de pagamento. Tente novamente.',
            debug: linkResult.data,
          });
        }

        const paymentUrl = linkResult.data?.data?.payment_url;
        console.log('[CARTAO] Link gerado:', paymentUrl);

        // Salvar no banco
        const { data: savedPayment } = await supabase
          .from('payments')
          .insert({
            user_id: link.user_id,
            billing_type: 'CREDIT_CARD',
            value: value,
            status: 'PENDING',
            description: description,
            due_date: new Date().toISOString().split('T')[0],
            efi_charge_id: chargeId.toString(),
            invoice_url: paymentUrl,
            payment_link_id: linkId,
            asaas_payment_id: chargeId.toString(),
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
          paymentUrl: paymentUrl,
          installments: cardInstallments || 1,
        };
        
        // Taxas e reservas serão processadas quando o pagamento for confirmado via webhook
        console.log('[CARTAO] Link gerado - aguardando pagamento via link EfiBank');
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

