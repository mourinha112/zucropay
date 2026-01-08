// API Admin - Gerenciar Saques
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase não configurado');
  return createClient(url, key);
};

const getUserIdFromToken = (authHeader) => {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.userId || payload.sub || payload.id;
  } catch { return null; }
};

// Verificar se usuário é admin
const isAdmin = async (supabase, userId) => {
  const { data: user } = await supabase
    .from('users')
    .select('role, email')
    .eq('id', userId)
    .single();
  
  // Admin por role ou por email específico
  const adminEmails = ['mourinha112@gmail.com', 'admin@zucropay.com'];
  return user?.role === 'admin' || adminEmails.includes(user?.email);
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: 'Token inválido' });

  const supabase = getSupabase();

  // Verificar se é admin
  const admin = await isAdmin(supabase, userId);
  if (!admin) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  try {
    // GET - Listar todos os saques pendentes
    if (req.method === 'GET') {
      const { status = 'pending' } = req.query;

      let query = supabase
        .from('withdrawals')
        .select(`
          *,
          users:user_id (name, email)
        `)
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data: withdrawals, error } = await query;

      if (error) throw error;

      // Formatar dados
      const formattedWithdrawals = (withdrawals || []).map(w => ({
        ...w,
        userName: w.users?.name || 'Usuário',
        userEmail: w.users?.email || '',
      }));

      return res.status(200).json({
        success: true,
        withdrawals: formattedWithdrawals,
      });
    }

    // PUT - Aprovar ou Rejeitar saque
    if (req.method === 'PUT') {
      const { withdrawalId, action, rejectionReason, adminNotes } = req.body;

      if (!withdrawalId || !action) {
        return res.status(400).json({
          success: false,
          message: 'ID do saque e ação são obrigatórios',
        });
      }

      if (!['approve', 'reject', 'complete'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Ação inválida. Use: approve, reject ou complete',
        });
      }

      // Buscar saque
      const { data: withdrawal, error: fetchError } = await supabase
        .from('withdrawals')
        .select('*, users:user_id (balance, email, name)')
        .eq('id', withdrawalId)
        .single();

      if (fetchError || !withdrawal) {
        return res.status(404).json({
          success: false,
          message: 'Solicitação de saque não encontrada',
        });
      }

      if (withdrawal.status !== 'pending' && action !== 'complete') {
        return res.status(400).json({
          success: false,
          message: `Este saque já foi ${withdrawal.status === 'approved' ? 'aprovado' : 'processado'}`,
        });
      }

      let newStatus = withdrawal.status;
      let updateData = {
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        admin_notes: adminNotes || null,
      };

      if (action === 'approve') {
        newStatus = 'approved';
        updateData.status = 'approved';
        
        console.log(`[ADMIN] Saque ${withdrawalId} APROVADO por admin ${userId}`);
        
        // Atualizar transação para aprovado
        await supabase
          .from('transactions')
          .update({ status: 'completed', description: 'Saque aprovado - Aguardando transferência' })
          .eq('metadata->>withdrawal_id', withdrawalId)
          .eq('type', 'withdrawal_request');

      } else if (action === 'reject') {
        if (!rejectionReason) {
          return res.status(400).json({
            success: false,
            message: 'Motivo da rejeição é obrigatório',
          });
        }

        newStatus = 'rejected';
        updateData.status = 'rejected';
        updateData.rejection_reason = rejectionReason;

        // Devolver saldo ao usuário
        const refundAmount = parseFloat(withdrawal.amount) + 2.00; // Valor + taxa
        const currentBalance = parseFloat(withdrawal.users?.balance || 0);
        
        await supabase
          .from('users')
          .update({ balance: currentBalance + refundAmount })
          .eq('id', withdrawal.user_id);

        // Atualizar transação para cancelado
        await supabase
          .from('transactions')
          .update({ status: 'cancelled', description: `Saque rejeitado: ${rejectionReason}` })
          .eq('metadata->>withdrawal_id', withdrawalId)
          .eq('type', 'withdrawal_request');

        // Criar transação de estorno
        await supabase.from('transactions').insert({
          user_id: withdrawal.user_id,
          type: 'withdrawal_refund',
          amount: refundAmount,
          status: 'completed',
          description: `Estorno de saque rejeitado: ${rejectionReason}`,
          metadata: { withdrawal_id: withdrawalId },
        });

        console.log(`[ADMIN] Saque ${withdrawalId} REJEITADO - Motivo: ${rejectionReason}`);

      } else if (action === 'complete') {
        if (withdrawal.status !== 'approved') {
          return res.status(400).json({
            success: false,
            message: 'Apenas saques aprovados podem ser marcados como concluídos',
          });
        }

        newStatus = 'completed';
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();

        // Atualizar transação para concluído
        await supabase
          .from('transactions')
          .update({ status: 'completed', description: 'Saque concluído - Transferência realizada' })
          .eq('metadata->>withdrawal_id', withdrawalId)
          .eq('type', 'withdrawal_request');

        console.log(`[ADMIN] Saque ${withdrawalId} CONCLUÍDO`);
      }

      // Atualizar saque
      const { error: updateError } = await supabase
        .from('withdrawals')
        .update(updateData)
        .eq('id', withdrawalId);

      if (updateError) throw updateError;

      return res.status(200).json({
        success: true,
        message: action === 'approve' 
          ? 'Saque aprovado com sucesso!' 
          : action === 'reject'
            ? 'Saque rejeitado. Saldo devolvido ao usuário.'
            : 'Saque marcado como concluído!',
        withdrawal: {
          id: withdrawalId,
          status: newStatus,
        },
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[Admin Withdrawals API] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

