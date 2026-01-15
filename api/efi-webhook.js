// Vercel Serverless Function - EfiBank Webhook
// Recebe notificações de pagamento da EfiBank

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Configurar VAPID para push notifications
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BLDL2Izhy0W6zhF1LpcrNRJ4IhjP6j1j_nWT-oSj8ZUIHjn1w7wMFac8E2AbX_ACm3kpkrm6Kj3FnaCLhqa6n3I';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'oiZgvhtY0BwrrnvIZ7FRl-Bsn65xt2Yrc3p6jIxw7cE';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:contato@appzucropay.com';

try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }
} catch (e) {
  console.error('[Webhook] Erro ao configurar VAPID:', e);
}

// Supabase client
const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase não configurado');
  }
  
  return createClient(url, key, { auth: { persistSession: false } });
};

// ==========================================
// ENVIAR PUSH NOTIFICATION DE VENDA
// ==========================================
const sendSaleNotification = async (supabase, userId, saleValue, description) => {
  try {
    // Buscar subscriptions do usuário
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error || !subscriptions?.length) {
      console.log(`[Push] Sem subscriptions para user: ${userId}`);
      return;
    }

    const formattedValue = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(saleValue);

    // Payload com estilo bonito roxo/branco
    const payload = JSON.stringify({
      title: '💰 Nova Venda Confirmada!',
      body: `${formattedValue} recebido${description ? ` - ${description}` : ''}`,
      icon: '/logotipo.png',
      badge: '/logotipo.png',
      tag: `sale-${Date.now()}`,
      data: {
        type: 'sale',
        value: saleValue,
        url: '/vendas',
        timestamp: new Date().toISOString(),
      },
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }, payload);
        sent++;
      } catch (err) {
        console.error(`[Push] Erro:`, err.statusCode || err.message);
        // Remover subscription inválida
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }
    console.log(`[Push] Notificações enviadas: ${sent}/${subscriptions.length}`);
  } catch (error) {
    console.error('[Push] Erro ao enviar notificação:', error);
  }
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

// Processar pagamento PIX recebido OU enviado
async function processPixPayment(supabase, pixData) {
  try {
    const { txid, valor, horario, pagador, endToEndId, tipo, status, gnExtras } = pixData;

    console.log(`[EfiBank Webhook] PIX: tipo=${tipo}, status=${status}, txid=${txid}, valor=${valor}`);

    // ========================================
    // PIX DE SAÍDA (Saque) - tipo: SOLICITACAO
    // ========================================
    if (tipo === 'SOLICITACAO') {
      const idEnvio = gnExtras?.idEnvio;
      console.log(`[EfiBank Webhook] PIX de saída: idEnvio=${idEnvio}, status=${status}`);

      if (!idEnvio) {
        console.log('[EfiBank Webhook] PIX de saída sem idEnvio, ignorando');
        return;
      }

      // Buscar saque pelo idEnvio (está no admin_notes)
      const { data: withdrawals, error: wError } = await supabase
        .from('withdrawals')
        .select('*')
        .ilike('admin_notes', `%${idEnvio}%`);

      if (wError || !withdrawals?.length) {
        console.log(`[EfiBank Webhook] Saque não encontrado para idEnvio: ${idEnvio}`);
        return;
      }

      const withdrawal = withdrawals[0];

      if (status === 'REALIZADO') {
        // PIX enviado com sucesso!
        console.log(`[EfiBank Webhook] PIX de saque REALIZADO: ${withdrawal.id}`);
        
        await supabase
          .from('withdrawals')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            admin_notes: withdrawal.admin_notes + ' | PIX confirmado: ' + endToEndId
          })
          .eq('id', withdrawal.id);

        // Atualizar transação
        await supabase
          .from('transactions')
          .update({ status: 'completed', description: 'Saque concluído - PIX enviado' })
          .eq('metadata->>withdrawal_id', withdrawal.id)
          .eq('type', 'withdrawal_request');

      } else if (status === 'NAO_REALIZADO') {
        // PIX falhou!
        const erro = gnExtras?.erro;
        const motivoErro = erro?.motivo || 'Erro desconhecido';
        console.log(`[EfiBank Webhook] PIX de saque FALHOU: ${motivoErro}`);

        // Devolver saldo ao usuário
        const { data: user } = await supabase
          .from('users')
          .select('balance')
          .eq('id', withdrawal.user_id)
          .single();

        const refundAmount = parseFloat(withdrawal.amount) + 2.00; // valor + taxa
        const newBalance = parseFloat(user?.balance || 0) + refundAmount;

        await supabase
          .from('users')
          .update({ balance: newBalance })
          .eq('id', withdrawal.user_id);

        // Atualizar saque para falhou
        await supabase
          .from('withdrawals')
          .update({ 
            status: 'rejected',
            rejection_reason: `PIX falhou: ${motivoErro}`,
            admin_notes: withdrawal.admin_notes + ' | ERRO: ' + motivoErro
          })
          .eq('id', withdrawal.id);

        // Criar transação de estorno
        await supabase.from('transactions').insert({
          user_id: withdrawal.user_id,
          type: 'withdrawal_refund',
          amount: refundAmount,
          status: 'completed',
          description: `Estorno - PIX falhou: ${motivoErro}`,
          metadata: { withdrawal_id: withdrawal.id, error: erro },
        });

        // Atualizar transação original
        await supabase
          .from('transactions')
          .update({ status: 'failed', description: `Saque falhou: ${motivoErro}` })
          .eq('metadata->>withdrawal_id', withdrawal.id)
          .eq('type', 'withdrawal_request');

        console.log(`[EfiBank Webhook] Saldo devolvido ao usuário: R$ ${refundAmount.toFixed(2)}`);
      }

      return;
    }

    // ========================================
    // PIX DE ENTRADA (Pagamento recebido)
    // ========================================
    console.log(`[EfiBank Webhook] PIX de entrada: txid=${txid}, valor=${valor}`);

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
    
    // ===== TAXAS DA PLATAFORMA =====
    const PLATFORM_FEE_PERCENT = 0.0599;      // 5.99% base
    const PLATFORM_FEE_FIXED = 2.50;          // R$2.50 por transação (PIX/Boleto)
    const INSTALLMENT_FEE_PERCENT = 0.0249;   // 2.49% por parcela (Cartão)
    
    // ===== RESERVA DE 5% POR 30 DIAS (sobre valor líquido) =====
    const RESERVE_PERCENT = 0.05;
    const RESERVE_DAYS = 30;
    
    // Obter tipo de pagamento e parcelas
    const billingType = payment.billing_type || 'PIX';
    const installments = payment.installments || 1;
    
    // Calcular taxa da plataforma baseada no tipo de pagamento
    let platformFee = paidValue * PLATFORM_FEE_PERCENT; // 5.99% base
    
    if (billingType === 'CREDIT_CARD' || billingType === 'CARTAO') {
      // Cartão: 5.99% + (2.49% × parcelas)
      platformFee += paidValue * INSTALLMENT_FEE_PERCENT * installments;
    } else {
      // PIX/Boleto: 5.99% + R$2.50
      platformFee += PLATFORM_FEE_FIXED;
    }
    
    // Taxa máxima: 50% do valor
    if (platformFee > paidValue * 0.5) {
      platformFee = paidValue * 0.5;
    }
    
    const valueAfterFees = Math.max(0, paidValue - platformFee);
    
    // Calcular reserva sobre o valor líquido (após taxas)
    const reserveAmount = valueAfterFees * RESERVE_PERCENT;
    const netAmount = valueAfterFees - reserveAmount;
    
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() + RESERVE_DAYS);
    
    console.log(`[EfiBank Webhook] Valor bruto: R$${paidValue.toFixed(2)}`);
    console.log(`[EfiBank Webhook] Tipo: ${billingType} | Parcelas: ${installments}`);
    console.log(`[EfiBank Webhook] Taxa plataforma: R$${platformFee.toFixed(2)}`);
    console.log(`[EfiBank Webhook] Valor após taxas: R$${valueAfterFees.toFixed(2)}`);
    console.log(`[EfiBank Webhook] Reserva 5%: R$${reserveAmount.toFixed(2)}`);
    console.log(`[EfiBank Webhook] Valor líquido para usuário: R$${netAmount.toFixed(2)}`);
    
    // Creditar saldo do vendedor (líquido) e reservar (5% do líquido)
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
        
        console.log(`[EfiBank Webhook] Saldo: ${currentBalance} + ${netAmount} = ${newBalance}`);
        console.log(`[EfiBank Webhook] Reserva: ${currentReserved} + ${reserveAmount} = ${newReserved}`);
        
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
            metadata: {
              gross_value: paidValue,
              platform_fee: platformFee,
              value_after_fees: valueAfterFees,
            }
          });

        // Criar transação de crédito
        await supabase.from('transactions').insert({
          user_id: payment.user_id,
          type: 'payment_received',
          amount: paidValue,
          status: 'completed',
          description: `PIX recebido - ${payment.description || 'Venda'} (Taxa: R$${platformFee.toFixed(2)} | Reserva: R$${reserveAmount.toFixed(2)})`,
          metadata: { 
            payment_id: payment.id, 
            txid,
            gross_value: paidValue,
            platform_fee: platformFee,
            platform_fee_percent: PLATFORM_FEE_PERCENT,
            platform_fee_fixed: PLATFORM_FEE_FIXED,
            value_after_fees: valueAfterFees,
            net_amount: netAmount,
            reserve_amount: reserveAmount,
            reserve_release_date: releaseDate.toISOString()
          },
        });
        
        // Registrar taxa da plataforma como transação separada
        await supabase.from('transactions').insert({
          user_id: payment.user_id,
          type: 'platform_fee',
          amount: -platformFee,
          status: 'completed',
          description: `Taxa da plataforma (5.99% + R$2.50) - ${payment.description || 'Venda'}`,
          metadata: { 
            payment_id: payment.id,
            txid,
            gross_value: paidValue,
            fee_percent: PLATFORM_FEE_PERCENT,
            fee_fixed: PLATFORM_FEE_FIXED,
          },
        });
        
        console.log(`[EfiBank Webhook] Saldo e reserva atualizados`);
        
        // ✨ ENVIAR NOTIFICAÇÃO PUSH DE NOVA VENDA
        await sendSaleNotification(supabase, payment.user_id, paidValue, payment.description);
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

    // Se foi pago, creditar saldo (com taxas e reserva)
    if (mappedStatus === 'RECEIVED' && dbPayment.user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('balance, reserved_balance')
        .eq('id', dbPayment.user_id)
        .single();

      if (user) {
        const paidValue = total ? total / 100 : dbPayment.value;
        
        // ===== TAXAS DA PLATAFORMA =====
        const PLATFORM_FEE_PERCENT = 0.0599;      // 5.99% base
        const PLATFORM_FEE_FIXED = 2.50;          // R$2.50 por transação (PIX/Boleto)
        const INSTALLMENT_FEE_PERCENT = 0.0249;   // 2.49% por parcela (Cartão)
        
        // ===== RESERVA DE 5% POR 30 DIAS (sobre valor líquido) =====
        const RESERVE_PERCENT = 0.05;
        const RESERVE_DAYS = 30;
        
        // Obter tipo de pagamento e parcelas
        const billingType = dbPayment.billing_type || 'BOLETO';
        const installments = dbPayment.installments || 1;
        
        // Calcular taxa da plataforma baseada no tipo de pagamento
        let platformFee = paidValue * PLATFORM_FEE_PERCENT; // 5.99% base
        
        if (billingType === 'CREDIT_CARD' || billingType === 'CARTAO') {
          // Cartão: 5.99% + (2.49% × parcelas)
          platformFee += paidValue * INSTALLMENT_FEE_PERCENT * installments;
        } else {
          // PIX/Boleto: 5.99% + R$2.50
          platformFee += PLATFORM_FEE_FIXED;
        }
        
        // Taxa máxima: 50% do valor
        if (platformFee > paidValue * 0.5) {
          platformFee = paidValue * 0.5;
        }
        
        const valueAfterFees = Math.max(0, paidValue - platformFee);
        
        // Calcular reserva sobre o valor líquido (após taxas)
        const reserveAmount = valueAfterFees * RESERVE_PERCENT;
        const netAmount = valueAfterFees - reserveAmount;
        
        const releaseDate = new Date();
        releaseDate.setDate(releaseDate.getDate() + RESERVE_DAYS);
        
        console.log(`[EfiBank Webhook] Cobrança - Valor bruto: R$${paidValue.toFixed(2)}`);
        console.log(`[EfiBank Webhook] Cobrança - Tipo: ${billingType} | Parcelas: ${installments}`);
        console.log(`[EfiBank Webhook] Cobrança - Taxa plataforma: R$${platformFee.toFixed(2)}`);
        console.log(`[EfiBank Webhook] Cobrança - Reserva 5%: R$${reserveAmount.toFixed(2)}`);
        console.log(`[EfiBank Webhook] Cobrança - Valor líquido: R$${netAmount.toFixed(2)}`);
        
        const currentBalance = parseFloat(user.balance || 0);
        const currentReserved = parseFloat(user.reserved_balance || 0);
        const newBalance = currentBalance + netAmount;
        const newReserved = currentReserved + reserveAmount;
        
        await supabase
          .from('users')
          .update({ 
            balance: newBalance,
            reserved_balance: newReserved
          })
          .eq('id', dbPayment.user_id);

        // Criar registro de reserva
        await supabase
          .from('balance_reserves')
          .insert({
            user_id: dbPayment.user_id,
            payment_id: dbPayment.id,
            original_amount: paidValue,
            reserve_amount: reserveAmount,
            status: 'held',
            release_date: releaseDate.toISOString(),
            description: `Reserva 5% - ${dbPayment.description || 'Cobrança recebida'}`,
            metadata: {
              gross_value: paidValue,
              platform_fee: platformFee,
              value_after_fees: valueAfterFees,
            }
          });

        // Criar transação de crédito
        await supabase.from('transactions').insert({
          user_id: dbPayment.user_id,
          type: 'payment_received',
          amount: paidValue,
          status: 'completed',
          description: `Pagamento recebido - ${dbPayment.description || 'Venda'} (Taxa: R$${platformFee.toFixed(2)} | Reserva: R$${reserveAmount.toFixed(2)})`,
          metadata: { 
            payment_id: dbPayment.id, 
            charge_id,
            gross_value: paidValue,
            platform_fee: platformFee,
            platform_fee_percent: PLATFORM_FEE_PERCENT,
            platform_fee_fixed: PLATFORM_FEE_FIXED,
            value_after_fees: valueAfterFees,
            net_amount: netAmount,
            reserve_amount: reserveAmount,
            reserve_release_date: releaseDate.toISOString()
          },
        });
        
        // Registrar taxa da plataforma como transação separada
        await supabase.from('transactions').insert({
          user_id: dbPayment.user_id,
          type: 'platform_fee',
          amount: -platformFee,
          status: 'completed',
          description: `Taxa da plataforma (5.99% + R$2.50) - ${dbPayment.description || 'Venda'}`,
          metadata: { 
            payment_id: dbPayment.id,
            charge_id,
            gross_value: paidValue,
            fee_percent: PLATFORM_FEE_PERCENT,
            fee_fixed: PLATFORM_FEE_FIXED,
          },
        });
        
        // ✨ ENVIAR NOTIFICAÇÃO PUSH DE NOVA VENDA
        await sendSaleNotification(supabase, dbPayment.user_id, paidValue, dbPayment.description);
      }
    }

    console.log(`[EfiBank Webhook] Cobrança processada: charge_id=${charge_id}, status=${mappedStatus}`);

  } catch (error) {
    console.error('[EfiBank Webhook] Erro ao processar cobrança:', error);
  }
}

