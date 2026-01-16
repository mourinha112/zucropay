// API Admin - Gerenciar Saques com Envio Automático PIX
import { createClient } from '@supabase/supabase-js';
import https from 'https';
import { randomUUID } from 'crypto';

// ========================================
// CONFIGURAÇÃO
// ========================================

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase não configurado');
  return createClient(url, key);
};

const getEfiConfig = () => ({
  clientId: process.env.EFI_CLIENT_ID,
  clientSecret: process.env.EFI_CLIENT_SECRET,
  certificate: process.env.EFI_CERTIFICATE,
  sandbox: process.env.EFI_SANDBOX === 'true',
  pixKey: process.env.EFI_PIX_KEY,
});

const getUserFromToken = async (authHeader) => {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  try {
    const supabaseAuth = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch { return null; }
};

// Verificar se usuário é admin (tabela admin_users)
const getAdmin = async (supabase, userId) => {
  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('user_id', userId)
    .single();

  if (error || !admin) return null;
  return admin;
};

// ========================================
// FUNÇÕES AUXILIARES PARA PIX
// ========================================

const getPixApiUrl = (sandbox) => sandbox ? 'pix-h.api.efipay.com.br' : 'pix.api.efipay.com.br';

const httpsRequestWithCert = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`[PIX Send] Response ${res.statusCode}:`, data.substring(0, 500));
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', (error) => {
      console.error('[PIX Send] Request Error:', error);
      reject(error);
    });

    if (postData) req.write(postData);
    req.end();
  });
};

let pixTokenCache = { token: null, expiry: null };

const getPixAccessToken = async (config) => {
  if (pixTokenCache.token && pixTokenCache.expiry && Date.now() < pixTokenCache.expiry) {
    return pixTokenCache.token;
  }

  console.log('[PIX Send] Obtendo token...');
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const certBuffer = Buffer.from(config.certificate, 'base64');
  const postData = JSON.stringify({ grant_type: 'client_credentials' });

  const options = {
    hostname: getPixApiUrl(config.sandbox),
    port: 443,
    path: '/oauth/token',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
    pfx: certBuffer,
    passphrase: '',
  };

  const response = await httpsRequestWithCert(options, postData);

  if (response.data?.access_token) {
    pixTokenCache.token = response.data.access_token;
    pixTokenCache.expiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    console.log('[PIX Send] Token obtido com sucesso');
    return pixTokenCache.token;
  }

  throw new Error(response.data?.error_description || 'Falha na autenticação EfiBank');
};

// ========================================
// CONFIGURAR WEBHOOK PARA PIX (necessário para envio)
// ========================================

const configurarWebhookPix = async (config) => {
  console.log('[Webhook] Configurando webhook para chave PIX:', config.pixKey);
  
  const token = await getPixAccessToken(config);
  const certBuffer = Buffer.from(config.certificate, 'base64');
  
  // URL do webhook - sem âncora, apenas URL limpa
  const webhookUrl = 'https://dashboard.appzucropay.com/api/efi-webhook';
  
  const postData = JSON.stringify({ webhookUrl });
  
  const options = {
    hostname: getPixApiUrl(config.sandbox),
    port: 443,
    path: `/v2/webhook/${encodeURIComponent(config.pixKey)}`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-skip-mtls-checking': 'true', // Header para skip mTLS (Vercel não suporta)
    },
    pfx: certBuffer,
    passphrase: '',
  };

  console.log(`[Webhook] PUT /v2/webhook/${config.pixKey} (skip-mTLS: true)`);
  console.log(`[Webhook] URL: ${webhookUrl}`);
  const response = await httpsRequestWithCert(options, postData);

  if (response.status >= 200 && response.status < 300) {
    console.log('[Webhook] Webhook configurado com sucesso!');
    return { success: true };
  }

  console.log('[Webhook] Resposta:', response.status, response.data);
  // Se já existir webhook, tudo bem
  if (response.data?.nome === 'webhook_ja_cadastrado_para_essa_chave' || 
      response.data?.mensagem?.includes('já cadastrado')) {
    console.log('[Webhook] Webhook já existe, continuando...');
    return { success: true, existing: true };
  }

  return { 
    success: false, 
    error: response.data?.mensagem || response.data?.error_description || 'Erro ao configurar webhook' 
  };
};

// ========================================
// ENVIAR PIX AUTOMÁTICO
// ========================================

const enviarPixAutomatico = async (config, withdrawal) => {
  console.log('[PIX Send] Iniciando envio automático...');
  console.log('[PIX Send] Valor:', withdrawal.amount);
  console.log('[PIX Send] Favorecido:', withdrawal.pix_key || `${withdrawal.bank_code}-${withdrawal.agency}-${withdrawal.account_number}`);

  // Primeiro, garantir que o webhook está configurado
  const webhookResult = await configurarWebhookPix(config);
  if (!webhookResult.success) {
    console.error('[PIX Send] Falha ao configurar webhook:', webhookResult.error);
    // Continuar mesmo assim, talvez o webhook já esteja configurado de outra forma
  }

  const token = await getPixAccessToken(config);
  const certBuffer = Buffer.from(config.certificate, 'base64');
  
  // Gerar ID único para o envio (35 caracteres alfanuméricos)
  const idEnvio = `zp${Date.now()}${randomUUID().replace(/-/g, '')}`.substring(0, 35);
  
  // Montar payload do PIX - formato correto para envio (Cash-out)
  const pixPayload = {
    valor: withdrawal.amount.toFixed(2),
    pagador: {
      chave: config.pixKey, // Chave PIX da ZucroPay (origem)
      infoPagador: `Saque ZucroPay #${withdrawal.id.substring(0, 8)}`
    },
    favorecido: {}
  };

  // Definir favorecido baseado no tipo de saque
  if (withdrawal.withdrawal_type === 'pix' && withdrawal.pix_key) {
    // Envio por chave PIX
    pixPayload.favorecido.chave = withdrawal.pix_key;
  } else {
    // Envio por conta bancária
    pixPayload.favorecido.contaBanco = {
      nome: withdrawal.holder_name,
      cpf: withdrawal.holder_document?.replace(/\D/g, '').substring(0, 11),
      codigoBanco: withdrawal.bank_code,
      agencia: withdrawal.agency,
      conta: withdrawal.account_number,
      tipoConta: withdrawal.account_type === 'savings' ? 'poupanca' : 'corrente'
    };
  }

  console.log('[PIX Send] Payload:', JSON.stringify(pixPayload, null, 2));

  const postData = JSON.stringify(pixPayload);

  const options = {
    hostname: getPixApiUrl(config.sandbox),
    port: 443,
    path: `/v2/gn/pix/${idEnvio}`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
    pfx: certBuffer,
    passphrase: '',
  };

  console.log(`[PIX Send] PUT /v2/gn/pix/${idEnvio}`);
  const response = await httpsRequestWithCert(options, postData);

  if (response.status >= 200 && response.status < 300) {
    console.log('[PIX Send] PIX enviado com sucesso!');
    return {
      success: true,
      idEnvio,
      e2eId: response.data?.e2eId || response.data?.endToEndId,
      status: response.data?.status || 'EM_PROCESSAMENTO',
      data: response.data
    };
  }

  console.error('[PIX Send] Erro ao enviar PIX:', response.data);
  return {
    success: false,
    error: response.data?.mensagem || response.data?.error_description || 'Erro ao enviar PIX',
    data: response.data
  };
};

// ========================================
// HANDLER PRINCIPAL
// ========================================

export default async function handler(req, res) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.VITE_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const origin = req.headers.origin;
  const allowOrigin = (allowedOrigins.length && origin && allowedOrigins.includes(origin))
    ? origin
    : (allowedOrigins[0] || '*');
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Token inválido' });
  const userId = user.id;

  const supabase = getSupabase();

  // Verificar se é admin
  const admin = await getAdmin(supabase, userId);
  if (!admin) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  try {
    // GET - Listar todos os saques (agora são automáticos, apenas visualização)
    if (req.method === 'GET') {
      const { status, limit = 100 } = req.query;
      console.log('[Admin Withdrawals] GET - status filter:', status || 'all', 'limit:', limit);

      let query = supabase
        .from('withdrawals')
        .select(`
          *,
          users:user_id (name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      // Filtrar por status apenas se especificado
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data: withdrawals, error } = await query;

      console.log('[Admin Withdrawals] Query result:', { count: withdrawals?.length, error });
      if (withdrawals?.length > 0) {
        console.log('[Admin Withdrawals] First withdrawal:', withdrawals[0]);
      }

      if (error) {
        console.error('[Admin Withdrawals] Query error:', error);
        throw error;
      }

      const formattedWithdrawals = (withdrawals || []).map(w => ({
        ...w,
        userName: w.users?.name || 'Usuário',
        userEmail: w.users?.email || '',
      }));

      console.log('[Admin Withdrawals] Returning', formattedWithdrawals.length, 'withdrawals');

      return res.status(200).json({
        success: true,
        withdrawals: formattedWithdrawals,
      });
    }

    // PUT - Aprovar ou Rejeitar saque
    if (req.method === 'PUT') {
      const { withdrawalId, action, rejectionReason, adminNotes } = req.body;

      if (!withdrawalId || !action) {
        return res.status(400).json({
          success: false,
          message: 'ID do saque e ação são obrigatórios',
        });
      }

      if (!['approve', 'reject', 'complete'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Ação inválida. Use: approve, reject ou complete',
        });
      }

      // Buscar saque
      const { data: withdrawal, error: fetchError } = await supabase
        .from('withdrawals')
        .select('*, users:user_id (balance, email, name)')
        .eq('id', withdrawalId)
        .single();

      if (fetchError || !withdrawal) {
        return res.status(404).json({
          success: false,
          message: 'Solicitação de saque não encontrada',
        });
      }

      // Validar status para cada ação
      if (action === 'approve' && withdrawal.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Este saque já foi ${withdrawal.status === 'approved' ? 'aprovado' : withdrawal.status === 'completed' ? 'concluído' : 'processado'}`,
        });
      }
      
      if (action === 'reject' && withdrawal.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Apenas saques pendentes podem ser rejeitados`,
        });
      }

      let updateData = {
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        admin_notes: adminNotes || null,
      };

      // ========================================
      // APROVAR SAQUE - ENVIAR PIX AUTOMÁTICO
      // ========================================
      if (action === 'approve') {
        console.log(`[ADMIN] Aprovando saque ${withdrawalId}...`);

        // Verificar se temos os dados necessários para enviar PIX
        if (withdrawal.withdrawal_type === 'pix' && !withdrawal.pix_key) {
          return res.status(400).json({
            success: false,
            message: 'Chave PIX do favorecido não informada',
          });
        }

        if (withdrawal.withdrawal_type === 'bank_transfer' && (!withdrawal.bank_code || !withdrawal.account_number)) {
          return res.status(400).json({
            success: false,
            message: 'Dados bancários incompletos',
          });
        }

        // Tentar enviar PIX automaticamente
        const config = getEfiConfig();
        
        if (!config.certificate || !config.clientId || !config.pixKey) {
          console.error('[ADMIN] Configuração EfiBank incompleta');
          // Fallback para aprovação manual
          updateData.status = 'approved';
          updateData.admin_notes = 'PIX automático indisponível - transferência manual necessária';
          await supabase.from('withdrawals').update(updateData).eq('id', withdrawalId);
          
          return res.status(200).json({
            success: true,
            message: `⚠️ Configuração de PIX incompleta. Saque aprovado para transferência manual.\n\n💰 Valor: R$ ${withdrawal.amount.toFixed(2)}\n📱 PIX: ${withdrawal.pix_key}`,
            withdrawal: { id: withdrawalId, status: 'approved' },
          });
        }

        try {
          const pixResult = await enviarPixAutomatico(config, withdrawal);

          if (pixResult.success) {
            // PIX enviado com sucesso!
            updateData.status = 'completed';
            updateData.completed_at = new Date().toISOString();
            updateData.admin_notes = `PIX automático enviado. ID: ${pixResult.idEnvio}${adminNotes ? ` | ${adminNotes}` : ''}`;

            // Atualizar transação para concluído
            await supabase
              .from('transactions')
              .update({ 
                status: 'completed', 
                description: `Saque concluído via PIX automático. E2E: ${pixResult.e2eId || pixResult.idEnvio}` 
              })
              .eq('metadata->>withdrawal_id', withdrawalId)
              .eq('type', 'withdrawal_request');

            console.log(`[ADMIN] Saque ${withdrawalId} CONCLUÍDO - PIX enviado: ${pixResult.idEnvio}`);

            // Atualizar saque
            await supabase.from('withdrawals').update(updateData).eq('id', withdrawalId);

            return res.status(200).json({
              success: true,
              message: '✅ Saque aprovado e PIX enviado automaticamente!',
              pixId: pixResult.idEnvio,
              e2eId: pixResult.e2eId,
              withdrawal: {
                id: withdrawalId,
                status: 'completed',
              },
            });

          } else {
            // Erro ao enviar PIX - marcar como aprovado para transferência manual
            console.error(`[ADMIN] Erro ao enviar PIX: ${pixResult.error}`);
            
            updateData.status = 'approved';
            updateData.admin_notes = `Erro no PIX automático: ${pixResult.error}${adminNotes ? ` | ${adminNotes}` : ''}`;

            await supabase.from('withdrawals').update(updateData).eq('id', withdrawalId);

            const transferInfo = withdrawal.withdrawal_type === 'pix' 
              ? `PIX para: ${withdrawal.pix_key} (${withdrawal.pix_key_type})`
              : `TED para: ${withdrawal.bank_name} Ag: ${withdrawal.agency} Cc: ${withdrawal.account_number}`;

            return res.status(200).json({
              success: true,
              message: `⚠️ PIX automático falhou: ${pixResult.error}\n\nFaça a transferência manualmente:\n💰 Valor: R$ ${withdrawal.amount.toFixed(2)}\n📱 ${transferInfo}`,
              pixError: pixResult.error,
              withdrawal: {
                id: withdrawalId,
                status: 'approved',
              },
            });
          }

        } catch (pixError) {
          console.error('[ADMIN] Exceção ao enviar PIX:', pixError);
          
          // Em caso de erro, aprovar para transferência manual
          updateData.status = 'approved';
          updateData.admin_notes = `Exceção no PIX: ${pixError.message}${adminNotes ? ` | ${adminNotes}` : ''}`;

          await supabase.from('withdrawals').update(updateData).eq('id', withdrawalId);

          return res.status(200).json({
            success: true,
            message: `⚠️ Erro no sistema de PIX: ${pixError.message}\n\nFaça a transferência manualmente.`,
            withdrawal: {
              id: withdrawalId,
              status: 'approved',
            },
          });
        }
      }
      
      // ========================================
      // CONCLUIR SAQUE (após transferência manual)
      // ========================================
      if (action === 'complete') {
        if (withdrawal.status !== 'approved') {
          return res.status(400).json({
            success: false,
            message: 'Apenas saques aprovados podem ser marcados como concluídos',
          });
        }

        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
        updateData.admin_notes = adminNotes || 'Transferência realizada manualmente';

        await supabase.from('withdrawals').update(updateData).eq('id', withdrawalId);

        // Atualizar transação para concluído
        await supabase
          .from('transactions')
          .update({ status: 'completed', description: 'Saque concluído - Transferência realizada' })
          .eq('metadata->>withdrawal_id', withdrawalId)
          .eq('type', 'withdrawal_request');

        console.log(`[ADMIN] Saque ${withdrawalId} CONCLUÍDO manualmente`);

        return res.status(200).json({
          success: true,
          message: '✅ Saque marcado como concluído!',
          withdrawal: {
            id: withdrawalId,
            status: 'completed',
          },
        });
      }

      // ========================================
      // REJEITAR SAQUE
      // ========================================
      if (action === 'reject') {
        if (!rejectionReason) {
          return res.status(400).json({
            success: false,
            message: 'Motivo da rejeição é obrigatório',
          });
        }

        updateData.status = 'rejected';
        updateData.rejection_reason = rejectionReason;

        // Devolver saldo ao usuário (valor + taxa)
        const refundAmount = parseFloat(withdrawal.amount) + 2.00;
        const currentBalance = parseFloat(withdrawal.users?.balance || 0);
        
        await supabase
          .from('users')
          .update({ balance: currentBalance + refundAmount })
          .eq('id', withdrawal.user_id);

        // Atualizar transação para cancelado
        await supabase
          .from('transactions')
          .update({ status: 'cancelled', description: `Saque rejeitado: ${rejectionReason}` })
          .eq('metadata->>withdrawal_id', withdrawalId)
          .eq('type', 'withdrawal_request');

        // Criar transação de estorno
        await supabase.from('transactions').insert({
          user_id: withdrawal.user_id,
          type: 'withdrawal_refund',
          amount: refundAmount,
          status: 'completed',
          description: `Estorno de saque rejeitado: ${rejectionReason}`,
          metadata: { withdrawal_id: withdrawalId },
        });

        console.log(`[ADMIN] Saque ${withdrawalId} REJEITADO - Motivo: ${rejectionReason}`);

        await supabase.from('withdrawals').update(updateData).eq('id', withdrawalId);

        return res.status(200).json({
          success: true,
          message: 'Saque rejeitado. Saldo devolvido ao usuário (valor + taxa R$2).',
          withdrawal: {
            id: withdrawalId,
            status: 'rejected',
          },
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[Admin Withdrawals API] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
