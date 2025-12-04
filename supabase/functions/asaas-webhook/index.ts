// Supabase Edge Function para processar webhooks do Asaas
// Deploy: supabase functions deploy asaas-webhook

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  };
  transfer?: {
    id: string;
    status: string;
    value: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WebhookPayload = await req.json();

    // Salvar no log de webhooks
    await supabaseClient.from('webhooks_log').insert({
      event_type: payload.event || 'unknown',
      payload: payload,
      processed: false,
    });

    // Processar webhook baseado no evento
    switch (payload.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED_IN_CASH':
        await processPaymentReceived(supabaseClient, payload);
        break;

      case 'PAYMENT_OVERDUE':
        await processPaymentOverdue(supabaseClient, payload);
        break;

      case 'PAYMENT_REFUNDED':
        await processPaymentRefunded(supabaseClient, payload);
        break;

      case 'TRANSFER_FINISHED':
        await processTransferFinished(supabaseClient, payload);
        break;

      default:
        console.log(`Evento não tratado: ${payload.event}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Retornar 200 para não reenviar
      }
    );
  }
});

async function processPaymentReceived(supabaseClient: any, payload: WebhookPayload) {
  if (!payload.payment) return;

  const paymentId = payload.payment.id;

  // Verificar se é um depósito (transação pending do tipo deposit)
  const { data: depositTransaction } = await supabaseClient
    .from('transactions')
    .select('*')
    .eq('asaas_payment_id', paymentId)
    .eq('type', 'deposit')
    .eq('status', 'pending')
    .single();

  if (depositTransaction) {
    // É um depósito - atualizar transação
    await supabaseClient
      .from('transactions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', depositTransaction.id);

    // Adicionar saldo ao usuário
    const { data: user } = await supabaseClient
      .from('users')
      .select('balance')
      .eq('id', depositTransaction.user_id)
      .single();

    if (user) {
      await supabaseClient
        .from('users')
        .update({ 
          balance: Number(user.balance) + Number(depositTransaction.amount),
          updated_at: new Date().toISOString()
        })
        .eq('id', depositTransaction.user_id);
    }

    console.log(`Depósito confirmado: R$ ${depositTransaction.amount} para usuário ${depositTransaction.user_id}`);
  } else {
    // Não é depósito, é venda de produto/link - atualizar pagamento
    await supabaseClient
      .from('payments')
      .update({ 
        status: payload.payment.status,
        payment_date: payload.payment.paymentDate || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('asaas_payment_id', paymentId);

    // Buscar dados do pagamento
    const { data: payment } = await supabaseClient
      .from('payments')
      .select('user_id, value')
      .eq('asaas_payment_id', paymentId)
      .single();

    if (payment) {
      // Verificar se já existe transação
      const { data: existingTransaction } = await supabaseClient
        .from('transactions')
        .select('id')
        .eq('asaas_payment_id', paymentId)
        .single();

      if (!existingTransaction) {
        // Criar transação
        await supabaseClient.from('transactions').insert({
          user_id: payment.user_id,
          type: 'payment_received',
          amount: payment.value,
          status: 'completed',
          description: 'Pagamento recebido via Asaas',
          asaas_payment_id: paymentId,
        });

        // Atualizar saldo
        const { data: user } = await supabaseClient
          .from('users')
          .select('balance')
          .eq('id', payment.user_id)
          .single();

        if (user) {
          await supabaseClient
            .from('users')
            .update({ 
              balance: Number(user.balance) + Number(payment.value),
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.user_id);
        }

        console.log(`Venda confirmada: R$ ${payment.value} para usuário ${payment.user_id}`);
      }
    }
  }
}

async function processPaymentOverdue(supabaseClient: any, payload: WebhookPayload) {
  if (!payload.payment) return;

  await supabaseClient
    .from('payments')
    .update({ 
      status: 'OVERDUE',
      updated_at: new Date().toISOString()
    })
    .eq('asaas_payment_id', payload.payment.id);
}

async function processPaymentRefunded(supabaseClient: any, payload: WebhookPayload) {
  if (!payload.payment) return;

  const paymentId = payload.payment.id;

  // Atualizar status do pagamento
  await supabaseClient
    .from('payments')
    .update({ 
      status: 'REFUNDED',
      updated_at: new Date().toISOString()
    })
    .eq('asaas_payment_id', paymentId);

  // Buscar dados do pagamento
  const { data: payment } = await supabaseClient
    .from('payments')
    .select('user_id, value')
    .eq('asaas_payment_id', paymentId)
    .single();

  if (payment) {
    // Criar transação de reembolso
    await supabaseClient.from('transactions').insert({
      user_id: payment.user_id,
      type: 'refund',
      amount: -payment.value,
      status: 'completed',
      description: 'Reembolso de pagamento',
      asaas_payment_id: paymentId,
    });

    // Subtrair do saldo
    const { data: user } = await supabaseClient
      .from('users')
      .select('balance')
      .eq('id', payment.user_id)
      .single();

    if (user) {
      await supabaseClient
        .from('users')
        .update({ 
          balance: Number(user.balance) - Number(payment.value),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.user_id);
    }
  }
}

async function processTransferFinished(supabaseClient: any, payload: WebhookPayload) {
  if (!payload.transfer) return;

  await supabaseClient
    .from('transactions')
    .update({ 
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('asaas_transfer_id', payload.transfer.id);
}

