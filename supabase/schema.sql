-- ============================================
-- ZUCROPAY - SCHEMA COMPLETO PARA SUPABASE
-- Gateway de Pagamento com Asaas Integration
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- LIMPEZA (Usar apenas em desenvolvimento)
-- ========================================
-- DROP SCHEMA IF EXISTS public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;

-- ========================================
-- TABELAS PRINCIPAIS
-- ========================================

-- ========== USUÁRIOS ==========
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(20),
  phone VARCHAR(20),
  avatar VARCHAR(512) DEFAULT NULL,
  asaas_customer_id VARCHAR(100) DEFAULT NULL,
  asaas_api_key VARCHAR(255) DEFAULT NULL, -- Chave API do Asaas do usuário
  balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices
  CONSTRAINT unique_email UNIQUE (email)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_asaas_customer ON users(asaas_customer_id);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ========== PRODUTOS ==========
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  image_url VARCHAR(512) DEFAULT NULL,
  stock INT DEFAULT NULL CHECK (stock >= 0),
  active BOOLEAN DEFAULT true,
  
  -- Marketplace
  marketplace_enabled BOOLEAN DEFAULT false,
  commission_percentage DECIMAL(5,2) DEFAULT 30.00 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_marketplace ON products(marketplace_enabled) WHERE marketplace_enabled = true;
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- ========== CLIENTES DO ASAAS ==========
CREATE TABLE IF NOT EXISTS asaas_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asaas_customer_id VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(20),
  cpf_cnpj VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_asaas_customers_user_id ON asaas_customers(user_id);
CREATE INDEX idx_asaas_customers_asaas_id ON asaas_customers(asaas_customer_id);

-- ========== COBRANÇAS/PAGAMENTOS ==========
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES asaas_customers(id) ON DELETE SET NULL,
  asaas_payment_id VARCHAR(100) NOT NULL,
  
  billing_type VARCHAR(20) NOT NULL CHECK (billing_type IN ('BOLETO', 'CREDIT_CARD', 'PIX', 'UNDEFINED')),
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE', 'REFUNDED', 
    'RECEIVED_IN_CASH', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 
    'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 
    'DUNNING_REQUESTED', 'DUNNING_RECEIVED', 'AWAITING_RISK_ANALYSIS'
  )),
  
  value DECIMAL(10, 2) NOT NULL CHECK (value > 0),
  net_value DECIMAL(10, 2) DEFAULT 0.00,
  description TEXT,
  
  due_date DATE NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  -- URLs e dados de pagamento
  invoice_url VARCHAR(512) DEFAULT NULL,
  bank_slip_url VARCHAR(512) DEFAULT NULL,
  pix_qrcode TEXT DEFAULT NULL,
  pix_copy_paste TEXT DEFAULT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_asaas_id ON payments(asaas_payment_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- ========== TRANSAÇÕES ==========
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  type VARCHAR(20) NOT NULL CHECK (type IN (
    'deposit', 'withdraw', 'payment_received', 'payment_sent', 
    'fee', 'refund', 'affiliate_commission'
  )),
  
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  description TEXT,
  
  asaas_payment_id VARCHAR(100) DEFAULT NULL,
  asaas_transfer_id VARCHAR(100) DEFAULT NULL,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_asaas_payment ON transactions(asaas_payment_id);
CREATE INDEX idx_transactions_asaas_transfer ON transactions(asaas_transfer_id);

-- ========== LINKS DE PAGAMENTO ==========
CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  
  asaas_payment_link_id VARCHAR(100) NOT NULL,
  asaas_link_url VARCHAR(512) NOT NULL,
  
  name VARCHAR(200) NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  billing_type VARCHAR(20) DEFAULT 'UNDEFINED' CHECK (billing_type IN ('BOLETO', 'CREDIT_CARD', 'PIX', 'UNDEFINED')),
  
  active BOOLEAN DEFAULT true,
  clicks INT DEFAULT 0,
  payments_count INT DEFAULT 0,
  total_received DECIMAL(10, 2) DEFAULT 0.00,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_links_user_id ON payment_links(user_id);
CREATE INDEX idx_payment_links_product_id ON payment_links(product_id);
CREATE INDEX idx_payment_links_asaas_id ON payment_links(asaas_payment_link_id);
CREATE INDEX idx_payment_links_active ON payment_links(active);

-- ========== PERSONALIZAÇÃO DE CHECKOUT ==========
CREATE TABLE IF NOT EXISTS checkout_customization (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Imagens
  logo_url VARCHAR(512) DEFAULT NULL,
  banner_url VARCHAR(512) DEFAULT NULL,
  background_image_url VARCHAR(512) DEFAULT NULL,
  
  -- Cores
  primary_color VARCHAR(20) DEFAULT '#667eea',
  secondary_color VARCHAR(20) DEFAULT '#764ba2',
  text_color VARCHAR(20) DEFAULT '#333333',
  background_color VARCHAR(20) DEFAULT '#ffffff',
  
  -- Cronômetro/Timer
  countdown_enabled BOOLEAN DEFAULT false,
  countdown_minutes INT DEFAULT 30,
  countdown_text VARCHAR(200) DEFAULT 'Oferta expira em:',
  
  -- Garantia
  guarantee_enabled BOOLEAN DEFAULT false,
  guarantee_days INT DEFAULT 7,
  guarantee_text TEXT DEFAULT 'Garantia de 7 dias',
  
  -- Depoimentos/Provas Sociais
  testimonials_enabled BOOLEAN DEFAULT false,
  testimonials JSONB DEFAULT '[]',
  
  -- FAQ
  faq_enabled BOOLEAN DEFAULT false,
  faq JSONB DEFAULT '[]',
  
  -- Extras
  security_badges_enabled BOOLEAN DEFAULT true,
  whatsapp_support VARCHAR(20) DEFAULT NULL,
  custom_css TEXT DEFAULT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_checkout_customization_product_id ON checkout_customization(product_id);
CREATE INDEX idx_checkout_customization_user_id ON checkout_customization(user_id);

-- ========== MARKETPLACE - AFILIAÇÕES ==========
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  affiliate_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  affiliate_link VARCHAR(255) UNIQUE NOT NULL,
  commission_percentage DECIMAL(5,2) DEFAULT 30.00 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  
  total_sales INT DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0.00,
  
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que um afiliado não se afilie ao mesmo produto duas vezes
  UNIQUE (product_id, affiliate_user_id)
);

CREATE INDEX idx_affiliates_product_id ON affiliates(product_id);
CREATE INDEX idx_affiliates_affiliate_user_id ON affiliates(affiliate_user_id);
CREATE INDEX idx_affiliates_product_owner_id ON affiliates(product_owner_id);
CREATE INDEX idx_affiliates_status ON affiliates(status);

-- ========== VENDAS DE AFILIADOS ==========
CREATE TABLE IF NOT EXISTS affiliate_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  sale_value DECIMAL(10,2) NOT NULL,
  commission_value DECIMAL(10,2) NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX idx_affiliate_sales_affiliate_id ON affiliate_sales(affiliate_id);
CREATE INDEX idx_affiliate_sales_payment_id ON affiliate_sales(payment_id);
CREATE INDEX idx_affiliate_sales_status ON affiliate_sales(status);

-- ========== ASSINATURAS ==========
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES asaas_customers(id) ON DELETE CASCADE,
  
  asaas_subscription_id VARCHAR(100) NOT NULL,
  billing_type VARCHAR(20) NOT NULL CHECK (billing_type IN ('BOLETO', 'CREDIT_CARD', 'PIX', 'UNDEFINED')),
  
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED')),
  
  value DECIMAL(10, 2) NOT NULL CHECK (value > 0),
  cycle VARCHAR(20) NOT NULL CHECK (cycle IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY')),
  description TEXT,
  
  next_due_date DATE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_asaas_id ON subscriptions(asaas_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ========== DADOS BANCÁRIOS PARA SAQUE ==========
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  bank_code VARCHAR(10) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  agency VARCHAR(20) NOT NULL,
  account VARCHAR(20) NOT NULL,
  account_digit VARCHAR(5) NOT NULL,
  account_type VARCHAR(20) DEFAULT 'CHECKING' CHECK (account_type IN ('CHECKING', 'SAVINGS')),
  
  cpf_cnpj VARCHAR(20) NOT NULL,
  holder_name VARCHAR(200) NOT NULL,
  
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_user_id ON bank_accounts(user_id);

-- ========== WEBHOOKS (Log de notificações do Asaas) ==========
CREATE TABLE IF NOT EXISTS webhooks_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX idx_webhooks_log_event_type ON webhooks_log(event_type);
CREATE INDEX idx_webhooks_log_processed ON webhooks_log(processed);
CREATE INDEX idx_webhooks_log_created_at ON webhooks_log(created_at DESC);

-- ========== API KEYS ==========
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  api_key VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(100) DEFAULT 'Chave Principal',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
  
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_status ON api_keys(status);

-- ========== WEBHOOKS CONFIGURADOS PELO USUÁRIO ==========
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  url VARCHAR(512) NOT NULL,
  secret VARCHAR(64) NOT NULL,
  events JSONB DEFAULT '[]',
  
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'failed')),
  
  last_success_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  last_failure_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  failure_count INT DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_status ON webhooks(status);

-- ========== LOGS DE WEBHOOK ==========
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  
  response_code INT DEFAULT NULL,
  response_body TEXT DEFAULT NULL,
  success BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- ========================================
-- FUNÇÕES E TRIGGERS
-- ========================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas relevantes
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asaas_customers_updated_at BEFORE UPDATE ON asaas_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_links_updated_at BEFORE UPDATE ON payment_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checkout_customization_updated_at BEFORE UPDATE ON checkout_customization
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_customization ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- ========== POLICIES PARA USERS ==========
-- Usuários podem ver e atualizar apenas seus próprios dados
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ========== POLICIES PARA PRODUCTS ==========
CREATE POLICY "Users can view own products" ON products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view marketplace products" ON products
  FOR SELECT USING (marketplace_enabled = true AND active = true);

CREATE POLICY "Users can insert own products" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- ========== POLICIES PARA ASAAS_CUSTOMERS ==========
CREATE POLICY "Users can view own customers" ON asaas_customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers" ON asaas_customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers" ON asaas_customers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers" ON asaas_customers
  FOR DELETE USING (auth.uid() = user_id);

-- ========== POLICIES PARA PAYMENTS ==========
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments" ON payments
  FOR UPDATE USING (auth.uid() = user_id);

-- ========== POLICIES PARA TRANSACTIONS ==========
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

-- ========== POLICIES PARA PAYMENT_LINKS ==========
CREATE POLICY "Users can view own payment links" ON payment_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment links" ON payment_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment links" ON payment_links
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment links" ON payment_links
  FOR DELETE USING (auth.uid() = user_id);

-- ========== POLICIES PARA CHECKOUT_CUSTOMIZATION ==========
CREATE POLICY "Users can view own checkout customization" ON checkout_customization
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view checkout customization by product" ON checkout_customization
  FOR SELECT USING (true); -- Público para checkout

CREATE POLICY "Users can insert own checkout customization" ON checkout_customization
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkout customization" ON checkout_customization
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own checkout customization" ON checkout_customization
  FOR DELETE USING (auth.uid() = user_id);

-- ========== POLICIES PARA AFFILIATES ==========
CREATE POLICY "Users can view own affiliations" ON affiliates
  FOR SELECT USING (auth.uid() = affiliate_user_id OR auth.uid() = product_owner_id);

CREATE POLICY "Users can insert affiliations" ON affiliates
  FOR INSERT WITH CHECK (auth.uid() = affiliate_user_id);

CREATE POLICY "Users can update own affiliations" ON affiliates
  FOR UPDATE USING (auth.uid() = affiliate_user_id);

CREATE POLICY "Users can delete own affiliations" ON affiliates
  FOR DELETE USING (auth.uid() = affiliate_user_id);

-- ========== POLICIES PARA AFFILIATE_SALES ==========
CREATE POLICY "Affiliates can view own sales" ON affiliate_sales
  FOR SELECT USING (
    auth.uid() IN (
      SELECT affiliate_user_id FROM affiliates WHERE id = affiliate_id
      UNION
      SELECT product_owner_id FROM affiliates WHERE id = affiliate_id
    )
  );

-- ========== POLICIES PARA SUBSCRIPTIONS ==========
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- ========== POLICIES PARA BANK_ACCOUNTS ==========
CREATE POLICY "Users can view own bank accounts" ON bank_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank accounts" ON bank_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank accounts" ON bank_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank accounts" ON bank_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- ========== POLICIES PARA API_KEYS ==========
CREATE POLICY "Users can view own api keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- ========== POLICIES PARA WEBHOOKS ==========
CREATE POLICY "Users can view own webhooks" ON webhooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own webhooks" ON webhooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks" ON webhooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks" ON webhooks
  FOR DELETE USING (auth.uid() = user_id);

-- ========== POLICIES PARA WEBHOOK_LOGS ==========
CREATE POLICY "Users can view own webhook logs" ON webhook_logs
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM webhooks WHERE id = webhook_id)
  );

-- ========== POLICIES PARA WEBHOOKS_LOG (Sistema) ==========
-- Webhooks_log é apenas para sistema/admin - sem policies de usuário
-- Pode ser acessado via service_role key

-- ========================================
-- FUNÇÕES AUXILIARES
-- ========================================

-- Função para gerar API Key única
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
BEGIN
  RETURN 'zp_' || encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Função para calcular saldo de um usuário
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id UUID)
RETURNS TABLE (
  available DECIMAL(10,2),
  pending DECIMAL(10,2),
  total DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(u.balance, 0)::DECIMAL(10,2) as available,
    COALESCE(
      (SELECT SUM(amount) 
       FROM transactions 
       WHERE user_id = p_user_id 
       AND status = 'pending' 
       AND type IN ('deposit', 'payment_received')
      ), 0
    )::DECIMAL(10,2) as pending,
    (COALESCE(u.balance, 0) + COALESCE(
      (SELECT SUM(amount) 
       FROM transactions 
       WHERE user_id = p_user_id 
       AND status = 'pending' 
       AND type IN ('deposit', 'payment_received')
      ), 0
    ))::DECIMAL(10,2) as total
  FROM users u
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- DADOS SEED (Opcional - para desenvolvimento)
-- ========================================

-- Inserir usuário de teste (senha: 123456)
-- Hash gerado com bcrypt
-- INSERT INTO auth.users (id, email) VALUES 
--   ('00000000-0000-0000-0000-000000000001', 'admin@zucropay.com');

-- INSERT INTO users (id, name, email, password_hash, cpf_cnpj, phone, balance) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'Admin ZucroPay', 'admin@zucropay.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '12345678901', '11999999999', 1000.00);

-- ========================================
-- FIM DO SCHEMA
-- ========================================

