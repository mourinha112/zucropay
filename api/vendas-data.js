// API otimizada para página de Vendas
import { createClient } from '@supabase/supabase-js';

// ===== TAXAS DA PLATAFORMA =====
const PLATFORM_FEE_PERCENT = 0.0599;      // 5.99% base
const PLATFORM_FEE_FIXED = 2.50;          // R$2.50 por transação (PIX/Boleto)
const INSTALLMENT_FEE_PERCENT = 0.0249;   // 2.49% por parcela (Cartão)
const MIN_VALUE_FOR_FIXED_FEE = 5.00;     // Valor mínimo para taxa fixa
const RESERVE_PERCENT = 0.05;             // 5% reserva

// Calcular valor líquido após taxas e reserva
// - PIX/Boleto: 5.99% + R$2.50
// - Cartão: 5.99% + (2.49% × parcelas)
const calculateNetValue = (grossValue, billingType = 'PIX', installments = 1) => {
  const value = parseFloat(grossValue || 0);
  if (value <= 0) return { netValue: 0, platformFee: 0, reserveAmount: 0 };
  
  // Calcular taxa da plataforma baseada no tipo de pagamento
  let platformFee = value * PLATFORM_FEE_PERCENT; // 5.99% base
  
  if (billingType === 'CREDIT_CARD' || billingType === 'CARTAO') {
    // Cartão: 5.99% + (2.49% × parcelas)
    platformFee += value * INSTALLMENT_FEE_PERCENT * (installments || 1);
  } else {
    // PIX/Boleto: 5.99% + R$2.50
    if (value >= MIN_VALUE_FOR_FIXED_FEE) {
      platformFee += PLATFORM_FEE_FIXED;
    }
  }
  
  // Taxa máxima de 50% do valor
  platformFee = Math.min(platformFee, value * 0.5);
  
  const valueAfterFees = Math.max(0, value - platformFee);
  const reserveAmount = Math.max(0, valueAfterFees * RESERVE_PERCENT);
  const netValue = Math.max(0, valueAfterFees - reserveAmount);
  
  return { netValue, platformFee, reserveAmount, valueAfterFees };
};

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

    // Adicionar valor líquido calculado a cada pagamento
    const paymentsWithNet = (payments || []).map(p => {
      const { netValue, platformFee, reserveAmount } = calculateNetValue(
        p.value, 
        p.billing_type || 'PIX', 
        p.installments || 1
      );
      return {
        ...p,
        net_value: netValue,
        platform_fee: platformFee,
        reserve_amount: reserveAmount,
      };
    });

    // Calcular estatísticas
    const confirmedPayments = paymentsWithNet.filter(p => 
      p.status === 'RECEIVED' || p.status === 'CONFIRMED'
    );

    const stats = {
      total: paymentsWithNet.length,
      confirmed: confirmedPayments.length,
      pending: paymentsWithNet.filter(p => p.status === 'PENDING').length,
      totalValue: confirmedPayments.reduce((sum, p) => sum + parseFloat(p.value || 0), 0),
      totalNetValue: confirmedPayments.reduce((sum, p) => sum + parseFloat(p.net_value || 0), 0),
      totalFees: confirmedPayments.reduce((sum, p) => sum + parseFloat(p.platform_fee || 0), 0),
      totalReserved: confirmedPayments.reduce((sum, p) => sum + parseFloat(p.reserve_amount || 0), 0),
    };

    return res.status(200).json({
      success: true,
      payments: paymentsWithNet,
      stats,
    });

  } catch (error) {
    console.error('[Vendas API] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

