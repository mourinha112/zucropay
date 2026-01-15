import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Configurar VAPID para push notifications
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'Dl-lJhF_kE-O8gT-mSLcVxpRdwAY3bxGLTaJNE1Qz2I';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:contato@appzucropay.com';

try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }
} catch (e) {
  console.log('[Dashboard] VAPID config error:', e.message);
}

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Inicializar Supabase
const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase não configurado');
  }
  
  return createClient(url, key);
};

// Extrair userId do token JWT
const getUserIdFromToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.userId || payload.sub || payload.id;
  } catch (error) {
    console.error('[Dashboard API] Erro ao decodificar token:', error);
    return null;
  }
};

export default async function handler(req, res) {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: 'Token inválido ou não fornecido' });
  }

  const supabase = getSupabase();
  const { type } = req.query; // ?type=verification, ?type=push

  try {
    // ========================================
    // PUSH NOTIFICATIONS (integrado)
    // ========================================
    
    if (type === 'push') {
      // POST - Subscribe/Unsubscribe
      if (req.method === 'POST') {
        const { action, subscription, endpoint } = req.body;

        if (action === 'subscribe' && subscription) {
          // Verificar se já existe
          const { data: existing } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', userId)
            .eq('endpoint', subscription.endpoint)
            .single();

          if (existing) {
            await supabase
              .from('push_subscriptions')
              .update({
                p256dh: subscription.keys?.p256dh,
                auth: subscription.keys?.auth,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
            return res.status(200).json({ success: true, message: 'Subscription atualizada' });
          }

          const { error: insertError } = await supabase
            .from('push_subscriptions')
            .insert({
              user_id: userId,
              endpoint: subscription.endpoint,
              p256dh: subscription.keys?.p256dh,
              auth: subscription.keys?.auth,
              user_agent: req.headers['user-agent'] || 'unknown',
            });

          if (insertError) throw insertError;
          console.log(`[Push] Nova subscription criada para user: ${userId}`);
          return res.status(201).json({ success: true, message: 'Subscription criada' });
        }

        if (action === 'unsubscribe' && endpoint) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', endpoint);
          return res.status(200).json({ success: true, message: 'Subscription removida' });
        }

        return res.status(400).json({ success: false, error: 'Ação inválida' });
      }

      // GET - Listar subscriptions
      if (req.method === 'GET') {
        const { data: subscriptions, error } = await supabase
          .from('push_subscriptions')
          .select('id, endpoint, created_at, user_agent')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return res.status(200).json({
          success: true,
          subscriptions: subscriptions || [],
          count: subscriptions?.length || 0,
        });
      }
    }

    // ========================================
    // VERIFICAÇÃO DE USUÁRIO (integrado)
    // ========================================
    
    // GET ?type=verification - Buscar status de verificação
    if (req.method === 'GET' && type === 'verification') {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, email, cpf_cnpj, phone, verification_status, verification_rejection_reason')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      const { data: verification } = await supabase
        .from('user_verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          cpf_cnpj: user.cpf_cnpj,
          phone: user.phone,
          verification_status: user.verification_status || 'pending',
          verification_rejection_reason: user.verification_rejection_reason
        },
        verification: verification || null
      });
    }

    // POST - Enviar documentos de verificação
    if (req.method === 'POST') {
      const { 
        document_type, 
        document_front_url, 
        document_back_url, 
        selfie_url, 
        full_name, 
        birth_date, 
        document_number 
      } = req.body;

      if (!document_type || !document_front_url || !selfie_url || !full_name || !birth_date || !document_number) {
        return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
      }

      const { data: existingVerification } = await supabase
        .from('user_verifications')
        .select('id, status')
        .eq('user_id', userId)
        .in('status', ['pending', 'approved'])
        .single();

      if (existingVerification) {
        if (existingVerification.status === 'approved') {
          return res.status(400).json({ error: 'Sua conta já está verificada' });
        }
        return res.status(400).json({ error: 'Você já possui uma verificação pendente' });
      }

      const { data: newVerification, error: insertError } = await supabase
        .from('user_verifications')
        .insert({
          user_id: userId,
          document_type,
          document_front_url,
          document_back_url: document_back_url || null,
          selfie_url,
          full_name,
          birth_date,
          document_number,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase
        .from('users')
        .update({ 
          verification_status: 'submitted',
          verification_submitted_at: new Date().toISOString()
        })
        .eq('id', userId);

      console.log('[VERIFICATION] Nova verificação enviada:', newVerification.id, 'Usuário:', userId);

      return res.status(201).json({
        success: true,
        message: 'Documentos enviados com sucesso! Aguarde a análise.',
        verification: newVerification
      });
    }

    // PUT - Atualizar dados do perfil
    if (req.method === 'PUT') {
      const { name, phone, cpf_cnpj } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (cpf_cnpj) updateData.cpf_cnpj = cpf_cnpj;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'Dados atualizados com sucesso!',
        user: data
      });
    }

    // ========================================
    // DASHBOARD DATA (padrão GET)
    // ========================================
    
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Buscar dados em paralelo (muito mais rápido!)
    const [userResult, paymentsResult, linksResult, reservesResult, transactionsResult] = await Promise.all([
      // Saldo do usuário e status de verificação
      supabase
        .from('users')
        .select('balance, reserved_balance, name, email, cpf_cnpj, phone, verification_status, verification_rejection_reason')
        .eq('id', userId)
        .single(),
      
      // Pagamentos do usuário (últimos 90 dias para gráficos)
      supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),
      
      // Links de pagamento
      supabase
        .from('payment_links')
        .select('id, name, amount, total_received, payments_count, active')
        .eq('user_id', userId)
        .eq('active', true)
        .limit(10),
      
      // Reservas pendentes
      supabase
        .from('balance_reserves')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'held')
        .order('release_date', { ascending: true }),
      
      // Transações do usuário (últimas 50)
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    const user = userResult.data;
    const payments = paymentsResult.data || [];
    const links = linksResult.data || [];
    const reserves = reservesResult.data || [];
    const transactions = transactionsResult.data || [];

    // Calcular dados de reserva
    const reservesTotal = reserves.reduce((sum, r) => sum + parseFloat(r.reserve_amount || 0), 0);
    const totalReserved = parseFloat(user?.reserved_balance || 0) || reservesTotal;
    const nextRelease = reserves.length > 0 ? reserves[0] : null;
    const reservesCount = reserves.length > 0 ? reserves.length : (totalReserved > 0 ? 1 : 0);

    // Calcular estatísticas
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const confirmedPayments = payments.filter(p => 
      p.status === 'RECEIVED' || p.status === 'CONFIRMED'
    );

    const todaySales = confirmedPayments.filter(p => 
      new Date(p.created_at) >= todayStart
    );

    const monthSales = confirmedPayments.filter(p => 
      new Date(p.created_at) >= monthStart
    );

    // Contar por método de pagamento
    const paymentMethods = {
      PIX: { count: 0, total: 0 },
      CREDIT_CARD: { count: 0, total: 0 },
      BOLETO: { count: 0, total: 0 },
    };

    confirmedPayments.forEach(p => {
      const type = p.billing_type || 'PIX';
      if (paymentMethods[type]) {
        paymentMethods[type].count++;
        paymentMethods[type].total += parseFloat(p.value || 0);
      }
    });

    // Dados para gráfico (últimos 30 dias)
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const daySales = confirmedPayments.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate >= date && paymentDate < nextDate;
      });
      
      chartData.push({
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        value: daySales.reduce((sum, p) => sum + parseFloat(p.value || 0), 0),
        count: daySales.length,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: userId,
          name: user?.name || 'Usuário',
          email: user?.email,
          cpf_cnpj: user?.cpf_cnpj,
          phone: user?.phone,
          balance: parseFloat(user?.balance || 0),
          reservedBalance: parseFloat(user?.reserved_balance || 0),
          verificationStatus: user?.verification_status || 'pending',
          verificationRejectionReason: user?.verification_rejection_reason,
        },
        stats: {
          todayTotal: todaySales.reduce((sum, p) => sum + parseFloat(p.value || 0), 0),
          todayCount: todaySales.length,
          monthTotal: monthSales.reduce((sum, p) => sum + parseFloat(p.value || 0), 0),
          monthCount: monthSales.length,
          totalConfirmed: confirmedPayments.length,
          totalPending: payments.filter(p => p.status === 'PENDING').length,
        },
        reserves: {
          totalReserved: totalReserved,
          reservesCount: reservesCount,
          nextRelease: nextRelease ? {
            amount: parseFloat(nextRelease.reserve_amount),
            releaseDate: nextRelease.release_date,
            description: nextRelease.description,
          } : null,
          reserves: reserves.slice(0, 5).map(r => ({
            id: r.id,
            amount: parseFloat(r.reserve_amount),
            originalAmount: parseFloat(r.original_amount),
            releaseDate: r.release_date,
            createdAt: r.created_at,
          })),
        },
        paymentMethods,
        chartData,
        recentPayments: payments.slice(0, 10),
        activeLinks: links,
        transactions: transactions,
      }
    });

  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno' 
    });
  }
}
