-- ========================================
-- 🛡️ ZUCROPAY ADMIN SCHEMA
-- Execute este SQL no Supabase SQL Editor
-- ========================================

-- ========== ADMINISTRADORES ==========
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'admin', -- 'super_admin', 'admin', 'moderator'
  permissions JSONB DEFAULT '["view_users", "approve_users", "manage_withdrawals"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== VERIFICAÇÃO DE IDENTIDADE ==========
CREATE TABLE IF NOT EXISTS user_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Documentos enviados
  document_type VARCHAR(50) DEFAULT 'cpf', -- 'cpf', 'cnpj', 'rg', 'cnh'
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  
  -- Status da verificação
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'needs_review'
  rejection_reason TEXT,
  
  -- Auditoria
  reviewed_by UUID REFERENCES admin_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Dados extraídos (preenchidos após aprovação)
  verified_name VARCHAR(255),
  verified_cpf_cnpj VARCHAR(20),
  verified_birth_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- ========== STATUS DO USUÁRIO (APROVAÇÃO) ==========
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'pending';
-- Valores: 'pending', 'approved', 'rejected', 'suspended', 'blocked'

ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_reviewed_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT FALSE;

-- ========== CONTROLE DE SAQUES ==========
CREATE TABLE IF NOT EXISTS withdrawal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Configurações
  withdrawals_enabled BOOLEAN DEFAULT TRUE,
  daily_limit DECIMAL(10, 2) DEFAULT 5000.00,
  monthly_limit DECIMAL(10, 2) DEFAULT 50000.00,
  min_withdrawal DECIMAL(10, 2) DEFAULT 10.00,
  
  -- Bloqueio
  blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  blocked_by UUID REFERENCES admin_users(id),
  blocked_at TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- ========== SOLICITAÇÕES DE SAQUE ==========
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Valores
  amount DECIMAL(10, 2) NOT NULL,
  fee DECIMAL(10, 2) DEFAULT 0.00,
  net_amount DECIMAL(10, 2) NOT NULL,
  
  -- Dados bancários
  bank_code VARCHAR(10),
  bank_name VARCHAR(100),
  agency VARCHAR(20),
  account VARCHAR(30),
  account_digit VARCHAR(5),
  account_type VARCHAR(20) DEFAULT 'checking', -- 'checking', 'savings'
  holder_name VARCHAR(255),
  holder_cpf_cnpj VARCHAR(20),
  pix_key TEXT,
  pix_key_type VARCHAR(20), -- 'cpf', 'cnpj', 'email', 'phone', 'random'
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'
  rejection_reason TEXT,
  
  -- Asaas
  asaas_transfer_id VARCHAR(100),
  asaas_status VARCHAR(50),
  
  -- Auditoria
  reviewed_by UUID REFERENCES admin_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== LOGS DE AÇÕES ADMIN ==========
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id),
  action VARCHAR(100) NOT NULL, -- 'approve_user', 'reject_user', 'block_withdrawal', etc.
  target_type VARCHAR(50), -- 'user', 'withdrawal', 'verification'
  target_id UUID,
  details JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== ESTATÍSTICAS DIÁRIAS (CACHE) ==========
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  
  -- Usuários
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  pending_users INTEGER DEFAULT 0,
  approved_users INTEGER DEFAULT 0,
  
  -- Vendas
  total_sales DECIMAL(12, 2) DEFAULT 0.00,
  total_transactions INTEGER DEFAULT 0,
  
  -- Movimentação
  total_deposits DECIMAL(12, 2) DEFAULT 0.00,
  total_withdrawals DECIMAL(12, 2) DEFAULT 0.00,
  pending_withdrawals DECIMAL(12, 2) DEFAULT 0.00,
  
  -- Taxas
  total_fees DECIMAL(12, 2) DEFAULT 0.00,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== ÍNDICES PARA PERFORMANCE ==========
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON user_verifications(status);
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);

-- ========== FUNÇÃO PARA ATUALIZAR UPDATED_AT ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_verifications_updated_at ON user_verifications;
CREATE TRIGGER update_user_verifications_updated_at
  BEFORE UPDATE ON user_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_withdrawal_settings_updated_at ON withdrawal_settings;
CREATE TRIGGER update_withdrawal_settings_updated_at
  BEFORE UPDATE ON withdrawal_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_withdrawal_requests_updated_at ON withdrawal_requests;
CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== VIEWS PARA DASHBOARD ADMIN ==========

-- View de estatísticas gerais
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE account_status = 'pending') as pending_users,
  (SELECT COUNT(*) FROM users WHERE account_status = 'approved') as approved_users,
  (SELECT COUNT(*) FROM users WHERE identity_verified = true) as verified_users,
  (SELECT COUNT(*) FROM user_verifications WHERE status = 'pending') as pending_verifications,
  (SELECT COALESCE(SUM(value), 0) FROM payments WHERE status IN ('RECEIVED', 'CONFIRMED')) as total_sales,
  (SELECT COUNT(*) FROM payments WHERE status IN ('RECEIVED', 'CONFIRMED')) as total_transactions,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'deposit' AND status = 'completed') as total_deposits,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'withdraw' AND status = 'completed') as total_withdrawals,
  (SELECT COUNT(*) FROM withdrawal_requests WHERE status = 'pending') as pending_withdrawals,
  (SELECT COALESCE(SUM(amount), 0) FROM withdrawal_requests WHERE status = 'pending') as pending_withdrawal_amount;

-- ========== ROW LEVEL SECURITY (RLS) ==========

-- Habilitar RLS nas tabelas admin
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Política para admin_users (apenas admins podem ver)
CREATE POLICY admin_users_select ON admin_users
  FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Política para user_verifications (usuário vê o próprio, admin vê todos)
CREATE POLICY user_verifications_user_select ON user_verifications
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

CREATE POLICY user_verifications_user_insert ON user_verifications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_verifications_admin_update ON user_verifications
  FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Política para withdrawal_settings
CREATE POLICY withdrawal_settings_select ON withdrawal_settings
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

CREATE POLICY withdrawal_settings_admin_all ON withdrawal_settings
  FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Política para withdrawal_requests
CREATE POLICY withdrawal_requests_user_select ON withdrawal_requests
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

CREATE POLICY withdrawal_requests_user_insert ON withdrawal_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY withdrawal_requests_admin_update ON withdrawal_requests
  FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Política para admin_logs (apenas admins podem ver)
CREATE POLICY admin_logs_admin_select ON admin_logs
  FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY admin_logs_admin_insert ON admin_logs
  FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));

-- ========== DADOS INICIAIS ==========

-- Inserir admin inicial (substitua pelo ID do seu usuário admin)
-- INSERT INTO admin_users (user_id, role, permissions)
-- VALUES (
--   'SEU_USER_ID_AQUI',
--   'super_admin',
--   '["view_users", "approve_users", "reject_users", "verify_identity", "manage_withdrawals", "block_users", "view_stats", "manage_admins"]'
-- );

-- ========================================
-- ✅ SQL EXECUTADO COM SUCESSO!
-- 
-- PRÓXIMOS PASSOS:
-- 1. Execute este SQL no Supabase SQL Editor
-- 2. Adicione o ID do seu usuário admin na tabela admin_users
-- 3. Configure as variáveis de ambiente na Vercel
-- ========================================

