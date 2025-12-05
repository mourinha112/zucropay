// ============================================
// 🔧 CONFIGURAÇÃO DO SUPABASE
// ============================================

import { createClient } from '@supabase/supabase-js';

// ============================================
// 📍 CONFIGURAÇÕES DO SUPABASE
// Cole aqui as credenciais do seu projeto Supabase
// ============================================

// Helper para pegar variável de ambiente limpa (sem espaços extras)
const getEnvVar = (key: string, defaultValue: string): string => {
  const value = import.meta.env[key];
  return value ? String(value).trim() : defaultValue;
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL', 'https://your-project.supabase.co');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY', 'your-anon-key');

// Validação de URL para evitar erro "Invalid value" no fetch
try {
  new URL(SUPABASE_URL);
} catch (e) {
  console.error('❌ URL do Supabase INVÁLIDA:', SUPABASE_URL);
}

if (import.meta.env.DEV) {
  console.log('🔧 Supabase Config:', {
    url: SUPABASE_URL,
    keyLength: SUPABASE_ANON_KEY.length,
    isDefault: SUPABASE_URL === 'https://your-project.supabase.co'
  });
}

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

// Chave API do Asaas (pode ser sobrescrita por usuário)
export const ASAAS_API_KEY = import.meta.env.VITE_ASAAS_API_KEY || '';
export const ASAAS_API_URL = import.meta.env.VITE_ASAAS_API_URL || 'https://api.asaas.com/v3';

// URL das Edge Functions
export const EDGE_FUNCTIONS_URL = import.meta.env.VITE_EDGE_FUNCTIONS_URL || 
  `${SUPABASE_URL}/functions/v1`;

// ============================================
// 🔧 FUNÇÕES AUXILIARES
// ============================================

/**
 * Verificar se o Supabase está configurado corretamente
 */
export const isSupabaseConfigured = (): boolean => {
  return SUPABASE_URL !== 'https://your-project.supabase.co' && 
         SUPABASE_ANON_KEY !== 'your-anon-key';
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
 * Chamar API do Asaas via Edge Function
 */
export const callAsaasAPI = async (
  method: string,
  endpoint: string,
  data?: any
): Promise<any> => {
  const response = await callEdgeFunction('asaas-api', {
    method,
    endpoint,
    data,
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

// ============================================
// 📊 TIPOS AUXILIARES
// ============================================

export interface Database {
  public: {
    Tables: {
      users: any;
      products: any;
      payments: any;
      transactions: any;
      // ... adicione outros tipos conforme necessário
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T];

export default supabase;

