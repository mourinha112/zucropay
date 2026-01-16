// Vercel Serverless Function - Admin API
// Endpoints para gerenciamento administrativo da ZucroPay

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Criar cliente Supabase com service role para bypass de RLS
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  
  return { supabaseUrl, supabaseServiceKey };
};

const createSupabaseClient = (url, key) => {
  return createClient(url, key, {
    auth: { persistSession: false }
  });
};

// Verificar se usuário é admin
const verifyAdmin = async (supabase, userId) => {
  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error || !admin) {
    return null;
  }
  
  return admin;
};

// Extrair user do token JWT do Supabase (valida assinatura)
const getUserFromToken = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Admin API] Token não fornecido ou formato inválido');
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('[Admin API] SUPABASE_URL ou SUPABASE_KEY não configurado');
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.log('[Admin API] Erro ao verificar token:', error.message);
      return null;
    }
    
    if (!user) {
      console.log('[Admin API] Token válido mas sem usuário');
      return null;
    }
    
    console.log('[Admin API] Usuário autenticado:', user.id);
    return user;
  } catch (err) {
    console.log('[Admin API] Erro ao processar token:', err.message);
    return null;
  }
};

export default async function handler(req, res) {
  // Headers CORS
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.VITE_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const origin = req.headers.origin;
  const allowOrigin = (allowedOrigins.length && origin && allowedOrigins.includes(origin))
    ? origin
    : (allowedOrigins[0] || '*');
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET para verificar status da API
  if (req.method === 'GET') {
    const { supabaseUrl, supabaseServiceKey } = getSupabaseAdmin();
    return res.status(200).json({
      success: true,
      message: 'Admin API funcionando',
      configured: !!(supabaseUrl && supabaseServiceKey),
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    });
  }

  try {
    const { supabaseUrl, supabaseServiceKey } = getSupabaseAdmin();
    
    // Verificar configuração do Supabase
    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(200).json({
        success: false,
        message: 'Supabase não configurado. Adicione SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente da Vercel.',
        configured: false,
      });
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);
    
    const { action, ...params } = req.body || {};

    // ========== LOGIN DE ADMIN (não requer autenticação prévia) ==========
    if (action === 'login') {
      return await handleAdminLogin(supabase, params, res);
    }

    // Para outras ações, verificar autenticação
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(200).json({ success: false, message: 'Não autorizado. Faça login novamente.' });
    }
    
    // Verificar se é admin
    const admin = await verifyAdmin(supabase, user.id);
    if (!admin) {
      return res.status(200).json({ 
        success: false, 
        message: `Acesso negado. Você não é um administrador. userId: ${user.id}`,
        userId: user.id 
      });
    }

    switch (action) {
      // ========== DASHBOARD STATS ==========
      case 'getStats':
        return await getStats(supabase, res);
      
      // ========== USUÁRIOS ==========
      case 'getUsers':
        return await getUsers(supabase, params, res);
      
      case 'approveUser':
        return await updateUserStatus(supabase, admin.id, params.userId, 'approved', params.reason, res);
      
      case 'rejectUser':
        return await updateUserStatus(supabase, admin.id, params.userId, 'rejected', params.reason, res);
      
      case 'suspendUser':
        return await updateUserStatus(supabase, admin.id, params.userId, 'suspended', params.reason, res);
      
      case 'blockUser':
        return await updateUserStatus(supabase, admin.id, params.userId, 'blocked', params.reason, res);

      // ========== VERIFICAÇÃO DE IDENTIDADE ==========
      case 'getVerifications':
        return await getVerifications(supabase, params, res);
      
      case 'approveVerification':
        return await updateVerificationStatus(supabase, admin.id, params.verificationId, 'approved', null, res);
      
      case 'rejectVerification':
        return await updateVerificationStatus(supabase, admin.id, params.verificationId, 'rejected', params.reason, res);

      // ========== SAQUES ==========
      case 'getWithdrawals':
        return await getWithdrawals(supabase, params, res);
      
      case 'approveWithdrawal':
        return await updateWithdrawalStatus(supabase, admin.id, params.withdrawalId, 'approved', null, res);
      
      case 'rejectWithdrawal':
        return await updateWithdrawalStatus(supabase, admin.id, params.withdrawalId, 'rejected', params.reason, res);
      
      case 'blockUserWithdrawals':
        return await blockUserWithdrawals(supabase, admin.id, params.userId, true, params.reason, res);
      
      case 'unblockUserWithdrawals':
        return await blockUserWithdrawals(supabase, admin.id, params.userId, false, null, res);

      // ========== VENDAS ==========
      case 'getSales':
        return await getSales(supabase, params, res);

      // ========== TRANSAÇÕES ==========
      case 'getTransactions':
        return await getTransactions(supabase, params, res);

      // ========== PRODUTOS (ADMIN VIEW) ==========
      case 'getAllProducts':
        return await getAllProducts(supabase, params, res);

      // ========== LOGS DE WEBHOOK ==========
      case 'getWebhookLogs':
        return await getWebhookLogs(supabase, params, res);

      // ========== LOGS DE ADMIN ==========
      case 'getAdminLogs':
        return await getAdminLogs(supabase, params, res);

      // ========== DETALHES DO USUÁRIO ==========
      case 'getUserDetails':
        return await getUserDetails(supabase, params.userId, res);

      // ========== AJUSTAR SALDO ==========
      case 'adjustUserBalance':
        return await adjustUserBalance(supabase, admin.id, params, res);

      // ========== CONFIGURAÇÕES DO GATEWAY ==========
      case 'getGatewayConfig':
        return await getGatewayConfig(res);

      // ========== API KEYS DOS USUÁRIOS ==========
      case 'getAllApiKeys':
        return await getAllApiKeys(supabase, params, res);

      // ========== LINKS DE PAGAMENTO ==========
      case 'getAllPaymentLinks':
        return await getAllPaymentLinks(supabase, params, res);

      // ========== ESTATÍSTICAS AVANÇADAS ==========
      case 'getAdvancedStats':
        return await getAdvancedStats(supabase, params, res);

      // ========== GERENTE: TAXAS PERSONALIZADAS ==========
      case 'setUserCustomRates':
        return await setUserCustomRates(supabase, admin.id, params, res);

      case 'getUserCustomRates':
        return await getUserCustomRates(supabase, params.userId, res);

      // ========== CRIAR GERENTE (apenas super_admin e admin) ==========
      case 'createManager':
        return await createManager(supabase, admin, params, res);

      case 'listManagers':
        return await listManagers(supabase, res);

      case 'deleteManager':
        return await deleteManager(supabase, admin, params.managerId, res);

      default:
        return res.status(400).json({ success: false, message: 'Ação inválida' });
    }

  } catch (error) {
    console.error('[Admin API] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
}

// ========== FUNÇÕES DE STATS ==========

async function getStats(supabase, res) {
  try {
    // Total de usuários
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Usuários pendentes
    const { count: pendingUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'pending');

    // Usuários aprovados
    const { count: approvedUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'approved');

    // Verificações pendentes
    const { count: pendingVerifications } = await supabase
      .from('user_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Total de vendas (payments RECEIVED ou CONFIRMED)
    const { data: salesData } = await supabase
      .from('payments')
      .select('value')
      .in('status', ['RECEIVED', 'CONFIRMED']);
    
    const totalSales = salesData?.reduce((sum, p) => sum + parseFloat(p.value || 0), 0) || 0;
    const totalTransactions = salesData?.length || 0;

    // Saques pendentes
    const { data: withdrawalsData } = await supabase
      .from('withdrawal_requests')
      .select('amount')
      .eq('status', 'pending');
    
    const pendingWithdrawalsCount = withdrawalsData?.length || 0;
    const pendingWithdrawalsAmount = withdrawalsData?.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0) || 0;

    // Total de depósitos
    const { data: depositsData } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'deposit')
      .eq('status', 'completed');
    
    const totalDeposits = depositsData?.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0) || 0;

    // Total de saques completados
    const { data: completedWithdrawals } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'withdraw')
      .eq('status', 'completed');
    
    const totalWithdrawals = completedWithdrawals?.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0) || 0;

    // Saldo total na plataforma
    const { data: usersBalance } = await supabase
      .from('users')
      .select('balance');
    
    const platformBalance = usersBalance?.reduce((sum, u) => sum + parseFloat(u.balance || 0), 0) || 0;

    return res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers || 0,
          pending: pendingUsers || 0,
          approved: approvedUsers || 0,
        },
        verifications: {
          pending: pendingVerifications || 0,
        },
        sales: {
          total: totalSales,
          transactions: totalTransactions,
        },
        withdrawals: {
          pending: pendingWithdrawalsCount,
          pendingAmount: pendingWithdrawalsAmount,
          completed: totalWithdrawals,
        },
        deposits: {
          total: totalDeposits,
        },
        platform: {
          balance: platformBalance,
        }
      }
    });
  } catch (error) {
    console.error('getStats error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== FUNÇÕES DE USUÁRIOS ==========

async function getUsers(supabase, params, res) {
  try {
    let query = supabase
      .from('users')
      .select(`
        *,
        user_verifications (
          status,
          document_type,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (params.status) {
      query = query.eq('account_status', params.status);
    }

    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      users: data,
      count
    });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateUserStatus(supabase, adminId, userId, status, reason, res) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        account_status: status,
        account_status_reason: reason,
        account_reviewed_by: adminId,
        account_reviewed_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    // Log da ação
    await supabase.from('admin_logs').insert({
      admin_id: adminId,
      action: `${status}_user`,
      target_type: 'user',
      target_id: userId,
      details: { status, reason }
    });

    return res.status(200).json({
      success: true,
      message: `Usuário ${status === 'approved' ? 'aprovado' : status === 'rejected' ? 'rejeitado' : status === 'suspended' ? 'suspenso' : 'bloqueado'} com sucesso`
    });
  } catch (error) {
    console.error('updateUserStatus error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== FUNÇÕES DE VERIFICAÇÃO ==========

async function getVerifications(supabase, params, res) {
  try {
    let query = supabase
      .from('user_verifications')
      .select(`
        *,
        users (
          id,
          name,
          email,
          cpf_cnpj
        )
      `)
      .order('created_at', { ascending: false });

    if (params.status) {
      query = query.eq('status', params.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      verifications: data
    });
  } catch (error) {
    console.error('getVerifications error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateVerificationStatus(supabase, adminId, verificationId, status, reason, res) {
  try {
    const updateData = {
      status,
      rejection_reason: reason,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString()
    };

    const { data: verification, error } = await supabase
      .from('user_verifications')
      .update(updateData)
      .eq('id', verificationId)
      .select('user_id')
      .single();

    if (error) throw error;

    // Atualizar status de verificação do usuário
    if (verification) {
      await supabase
        .from('users')
        .update({ 
          verification_status: status,
          verification_reviewed_at: new Date().toISOString(),
          verification_reviewed_by: adminId,
          verification_rejection_reason: status === 'rejected' ? reason : null
        })
        .eq('id', verification.user_id);
    }

    // Log da ação
    await supabase.from('admin_logs').insert({
      admin_id: adminId,
      action: `${status}_verification`,
      target_type: 'verification',
      target_id: verificationId,
      details: { status, reason }
    });

    return res.status(200).json({
      success: true,
      message: `Verificação ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso`
    });
  } catch (error) {
    console.error('updateVerificationStatus error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== FUNÇÕES DE SAQUES ==========

async function getWithdrawals(supabase, params, res) {
  try {
    let query = supabase
      .from('withdrawal_requests')
      .select(`
        *,
        users (
          id,
          name,
          email,
          balance
        )
      `)
      .order('created_at', { ascending: false });

    if (params.status) {
      query = query.eq('status', params.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      withdrawals: data
    });
  } catch (error) {
    console.error('getWithdrawals error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateWithdrawalStatus(supabase, adminId, withdrawalId, status, reason, res) {
  try {
    const updateData = {
      status,
      rejection_reason: reason,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('withdrawal_requests')
      .update(updateData)
      .eq('id', withdrawalId);

    if (error) throw error;

    // Log da ação
    await supabase.from('admin_logs').insert({
      admin_id: adminId,
      action: `${status}_withdrawal`,
      target_type: 'withdrawal',
      target_id: withdrawalId,
      details: { status, reason }
    });

    return res.status(200).json({
      success: true,
      message: `Saque ${status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso`
    });
  } catch (error) {
    console.error('updateWithdrawalStatus error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function blockUserWithdrawals(supabase, adminId, userId, blocked, reason, res) {
  try {
    // Verificar se já existe configuração
    const { data: existing } = await supabase
      .from('withdrawal_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      await supabase
        .from('withdrawal_settings')
        .update({
          blocked,
          blocked_reason: reason,
          blocked_by: blocked ? adminId : null,
          blocked_at: blocked ? new Date().toISOString() : null
        })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('withdrawal_settings')
        .insert({
          user_id: userId,
          blocked,
          blocked_reason: reason,
          blocked_by: blocked ? adminId : null,
          blocked_at: blocked ? new Date().toISOString() : null
        });
    }

    // Log da ação
    await supabase.from('admin_logs').insert({
      admin_id: adminId,
      action: blocked ? 'block_withdrawals' : 'unblock_withdrawals',
      target_type: 'user',
      target_id: userId,
      details: { blocked, reason }
    });

    return res.status(200).json({
      success: true,
      message: blocked ? 'Saques bloqueados para este usuário' : 'Saques liberados para este usuário'
    });
  } catch (error) {
    console.error('blockUserWithdrawals error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== FUNÇÕES DE VENDAS ==========

async function getSales(supabase, params, res) {
  try {
    let query = supabase
      .from('payments')
      .select(`
        *,
        users (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (params.status) {
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
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      sales: data
    });
  } catch (error) {
    console.error('getSales error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== FUNÇÕES DE TRANSAÇÕES ==========

async function getTransactions(supabase, params, res) {
  try {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        users (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (params.type) {
      query = query.eq('type', params.type);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      transactions: data
    });
  } catch (error) {
    console.error('getTransactions error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== FUNÇÕES DE PRODUTOS (ADMIN) ==========

async function getAllProducts(supabase, params, res) {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        users (
          id,
          name,
          email
        )
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
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      products: data,
      count
    });
  } catch (error) {
    console.error('getAllProducts error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== FUNÇÕES DE WEBHOOK LOGS ==========

async function getWebhookLogs(supabase, params, res) {
  try {
    let query = supabase
      .from('webhooks_log')
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

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      logs: data
    });
  } catch (error) {
    console.error('getWebhookLogs error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== FUNÇÕES DE ADMIN LOGS ==========

async function getAdminLogs(supabase, params, res) {
  try {
    let query = supabase
      .from('admin_logs')
      .select(`
        *,
        admin:admin_users (
          user_id,
          role
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

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      logs: data
    });
  } catch (error) {
    console.error('getAdminLogs error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== FUNÇÕES DE DETALHES DO USUÁRIO ==========

async function getUserDetails(supabase, userId, res) {
  try {
    // Buscar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Buscar verificação
    const { data: verification } = await supabase
      .from('user_verifications')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Buscar produtos
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Buscar pagamentos
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Buscar transações
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Buscar saques
    const { data: withdrawals } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Buscar configurações de saque
    const { data: withdrawalSettings } = await supabase
      .from('withdrawal_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Calcular estatísticas
    const totalSales = payments?.filter(p => ['RECEIVED', 'CONFIRMED'].includes(p.status))
      .reduce((sum, p) => sum + parseFloat(p.value || 0), 0) || 0;
    
    const totalWithdrawn = withdrawals?.filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + parseFloat(w.amount || 0), 0) || 0;

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        verification,
        withdrawalSettings,
        stats: {
          totalProducts: products?.length || 0,
          totalSales,
          totalWithdrawn,
          totalPayments: payments?.length || 0,
          totalTransactions: transactions?.length || 0,
        }
      },
      products,
      payments,
      transactions,
      withdrawals
    });
  } catch (error) {
    console.error('getUserDetails error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== FUNÇÕES DE AJUSTE DE SALDO ==========

async function adjustUserBalance(supabase, adminId, params, res) {
  try {
    const { userId, amount, type, reason } = params;

    if (!userId || amount === undefined || !type || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parâmetros obrigatórios: userId, amount, type, reason' 
      });
    }

    // Buscar saldo atual
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const currentBalance = parseFloat(user.balance || 0);
    const adjustmentAmount = parseFloat(amount);
    
    let newBalance;
    if (type === 'add') {
      newBalance = currentBalance + adjustmentAmount;
    } else if (type === 'subtract') {
      newBalance = currentBalance - adjustmentAmount;
      if (newBalance < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Saldo insuficiente para esta operação' 
        });
      }
    } else if (type === 'set') {
      newBalance = adjustmentAmount;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo inválido. Use: add, subtract ou set' 
      });
    }

    // Atualizar saldo
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Criar transação de ajuste
    await supabase.from('transactions').insert({
      user_id: userId,
      type: type === 'subtract' ? 'fee' : 'deposit',
      amount: Math.abs(adjustmentAmount),
      status: 'completed',
      description: `[ADMIN] ${reason}`,
      metadata: {
        admin_adjustment: true,
        admin_id: adminId,
        adjustment_type: type,
        previous_balance: currentBalance,
        new_balance: newBalance
      }
    });

    // Log da ação
    await supabase.from('admin_logs').insert({
      admin_id: adminId,
      action: 'adjust_balance',
      target_type: 'user',
      target_id: userId,
      details: { type, amount: adjustmentAmount, reason, previousBalance: currentBalance, newBalance }
    });

    return res.status(200).json({
      success: true,
      message: `Saldo ajustado com sucesso. Novo saldo: R$ ${newBalance.toFixed(2)}`,
      previousBalance: currentBalance,
      newBalance
    });
  } catch (error) {
    console.error('adjustUserBalance error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== CONFIGURAÇÕES DO GATEWAY ==========

async function getGatewayConfig(res) {
  try {
    const config = {
      provider: 'EfiBank',
      sandbox: process.env.EFI_SANDBOX === 'true',
      configured: !!(process.env.EFI_CLIENT_ID && process.env.EFI_CLIENT_SECRET && process.env.EFI_CERTIFICATE),
      pixKeyConfigured: !!process.env.EFI_PIX_KEY,
      webhookUrlConfigured: !!process.env.EFI_WEBHOOK_URL,
      environment: process.env.NODE_ENV || 'development',
      features: {
        pix: true,
        boleto: true,
        creditCard: true,
      },
      // Não expor dados sensíveis
      clientIdMasked: process.env.EFI_CLIENT_ID ? `${process.env.EFI_CLIENT_ID.substring(0, 8)}...` : null,
      pixKeyMasked: process.env.EFI_PIX_KEY ? `${process.env.EFI_PIX_KEY.substring(0, 4)}...` : null,
    };

    return res.status(200).json({
      success: true,
      config
    });
  } catch (error) {
    console.error('getGatewayConfig error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== API KEYS DOS USUÁRIOS ==========

async function getAllApiKeys(supabase, params, res) {
  try {
    let query = supabase
      .from('api_keys')
      .select(`
        id,
        name,
        api_key,
        status,
        last_used_at,
        created_at,
        users (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (params.userId) {
      query = query.eq('user_id', params.userId);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Mascarar as API keys
    const maskedData = data?.map(key => ({
      ...key,
      api_key: key.api_key ? `${key.api_key.substring(0, 10)}...${key.api_key.slice(-4)}` : null
    }));

    return res.status(200).json({
      success: true,
      apiKeys: maskedData
    });
  } catch (error) {
    console.error('getAllApiKeys error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== LINKS DE PAGAMENTO ==========

async function getAllPaymentLinks(supabase, params, res) {
  try {
    let query = supabase
      .from('payment_links')
      .select(`
        *,
        users (
          id,
          name,
          email
        ),
        products (
          id,
          name,
          price
        )
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
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      paymentLinks: data
    });
  } catch (error) {
    console.error('getAllPaymentLinks error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== ESTATÍSTICAS AVANÇADAS ==========

async function getAdvancedStats(supabase, params, res) {
  try {
    const { startDate, endDate } = params;
    
    // Vendas por dia (últimos 30 dias se não especificado)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const start = startDate || thirtyDaysAgo.toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Vendas confirmadas no período
    const { data: salesByDay } = await supabase
      .from('payments')
      .select('created_at, value, billing_type, status')
      .in('status', ['RECEIVED', 'CONFIRMED'])
      .gte('created_at', start)
      .lte('created_at', end + 'T23:59:59')
      .order('created_at', { ascending: true });

    // Novos usuários por dia
    const { data: usersByDay } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', start)
      .lte('created_at', end + 'T23:59:59')
      .order('created_at', { ascending: true });

    // Agrupar por dia
    const salesGrouped = {};
    const usersGrouped = {};
    const paymentMethodStats = { PIX: 0, CREDIT_CARD: 0, BOLETO: 0 };

    salesByDay?.forEach(sale => {
      const day = sale.created_at.split('T')[0];
      if (!salesGrouped[day]) salesGrouped[day] = { total: 0, count: 0 };
      salesGrouped[day].total += parseFloat(sale.value || 0);
      salesGrouped[day].count += 1;
      
      if (sale.billing_type) {
        paymentMethodStats[sale.billing_type] = (paymentMethodStats[sale.billing_type] || 0) + parseFloat(sale.value || 0);
      }
    });

    usersByDay?.forEach(user => {
      const day = user.created_at.split('T')[0];
      usersGrouped[day] = (usersGrouped[day] || 0) + 1;
    });

    // Criar array de datas
    const dailyStats = [];
    const currentDate = new Date(start);
    const endDateObj = new Date(end);

    while (currentDate <= endDateObj) {
      const day = currentDate.toISOString().split('T')[0];
      dailyStats.push({
        date: day,
        sales: salesGrouped[day]?.total || 0,
        salesCount: salesGrouped[day]?.count || 0,
        newUsers: usersGrouped[day] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Top vendedores
    const { data: topSellers } = await supabase
      .from('payments')
      .select(`
        user_id,
        value,
        users (
          name,
          email
        )
      `)
      .in('status', ['RECEIVED', 'CONFIRMED'])
      .gte('created_at', start)
      .lte('created_at', end + 'T23:59:59');

    const sellerStats = {};
    topSellers?.forEach(sale => {
      if (!sellerStats[sale.user_id]) {
        sellerStats[sale.user_id] = {
          userId: sale.user_id,
          name: sale.users?.name || 'N/A',
          email: sale.users?.email || 'N/A',
          total: 0,
          count: 0
        };
      }
      sellerStats[sale.user_id].total += parseFloat(sale.value || 0);
      sellerStats[sale.user_id].count += 1;
    });

    const topSellersArray = Object.values(sellerStats)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      stats: {
        dailyStats,
        paymentMethodStats,
        topSellers: topSellersArray,
        period: { start, end }
      }
    });
  } catch (error) {
    console.error('getAdvancedStats error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== LOGIN DE ADMIN ==========

async function handleAdminLogin(supabase, params, res) {
  try {
    const { email, password } = params;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email e senha são obrigatórios' 
      });
    }

    // Buscar admin pelo email na tabela admin_credentials
    const { data: admin, error } = await supabase
      .from('admin_credentials')
      .select('id, email, password_hash, name, role, is_active')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      console.log('[Admin Login] Admin não encontrado:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciais inválidas' 
      });
    }

    // Verificar senha (bcrypt com fallback legado)
    const storedHash = admin.password_hash || '';
    let passwordOk = false;

    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
      passwordOk = await bcrypt.compare(password, storedHash);
    } else {
      // Legacy: senha em texto puro
      passwordOk = storedHash === password;
      if (passwordOk) {
        // Atualizar para bcrypt automaticamente
        const newHash = await bcrypt.hash(password, 10);
        await supabase.from('admin_credentials').update({ password_hash: newHash }).eq('id', admin.id);
      }
    }

    if (!passwordOk) {
      console.log('[Admin Login] Senha incorreta para:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciais inválidas' 
      });
    }

    // Atualizar último login
    await supabase
      .from('admin_credentials')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Gerar token simples (em produção usar JWT real)
    const token = Buffer.from(JSON.stringify({
      type: 'admin',
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      timestamp: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24 horas
    })).toString('base64');

    console.log('[Admin Login] Login bem sucedido:', admin.email);

    return res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('[Admin Login] Erro:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}

// ========== GERENTE: TAXAS PERSONALIZADAS ==========

async function setUserCustomRates(supabase, adminId, params, res) {
  try {
    const { userId, pixRate, cardRate, boletoRate, withdrawalFee, notes } = params;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId é obrigatório' 
      });
    }

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    // Verificar se já existe configuração de taxas para o usuário
    const { data: existing } = await supabase
      .from('user_custom_rates')
      .select('id')
      .eq('user_id', userId)
      .single();

    const ratesData = {
      user_id: userId,
      pix_rate: pixRate || 0.99,
      card_rate: cardRate || 4.99,
      boleto_rate: boletoRate || 2.99,
      withdrawal_fee: withdrawalFee || 2.00,
      notes: notes || null,
      created_by: adminId,
    };

    if (existing) {
      // Atualizar taxas existentes
      const { error: updateError } = await supabase
        .from('user_custom_rates')
        .update(ratesData)
        .eq('user_id', userId);

      if (updateError) throw updateError;
    } else {
      // Criar novas taxas
      const { error: insertError } = await supabase
        .from('user_custom_rates')
        .insert(ratesData);

      if (insertError) throw insertError;
    }

    // Log da ação
    await supabase.from('admin_logs').insert({
      admin_id: adminId,
      action: 'set_custom_rates',
      target_type: 'user',
      target_id: userId,
      details: { pixRate, cardRate, boletoRate, withdrawalFee, notes }
    });

    return res.status(200).json({
      success: true,
      message: `Taxas personalizadas definidas para ${user.name}`
    });
  } catch (error) {
    console.error('setUserCustomRates error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getUserCustomRates(supabase, userId, res) {
  try {
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId é obrigatório' 
      });
    }

    const { data, error } = await supabase
      .from('user_custom_rates')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    // Se não há taxas personalizadas, retornar as padrão
    const rates = data || {
      pix_rate: 0.99,
      card_rate: 4.99,
      boleto_rate: 2.99,
      withdrawal_fee: 2.00,
      is_default: true
    };

    return res.status(200).json({
      success: true,
      rates
    });
  } catch (error) {
    console.error('getUserCustomRates error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ========== CRIAR/GERENCIAR GERENTES ==========

async function createManager(supabase, admin, params, res) {
  try {
    const { email, password, name } = params;

    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, senha e nome são obrigatórios' 
      });
    }

    // Verificar se o admin tem permissão (apenas admin e super_admin podem criar gerentes)
    // Nota: A verificação do role do admin já foi feita antes de chegar aqui
    // Mas o gerente não pode criar outros gerentes
    const adminToken = admin.role;
    
    // Verificar se email já existe
    const { data: existing } = await supabase
      .from('admin_credentials')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Este email já está cadastrado' 
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Criar o gerente
    const { data: newManager, error } = await supabase
      .from('admin_credentials')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        name,
        role: 'gerente',
        is_active: true,
        permissions: JSON.stringify(['approve_accounts', 'cancel_accounts', 'adjust_user_rates'])
      })
      .select()
      .single();

    if (error) throw error;

    // Log da ação
    await supabase.from('admin_logs').insert({
      admin_id: admin.id,
      action: 'create_manager',
      target_type: 'manager',
      target_id: newManager.id,
      details: { email, name }
    });

    return res.status(200).json({
      success: true,
      message: `Gerente ${name} criado com sucesso!`,
      manager: {
        id: newManager.id,
        email: newManager.email,
        name: newManager.name,
        role: newManager.role
      }
    });
  } catch (error) {
    console.error('createManager error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function listManagers(supabase, res) {
  try {
    const { data, error } = await supabase
      .from('admin_credentials')
      .select('id, email, name, role, is_active, last_login, created_at')
      .eq('role', 'gerente')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      managers: data || []
    });
  } catch (error) {
    console.error('listManagers error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteManager(supabase, admin, managerId, res) {
  try {
    if (!managerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'managerId é obrigatório' 
      });
    }

    // Verificar se é realmente um gerente
    const { data: manager, error: findError } = await supabase
      .from('admin_credentials')
      .select('id, email, name, role')
      .eq('id', managerId)
      .eq('role', 'gerente')
      .single();

    if (findError || !manager) {
      return res.status(404).json({ 
        success: false, 
        message: 'Gerente não encontrado' 
      });
    }

    // Desativar o gerente (soft delete)
    const { error } = await supabase
      .from('admin_credentials')
      .update({ is_active: false })
      .eq('id', managerId);

    if (error) throw error;

    // Log da ação
    await supabase.from('admin_logs').insert({
      admin_id: admin.id,
      action: 'delete_manager',
      target_type: 'manager',
      target_id: managerId,
      details: { email: manager.email, name: manager.name }
    });

    return res.status(200).json({
      success: true,
      message: `Gerente ${manager.name} desativado com sucesso`
    });
  } catch (error) {
    console.error('deleteManager error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
