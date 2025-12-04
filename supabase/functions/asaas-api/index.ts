// Supabase Edge Function para chamadas à API do Asaas
// Deploy: supabase functions deploy asaas-api

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuração do Asaas
const ASAAS_API_URL = Deno.env.get('ASAAS_API_URL') || 'https://api.asaas.com/v3';
const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || '';

interface AsaasRequestParams {
  method: string;
  endpoint: string;
  data?: any;
  userApiKey?: string; // API key específica do usuário
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Authorization required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Pegar API key do usuário (se configurada) ou usar a padrão
    const { data: userData } = await supabaseClient
      .from('users')
      .select('asaas_api_key')
      .eq('id', user.id)
      .single();

    const apiKey = userData?.asaas_api_key || ASAAS_API_KEY;

    // Processar requisição
    const params: AsaasRequestParams = await req.json();
    const result = await asaasRequest(
      params.method,
      params.endpoint,
      params.data,
      apiKey
    );

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing Asaas API request:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function asaasRequest(
  method: string,
  endpoint: string,
  data?: any,
  apiKey?: string
): Promise<any> {
  const url = `${ASAAS_API_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'access_token': apiKey || ASAAS_API_KEY,
    'User-Agent': 'ZucroPay/1.0',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.json();

    return {
      code: response.status,
      data: responseData,
      success: response.ok,
    };
  } catch (error) {
    return {
      code: 0,
      data: { error: error.message },
      success: false,
    };
  }
}

