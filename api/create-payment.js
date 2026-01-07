// Vercel Serverless Function - Create Payment API
// Endpoint: POST /api/create-payment
// Used by external clients to create payments via API

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API Key is required. Use X-API-Key header or Authorization: Bearer <key>'
      });
    }

    // Validate API key against Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    // Check if API key exists and get user_id
    const keyCheckResponse = await fetch(`${supabaseUrl}/rest/v1/api_keys?api_key=eq.${apiKey}&select=user_id,name`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const keyData = await keyCheckResponse.json();
    
    if (!keyData || keyData.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API Key'
      });
    }

    const userId = keyData[0].user_id;

    // Parse request body
    const {
      amount,
      value, // alias for amount
      customer,
      description,
      billingType = 'PIX',
      externalReference,
      external_reference,
      dueDate
    } = req.body;

    const paymentAmount = amount || value;
    const extRef = externalReference || external_reference;

    // Validate required fields
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required and must be greater than 0'
      });
    }

    if (!customer || !customer.name || !customer.email) {
      return res.status(400).json({
        success: false,
        error: 'Customer name and email are required'
      });
    }

    // Get Asaas API key
    const asaasApiKey = process.env.ASAAS_API_KEY || process.env.VITE_ASAAS_API_KEY;
    
    if (!asaasApiKey) {
      return res.status(500).json({
        success: false,
        error: 'Payment gateway not configured'
      });
    }

    const ASAAS_API_URL = 'https://api.asaas.com/v3';

    // 1. Create or get customer in Asaas
    const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey
      },
      body: JSON.stringify({
        name: customer.name,
        email: customer.email,
        cpfCnpj: customer.cpfCnpj || customer.document || customer.cpf,
        mobilePhone: customer.mobilePhone || customer.phone
      })
    });

    const customerData = await customerResponse.json();
    
    // If customer already exists, use existing ID
    let customerId = customerData.id;
    if (customerData.errors && customerData.errors[0]?.code === 'invalid_cpfCnpj') {
      // Try to find existing customer
      const findCustomer = await fetch(`${ASAAS_API_URL}/customers?email=${customer.email}`, {
        headers: { 'access_token': asaasApiKey }
      });
      const foundData = await findCustomer.json();
      if (foundData.data && foundData.data.length > 0) {
        customerId = foundData.data[0].id;
      }
    }

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create customer',
        details: customerData.errors || customerData
      });
    }

    // 2. Create payment in Asaas
    const paymentPayload = {
      customer: customerId,
      billingType: billingType.toUpperCase(),
      value: paymentAmount,
      description: description || 'Pagamento via ZucroPay API',
      externalReference: extRef,
      dueDate: dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 3 days from now
    };

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey
      },
      body: JSON.stringify(paymentPayload)
    });

    const paymentData = await paymentResponse.json();

    if (!paymentData.id) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create payment',
        details: paymentData.errors || paymentData
      });
    }

    // 3. Get PIX QR Code if billing type is PIX
    let pixData = null;
    if (billingType.toUpperCase() === 'PIX') {
      const pixResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, {
        headers: { 'access_token': asaasApiKey }
      });
      pixData = await pixResponse.json();
    }

    // 4. Save payment to Supabase
    const savePayment = await fetch(`${supabaseUrl}/rest/v1/payments`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: userId,
        asaas_id: paymentData.id,
        customer_name: customer.name,
        customer_email: customer.email,
        amount: paymentAmount,
        status: paymentData.status,
        billing_type: billingType.toUpperCase(),
        external_reference: extRef,
        description: description
      })
    });

    const savedPayment = await savePayment.json();

    // 5. Build checkout URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://dashboard.appzucropay.com';

    // Return response
    return res.status(200).json({
      success: true,
      payment: {
        id: paymentData.id,
        status: paymentData.status,
        value: paymentData.value,
        billingType: paymentData.billingType,
        dueDate: paymentData.dueDate,
        invoiceUrl: paymentData.invoiceUrl,
        bankSlipUrl: paymentData.bankSlipUrl,
        externalReference: extRef,
        customer: {
          name: customer.name,
          email: customer.email
        }
      },
      pix: pixData ? {
        qrCode: pixData.encodedImage,
        qrCodeBase64: pixData.encodedImage,
        copyPaste: pixData.payload,
        expirationDate: pixData.expirationDate
      } : null,
      checkoutUrl: paymentData.invoiceUrl,
      created_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create payment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}











