// ZucroPay Admin Local Service
// Implementação local para desenvolvimento usando diretamente o Supabase
// Usado como fallback quando a API serverless não está disponível

import { supabase } from '../config/supabase';

// Verificar se usuário é admin
export const verifyIsAdmin = async (): Promise<{ isAdmin: boolean; adminId: string | null; userId: string | null }> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { isAdmin: false, adminId: null, userId: null };
  }

  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .single();

  // Se a tabela não existe ou não há admin, tenta criar automaticamente em dev
  if (error && (error.code === 'PGRST116' || error.code === '42P01')) {
    // Verificar se é modo de desenvolvimento
    const isDev = import.meta.env.DEV;
    
    if (isDev) {
      console.log('[Admin Local] Modo dev detectado. Tentando criar admin automaticamente...');
      
      // Tenta inserir o usuário como admin
      const { data: newAdmin, error: insertError } = await supabase
        .from('admin_users')
        .insert({
          user_id: user.id,
          role: 'super_admin',
          permissions: ['view_users', 'approve_users', 'reject_users', 'verify_identity', 'manage_withdrawals', 'block_users', 'view_stats', 'manage_admins']
        })
        .select('id')
        .single();

      if (!insertError && newAdmin) {
        console.log('[Admin Local] Admin criado automaticamente:', newAdmin.id);
        return { isAdmin: true, adminId: newAdmin.id, userId: user.id };
      } else {
        console.log('[Admin Local] Não foi possível criar admin:', insertError?.message);
      }
    }
  }

  return { isAdmin: !!admin, adminId: admin?.id || null, userId: user.id };
};

// Função para promover usuário a admin (para setup inicial)
export const promoteToAdmin = async (userId?: string): Promise<{ success: boolean; message: string }> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, message: 'Usuário não autenticado' };
  }

  const targetUserId = userId || user.id;

  // Verificar se já é admin
  const { data: existingAdmin } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', targetUserId)
    .single();

  if (existingAdmin) {
    return { success: true, message: 'Usuário já é administrador' };
  }

  // Inserir como admin
  const { error } = await supabase
    .from('admin_users')
    .insert({
      user_id: targetUserId,
      role: 'super_admin',
      permissions: ['view_users', 'approve_users', 'reject_users', 'verify_identity', 'manage_withdrawals', 'block_users', 'view_stats', 'manage_admins']
    });

  if (error) {
    return { success: false, message: `Erro ao promover usuário: ${error.message}` };
  }

  return { success: true, message: 'Usuário promovido a administrador com sucesso!' };
};

// ========================================
// ESTATÍSTICAS
// ========================================

export const getStats = async () => {
  const { isAdmin } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  // Total de usuários
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  // Usuários pendentes
  const { count: pendingUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pendente');

  // Usuários aprovados
  const { count: approvedUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'aprovado');

  // Total de vendas
  const { data: salesData } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'paid');

  const totalSales = salesData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  // Vendas hoje
  const today = new Date().toISOString().split('T')[0];
  const { data: todaySalesData } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'paid')
    .gte('created_at', today);

  const todaySales = todaySalesData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  // Total de transações
  const { count: totalTransactions } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });

  // Saques pendentes
  const { count: pendingWithdrawals, data: pendingWithdrawalsData } = await supabase
    .from('withdrawals')
    .select('*', { count: 'exact' })
    .eq('status', 'pending');
  
  const pendingWithdrawalsAmount = pendingWithdrawalsData?.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0) || 0;

  return {
    success: true,
    stats: {
      users: {
        total: totalUsers || 0,
        pending: pendingUsers || 0,
        approved: approvedUsers || 0,
      },
      sales: {
        total: totalSales,
        today: todaySales,
      },
      transactions: {
        total: totalTransactions || 0,
      },
      withdrawals: {
        pending: pendingWithdrawals || 0,
        pendingAmount: pendingWithdrawalsAmount,
        completed: 0,
      },
      verifications: {
        pending: 0,
      },
    }
  };
};

// ========================================
// ESTATÍSTICAS AVANÇADAS
// ========================================

export const getAdvancedStats = async () => {
  const { isAdmin } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  // Vendas por dia dos últimos 30 dias
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: salesByDay } = await supabase
    .from('payments')
    .select('amount, created_at')
    .eq('status', 'paid')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  // Agrupar por dia
  const dailyStats: Record<string, { date: string; total: number; count: number }> = {};
  salesByDay?.forEach(sale => {
    const date = sale.created_at.split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { date, total: 0, count: 0 };
    }
    dailyStats[date].total += sale.amount || 0;
    dailyStats[date].count += 1;
  });

  // Vendas por status
  const { data: statusCounts } = await supabase
    .from('payments')
    .select('status');

  const salesByStatus: Record<string, number> = {};
  statusCounts?.forEach(p => {
    salesByStatus[p.status] = (salesByStatus[p.status] || 0) + 1;
  });

  // Top produtos
  const { data: productSales } = await supabase
    .from('payments')
    .select(`
      amount,
      product:products(name)
    `)
    .eq('status', 'paid')
    .limit(100);

  const productStats: Record<string, { name: string; total: number; count: number }> = {};
  productSales?.forEach(sale => {
    const productName = (sale.product as any)?.name || 'Desconhecido';
    if (!productStats[productName]) {
      productStats[productName] = { name: productName, total: 0, count: 0 };
    }
    productStats[productName].total += sale.amount || 0;
    productStats[productName].count += 1;
  });

  const topProducts = Object.values(productStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    success: true,
    data: {
      dailyStats: Object.values(dailyStats),
      salesByStatus,
      topProducts,
    }
  };
};

// ========================================
// USUÁRIOS
// ========================================

export const getUsers = async (params: { search?: string; status?: string; limit?: number; offset?: number } = {}) => {
  const { isAdmin } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  let query = supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,cpf_cnpj.ilike.%${params.search}%`);
  }

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }

  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
  }

  const { data: users, error } = await query;

  if (error) throw error;

  return {
    success: true,
    users: users || []
  };
};

export const approveUser = async (userId: string) => {
  const { isAdmin, adminId } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  const { error } = await supabase
    .from('users')
    .update({ status: 'aprovado', updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;

  // Log da ação
  await logAdminAction(adminId!, 'approve_user', 'user', userId);

  return { success: true, message: 'Usuário aprovado com sucesso' };
};

export const rejectUser = async (userId: string, reason: string) => {
  const { isAdmin, adminId } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  const { error } = await supabase
    .from('users')
    .update({ 
      status: 'rejeitado', 
      rejection_reason: reason,
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);

  if (error) throw error;

  await logAdminAction(adminId!, 'reject_user', 'user', userId, { reason });

  return { success: true, message: 'Usuário rejeitado' };
};

export const suspendUser = async (userId: string, reason: string) => {
  const { isAdmin, adminId } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  const { error } = await supabase
    .from('users')
    .update({ 
      status: 'suspenso', 
      suspension_reason: reason,
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);

  if (error) throw error;

  await logAdminAction(adminId!, 'suspend_user', 'user', userId, { reason });

  return { success: true, message: 'Usuário suspenso' };
};

export const blockUser = async (userId: string, reason: string) => {
  const { isAdmin, adminId } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  const { error } = await supabase
    .from('users')
    .update({ 
      status: 'bloqueado', 
      block_reason: reason,
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);

  if (error) throw error;

  await logAdminAction(adminId!, 'block_user', 'user', userId, { reason });

  return { success: true, message: 'Usuário bloqueado' };
};

// ========================================
// VERIFICAÇÕES
// ========================================

export const getVerifications = async (params: { status?: string } = {}) => {
  const { isAdmin } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  let query = supabase
    .from('user_verifications')
    .select(`
      *,
      user:users(name, email, cpf_cnpj)
    `)
    .order('created_at', { ascending: false });

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  const { data: verifications, error } = await query;

  if (error) throw error;

  return {
    success: true,
    verifications: verifications || []
  };
};

export const approveVerification = async (verificationId: string) => {
  const { isAdmin, adminId } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  const { data: verification, error: fetchError } = await supabase
    .from('user_verifications')
    .select('user_id')
    .eq('id', verificationId)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from('user_verifications')
    .update({ 
      status: 'approved', 
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId
    })
    .eq('id', verificationId);

  if (error) throw error;

  // Atualizar usuário para verificado
  await supabase
    .from('users')
    .update({ 
      is_verified: true,
      status: 'aprovado',
      updated_at: new Date().toISOString()
    })
    .eq('id', verification.user_id);

  await logAdminAction(adminId!, 'approve_verification', 'verification', verificationId);

  return { success: true, message: 'Verificação aprovada' };
};

export const rejectVerification = async (verificationId: string, reason: string) => {
  const { isAdmin, adminId } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  const { error } = await supabase
    .from('user_verifications')
    .update({ 
      status: 'rejected', 
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId
    })
    .eq('id', verificationId);

  if (error) throw error;

  await logAdminAction(adminId!, 'reject_verification', 'verification', verificationId, { reason });

  return { success: true, message: 'Verificação rejeitada' };
};

// ========================================
// SAQUES
// ========================================

export const getWithdrawals = async (params: { status?: string } = {}) => {
  const { isAdmin } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  let query = supabase
    .from('withdrawals')
    .select(`
      *,
      users:user_id(name, email, cpf_cnpj)
    `)
    .order('created_at', { ascending: false });

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  const { data: withdrawals, error } = await query;

  if (error) throw error;

  return {
    success: true,
    withdrawals: withdrawals || []
  };
};

export const approveWithdrawal = async (withdrawalId: string) => {
  const { isAdmin, adminId } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  const { error } = await supabase
    .from('withdrawals')
    .update({ 
      status: 'approved', 
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId
    })
    .eq('id', withdrawalId);

  if (error) throw error;

  await logAdminAction(adminId!, 'approve_withdrawal', 'withdrawal', withdrawalId);

  return { success: true, message: 'Saque aprovado! Realize a transferência e marque como concluído.' };
};

export const rejectWithdrawal = async (withdrawalId: string, reason: string) => {
  const { isAdmin, adminId } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  // Buscar dados do saque
  const { data: withdrawal } = await supabase
    .from('withdrawals')
    .select('user_id, amount')
    .eq('id', withdrawalId)
    .single();

  const { error } = await supabase
    .from('withdrawals')
    .update({ 
      status: 'rejected', 
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId
    })
    .eq('id', withdrawalId);

  if (error) throw error;

  // Devolver saldo ao usuário (valor + taxa de R$2)
  if (withdrawal) {
    const refundAmount = parseFloat(withdrawal.amount) + 2.00;
    const { data: user } = await supabase
      .from('users')
      .select('balance')
      .eq('id', withdrawal.user_id)
      .single();
    
    if (user) {
      await supabase
        .from('users')
        .update({ balance: parseFloat(user.balance || 0) + refundAmount })
        .eq('id', withdrawal.user_id);
      
      // Registrar estorno
      await supabase.from('transactions').insert({
        user_id: withdrawal.user_id,
        type: 'withdrawal_refund',
        amount: refundAmount,
        status: 'completed',
        description: `Estorno de saque rejeitado: ${reason}`,
      });
    }
  }

  await logAdminAction(adminId!, 'reject_withdrawal', 'withdrawal', withdrawalId, { reason });

  return { success: true, message: 'Saque rejeitado e saldo devolvido ao usuário' };
};

// ========================================
// VENDAS
// ========================================

export const getSales = async (params: { status?: string; startDate?: string; endDate?: string; limit?: number } = {}) => {
  const { isAdmin } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  let query = supabase
    .from('payments')
    .select(`
      *,
      user:users(name, email),
      product:products(name, price)
    `)
    .order('created_at', { ascending: false });

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  if (params.startDate) {
    query = query.gte('created_at', params.startDate);
  }

  if (params.endDate) {
    query = query.lte('created_at', params.endDate);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  } else {
    query = query.limit(100);
  }

  const { data: sales, error } = await query;

  if (error) throw error;

  return {
    success: true,
    sales: sales || []
  };
};

// ========================================
// TRANSAÇÕES
// ========================================

export const getTransactions = async (params: { type?: string; status?: string; limit?: number } = {}) => {
  const { isAdmin } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  let query = supabase
    .from('transactions')
    .select(`
      *,
      user:users(name, email)
    `)
    .order('created_at', { ascending: false });

  if (params.type && params.type !== 'all') {
    query = query.eq('type', params.type);
  }

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  } else {
    query = query.limit(100);
  }

  const { data: transactions, error } = await query;

  if (error) throw error;

  return {
    success: true,
    transactions: transactions || []
  };
};

// ========================================
// PRODUTOS
// ========================================

export const getAllProducts = async (params: { userId?: string; active?: boolean; search?: string; limit?: number } = {}) => {
  const { isAdmin } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  let query = supabase
    .from('products')
    .select(`
      *,
      user:users(name, email)
    `)
    .order('created_at', { ascending: false });

  if (params.userId) {
    query = query.eq('user_id', params.userId);
  }

  if (params.active !== undefined) {
    query = query.eq('active', params.active);
  }

  if (params.search) {
    query = query.ilike('name', `%${params.search}%`);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  } else {
    query = query.limit(100);
  }

  const { data: products, error } = await query;

  if (error) throw error;

  return {
    success: true,
    products: products || []
  };
};

// ========================================
// API KEYS
// ========================================

export const getAllApiKeys = async (params: { userId?: string; status?: string; limit?: number } = {}) => {
  const { isAdmin } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  let query = supabase
    .from('api_keys')
    .select(`
      *,
      user:users(name, email)
    `)
    .order('created_at', { ascending: false });

  if (params.userId) {
    query = query.eq('user_id', params.userId);
  }

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  } else {
    query = query.limit(100);
  }

  const { data: apiKeys, error } = await query;

  if (error) throw error;

  return {
    success: true,
    apiKeys: apiKeys || []
  };
};

// ========================================
// LINKS DE PAGAMENTO
// ========================================

export const getAllPaymentLinks = async (params: { userId?: string; active?: boolean; limit?: number } = {}) => {
  const { isAdmin } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  let query = supabase
    .from('payment_links')
    .select(`
      *,
      user:users(name, email),
      product:products(name)
    `)
    .order('created_at', { ascending: false });

  if (params.userId) {
    query = query.eq('user_id', params.userId);
  }

  if (params.active !== undefined) {
    query = query.eq('active', params.active);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  } else {
    query = query.limit(100);
  }

  const { data: paymentLinks, error } = await query;

  if (error) throw error;

  return {
    success: true,
    paymentLinks: paymentLinks || []
  };
};

// ========================================
// WEBHOOK LOGS
// ========================================

export const getWebhookLogs = async (params: { eventType?: string; processed?: boolean; limit?: number } = {}) => {
  const { isAdmin } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  let query = supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (params.eventType) {
    query = query.eq('event_type', params.eventType);
  }

  if (params.processed !== undefined) {
    query = query.eq('processed', params.processed);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  } else {
    query = query.limit(100);
  }

  const { data: logs, error } = await query;

  if (error) throw error;

  return {
    success: true,
    logs: logs || []
  };
};

// ========================================
// ADMIN LOGS
// ========================================

export const getAdminLogs = async (params: { action?: string; targetType?: string; limit?: number } = {}) => {
  const { isAdmin } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  let query = supabase
    .from('admin_logs')
    .select(`
      *,
      admin:admin_users(
        user:users(name, email)
      )
    `)
    .order('created_at', { ascending: false });

  if (params.action) {
    query = query.eq('action', params.action);
  }

  if (params.targetType) {
    query = query.eq('target_type', params.targetType);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  } else {
    query = query.limit(100);
  }

  const { data: logs, error } = await query;

  if (error) throw error;

  return {
    success: true,
    logs: logs || []
  };
};

// ========================================
// DETALHES DO USUÁRIO
// ========================================

export const getUserDetails = async (userId: string) => {
  const { isAdmin } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;

  // Buscar transações do usuário
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Buscar vendas do usuário
  const { data: sales } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Buscar produtos do usuário
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId);

  return {
    success: true,
    user,
    transactions: transactions || [],
    sales: sales || [],
    products: products || []
  };
};

// ========================================
// AJUSTAR SALDO
// ========================================

export const adjustUserBalance = async (params: { userId: string; amount: number; type: 'add' | 'subtract' | 'set'; reason: string }) => {
  const { isAdmin, adminId } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('balance')
    .eq('id', params.userId)
    .single();

  if (fetchError) throw fetchError;

  let newBalance: number;
  const currentBalance = user.balance || 0;

  switch (params.type) {
    case 'add':
      newBalance = currentBalance + params.amount;
      break;
    case 'subtract':
      newBalance = currentBalance - params.amount;
      break;
    case 'set':
      newBalance = params.amount;
      break;
    default:
      throw new Error('Tipo de ajuste inválido');
  }

  const { error } = await supabase
    .from('users')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', params.userId);

  if (error) throw error;

  // Registrar transação
  await supabase
    .from('transactions')
    .insert({
      user_id: params.userId,
      type: 'admin_adjustment',
      amount: params.type === 'subtract' ? -params.amount : params.amount,
      description: `Ajuste administrativo: ${params.reason}`,
      status: 'completed'
    });

  await logAdminAction(adminId!, 'adjust_balance', 'user', params.userId, { 
    amount: params.amount, 
    type: params.type, 
    reason: params.reason,
    oldBalance: currentBalance,
    newBalance 
  });

  return { 
    success: true, 
    message: 'Saldo ajustado com sucesso',
    oldBalance: currentBalance,
    newBalance 
  };
};

// ========================================
// CONFIGURAÇÕES DO GATEWAY
// ========================================

export const getGatewayConfig = async () => {
  const { isAdmin } = await verifyIsAdmin();
  if (!isAdmin) throw new Error('Não autorizado');

  const { data: config, error } = await supabase
    .from('gateway_config')
    .select('*')
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return {
    success: true,
    config: config || {
      efibank_client_id: '',
      efibank_client_secret: '',
      efibank_sandbox: true,
      pix_key: '',
      pix_key_type: 'cpf',
      default_fee_percentage: 2.99,
      min_withdrawal: 10,
      max_withdrawal: 10000,
      withdrawal_fee: 2,
      auto_approve_users: false,
      auto_approve_withdrawals: false,
      maintenance_mode: false
    }
  };
};

// ========================================
// HELPERS
// ========================================

async function logAdminAction(adminId: string, action: string, targetType: string, targetId: string, metadata?: any) {
  try {
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId,
        metadata: metadata || {},
        ip_address: '127.0.0.1'
      });
  } catch (error) {
    console.error('Erro ao registrar log admin:', error);
  }
}

export default {
  verifyIsAdmin,
  getStats,
  getAdvancedStats,
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
  getSales,
  getTransactions,
  getAllProducts,
  getAllApiKeys,
  getAllPaymentLinks,
  getWebhookLogs,
  getAdminLogs,
  getUserDetails,
  adjustUserBalance,
  getGatewayConfig,
};

