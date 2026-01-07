// API otimizada para página de Vendas
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=59');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const userId = getUserIdFromToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    const supabase = getSupabase();
    const { filter, startDate, endDate, limit = 100 } = req.query;

    // Query otimizada com filtros
    let query = supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (filter && filter !== 'ALL') {
      query = query.eq('status', filter);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: payments, error } = await query;

    if (error) throw error;

    // Calcular estatísticas
    const confirmedPayments = (payments || []).filter(p => 
      p.status === 'RECEIVED' || p.status === 'CONFIRMED'
    );

    const stats = {
      total: payments?.length || 0,
      confirmed: confirmedPayments.length,
      pending: (payments || []).filter(p => p.status === 'PENDING').length,
      totalValue: confirmedPayments.reduce((sum, p) => sum + parseFloat(p.value || 0), 0),
      totalNetValue: confirmedPayments.reduce((sum, p) => sum + parseFloat(p.net_value || p.value || 0), 0),
    };

    return res.status(200).json({
      success: true,
      payments: payments || [],
      stats,
    });

  } catch (error) {
    console.error('[Vendas API] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

