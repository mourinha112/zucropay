// API de Saques (Withdrawals)
import { createClient } from '@supabase/supabase-js';

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
  } catch {
    return null;
  }
};

// Configurações de saque
const WITHDRAWAL_FEE = 3.00; // R$ 2,00 por saque
const MIN_WITHDRAWAL = 10.00; // Mínimo R$ 10,00
const MAX_WITHDRAWALS_PER_DAY = 2; // Máximo 2 saques por dia

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Token inválido' });
  const userId = user.id;

  const supabase = getSupabase();

  try {
    // GET - Listar saques do usuário
    if (req.method === 'GET') {
      const { data: withdrawals, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        withdrawals: withdrawals || [],
      });
    }

    // POST - Solicitar novo saque
    if (req.method === 'POST') {
      const {
        amount,
        withdrawalType, // 'pix' ou 'bank_transfer'
        // Dados PIX
        pixKey,
        pixKeyType,
        // Dados bancários
        bankCode,
        bankName,
        agency,
        accountNumber,
        accountDigit,
        accountType,
        holderName,
        holderDocument,
      } = req.body;

      // Validações
      // amount = valor BRUTO (total a ser debitado do saldo)
      const grossAmount = parseFloat(amount);
      const netAmount = grossAmount - WITHDRAWAL_FEE; // Valor que o usuário recebe
      
      if (isNaN(grossAmount) || grossAmount < MIN_WITHDRAWAL) {
        return res.status(400).json({
          success: false,
          message: `Valor mínimo para saque: R$ ${MIN_WITHDRAWAL.toFixed(2)}`,
        });
      }

      // Buscar saldo do usuário
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('balance, reserved_balance, name, email')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      }

      const availableBalance = parseFloat(user.balance || 0);

      if (grossAmount > availableBalance) {
        return res.status(400).json({
          success: false,
          message: `Saldo insuficiente. Disponível: R$ ${availableBalance.toFixed(2)}`,
        });
      }
      
      if (netAmount < 8) {
        return res.status(400).json({
          success: false,
          message: `Valor líquido mínimo: R$ 8,00. Você receberá R$ ${netAmount.toFixed(2)} (após taxa de R$ ${WITHDRAWAL_FEE.toFixed(2)})`,
        });
      }

      // Verificar limite de saques por dia (máximo 2)
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { data: todayWithdrawals, error: countError } = await supabase
        .from('withdrawals')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay);

      if (!countError && todayWithdrawals && todayWithdrawals.length >= MAX_WITHDRAWALS_PER_DAY) {
        return res.status(400).json({
          success: false,
          message: `Você já atingiu o limite de ${MAX_WITHDRAWALS_PER_DAY} saques por dia. Tente novamente amanhã.`,
        });
      }

      // Validar dados conforme tipo de saque
      if (withdrawalType === 'pix') {
        if (!pixKey || !pixKeyType) {
          return res.status(400).json({
            success: false,
            message: 'Informe a chave PIX e o tipo da chave',
          });
        }
      } else if (withdrawalType === 'bank_transfer') {
        if (!bankCode || !agency || !accountNumber || !holderName || !holderDocument) {
          return res.status(400).json({
            success: false,
            message: 'Preencha todos os dados bancários',
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Tipo de saque inválido',
        });
      }

      // Criar saque AUTOMÁTICO (não precisa de aprovação)
      // amount = valor líquido que o usuário vai receber (grossAmount - taxa)
      const withdrawalData = {
        user_id: userId,
        amount: netAmount, // Valor que o usuário recebe
        status: 'completed', // Saque automático - já aprovado
        withdrawal_type: withdrawalType,
        // PIX
        pix_key: pixKey || null,
        pix_key_type: pixKeyType || null,
        // Banco
        bank_code: bankCode || null,
        bank_name: bankName || null,
        agency: agency || null,
        account_number: accountNumber || null,
        account_digit: accountDigit || null,
        account_type: accountType || 'checking',
        holder_name: holderName || null,
        holder_document: holderDocument || null,
        completed_at: new Date().toISOString(),
      };

      const { data: withdrawal, error: insertError } = await supabase
        .from('withdrawals')
        .insert(withdrawalData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Debitar saldo do usuário (valor bruto = líquido + taxa)
      const newBalance = availableBalance - grossAmount;
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', userId);

      // Contar quantos saques restam hoje
      const withdrawalsRemaining = MAX_WITHDRAWALS_PER_DAY - (todayWithdrawals?.length || 0) - 1;

      // Registrar transação de saque (valor líquido)
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'withdraw',
        amount: -netAmount,
        status: 'completed',
        description: `Saque via ${withdrawalType === 'pix' ? 'PIX' : 'Transferência Bancária'} - R$ ${netAmount.toFixed(2)}`,
        metadata: { withdrawal_id: withdrawal.id, gross_amount: grossAmount, net_amount: netAmount, fee: WITHDRAWAL_FEE },
      });

      // Registrar taxa de saque
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'fee',
        amount: -WITHDRAWAL_FEE,
        status: 'completed',
        description: 'Taxa de saque',
        metadata: { withdrawal_id: withdrawal.id },
      });

      console.log(`[SAQUE AUTOMÁTICO] Concluído: ${withdrawal.id} - Líquido: R$ ${netAmount.toFixed(2)} | Bruto: R$ ${grossAmount.toFixed(2)} | Taxa: R$ ${WITHDRAWAL_FEE.toFixed(2)} | Usuário: ${user.email}`);

      return res.status(200).json({
        success: true,
        message: `Saque de R$ ${netAmount.toFixed(2)} efetuado com sucesso! ${withdrawalsRemaining > 0 ? `Você ainda pode fazer mais ${withdrawalsRemaining} saque(s) hoje.` : 'Você atingiu o limite de saques de hoje.'}`,
        withdrawal: {
          id: withdrawal.id,
          amount: netAmount, // Valor que o usuário recebe
          grossAmount: grossAmount, // Valor debitado do saldo
          fee: WITHDRAWAL_FEE,
          status: 'completed',
          withdrawalType,
        },
        withdrawalsRemaining,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[Withdrawals API] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

