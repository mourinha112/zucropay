// ZucroPay Admin API Service
// Comunicação com a API de administração
// Com fallback para serviço local quando a API serverless não está disponível

import { supabase } from '../config/supabase';
import * as adminLocal from './admin-local';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Flag para usar serviço local (ativa automaticamente se API não estiver disponível)
let useLocalService = false;

// Função para obter token de autenticação
const getAuthToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

// Mapeamento de ações para funções locais
const localActionMap: Record<string, (params: any) => Promise<any>> = {
  getStats: () => adminLocal.getStats(),
  getAdvancedStats: () => adminLocal.getAdvancedStats(),
  getUsers: (p) => adminLocal.getUsers(p),
  approveUser: (p) => adminLocal.approveUser(p.userId),
  rejectUser: (p) => adminLocal.rejectUser(p.userId, p.reason),
  suspendUser: (p) => adminLocal.suspendUser(p.userId, p.reason),
  blockUser: (p) => adminLocal.blockUser(p.userId, p.reason),
  getVerifications: (p) => adminLocal.getVerifications(p),
  approveVerification: (p) => adminLocal.approveVerification(p.verificationId),
  rejectVerification: (p) => adminLocal.rejectVerification(p.verificationId, p.reason),
  getWithdrawals: (p) => adminLocal.getWithdrawals(p),
  approveWithdrawal: (p) => adminLocal.approveWithdrawal(p.withdrawalId),
  rejectWithdrawal: (p) => adminLocal.rejectWithdrawal(p.withdrawalId, p.reason),
  getSales: (p) => adminLocal.getSales(p),
  getTransactions: (p) => adminLocal.getTransactions(p),
  getAllProducts: (p) => adminLocal.getAllProducts(p),
  getAllApiKeys: (p) => adminLocal.getAllApiKeys(p),
  getAllPaymentLinks: (p) => adminLocal.getAllPaymentLinks(p),
  getWebhookLogs: (p) => adminLocal.getWebhookLogs(p),
  getAdminLogs: (p) => adminLocal.getAdminLogs(p),
  getUserDetails: (p) => adminLocal.getUserDetails(p.userId),
  adjustUserBalance: (p) => adminLocal.adjustUserBalance(p),
  getGatewayConfig: () => adminLocal.getGatewayConfig(),
};

// Função base para chamadas à API Admin (com fallback local)
const callAdminAPI = async (action: string, params: Record<string, any> = {}): Promise<any> => {
  // Se já sabemos que devemos usar local, pula a API
  if (useLocalService) {
    return callLocalService(action, params);
  }

  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('Não autenticado');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...params }),
    });

    // Verificar se a resposta está vazia
    const responseText = await response.text();
    
    if (!responseText) {
      console.log('[Admin API] API retornou vazia, usando serviço local');
      useLocalService = true;
      return callLocalService(action, params);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Resposta inválida da API:', responseText);
      console.log('[Admin API] Resposta inválida, usando serviço local');
      useLocalService = true;
      return callLocalService(action, params);
    }

    if (!result.success) {
      throw new Error(result.message || 'Erro na API Admin');
    }

    return result;
  } catch (error: any) {
    // Se é erro de rede ou API não disponível, usar serviço local
    if (error.message?.includes('API retornou resposta vazia') || 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError')) {
      console.log('[Admin API] API não disponível, usando serviço local');
      useLocalService = true;
      return callLocalService(action, params);
    }
    console.error('[Admin API] Erro:', error);
    throw error;
  }
};

// Chamar serviço local
const callLocalService = async (action: string, params: Record<string, any>): Promise<any> => {
  const handler = localActionMap[action];
  
  if (!handler) {
    throw new Error(`Ação não suportada no serviço local: ${action}`);
  }

  console.log(`[Admin API] Executando ${action} localmente`);
  return handler(params);
};

// ========================================
// ESTATÍSTICAS
// ========================================

export const getStats = async () => {
  return callAdminAPI('getStats');
};

// ========================================
// USUÁRIOS
// ========================================

export interface GetUsersParams {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const getUsers = async (params: GetUsersParams = {}) => {
  return callAdminAPI('getUsers', params);
};

export const approveUser = async (userId: string) => {
  return callAdminAPI('approveUser', { userId });
};

export const rejectUser = async (userId: string, reason: string) => {
  return callAdminAPI('rejectUser', { userId, reason });
};

export const suspendUser = async (userId: string, reason: string) => {
  return callAdminAPI('suspendUser', { userId, reason });
};

export const blockUser = async (userId: string, reason: string) => {
  return callAdminAPI('blockUser', { userId, reason });
};

// ========================================
// VERIFICAÇÕES DE IDENTIDADE
// ========================================

export interface GetVerificationsParams {
  status?: string;
}

export const getVerifications = async (params: GetVerificationsParams = {}) => {
  // Chamar API serverless diretamente
  const token = await getAuthToken();
  if (!token) throw new Error('Não autenticado');
  
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  
  const response = await fetch(`${API_BASE_URL}/admin-verifications?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const result = await response.json();
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
};

export const approveVerification = async (verificationId: string) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Não autenticado');
  
  const response = await fetch(`${API_BASE_URL}/admin-verifications`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ verification_id: verificationId, action: 'approve' }),
  });
  
  const result = await response.json();
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
};

export const rejectVerification = async (verificationId: string, reason: string) => {
  const token = await getAuthToken();
  if (!token) throw new Error('Não autenticado');
  
  const response = await fetch(`${API_BASE_URL}/admin-verifications`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ verification_id: verificationId, action: 'reject', rejection_reason: reason }),
  });
  
  const result = await response.json();
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
};

// ========================================
// SAQUES
// ========================================

export interface GetWithdrawalsParams {
  status?: string;
}

export const getWithdrawals = async (params: GetWithdrawalsParams = {}) => {
  // Chamar API serverless diretamente
  const token = await getAuthToken();
  if (!token) throw new Error('Não autenticado');
  
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  
  const response = await fetch(`${API_BASE_URL}/admin-withdrawals?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const result = await response.json();
  if (!result.success && result.error) {
    throw new Error(result.error);
  }
  return result;
};

export const approveWithdrawal = async (withdrawalId: string) => {
  // Chamar API serverless diretamente para PIX automático
  const token = await getAuthToken();
  if (!token) throw new Error('Não autenticado');
  
  const response = await fetch(`${API_BASE_URL}/admin-withdrawals`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ withdrawalId, action: 'approve' }),
  });
  
  const result = await response.json();
  if (!result.success && result.error) {
    throw new Error(result.error);
  }
  return result;
};

export const rejectWithdrawal = async (withdrawalId: string, reason: string) => {
  // Chamar API serverless diretamente
  const token = await getAuthToken();
  if (!token) throw new Error('Não autenticado');
  
  const response = await fetch(`${API_BASE_URL}/admin-withdrawals`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ withdrawalId, action: 'reject', rejectionReason: reason }),
  });
  
  const result = await response.json();
  if (!result.success && result.error) {
    throw new Error(result.error);
  }
  return result;
};

export const completeWithdrawal = async (withdrawalId: string) => {
  // Marcar saque como concluído após transferência manual
  const token = await getAuthToken();
  if (!token) throw new Error('Não autenticado');
  
  const response = await fetch(`${API_BASE_URL}/admin-withdrawals`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ withdrawalId, action: 'complete' }),
  });
  
  const result = await response.json();
  if (!result.success && result.error) {
    throw new Error(result.error);
  }
  return result;
};

export const blockUserWithdrawals = async (userId: string, reason: string) => {
  return callAdminAPI('blockUserWithdrawals', { userId, reason });
};

export const unblockUserWithdrawals = async (userId: string) => {
  return callAdminAPI('unblockUserWithdrawals', { userId });
};

// ========================================
// VENDAS
// ========================================

export interface GetSalesParams {
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export const getSales = async (params: GetSalesParams = {}) => {
  return callAdminAPI('getSales', params);
};

// ========================================
// TRANSAÇÕES
// ========================================

export interface GetTransactionsParams {
  type?: string;
  status?: string;
  limit?: number;
}

export const getTransactions = async (params: GetTransactionsParams = {}) => {
  return callAdminAPI('getTransactions', params);
};

// ========================================
// PRODUTOS (ADMIN)
// ========================================

export interface GetAllProductsParams {
  userId?: string;
  active?: boolean;
  search?: string;
  limit?: number;
}

export const getAllProducts = async (params: GetAllProductsParams = {}) => {
  return callAdminAPI('getAllProducts', params);
};

// ========================================
// WEBHOOK LOGS
// ========================================

export interface GetWebhookLogsParams {
  eventType?: string;
  processed?: boolean;
  limit?: number;
}

export const getWebhookLogs = async (params: GetWebhookLogsParams = {}) => {
  return callAdminAPI('getWebhookLogs', params);
};

// ========================================
// ADMIN LOGS
// ========================================

export interface GetAdminLogsParams {
  action?: string;
  targetType?: string;
  limit?: number;
}

export const getAdminLogs = async (params: GetAdminLogsParams = {}) => {
  return callAdminAPI('getAdminLogs', params);
};

// ========================================
// DETALHES DO USUÁRIO
// ========================================

export const getUserDetails = async (userId: string) => {
  return callAdminAPI('getUserDetails', { userId });
};

// ========================================
// AJUSTAR SALDO
// ========================================

export interface AdjustBalanceParams {
  userId: string;
  amount: number;
  type: 'add' | 'subtract' | 'set';
  reason: string;
}

export const adjustUserBalance = async (params: AdjustBalanceParams) => {
  return callAdminAPI('adjustUserBalance', params);
};

// ========================================
// CONFIGURAÇÕES DO GATEWAY
// ========================================

export const getGatewayConfig = async () => {
  return callAdminAPI('getGatewayConfig');
};

// ========================================
// API KEYS DOS USUÁRIOS
// ========================================

export interface GetAllApiKeysParams {
  userId?: string;
  status?: string;
  limit?: number;
}

export const getAllApiKeys = async (params: GetAllApiKeysParams = {}) => {
  return callAdminAPI('getAllApiKeys', params);
};

// ========================================
// LINKS DE PAGAMENTO
// ========================================

export interface GetAllPaymentLinksParams {
  userId?: string;
  active?: boolean;
  limit?: number;
}

export const getAllPaymentLinks = async (params: GetAllPaymentLinksParams = {}) => {
  return callAdminAPI('getAllPaymentLinks', params);
};

// ========================================
// ESTATÍSTICAS AVANÇADAS
// ========================================

export interface GetAdvancedStatsParams {
  startDate?: string;
  endDate?: string;
}

export const getAdvancedStats = async (params: GetAdvancedStatsParams = {}) => {
  return callAdminAPI('getAdvancedStats', params);
};

// ========================================
// VERIFICAR SE É ADMIN
// ========================================

export const checkIsAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const { data: admin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    return !!admin;
  } catch {
    return false;
  }
};

export default {
  getStats,
  getUsers,
  approveUser,
  rejectUser,
  suspendUser,
  blockUser,
  getVerifications,
  approveVerification,
  rejectVerification,
  getWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  completeWithdrawal,
  blockUserWithdrawals,
  unblockUserWithdrawals,
  getSales,
  getTransactions,
  getAllProducts,
  getWebhookLogs,
  getAdminLogs,
  getUserDetails,
  adjustUserBalance,
  getGatewayConfig,
  getAllApiKeys,
  getAllPaymentLinks,
  getAdvancedStats,
  checkIsAdmin,
};

