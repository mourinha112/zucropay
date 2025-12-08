// ============================================
// 🔧 CONFIGURAÇÃO DO SUPABASE
// ============================================

import { createClient } from '@supabase/supabase-js';

// ============================================
// 📍 CONFIGURAÇÕES DO SUPABASE
// ============================================

// ⚠️ IMPORTANTE: Acesso direto para garantir que o Vite substitua os valores no build
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Função para limpar as variáveis (remove espaços, aspas e caracteres invisíveis)
const cleanEnv = (value: any): string => {
  if (!value) return '';
  
  let clean = String(value);
  
  // Remove caracteres não imprimíveis (invisíveis, quebras de linha, etc)
  clean = clean.replace(/[^\x20-\x7E]/g, '');
  
  clean = clean.trim();
  
  // Remove aspas duplas ou simples do início e fim
  if ((clean.startsWith('"') && clean.endsWith('"')) || 
      (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1);
  }
  
  return clean;
};

const cleanUrl = cleanEnv(rawUrl);
const cleanKey = cleanEnv(rawKey);

const DEFAULT_URL = 'https://your-project.supabase.co';
const DEFAULT_KEY = 'your-anon-key';

// Usa a variável limpa ou o fallback
const SUPABASE_URL = (cleanUrl && cleanUrl.length > 0) ? cleanUrl : DEFAULT_URL;
const SUPABASE_ANON_KEY = (cleanKey && cleanKey.length > 0) ? cleanKey : DEFAULT_KEY;

// ============================================
// 🔐 CLIENTE SUPABASE
// ============================================

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'ZucroPay',
    },
  },
});

// ============================================
// 🌐 CONFIGURAÇÃO DE ASAAS
// ============================================

export const ASAAS_API_KEY = import.meta.env.VITE_ASAAS_API_KEY || '';
export const ASAAS_API_URL = import.meta.env.VITE_ASAAS_API_URL || 'https://api.asaas.com/v3';

// URL das API Functions (Vercel Serverless)
// Em produção usa /api, em desenvolvimento pode usar Edge Functions do Supabase
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// URL das Edge Functions (legado - não usado mais)
export const EDGE_FUNCTIONS_URL = import.meta.env.VITE_EDGE_FUNCTIONS_URL || 
  `${SUPABASE_URL}/functions/v1`;

// ============================================
// 🔧 FUNÇÕES AUXILIARES
// ============================================

/**
 * Verificar se o Supabase está configurado corretamente
 */
export const isSupabaseConfigured = (): boolean => {
  return SUPABASE_URL !== DEFAULT_URL && 
         SUPABASE_ANON_KEY !== DEFAULT_KEY &&
         SUPABASE_URL.startsWith('http');
};

/**
 * Obter sessão atual do usuário
 */
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

/**
 * Obter token de autenticação
 */
export const getAuthToken = async (): Promise<string | null> => {
  const session = await getCurrentSession();
  return session?.access_token || null;
};

/**
 * Verificar se usuário está autenticado
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getCurrentSession();
  return !!session;
};

/**
 * Chamar Edge Function do Supabase
 */
export const callEdgeFunction = async (
  functionName: string,
  data?: any,
  options?: RequestInit
): Promise<Response> => {
  const token = await getAuthToken();

  const response = await fetch(`${EDGE_FUNCTIONS_URL}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });

  return response;
};

/**
 * Chamar API do Asaas via Vercel Serverless Function
 */
export const callAsaasAPI = async (
  method: string,
  endpoint: string,
  data?: any
): Promise<any> => {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}/asaas-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      method,
      endpoint,
      data,
    }),
  });

  if (!response.ok) {
    throw new Error(`Asaas API error: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Upload de arquivo para Supabase Storage
 */
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string; path: string }> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    url: publicUrl,
    path: data.path,
  };
};

/**
 * Deletar arquivo do Supabase Storage
 */
export const deleteFile = async (
  bucket: string,
  path: string
): Promise<void> => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
};

// Debug em desenvolvimento
if (import.meta.env.DEV) {
  console.log('🔧 Supabase Config:', {
    url: SUPABASE_URL,
    configured: isSupabaseConfigured()
  });
}

export default supabase;
