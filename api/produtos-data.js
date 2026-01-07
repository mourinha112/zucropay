// API otimizada para página de Produtos
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase não configurado');
  return createClient(url, key);
};

const getUserIdFromToken = (authHeader) => {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.userId || payload.sub || payload.id;
  } catch { return null; }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=59');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const userId = getUserIdFromToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

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

