// Vercel Serverless Function - Pagamento Público (Checkout)
// Não requer autenticação - usado para checkout público

import type { VercelRequest, VercelResponse } from '@vercel/node';

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function asaasRequest(method: string, endpoint: string, data?: any) {
  const url = `${ASAAS_API_URL}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
      'User-Agent': 'ZucroPay/1.0',
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  return {
    code: response.status,
    data: await response.json(),
    success: response.ok,
  };
}

async function createOrGetCustomer(customerData: any) {
  // Buscar cliente existente por CPF
  const searchResponse = await asaasRequest(
    'GET',
    `/customers?cpfCnpj=${encodeURIComponent(customerData.cpfCnpj)}`
  );

  if (searchResponse.code === 200 && searchResponse.data?.data?.length > 0) {
    return searchResponse.data.data[0];
  }

  // Criar novo cliente
  const createResponse = await asaasRequest('POST', '/customers', customerData);
  
  if (createResponse.code === 200 || createResponse.code === 201) {
    return createResponse.data;
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(200).json({ ok: true });
  }

  // Adicionar headers CORS
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { 
      customerName, 
      customerEmail, 
      customerCpfCnpj, 
      customerPhone,
      billingType, 
      value, 
      description,
      creditCard,
      creditCardHolderInfo 
    } = req.body;

    // Validar dados obrigatórios
    if (!customerName || !customerCpfCnpj || !billingType || !value) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customerName, customerCpfCnpj, billingType, value',
      });
    }

    // Criar ou buscar cliente
    const customer = await createOrGetCustomer({
      name: customerName,
      email: customerEmail,
      cpfCnpj: customerCpfCnpj.replace(/\D/g, ''),
      phone: customerPhone,
    });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create or find customer',
      });
    }

    // Criar cobrança
    const paymentData: any = {
      customer: customer.id,
      billingType,
      value,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: description || 'Pagamento ZucroPay',
    };

    // Se for cartão de crédito, adicionar dados do cartão
    if (billingType === 'CREDIT_CARD' && creditCard) {
      paymentData.creditCard = creditCard;
      paymentData.creditCardHolderInfo = creditCardHolderInfo;
    }

    const paymentResponse = await asaasRequest('POST', '/payments', paymentData);

    if (!paymentResponse.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create payment',
        error: paymentResponse.data,
      });
    }

    const payment = paymentResponse.data;

    // Se for PIX, buscar QR Code
    let pixData = null;
    if (billingType === 'PIX' && payment.id) {
      const pixResponse = await asaasRequest('GET', `/payments/${payment.id}/pixQrCode`);
      if (pixResponse.success) {
        pixData = pixResponse.data;
      }
    }

    return res.status(200).json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        value: payment.value,
        billingType: payment.billingType,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        pixQrCode: pixData?.encodedImage,
        pixCopyPaste: pixData?.payload,
      },
    });

  } catch (error: any) {
    console.error('Error processing payment:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

