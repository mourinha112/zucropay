// Vercel Serverless Function - Pagamento Público (Checkout)

const ASAAS_API_URL = process.env.ASAAS_API_URL || process.env.VITE_ASAAS_API_URL || 'https://api.asaas.com/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || process.env.VITE_ASAAS_API_KEY || '';

async function asaasRequest(method: string, endpoint: string, data?: any) {
  const url = `${ASAAS_API_URL}${endpoint}`;

  const options: any = {
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
  const cpf = customerData.cpfCnpj?.replace(/\D/g, '');
  if (cpf) {
    const searchResponse = await asaasRequest('GET', `/customers?cpfCnpj=${encodeURIComponent(cpf)}`);
    if (searchResponse.code === 200 && searchResponse.data?.data?.length > 0) {
      return searchResponse.data.data[0];
    }
  }

  // Criar novo cliente
  const createResponse = await asaasRequest('POST', '/customers', {
    ...customerData,
    cpfCnpj: cpf
  });
  
  if (createResponse.code === 200 || createResponse.code === 201) {
    return createResponse.data;
  }

  return null;
}

export default async function handler(req: any, res: any) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET para teste
  if (req.method === 'GET') {
    return res.status(200).json({ 
      success: true, 
      message: 'Public payment endpoint is working',
      configured: !!ASAAS_API_KEY
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  if (!ASAAS_API_KEY) {
    return res.status(200).json({
      success: false,
      message: 'ASAAS_API_KEY not configured'
    });
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
    } = req.body || {};

    // Validar dados obrigatórios
    if (!customerName || !customerCpfCnpj || !billingType || !value) {
      return res.status(200).json({
        success: false,
        message: 'Missing required fields: customerName, customerCpfCnpj, billingType, value',
      });
    }

    // Criar ou buscar cliente
    const customer = await createOrGetCustomer({
      name: customerName,
      email: customerEmail,
      cpfCnpj: customerCpfCnpj,
      phone: customerPhone,
    });

    if (!customer) {
      return res.status(200).json({
        success: false,
        message: 'Failed to create or find customer',
      });
    }

    // Criar cobrança
    const paymentData: any = {
      customer: customer.id,
      billingType,
      value: parseFloat(value),
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
      return res.status(200).json({
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
    return res.status(200).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
