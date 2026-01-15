import { createClient } from '@supabase/supabase-js';

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Inicializar Supabase com service role para acessar admin_credentials
const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase não configurado');
  }
  
  return createClient(url, key);
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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email e senha são obrigatórios' 
      });
    }

    const supabase = getSupabase();

    // Buscar admin pelo email
    const { data: admin, error } = await supabase
      .from('admin_credentials')
      .select('id, email, password_hash, name, role, is_active')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      console.log('[Admin Login] Admin não encontrado:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciais inválidas' 
      });
    }

    // Verificar senha (comparação simples - em produção usar bcrypt)
    // Para maior segurança, use bcrypt.compare()
    if (admin.password_hash !== password) {
      console.log('[Admin Login] Senha incorreta para:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciais inválidas' 
      });
    }

    // Atualizar último login
    await supabase
      .from('admin_credentials')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Gerar token simples (em produção usar JWT real)
    const token = Buffer.from(JSON.stringify({
      type: 'admin',
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      timestamp: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24 horas
    })).toString('base64');

    console.log('[Admin Login] Login bem sucedido:', admin.email);

    return res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('[Admin Login] Erro:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}
