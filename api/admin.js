// Vercel Serverless Function - Admin API
// Endpoints para gerenciamento administrativo da ZucroPay

import { createClient } from '@supabase/supabase-js';

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

// Extrair user_id do token JWT do Supabase
const getUserFromToken = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Admin API] Token não fornecido ou formato inválido');
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('[Admin API] SUPABASE_URL ou SUPABASE_ANON_KEY não configurado');
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
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
  res.setHeader('Access-Control-Allow-Origin', '*');
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
    
    // Verificar autenticação
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

    const { action, ...params } = req.body || {};

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

    // Se aprovado, atualizar usuário como verificado
    if (status === 'approved' && verification) {
      await supabase
        .from('users')
        .update({ identity_verified: true })
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

