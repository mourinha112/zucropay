-- ============================================
-- ZUCROPAY - API KEYS & WEBHOOKS TABLES
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ============================================

-- ============================================
-- TABELA: API KEYS
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT 'Chave Principal',
  api_key VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key);

-- RLS (Row Level Security)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Users can view own api_keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api_keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api_keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TABELA: WEBHOOKS
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  secret_key VARCHAR(100),
  last_triggered_at TIMESTAMPTZ,
  last_response_code INTEGER,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status);

-- RLS (Row Level Security)
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Users can view own webhooks" ON webhooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own webhooks" ON webhooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks" ON webhooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks" ON webhooks
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TABELA: CHECKOUT CUSTOMIZATION (se não existir)
-- ============================================

CREATE TABLE IF NOT EXISTS checkout_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Configurações visuais
  primary_color VARCHAR(20) DEFAULT '#651BE5',
  background_color VARCHAR(20) DEFAULT '#ffffff',
  text_color VARCHAR(20) DEFAULT '#1e293b',
  button_color VARCHAR(20) DEFAULT '#651BE5',
  button_text_color VARCHAR(20) DEFAULT '#ffffff',
  
  -- Imagens
  logo_url TEXT,
  banner_url TEXT,
  background_url TEXT,
  
  -- Timer
  timer_enabled BOOLEAN DEFAULT false,
  timer_minutes INTEGER DEFAULT 15,
  
  -- Textos customizados
  headline TEXT,
  subheadline TEXT,
  cta_text VARCHAR(100) DEFAULT 'Comprar Agora',
  
  -- Configurações de pagamento
  show_pix BOOLEAN DEFAULT true,
  show_credit_card BOOLEAN DEFAULT true,
  show_boleto BOOLEAN DEFAULT false,
  
  -- Configurações adicionais
  show_guarantee BOOLEAN DEFAULT true,
  guarantee_days INTEGER DEFAULT 7,
  show_testimonials BOOLEAN DEFAULT false,
  testimonials JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(product_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_checkout_customizations_user_id ON checkout_customizations(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_customizations_product_id ON checkout_customizations(product_id);

-- RLS
ALTER TABLE checkout_customizations ENABLE ROW LEVEL SECURITY;

-- Políticas - usuários podem gerenciar suas customizações
CREATE POLICY "Users can view own checkout_customizations" ON checkout_customizations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkout_customizations" ON checkout_customizations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkout_customizations" ON checkout_customizations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own checkout_customizations" ON checkout_customizations
  FOR DELETE USING (auth.uid() = user_id);

-- Política pública para checkout (leitura apenas)
CREATE POLICY "Public can view checkout_customizations" ON checkout_customizations
  FOR SELECT USING (true);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para api_keys
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para webhooks
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON webhooks;
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para checkout_customizations
DROP TRIGGER IF EXISTS update_checkout_customizations_updated_at ON checkout_customizations;
CREATE TRIGGER update_checkout_customizations_updated_at
  BEFORE UPDATE ON checkout_customizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE! 🎉
-- ============================================

