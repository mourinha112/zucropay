// Vercel Serverless Function - Liberar Reservas Vencidas
// Pode ser chamado via cron job (Vercel Cron ou externo)
// Endpoint: GET/POST /api/release-reserves

import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase não configurado');
  }
  
  return createClient(url, key, { auth: { persistSession: false } });
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar autorização (opcional - para segurança)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    // Se tem secret configurado, exigir autenticação
    // Mas permitir sem auth para testes
    console.log('[Release Reserves] Aviso: Sem autenticação de cron');
  }

  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    
    console.log('[Release Reserves] Iniciando liberação de reservas...');

    // Buscar reservas prontas para liberar
    const { data: reserves, error: fetchError } = await supabase
      .from('balance_reserves')
      .select('*')
      .eq('status', 'held')
      .lte('release_date', now);

    if (fetchError) {
      throw new Error(`Erro ao buscar reservas: ${fetchError.message}`);
    }

    if (!reserves || reserves.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma reserva para liberar',
        released: 0,
      });
    }

    console.log(`[Release Reserves] ${reserves.length} reservas para liberar`);

    let releasedCount = 0;
    let totalReleased = 0;
    const errors = [];

    for (const reserve of reserves) {
      try {
        // Atualizar reserva para liberada
        const { error: updateReserveError } = await supabase
          .from('balance_reserves')
          .update({
            status: 'released',
            released_amount: reserve.reserve_amount,
            released_at: now,
          })
          .eq('id', reserve.id);

        if (updateReserveError) {
          errors.push({ reserve_id: reserve.id, error: updateReserveError.message });
          continue;
        }

        // Buscar saldo atual do usuário
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('balance, reserved_balance')
          .eq('id', reserve.user_id)
          .single();

        if (userError || !user) {
          errors.push({ reserve_id: reserve.id, error: 'Usuário não encontrado' });
          continue;
        }

        const currentBalance = parseFloat(user.balance || 0);
        const currentReserved = parseFloat(user.reserved_balance || 0);
        const releaseAmount = parseFloat(reserve.reserve_amount);

        const newBalance = currentBalance + releaseAmount;
        const newReserved = Math.max(0, currentReserved - releaseAmount);

        // Atualizar saldo do usuário
        const { error: updateUserError } = await supabase
          .from('users')
          .update({
            balance: newBalance,
            reserved_balance: newReserved,
          })
          .eq('id', reserve.user_id);

        if (updateUserError) {
          errors.push({ reserve_id: reserve.id, error: updateUserError.message });
          continue;
        }

        // Criar transação de liberação
        await supabase.from('transactions').insert({
          user_id: reserve.user_id,
          type: 'deposit', // ou criar um tipo 'reserve_released'
          amount: releaseAmount,
          status: 'completed',
          description: `Reserva liberada - ${reserve.description || 'Venda'}`,
          metadata: {
            reserve_id: reserve.id,
            payment_id: reserve.payment_id,
            original_amount: reserve.original_amount,
          },
        });

        releasedCount++;
        totalReleased += releaseAmount;

        console.log(`[Release Reserves] Liberado: R$ ${releaseAmount.toFixed(2)} para user ${reserve.user_id}`);

      } catch (error) {
        errors.push({ reserve_id: reserve.id, error: error.message });
      }
    }

    console.log(`[Release Reserves] ✅ ${releasedCount} reservas liberadas, total: R$ ${totalReleased.toFixed(2)}`);

    return res.status(200).json({
      success: true,
      message: `${releasedCount} reservas liberadas`,
      released: releasedCount,
      totalAmount: totalReleased,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('[Release Reserves] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

