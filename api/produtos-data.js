// API otimizada para página de Produtos
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase não configurado');
  return createClient(url, key);
};

const getUserFromToken = async (authHeader) => {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const supabaseAuth = createClient(url, key, { auth: { persistSession: false } });
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch { return null; }
};

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=59');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Token inválido' });
    const userId = user.id;

    const supabase = getSupabase();

    // Buscar produtos e links em paralelo
    const [productsResult, linksResult] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('payment_links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ]);

    const products = productsResult.data || [];
    const links = linksResult.data || [];

    // Mapear links para produtos
    const productsWithLinks = products.map(product => {
      const productLinks = links.filter(l => l.product_id === product.id);
      return {
        ...product,
        links: productLinks,
        totalSales: productLinks.reduce((sum, l) => sum + (l.payments_count || 0), 0),
        totalReceived: productLinks.reduce((sum, l) => sum + parseFloat(l.total_received || 0), 0),
      };
    });

    // Estatísticas
    const stats = {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.active !== false).length,
      totalLinks: links.length,
      activeLinks: links.filter(l => l.active !== false).length,
      totalSales: links.reduce((sum, l) => sum + (l.payments_count || 0), 0),
      totalReceived: links.reduce((sum, l) => sum + parseFloat(l.total_received || 0), 0),
    };

    return res.status(200).json({
      success: true,
      products: productsWithLinks,
      links,
      stats,
    });

  } catch (error) {
    console.error('[Produtos API] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

