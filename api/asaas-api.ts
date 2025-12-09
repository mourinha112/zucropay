// Vercel Serverless Function - Proxy para API do Asaas
// Substitui a Edge Function do Supabase

import type { VercelRequest, VercelResponse } from '@vercel/node';

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
    return res.status(500).json({
      success: false,
      message: 'ASAAS_API_KEY not configured. Please add it to Vercel Environment Variables.'
    });
  }

  try {
    const { method, endpoint, data } = req.body || {};

    if (!method || !endpoint) {
      return res.status(400).json({ 
        success: false, 
        message: 'Method and endpoint are required in request body' 
      });
    }

    const url = `${ASAAS_API_URL}${endpoint}`;

    const fetchOptions: RequestInit = {
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
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

