// Vercel Serverless Function - EfiBank Webhook
// Recebe notificações de pagamento da EfiBank

import { createClient } from '@supabase/supabase-js';

// Supabase client
const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase não configurado');
  }
  
  return createClient(url, key, { auth: { persistSession: false } });
};

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET para verificar se webhook está ativo (EfiBank faz isso)
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'EfiBank Webhook ativo',
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const supabase = getSupabase();
    const payload = req.body;

    console.log('[EfiBank Webhook] Payload recebido:', JSON.stringify(payload, null, 2));

    // Log do webhook
    await supabase.from('webhooks_log').insert({
      event_type: 'efibank_notification',
      payload: payload,
      processed: false,
    });

    // Processar notificação PIX
    if (payload.pix && Array.isArray(payload.pix)) {
      for (const pix of payload.pix) {
        await processPixPayment(supabase, pix);
      }
    }

    // Processar notificação de cobrança (cartão/boleto)
    if (payload.data && payload.data.charge_id) {
      await processChargeNotification(supabase, payload.data);
    }

    // EfiBank espera 200 OK
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[EfiBank Webhook] Error:', error);
    // Mesmo com erro, retornar 200 para não reprocessar
    return res.status(200).json({ success: false, message: error.message });
  }
}

// Processar pagamento PIX recebido
async function processPixPayment(supabase, pixData) {
  try {
    const { txid, valor, horario, pagador, endToEndId } = pixData;

    console.log(`[EfiBank Webhook] PIX recebido: txid=${txid}, valor=${valor}`);

    // Buscar pagamento pelo txid
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, users(*)')
      .eq('efi_txid', txid)
      .single();

    if (paymentError || !payment) {
      console.log(`[EfiBank Webhook] Pagamento não encontrado para txid: ${txid}`);
      return;
    }

    // Atualizar status do pagamento
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'RECEIVED',
        payment_date: horario,
        net_value: parseFloat(valor),
        metadata: {
          ...payment.metadata,
          efi_end_to_end_id: endToEndId,
          efi_pagador: pagador,
        },
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('[EfiBank Webhook] Erro ao atualizar pagamento:', updateError);
      return;
    }

    const paidValue = parseFloat(valor);
    
    // ===== RESERVA DE 5% POR 30 DIAS =====
    const RESERVE_PERCENT = 0.05;
    const RESERVE_DAYS = 30;
    
    const reserveAmount = paidValue * RESERVE_PERCENT;
    const netAmount = paidValue - reserveAmount;
    
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() + RESERVE_DAYS);
    
    // Creditar saldo do vendedor (95%) e reservar (5%)
    if (payment.user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('balance, reserved_balance')
        .eq('id', payment.user_id)
        .single();

      if (user) {
        const currentBalance = parseFloat(user.balance || 0);
        const currentReserved = parseFloat(user.reserved_balance || 0);
        const newBalance = currentBalance + netAmount;
        const newReserved = currentReserved + reserveAmount;
        
        console.log(`[EfiBank Webhook] Saldo: ${currentBalance} + ${netAmount} (95%) = ${newBalance}`);
        console.log(`[EfiBank Webhook] Reserva: ${currentReserved} + ${reserveAmount} (5%) = ${newReserved}`);
        
        await supabase
          .from('users')
          .update({ 
            balance: newBalance,
            reserved_balance: newReserved
          })
          .eq('id', payment.user_id);

        // Criar registro de reserva
        await supabase
          .from('balance_reserves')
          .insert({
            user_id: payment.user_id,
            payment_id: payment.id,
            original_amount: paidValue,
            reserve_amount: reserveAmount,
            status: 'held',
            release_date: releaseDate.toISOString(),
            description: `Reserva 5% - ${payment.description || 'PIX recebido'}`,
          });

        // Criar transação de crédito
        await supabase.from('transactions').insert({
          user_id: payment.user_id,
          type: 'payment_received',
          amount: paidValue,
          status: 'completed',
          description: `PIX recebido - ${payment.description || 'Venda'} (5% em reserva)`,
          metadata: { 
            payment_id: payment.id, 
            txid,
            net_amount: netAmount,
            reserve_amount: reserveAmount,
            reserve_release_date: releaseDate.toISOString()
          },
        });
        
        console.log(`[EfiBank Webhook] Saldo e reserva atualizados`);
      }
    }

    // Atualizar payment_link se existir
    const linkId = payment.payment_link_id || payment.metadata?.link_id;
    if (linkId) {
      const { data: link } = await supabase
        .from('payment_links')
        .select('total_received')
        .eq('id', linkId)
        .single();

      if (link) {
        const newTotal = parseFloat(link.total_received || 0) + paidValue;
        await supabase
          .from('payment_links')
          .update({ total_received: newTotal })
          .eq('id', linkId);
        
        console.log(`[EfiBank Webhook] Link atualizado: total_received=${newTotal}`);
      }
    }

    // Marcar webhook como processado
    await supabase
      .from('webhooks_log')
      .update({ processed: true })
      .eq('payload->pix->0->txid', txid);

    console.log(`[EfiBank Webhook] ✅ PIX processado com sucesso: txid=${txid}`);

  } catch (error) {
    console.error('[EfiBank Webhook] Erro ao processar PIX:', error);
  }
}

// Processar notificação de cobrança (cartão/boleto)
async function processChargeNotification(supabase, chargeData) {
  try {
    const { charge_id, status, total, payment } = chargeData;

    console.log(`[EfiBank Webhook] Cobrança: charge_id=${charge_id}, status=${status}`);

    // Mapear status da EfiBank para nosso sistema
    const statusMap = {
      'new': 'PENDING',
      'waiting': 'PENDING',
      'approved': 'RECEIVED',
      'paid': 'RECEIVED',
      'unpaid': 'OVERDUE',
      'refunded': 'REFUNDED',
      'contested': 'CHARGEBACK_REQUESTED',
      'canceled': 'CANCELLED',
    };

    const mappedStatus = statusMap[status] || status.toUpperCase();

    // Buscar pagamento pelo charge_id
    const { data: dbPayment, error: paymentError } = await supabase
      .from('payments')
      .select('*, users(*)')
      .eq('efi_charge_id', charge_id)
      .single();

    if (paymentError || !dbPayment) {
      console.log(`[EfiBank Webhook] Pagamento não encontrado para charge_id: ${charge_id}`);
      return;
    }

    // Atualizar status
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: mappedStatus,
        net_value: total ? total / 100 : dbPayment.value, // EfiBank envia em centavos
        payment_date: mappedStatus === 'RECEIVED' ? new Date().toISOString() : null,
        metadata: {
          ...dbPayment.metadata,
          efi_payment_info: payment,
        },
      })
      .eq('id', dbPayment.id);

    if (updateError) {
      console.error('[EfiBank Webhook] Erro ao atualizar cobrança:', updateError);
      return;
    }

    // Se foi pago, creditar saldo
    if (mappedStatus === 'RECEIVED' && dbPayment.user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('id', dbPayment.user_id)
        .single();

      if (user) {
        const valueToCredit = total ? total / 100 : dbPayment.value;
        const newBalance = parseFloat(user.balance || 0) + valueToCredit;
        
        await supabase
          .from('users')
          .update({ balance: newBalance })
          .eq('id', dbPayment.user_id);

        await supabase.from('transactions').insert({
          user_id: dbPayment.user_id,
          type: 'payment_received',
          amount: valueToCredit,
          status: 'completed',
          description: `Pagamento recebido - ${dbPayment.description || 'Venda'}`,
          metadata: { payment_id: dbPayment.id, charge_id },
        });
      }
    }

    console.log(`[EfiBank Webhook] Cobrança processada: charge_id=${charge_id}, status=${mappedStatus}`);

  } catch (error) {
    console.error('[EfiBank Webhook] Erro ao processar cobrança:', error);
  }
}

