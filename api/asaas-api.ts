// Vercel Serverless Function - Proxy para API do Asaas

export default async function handler(req: any, res: any) {
  // Headers CORS - sempre definir primeiro
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200);
    return res.end();
  }

  // Wrap tudo em try-catch para nunca retornar vazio
  try {
    const ASAAS_API_URL = process.env.ASAAS_API_URL || process.env.VITE_ASAAS_API_URL || 'https://api.asaas.com/v3';
    const ASAAS_API_KEY = process.env.ASAAS_API_KEY || process.env.VITE_ASAAS_API_KEY || '';

    // GET para verificar se a API está funcionando
    if (req.method === 'GET') {
      return res.status(200).json({ 
        success: true, 
        message: 'Asaas API proxy is working',
        configured: !!ASAAS_API_KEY,
        keyLength: ASAAS_API_KEY ? ASAAS_API_KEY.length : 0,
        apiUrl: ASAAS_API_URL
      });
    }

    // Verificar se a API key está configurada
    if (!ASAAS_API_KEY) {
      return res.status(200).json({
        success: false,
        code: 500,
        message: 'ASAAS_API_KEY não configurada. Adicione nas Environment Variables da Vercel.',
        data: { error: 'API key not configured' }
      });
    }

    // Parse do body
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(200).json({
          success: false,
          code: 400,
          message: 'Invalid JSON in request body',
          data: { error: 'Invalid JSON' }
        });
      }
    }

    const { method, endpoint, data } = body || {};

    if (!method || !endpoint) {
      return res.status(200).json({ 
        success: false,
        code: 400,
        message: 'method e endpoint são obrigatórios no body da requisição',
        data: { error: 'Missing parameters', received: body }
      });
    }

    const url = `${ASAAS_API_URL}${endpoint}`;
    console.log(`[Asaas API] ${method} ${url}`);

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
    
    // Tentar parsear como JSON, mas se falhar, retornar o texto
    let responseData;
    const responseText = await response.text();
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }

    console.log(`[Asaas API] Response: ${response.status}`);

    return res.status(200).json({
      code: response.status,
      data: responseData,
      success: response.ok,
    });

  } catch (error: any) {
    console.error('[Asaas API] Error:', error);
    return res.status(200).json({
      success: false,
      code: 500,
      message: error.message || 'Internal server error',
      error: error.message,
      data: { error: error.message }
    });
  }
}
