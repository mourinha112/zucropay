// Serviço de cache para dados - elimina delay de carregamento
import { getAuthToken } from './api-supabase';

const API_URL = import.meta.env.VITE_API_URL || '';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface CacheConfig {
  ttl: number; // Time to live in ms
  staleWhileRevalidate: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
  ttl: 60000, // 1 minuto
  staleWhileRevalidate: true,
};

// Cache em memória
const memoryCache = new Map<string, CacheEntry<any>>();

// Prefetch queue
const prefetchQueue = new Set<string>();
let isPrefetching = false;

// Função genérica de fetch com cache
async function fetchWithCache<T>(
  key: string,
  url: string,
  config: Partial<CacheConfig> = {}
): Promise<T> {
  const { ttl, staleWhileRevalidate } = { ...DEFAULT_CONFIG, ...config };
  const cached = memoryCache.get(key);
  const now = Date.now();

  // Se tem cache válido, retorna imediatamente
  if (cached && now < cached.expiry) {
    return cached.data;
  }

  // Se tem cache expirado mas staleWhileRevalidate está ativo
  if (cached && staleWhileRevalidate) {
    // Revalida em background
    revalidateInBackground(key, url, ttl);
    return cached.data;
  }

  // Fetch novo
  const data = await fetchData<T>(url);
  memoryCache.set(key, { data, timestamp: now, expiry: now + ttl });
  return data;
}

async function fetchData<T>(url: string): Promise<T> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Token não disponível');
  }
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

async function revalidateInBackground(key: string, url: string, ttl: number) {
  try {
    const data = await fetchData(url);
    memoryCache.set(key, { data, timestamp: Date.now(), expiry: Date.now() + ttl });
  } catch (error) {
    console.error(`[Cache] Revalidation failed for ${key}:`, error);
  }
}

// ==========================================
// APIs ESPECÍFICAS COM CACHE
// ==========================================

// Produtos - cache de 1 minuto
export async function getProducts() {
  return fetchWithCache('products', `${API_URL}/api/produtos-data`, { ttl: 60000 });
}

// Dashboard - cache de 30 segundos
export async function getDashboard() {
  return fetchWithCache('dashboard', `${API_URL}/api/dashboard-data`, { ttl: 30000 });
}

// Vendas - cache de 30 segundos
export async function getVendas(params?: string) {
  const url = params ? `${API_URL}/api/vendas-data?${params}` : `${API_URL}/api/vendas-data`;
  return fetchWithCache(`vendas-${params || 'default'}`, url, { ttl: 30000 });
}

// ==========================================
// PREFETCH - Carrega dados antes de precisar
// ==========================================

export function prefetch(keys: string[]) {
  keys.forEach(key => prefetchQueue.add(key));
  processPrefetchQueue();
}

async function processPrefetchQueue() {
  if (isPrefetching || prefetchQueue.size === 0) return;
  
  isPrefetching = true;
  
  const keyToUrl: Record<string, string> = {
    products: `${API_URL}/api/produtos-data`,
    dashboard: `${API_URL}/api/dashboard-data`,
    vendas: `${API_URL}/api/vendas-data`,
  };
  
  for (const key of prefetchQueue) {
    const url = keyToUrl[key];
    if (url && !memoryCache.has(key)) {
      try {
        const data = await fetchData(url);
        memoryCache.set(key, { 
          data, 
          timestamp: Date.now(), 
          expiry: Date.now() + 60000 
        });
        console.log(`[Prefetch] ${key} loaded`);
      } catch (error) {
        console.error(`[Prefetch] Failed to load ${key}:`, error);
      }
    }
    prefetchQueue.delete(key);
  }
  
  isPrefetching = false;
}

// Prefetch inicial ao fazer login
export function prefetchOnLogin() {
  setTimeout(() => {
    prefetch(['dashboard', 'products', 'vendas']);
  }, 500); // Aguarda um pouco para não sobrecarregar
}

// ==========================================
// INVALIDAÇÃO DE CACHE
// ==========================================

export function invalidateCache(key?: string) {
  if (key) {
    memoryCache.delete(key);
  } else {
    memoryCache.clear();
  }
}

// Invalida e recarrega
export async function invalidateAndRefetch(key: string) {
  invalidateCache(key);
  prefetch([key]);
}

// ==========================================
// HOOKS HELPERS
// ==========================================

// Verifica se tem dados em cache
export function hasCache(key: string): boolean {
  const cached = memoryCache.get(key);
  return !!(cached && Date.now() < cached.expiry);
}

// Pega dados do cache diretamente (sem fetch)
export function getCached<T>(key: string): T | null {
  const cached = memoryCache.get(key);
  if (cached) {
    return cached.data;
  }
  return null;
}

export default {
  getProducts,
  getDashboard,
  getVendas,
  prefetch,
  prefetchOnLogin,
  invalidateCache,
  invalidateAndRefetch,
  hasCache,
  getCached,
};
