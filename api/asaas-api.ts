// Vercel Serverless Function - Proxy para API do Asaas

export const config = {
  runtime: 'nodejs20.x',
};

export default async function handler(req: any, res: any) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ASAAS_API_URL = process.env.ASAAS_API_URL || process.env.VITE_ASAAS_API_URL || 'https://api.asaas.com/v3';
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY || process.env.VITE_ASAAS_API_KEY || '';

  // GET para verificar se a API está funcionando
  if (req.method === 'GET') {
    return res.status(200).json({ 
      success: true, 
      message: 'Asaas API proxy is working',
      configured: !!ASAAS_API_KEY,
      apiUrl: ASAAS_API_URL
    });
  }

  // Verificar se a API key está configurada
  if (!ASAAS_API_KEY) {
    return res.status(200).json({
      success: false,
      code: 500,
      message: 'ASAAS_API_KEY not configured. Please add it to Vercel Environment Variables.',
      data: { error: 'API key not configured' }
    });
  }

  try {
    const body = req.body || {};
    const { method, endpoint, data } = body;

    if (!method || !endpoint) {
      return res.status(200).json({ 
        success: false,
        code: 400,
        message: 'Method and endpoint are required in request body',
        data: { error: 'Missing parameters' }
      });
    }

    const url = `${ASAAS_API_URL}${endpoint}`;

    const fetchOptions: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
        'User-Agent': 'ZucroPay/1.0',
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(data);
    }

    const response = await fetch(url, fetchOptions);
    const responseData = await response.json();

    return res.status(200).json({
      code: response.status,
      data: responseData,
      success: response.ok,
    });

  } catch (error: any) {
    console.error('Error calling Asaas API:', error);
    return res.status(200).json({
      success: false,
      code: 500,
      error: error.message || 'Internal server error',
      data: { error: error.message }
    });
  }
}
