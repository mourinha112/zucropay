// Vercel Serverless Function - Webhook do Asaas (ES Module)

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook endpoint is working'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const payload = req.body || {};
    console.log('Webhook received:', payload.event);

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('Supabase not configured');
      return res.status(200).json({ success: true, message: 'Webhook received (Supabase not configured)' });
    }

    // Import dinâmico do Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Processar eventos de pagamento
    if (payload.payment) {
      const paymentId = payload.payment.id;

      if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(payload.event)) {
        // Atualizar pagamento
        await supabase
          .from('payments')
          .update({ 
            status: payload.payment.status,
            updated_at: new Date().toISOString()
          })
          .eq('asaas_payment_id', paymentId);

        // Verificar depósito
        const { data: deposit } = await supabase
          .from('transactions')
          .select('*')
          .eq('asaas_payment_id', paymentId)
          .eq('type', 'deposit')
          .eq('status', 'pending')
          .single();

        if (deposit) {
          await supabase
            .from('transactions')
            .update({ status: 'completed' })
            .eq('id', deposit.id);

          const { data: user } = await supabase
            .from('users')
            .select('balance')
            .eq('id', deposit.user_id)
            .single();

          if (user) {
            await supabase
              .from('users')
              .update({ balance: Number(user.balance) + Number(deposit.amount) })
              .eq('id', deposit.user_id);
          }
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ success: true, message: 'Webhook received with errors' });
  }
}
