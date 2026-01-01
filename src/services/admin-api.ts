// ZucroPay Admin API Service
// Comunicação com a API de administração

import { supabase } from '../config/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Função para obter token de autenticação
const getAuthToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

// Função base para chamadas à API Admin
const callAdminAPI = async (action: string, params: Record<string, any> = {}): Promise<any> => {
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
      throw new Error('API retornou resposta vazia. Verifique se a rota /api/admin está deployada na Vercel.');
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Resposta inválida da API:', responseText);
      throw new Error('Resposta inválida da API Admin. Verifique os logs na Vercel.');
    }

    if (!result.success) {
      throw new Error(result.message || 'Erro na API Admin');
    }

    return result;
  } catch (error: any) {
    console.error('[Admin API] Erro:', error);
    throw error;
  }
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
  return callAdminAPI('getVerifications', params);
};

export const approveVerification = async (verificationId: string) => {
  return callAdminAPI('approveVerification', { verificationId });
};

export const rejectVerification = async (verificationId: string, reason: string) => {
  return callAdminAPI('rejectVerification', { verificationId, reason });
};

// ========================================
// SAQUES
// ========================================

export interface GetWithdrawalsParams {
  status?: string;
}

export const getWithdrawals = async (params: GetWithdrawalsParams = {}) => {
  return callAdminAPI('getWithdrawals', params);
};

export const approveWithdrawal = async (withdrawalId: string) => {
  return callAdminAPI('approveWithdrawal', { withdrawalId });
};

export const rejectWithdrawal = async (withdrawalId: string, reason: string) => {
  return callAdminAPI('rejectWithdrawal', { withdrawalId, reason });
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
  blockUserWithdrawals,
  unblockUserWithdrawals,
  getSales,
  getTransactions,
  checkIsAdmin,
};

