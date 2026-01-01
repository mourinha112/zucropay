// Vercel Serverless Function - Check Payment Status
// Endpoint: GET /api/check-payment?id=xxx

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use GET.' 
    });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID is required'
      });
    }

    // Get API key from header
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API Key is required'
      });
    }

    // Validate API key
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    const keyCheckResponse = await fetch(`${supabaseUrl}/rest/v1/api_keys?api_key=eq.${apiKey}&select=user_id`, {
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

    // Get Asaas API key
    const asaasApiKey = process.env.ASAAS_API_KEY || process.env.VITE_ASAAS_API_KEY;
    
    if (!asaasApiKey) {
      return res.status(500).json({
        success: false,
        error: 'Payment gateway not configured'
      });
    }

    // Check payment status in Asaas
    const paymentResponse = await fetch(`https://api.asaas.com/v3/payments/${id}`, {
      headers: { 'access_token': asaasApiKey }
    });

    const paymentData = await paymentResponse.json();

    if (paymentData.errors) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    return res.status(200).json({
      success: true,
      payment: {
        id: paymentData.id,
        status: paymentData.status,
        value: paymentData.value,
        billingType: paymentData.billingType,
        dueDate: paymentData.dueDate,
        paymentDate: paymentData.paymentDate,
        confirmedDate: paymentData.confirmedDate,
        externalReference: paymentData.externalReference,
        invoiceUrl: paymentData.invoiceUrl
      }
    });

  } catch (error) {
    console.error('Check payment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}




