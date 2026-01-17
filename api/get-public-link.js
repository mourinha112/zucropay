// Vercel Serverless Function - Get Public Payment Link
// Endpoint: GET /api/get-public-link?id=xxx
// Este endpoint é PÚBLICO e não requer autenticação

import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // IMPORTANTE: Usar SERVICE_ROLE_KEY para bypassar RLS
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  
  if (!url) {
    throw new Error('SUPABASE_URL não configurado');
  }
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado');
  }
  
  return createClient(url, key, { auth: { persistSession: false } });
};

export default async function handler(req, res) {
  // CORS headers - permitir acesso público
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use GET.' 
    });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Link ID is required'
      });
    }

    const supabase = getSupabase();

    // Buscar o link de pagamento com dados do produto e user_id
    const { data: link, error: linkError } = await supabase
      .from('payment_links')
      .select(`
        id,
        name,
        description,
        amount,
        billing_type,
        active,
        product_id,
        user_id,
        products (
          id,
          name,
          description,
          price,
          image_url,
          fee_payer
        )
      `)
      .eq('id', id)
      .eq('active', true)
      .single();

    if (linkError || !link) {
      console.log('[get-public-link] Link not found:', id, linkError);
      return res.status(404).json({
        success: false,
        error: 'Link de pagamento não encontrado ou inativo'
      });
    }

    // Buscar taxas personalizadas do vendedor
    let sellerRates = {
      pix_rate: 5.99,
      card_rate: 5.99,
      boleto_rate: 5.99,
      fixed_fee: 2.50,
      installment_fee: 2.49,
    };

    if (link.user_id) {
      const { data: customRates } = await supabase
        .from('user_custom_rates')
        .select('pix_rate, card_rate, boleto_rate')
        .eq('user_id', link.user_id)
        .maybeSingle();
      
      if (customRates) {
        sellerRates = {
          pix_rate: customRates.pix_rate !== null ? parseFloat(customRates.pix_rate) : 5.99,
          card_rate: customRates.card_rate !== null ? parseFloat(customRates.card_rate) : 5.99,
          boleto_rate: customRates.boleto_rate !== null ? parseFloat(customRates.boleto_rate) : 5.99,
          fixed_fee: 2.50,
          installment_fee: 2.49,
        };
        console.log('[get-public-link] Taxas personalizadas do vendedor:', sellerRates);
      }
    }

    // Mapear dados para o formato esperado pelo checkout
    const response = {
      id: link.id,
      name: link.name,
      description: link.description,
      amount: link.amount,
      value: link.amount,
      billingType: link.billing_type,
      productId: link.product_id,
      productName: link.products?.name || link.name,
      productDescription: link.products?.description || link.description,
      productImage: link.products?.image_url,
      productPrice: link.products?.price || link.amount,
      fee_payer: link.products?.fee_payer || 'seller', // Quem paga a taxa
      product: link.products, // Dados completos do produto
      sellerRates: sellerRates, // Taxas do vendedor (personalizadas ou padrão)
    };

    console.log('[get-public-link] Success:', id);

    return res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('[get-public-link] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

