// API otimizada para página de Vendas
import { createClient } from '@supabase/supabase-js';

// ===== TAXAS PADRÃO DA PLATAFORMA =====
const DEFAULT_FEE_PERCENT = 0.0599;       // 5.99% base
const DEFAULT_FEE_FIXED = 2.50;           // R$2.50 por transação (PIX/Boleto)
const INSTALLMENT_FEE_PERCENT = 0.0249;   // 2.49% por parcela (Cartão)
const MIN_VALUE_FOR_FIXED_FEE = 5.00;     // Valor mínimo para taxa fixa
const RESERVE_PERCENT = 0.05;             // 5% reserva

// Calcular valor líquido após taxas e reserva usando taxas personalizadas
const calculateNetValue = (grossValue, billingType = 'PIX', installments = 1, userRates = null) => {
  const value = parseFloat(grossValue || 0);
  if (value <= 0) return { netValue: 0, platformFee: 0, reserveAmount: 0 };
  
  // Usar taxas personalizadas ou padrão
  let feePercent;
  if (userRates) {
    if (billingType === 'CREDIT_CARD' || billingType === 'CARTAO') {
      feePercent = (userRates.card_rate || 5.99) / 100;
    } else if (billingType === 'BOLETO') {
      feePercent = (userRates.boleto_rate || 5.99) / 100;
    } else {
      feePercent = (userRates.pix_rate || 5.99) / 100;
    }
  } else {
    feePercent = DEFAULT_FEE_PERCENT;
  }
  
  // Calcular taxa da plataforma baseada no tipo de pagamento
  let platformFee = value * feePercent;
  
  if (billingType === 'CREDIT_CARD' || billingType === 'CARTAO') {
    // Cartão: taxa base + (2.49% × parcelas)
    platformFee += value * INSTALLMENT_FEE_PERCENT * (installments || 1);
  } else {
    // PIX/Boleto: taxa base + R$2.50 fixo
    if (value >= MIN_VALUE_FOR_FIXED_FEE) {
      platformFee += DEFAULT_FEE_FIXED;
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

const getUserFromToken = async (authHeader) => {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const supabaseAuth = createClient(url, key, { auth: { persistSession: false } });
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch { return null; }
};

export default async function handler(req, res) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.VITE_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const origin = req.headers.origin;
  const allowOrigin = (allowedOrigins.length && origin && allowedOrigins.includes(origin))
    ? origin
    : (allowedOrigins[0] || '*');
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=59');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Token inválido' });
    const userId = user.id;

    const supabase = getSupabase();
    const { filter, startDate, endDate, limit = 100 } = req.query;

    // Buscar taxas personalizadas e pagamentos em paralelo
    const [customRatesResult, paymentsResult] = await Promise.all([
      supabase
        .from('user_custom_rates')
        .select('pix_rate, card_rate, boleto_rate, withdrawal_fee')
        .eq('user_id', userId)
        .single(),
      (async () => {
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
        return query;
      })()
    ]);

    const userRates = customRatesResult.data;
    const { data: payments, error } = paymentsResult;

    if (error) throw error;

    // Adicionar valor líquido calculado a cada pagamento (usando taxas personalizadas)
    const paymentsWithNet = (payments || []).map(p => {
      const { netValue, platformFee, reserveAmount } = calculateNetValue(
        p.value, 
        p.billing_type || 'PIX', 
        p.installments || 1,
        userRates // Passar taxas personalizadas
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

