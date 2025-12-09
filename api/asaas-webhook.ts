// Vercel Serverless Function - Webhook do Asaas
// URL: https://dashboard.appzucropay.com/api/asaas-webhook

import type { VercelRequest, VercelResponse } from '@vercel/node';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface WebhookPayload {
  event: string;
  payment?: {
    id: string;
    status: string;
    value: number;
    netValue: number;
    customer: string;
    paymentDate?: string;
    externalReference?: string;
  };
  transfer?: {
    id: string;
    status: string;
    value: number;
  };
}

// Função para criar cliente Supabase dinamicamente
async function getSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(200).json({ ok: true });
  }

  // Adicionar headers CORS
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // GET para teste
  if (req.method === 'GET') {
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook endpoint is working',
      configured: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
    });
  }

  // Apenas POST é permitido para webhooks
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase not configured');
      return res.status(200).json({ success: false, message: 'Supabase not configured' });
    }

    const supabase = await getSupabaseClient();
    const payload: WebhookPayload = req.body;

    console.log('Webhook received:', payload.event, payload);

    // Salvar no log de webhooks (opcional)
    try {
      await supabase.from('webhooks_log').insert({
        event_type: payload.event || 'unknown',
        payload: payload,
        processed: false,
      });
    } catch (e) {
      console.log('webhooks_log table may not exist, continuing...');
    }

    // Processar webhook baseado no evento
    switch (payload.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED_IN_CASH':
        await processPaymentReceived(supabase, payload);
        break;

      case 'PAYMENT_OVERDUE':
        await processPaymentOverdue(supabase, payload);
        break;

      case 'PAYMENT_REFUNDED':
        await processPaymentRefunded(supabase, payload);
        break;

      case 'TRANSFER_FINISHED':
        await processTransferFinished(supabase, payload);
        break;

      default:
        console.log(`Evento não tratado: ${payload.event}`);
    }

    // Disparar webhooks configurados pelos usuários
    await dispatchUserWebhooks(supabase, payload);

    return res.status(200).json({ success: true, message: 'Webhook processed' });

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    // Retornar 200 para não reenviar
    return res.status(200).json({ success: false, error: error.message });
  }
}

async function processPaymentReceived(supabase: any, payload: WebhookPayload) {
  if (!payload.payment) return;

  const paymentId = payload.payment.id;

  // Verificar se é um depósito (transação pending do tipo deposit)
  const { data: depositTransaction } = await supabase
    .from('transactions')
    .select('*')
    .eq('asaas_payment_id', paymentId)
    .eq('type', 'deposit')
    .eq('status', 'pending')
    .single();

  if (depositTransaction) {
    // É um depósito - atualizar transação
    await supabase
      .from('transactions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', depositTransaction.id);

    // Adicionar saldo ao usuário
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
    // É venda de produto/link - atualizar pagamento
    await supabase
      .from('payments')
      .update({ 
        status: payload.payment.status,
        payment_date: payload.payment.paymentDate || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('asaas_payment_id', paymentId);

    // Buscar dados do pagamento
    const { data: payment } = await supabase
      .from('payments')
      .select('user_id, value')
      .eq('asaas_payment_id', paymentId)
      .single();

    if (payment) {
      // Verificar se já existe transação
      const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('id')
        .eq('asaas_payment_id', paymentId)
        .single();

      if (!existingTransaction) {
        // Criar transação
        await supabase.from('transactions').insert({
          user_id: payment.user_id,
          type: 'payment_received',
          amount: payment.value,
          status: 'completed',
          description: 'Pagamento recebido via Asaas',
          asaas_payment_id: paymentId,
        });

        // Atualizar saldo
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
  }
}

async function processPaymentOverdue(supabase: any, payload: WebhookPayload) {
  if (!payload.payment) return;

  await supabase
    .from('payments')
    .update({ 
      status: 'OVERDUE',
      updated_at: new Date().toISOString()
    })
    .eq('asaas_payment_id', payload.payment.id);
}

async function processPaymentRefunded(supabase: any, payload: WebhookPayload) {
  if (!payload.payment) return;

  const paymentId = payload.payment.id;

  await supabase
    .from('payments')
    .update({ 
      status: 'REFUNDED',
      updated_at: new Date().toISOString()
    })
    .eq('asaas_payment_id', paymentId);

  const { data: payment } = await supabase
    .from('payments')
    .select('user_id, value')
    .eq('asaas_payment_id', paymentId)
    .single();

  if (payment) {
    await supabase.from('transactions').insert({
      user_id: payment.user_id,
      type: 'refund',
      amount: -payment.value,
      status: 'completed',
      description: 'Reembolso de pagamento',
      asaas_payment_id: paymentId,
    });

    const { data: user } = await supabase
      .from('users')
      .select('balance')
      .eq('id', payment.user_id)
      .single();

    if (user) {
      await supabase
        .from('users')
        .update({ 
          balance: Number(user.balance) - Number(payment.value),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.user_id);
    }
  }
}

async function processTransferFinished(supabase: any, payload: WebhookPayload) {
  if (!payload.transfer) return;

  await supabase
    .from('transactions')
    .update({ 
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('asaas_transfer_id', payload.transfer.id);
}

async function dispatchUserWebhooks(supabase: any, payload: WebhookPayload) {
  // Buscar webhooks ativos que escutam este evento
  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('*')
    .eq('status', 'active')
    .contains('events', [payload.event]);

  if (!webhooks || webhooks.length === 0) return;

  // Disparar para cada webhook
  for (const webhook of webhooks) {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhook.secret || '',
        },
        body: JSON.stringify(payload),
      });

      // Atualizar status do webhook
      await supabase
        .from('webhooks')
        .update({
          last_triggered_at: new Date().toISOString(),
          last_success_at: response.ok ? new Date().toISOString() : undefined,
          last_failure_at: !response.ok ? new Date().toISOString() : undefined,
          failure_count: response.ok ? 0 : (webhook.failure_count || 0) + 1,
        })
        .eq('id', webhook.id);

    } catch (error) {
      console.error(`Failed to dispatch webhook to ${webhook.url}:`, error);
      
      await supabase
        .from('webhooks')
        .update({
          last_triggered_at: new Date().toISOString(),
          last_failure_at: new Date().toISOString(),
          failure_count: (webhook.failure_count || 0) + 1,
        })
        .eq('id', webhook.id);
    }
  }
}

