-- ============================================
-- ZUCROPAY - ADICIONAR ROLE DE GERENTE
-- Execute este SQL no Supabase para adicionar o cargo de gerente
-- ============================================

-- 1. Alterar a constraint para permitir o novo role 'gerente'
ALTER TABLE admin_credentials 
DROP CONSTRAINT IF EXISTS admin_credentials_role_check;

ALTER TABLE admin_credentials 
ADD CONSTRAINT admin_credentials_role_check 
CHECK (role IN ('admin', 'super_admin', 'gerente'));

-- 2. Adicionar coluna de permissões específicas (opcional - para controle mais granular)
ALTER TABLE admin_credentials 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- PERMISSÕES DO GERENTE:
-- - approve_accounts: Aprovar contas de usuários
-- - cancel_accounts: Cancelar/Bloquear contas de usuários
-- - adjust_user_rates: Diminuir taxas de usuários
-- 
-- O GERENTE NÃO TEM ACESSO A:
-- - Faturamento da empresa
-- - Estatísticas financeiras globais
-- - Saques da plataforma
-- - Configurações do gateway
-- ============================================

-- 3. Criar tabela de taxas personalizadas por usuário
-- NOTA: created_by não tem FK pois admin_users.id e admin_credentials.id são diferentes
CREATE TABLE IF NOT EXISTS user_custom_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pix_rate DECIMAL(5,2) DEFAULT 0.99, -- Taxa PIX em %
  card_rate DECIMAL(5,2) DEFAULT 4.99, -- Taxa Cartão em %
  boleto_rate DECIMAL(5,2) DEFAULT 2.99, -- Taxa Boleto em %
  withdrawal_fee DECIMAL(10,2) DEFAULT 2.00, -- Taxa de saque em R$
  created_by UUID, -- ID do admin/gerente que alterou (sem FK para flexibilidade)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id)
);

-- Se a tabela já existe com a FK, remover a constraint:
-- ALTER TABLE user_custom_rates DROP CONSTRAINT IF EXISTS user_custom_rates_created_by_fkey;

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_user_custom_rates_user_id ON user_custom_rates(user_id);

-- 5. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_custom_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_custom_rates_updated_at ON user_custom_rates;
CREATE TRIGGER update_user_custom_rates_updated_at 
  BEFORE UPDATE ON user_custom_rates
  FOR EACH ROW EXECUTE FUNCTION update_user_custom_rates_updated_at();

-- 6. Habilitar RLS na tabela de taxas
ALTER TABLE user_custom_rates ENABLE ROW LEVEL SECURITY;

-- 7. Policies para user_custom_rates (IMPORTANTE!)
-- Permitir que service_role faça tudo (usado pelas APIs)
DROP POLICY IF EXISTS "Service role full access" ON user_custom_rates;
CREATE POLICY "Service role full access" ON user_custom_rates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Permitir que usuários vejam suas próprias taxas
DROP POLICY IF EXISTS "Users can view own rates" ON user_custom_rates;
CREATE POLICY "Users can view own rates" ON user_custom_rates
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- EXEMPLO: CRIAR UM GERENTE
-- (Execute manualmente quando precisar adicionar um gerente)
-- ============================================

-- INSERT INTO admin_credentials (email, password_hash, name, role, is_active, permissions)
-- VALUES (
--   'gerente@zucropay.com', 
--   'senha123', -- Em produção, use hash bcrypt
--   'Gerente de Conta', 
--   'gerente', 
--   true,
--   '["approve_accounts", "cancel_accounts", "adjust_user_rates"]'::jsonb
-- );

-- ============================================
-- POLICIES PARA TABELA USERS (IMPORTANTE PARA REGISTRO!)
-- ============================================

-- Permitir que usuários autenticados criem seu próprio registro
DROP POLICY IF EXISTS "Users can insert own record" ON users;
CREATE POLICY "Users can insert own record" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Permitir que usuários vejam seu próprio registro
DROP POLICY IF EXISTS "Users can view own record" ON users;
CREATE POLICY "Users can view own record" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Permitir que usuários atualizem seu próprio registro
DROP POLICY IF EXISTS "Users can update own record" ON users;
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Permitir service role acesso total (para APIs do backend)
DROP POLICY IF EXISTS "Service role full access users" ON users;
CREATE POLICY "Service role full access users" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- CAMPOS ADICIONAIS NA TABELA PAYMENTS (IMPORTANTE!)
-- Necessários para armazenar detalhes das vendas
-- ============================================

-- Adicionar campos que podem não existir
ALTER TABLE payments ADD COLUMN IF NOT EXISTS net_value DECIMAL(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reserve_amount DECIMAL(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fee_payer VARCHAR(20) DEFAULT 'seller';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================
-- VERIFICAR SE FOI CRIADO CORRETAMENTE
-- ============================================
SELECT id, email, name, role, is_active, permissions, created_at 
FROM admin_credentials 
ORDER BY created_at;

-- Verificar policies da tabela users
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Verificar estrutura da tabela payments
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payments';
