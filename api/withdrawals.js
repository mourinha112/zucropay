// API de Saques (Withdrawals)
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

// Taxa de saque
const WITHDRAWAL_FEE = 2.00; // R$ 2,00 por saque
const MIN_WITHDRAWAL = 10.00; // Mínimo R$ 10,00

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: 'Token inválido' });

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
      const withdrawalAmount = parseFloat(amount);
      if (isNaN(withdrawalAmount) || withdrawalAmount < MIN_WITHDRAWAL) {
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
      const totalWithFee = withdrawalAmount + WITHDRAWAL_FEE;

      if (totalWithFee > availableBalance) {
        return res.status(400).json({
          success: false,
          message: `Saldo insuficiente. Disponível: R$ ${availableBalance.toFixed(2)} | Necessário: R$ ${totalWithFee.toFixed(2)} (incluindo taxa de R$ ${WITHDRAWAL_FEE.toFixed(2)})`,
        });
      }

      // Verificar se tem saque pendente
      const { data: pendingWithdrawals } = await supabase
        .from('withdrawals')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (pendingWithdrawals && pendingWithdrawals.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Você já possui uma solicitação de saque pendente. Aguarde a aprovação.',
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

      // Criar solicitação de saque
      const withdrawalData = {
        user_id: userId,
        amount: withdrawalAmount,
        status: 'pending',
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
      };

      const { data: withdrawal, error: insertError } = await supabase
        .from('withdrawals')
        .insert(withdrawalData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Debitar saldo do usuário (incluindo taxa)
      const newBalance = availableBalance - totalWithFee;
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', userId);

      // Registrar transação de saque
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'withdrawal_request',
        amount: -withdrawalAmount,
        status: 'pending',
        description: `Solicitação de saque via ${withdrawalType === 'pix' ? 'PIX' : 'Transferência Bancária'}`,
        metadata: { withdrawal_id: withdrawal.id },
      });

      // Registrar taxa de saque
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'withdrawal_fee',
        amount: -WITHDRAWAL_FEE,
        status: 'completed',
        description: 'Taxa de saque',
        metadata: { withdrawal_id: withdrawal.id },
      });

      console.log(`[SAQUE] Solicitação criada: ${withdrawal.id} - R$ ${withdrawalAmount} por ${user.email}`);

      return res.status(200).json({
        success: true,
        message: 'Solicitação de saque enviada! Aguarde a aprovação do administrador.',
        withdrawal: {
          id: withdrawal.id,
          amount: withdrawalAmount,
          fee: WITHDRAWAL_FEE,
          total: totalWithFee,
          status: 'pending',
          withdrawalType,
        },
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[Withdrawals API] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

