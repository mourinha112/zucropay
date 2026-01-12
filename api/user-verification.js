import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Lista de admins autorizados
const ADMIN_EMAILS = ['mourinha112@gmail.com', 'admin@zucropay.com', 'victorgronnyt@gmail.com', 'felipeaugusto.quark@gmail.com'];

function getUserIdFromToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.userId || payload.sub || payload.id;
  } catch (e) {
    return null;
  }
}

async function getUserEmailFromToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.email;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    // GET - Buscar status de verificação do usuário
    if (req.method === 'GET') {
      // Buscar dados do usuário
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, email, cpf_cnpj, phone, verification_status, verification_rejection_reason')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Buscar verificação mais recente
      const { data: verification, error: verificationError } = await supabase
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

      // Validações
      if (!document_type || !document_front_url || !selfie_url || !full_name || !birth_date || !document_number) {
        return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
      }

      // Verificar se já existe verificação pendente ou aprovada
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

      // Criar nova verificação
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

      // Atualizar status do usuário
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

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error) {
    console.error('[VERIFICATION] Erro:', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
}
