// Vercel Serverless Function - Webhook do Asaas
// URL: https://dashboard.appzucropay.com/api/asaas-webhook

export const config = {
  runtime: 'nodejs20.x',
};

export default async function handler(req: any, res: any) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET para teste
  if (req.method === 'GET') {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook endpoint is working',
      configured: !!supabaseUrl
    });
  }

  // Apenas POST é permitido para webhooks
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const payload = req.body || {};
    console.log('Webhook received:', payload.event, JSON.stringify(payload));

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('Supabase not configured, but accepting webhook');
      return res.status(200).json({ success: true, message: 'Webhook received (Supabase not configured)' });
    }

    // Import dinâmico do Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Salvar no log de webhooks (opcional)
    try {
      await supabase.from('webhooks_log').insert({
        event_type: payload.event || 'unknown',
        payload: payload,
        processed: false,
      });
    } catch (e) {
      console.log('webhooks_log insert failed (table may not exist)');
    }

    // Processar webhook baseado no evento
    if (payload.payment) {
      const paymentId = payload.payment.id;

      switch (payload.event) {
        case 'PAYMENT_RECEIVED':
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED_IN_CASH':
          // Verificar se é um depósito
          const { data: depositTransaction } = await supabase
            .from('transactions')
            .select('*')
            .eq('asaas_payment_id', paymentId)
            .eq('type', 'deposit')
            .eq('status', 'pending')
            .single();

          if (depositTransaction) {
            // Atualizar transação de depósito
            await supabase
              .from('transactions')
              .update({ status: 'completed', updated_at: new Date().toISOString() })
              .eq('id', depositTransaction.id);

            // Adicionar saldo
            const { data: user } = await supabase
              .from('users')
              .select('balance')
              .eq('id', depositTransaction.user_id)
              .single();

            if (user) {
              await supabase
                .from('users')
                .update({ 
                  balance: Number(user.balance) + Number(depositTransaction.amount),
                  updated_at: new Date().toISOString()
                })
                .eq('id', depositTransaction.user_id);
            }
            console.log(`Depósito confirmado: R$ ${depositTransaction.amount}`);
          } else {
            // Atualizar pagamento de venda
            await supabase
              .from('payments')
              .update({ 
                status: payload.payment.status,
                payment_date: payload.payment.paymentDate || new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('asaas_payment_id', paymentId);

            // Buscar e atualizar saldo
            const { data: payment } = await supabase
              .from('payments')
              .select('user_id, value')
              .eq('asaas_payment_id', paymentId)
              .single();

            if (payment) {
              const { data: user } = await supabase
                .from('users')
                .select('balance')
                .eq('id', payment.user_id)
                .single();

              if (user) {
                await supabase
                  .from('users')
                  .update({ 
                    balance: Number(user.balance) + Number(payment.value),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', payment.user_id);
              }
              console.log(`Venda confirmada: R$ ${payment.value}`);
            }
          }
          break;

        case 'PAYMENT_OVERDUE':
          await supabase
            .from('payments')
            .update({ status: 'OVERDUE', updated_at: new Date().toISOString() })
            .eq('asaas_payment_id', paymentId);
          break;

        case 'PAYMENT_REFUNDED':
          await supabase
            .from('payments')
            .update({ status: 'REFUNDED', updated_at: new Date().toISOString() })
            .eq('asaas_payment_id', paymentId);
          break;
      }
    }

    if (payload.transfer && payload.event === 'TRANSFER_FINISHED') {
      await supabase
        .from('transactions')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('asaas_transfer_id', payload.transfer.id);
    }

    return res.status(200).json({ success: true, message: 'Webhook processed' });

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    // Retornar 200 para não reenviar
    return res.status(200).json({ success: true, message: 'Webhook received with errors', error: error.message });
  }
}
