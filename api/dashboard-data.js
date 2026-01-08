import { createClient } from '@supabase/supabase-js';

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Inicializar Supabase
const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase não configurado');
  }
  
  return createClient(url, key);
};

// Extrair userId do token JWT
const getUserIdFromToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.userId || payload.sub || payload.id;
  } catch (error) {
    console.error('[Dashboard API] Erro ao decodificar token:', error);
    return null;
  }
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Apenas GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = getUserIdFromToken(req.headers.authorization);
    
    if (!userId) {
      return res.status(401).json({ error: 'Token inválido ou não fornecido' });
    }

    const supabase = getSupabase();
    
    // Buscar dados em paralelo (muito mais rápido!)
    const [userResult, paymentsResult, linksResult, reservesResult] = await Promise.all([
      // Saldo do usuário
      supabase
        .from('users')
        .select('balance, reserved_balance, name, email')
        .eq('id', userId)
        .single(),
      
      // Pagamentos do usuário (últimos 90 dias para gráficos)
      supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),
      
      // Links de pagamento
      supabase
        .from('payment_links')
        .select('id, name, amount, total_received, payments_count, active')
        .eq('user_id', userId)
        .eq('active', true)
        .limit(10),
      
      // Reservas pendentes
      supabase
        .from('balance_reserves')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'held')
        .order('release_date', { ascending: true })
    ]);

    const user = userResult.data;
    const payments = paymentsResult.data || [];
    const links = linksResult.data || [];
    const reserves = reservesResult.data || [];

    // Calcular dados de reserva
    // Usar o reserved_balance do usuário (mais confiável) ou somar da tabela balance_reserves
    const reservesTotal = reserves.reduce((sum, r) => sum + parseFloat(r.reserve_amount || 0), 0);
    const totalReserved = parseFloat(user?.reserved_balance || 0) || reservesTotal;
    const nextRelease = reserves.length > 0 ? reserves[0] : null;
    
    // Contar reservas ativas (se não tiver na tabela, mas tiver saldo reservado, conta como 1)
    const reservesCount = reserves.length > 0 ? reserves.length : (totalReserved > 0 ? 1 : 0);

    // Calcular estatísticas
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const confirmedPayments = payments.filter(p => 
      p.status === 'RECEIVED' || p.status === 'CONFIRMED'
    );

    const todaySales = confirmedPayments.filter(p => 
      new Date(p.created_at) >= todayStart
    );

    const monthSales = confirmedPayments.filter(p => 
      new Date(p.created_at) >= monthStart
    );

    // Contar por método de pagamento
    const paymentMethods = {
      PIX: { count: 0, total: 0 },
      CREDIT_CARD: { count: 0, total: 0 },
      BOLETO: { count: 0, total: 0 },
    };

    confirmedPayments.forEach(p => {
      const type = p.billing_type || 'PIX';
      if (paymentMethods[type]) {
        paymentMethods[type].count++;
        paymentMethods[type].total += parseFloat(p.value || 0);
      }
    });

    // Dados para gráfico (últimos 30 dias)
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const daySales = confirmedPayments.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate >= date && paymentDate < nextDate;
      });
      
      chartData.push({
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        value: daySales.reduce((sum, p) => sum + parseFloat(p.value || 0), 0),
        count: daySales.length,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          name: user?.name || 'Usuário',
          email: user?.email,
          balance: parseFloat(user?.balance || 0),
          reservedBalance: parseFloat(user?.reserved_balance || 0),
        },
        stats: {
          todayTotal: todaySales.reduce((sum, p) => sum + parseFloat(p.value || 0), 0),
          todayCount: todaySales.length,
          monthTotal: monthSales.reduce((sum, p) => sum + parseFloat(p.value || 0), 0),
          monthCount: monthSales.length,
          totalConfirmed: confirmedPayments.length,
          totalPending: payments.filter(p => p.status === 'PENDING').length,
        },
        reserves: {
          totalReserved: totalReserved,
          reservesCount: reservesCount,
          nextRelease: nextRelease ? {
            amount: parseFloat(nextRelease.reserve_amount),
            releaseDate: nextRelease.release_date,
            description: nextRelease.description,
          } : null,
          reserves: reserves.slice(0, 5).map(r => ({
            id: r.id,
            amount: parseFloat(r.reserve_amount),
            originalAmount: parseFloat(r.original_amount),
            releaseDate: r.release_date,
            createdAt: r.created_at,
          })),
        },
        paymentMethods,
        chartData,
        recentPayments: payments.slice(0, 10),
        activeLinks: links,
      }
    });

  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno' 
    });
  }
}

