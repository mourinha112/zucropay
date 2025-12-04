// Supabase Edge Function para processar pagamentos públicos
// Deploy: supabase functions deploy public-payment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { asaasCreatePayment, asaasGetPixQrCode, asaasCreateCustomer } from '../_shared/asaas.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const payload = await req.json();
    const { linkId, customer, billingType, creditCard } = payload;

    // Buscar payment link
    const { data: paymentLink, error: linkError } = await supabaseClient
      .from('payment_links')
      .select('*, user:users!payment_links_user_id_fkey(asaas_api_key)')
      .eq('id', linkId)
      .eq('active', true)
      .single();

    if (linkError || !paymentLink) {
      return new Response(
        JSON.stringify({ success: false, message: 'Link de pagamento não encontrado' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Pegar API key do usuário ou usar a padrão
    const apiKey = paymentLink.user?.asaas_api_key || Deno.env.get('ASAAS_API_KEY');

    // Criar ou buscar cliente no Asaas
    const customerResponse = await asaasCreateCustomer(
      customer.name,
      customer.cpfCnpj.replace(/\D/g, ''),
      customer.email,
      customer.phone,
      apiKey
    );

    if (!customerResponse.success) {
      return new Response(
        JSON.stringify({ success: false, message: 'Erro ao criar cliente' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const asaasCustomerId = customerResponse.data.id;

    // Preparar dados do pagamento
    const extraData: any = {};
    
    if (billingType === 'CREDIT_CARD' && creditCard) {
      extraData.creditCard = {
        holderName: creditCard.name,
        number: creditCard.number,
        expiryMonth: creditCard.expiryMonth,
        expiryYear: creditCard.expiryYear,
        ccv: creditCard.ccv,
      };
      extraData.creditCardHolderInfo = {
        name: customer.name,
        email: customer.email,
        cpfCnpj: customer.cpfCnpj.replace(/\D/g, ''),
        phone: customer.phone,
      };
    }

    // Criar pagamento no Asaas
    const paymentResponse = await asaasCreatePayment(
      asaasCustomerId,
      billingType,
      paymentLink.amount,
      new Date().toISOString().split('T')[0],
      paymentLink.description,
      extraData,
      apiKey
    );

    if (!paymentResponse.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Erro ao criar pagamento',
          details: paymentResponse.data 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const payment = paymentResponse.data;

    // Salvar no banco
    await supabaseClient.from('payments').insert({
      user_id: paymentLink.user_id,
      asaas_payment_id: payment.id,
      billing_type: billingType,
      value: paymentLink.amount,
      description: paymentLink.description,
      due_date: payment.dueDate,
      status: payment.status,
      invoice_url: payment.invoiceUrl,
      bank_slip_url: payment.bankSlipUrl,
    });

    // Se for PIX, buscar QR Code
    let pixData = null;
    if (billingType === 'PIX') {
      const pixResponse = await asaasGetPixQrCode(payment.id, apiKey);
      if (pixResponse.success) {
        pixData = pixResponse.data;
        
        // Salvar PIX no pagamento
        await supabaseClient
          .from('payments')
          .update({
            pix_qrcode: pixData.encodedImage,
            pix_copy_paste: pixData.payload,
          })
          .eq('asaas_payment_id', payment.id);
      }
    }

    // Incrementar contador de cliques
    await supabaseClient
      .from('payment_links')
      .update({ payments_count: paymentLink.payments_count + 1 })
      .eq('id', linkId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pagamento criado com sucesso',
        payment: {
          id: payment.id,
          status: payment.status,
          invoiceUrl: payment.invoiceUrl,
          bankSlipUrl: payment.bankSlipUrl,
        },
        pix: pixData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing public payment:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

