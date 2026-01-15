-- ============================================
-- ZUCROPAY - TABELA DE CREDENCIAIS DE ADMIN
-- Execute este SQL no Supabase para criar a tabela de admins
-- ============================================

-- Criar tabela de credenciais de admin
CREATE TABLE IF NOT EXISTS admin_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(200) DEFAULT 'Administrador',
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_admin_credentials_email ON admin_credentials(email);
CREATE INDEX IF NOT EXISTS idx_admin_credentials_is_active ON admin_credentials(is_active);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_admin_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_admin_credentials_updated_at ON admin_credentials;
CREATE TRIGGER update_admin_credentials_updated_at 
  BEFORE UPDATE ON admin_credentials
  FOR EACH ROW EXECUTE FUNCTION update_admin_credentials_updated_at();

-- ============================================
-- INSERIR PRIMEIRO ADMIN
-- Senha: fansro123 (hash bcrypt)
-- ============================================

-- Deletar admin existente se houver (para evitar duplicatas)
DELETE FROM admin_credentials WHERE email = 'mourinha112@gmail.com';

-- Inserir o primeiro administrador
-- NOTA: A senha está como texto simples aqui, mas será verificada via API
-- Em produção, use bcrypt hash
INSERT INTO admin_credentials (email, password_hash, name, role, is_active)
VALUES (
  'mourinha112@gmail.com',
  'fansro123',
  'Mourinha Admin',
  'super_admin',
  true
);

-- ============================================
-- POLÍTICA DE ACESSO (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

-- Apenas service_role pode acessar (via API)
-- Não criar policies de usuário para maior segurança

-- ============================================
-- VERIFICAR SE FOI CRIADO
-- ============================================
SELECT id, email, name, role, is_active, created_at 
FROM admin_credentials 
WHERE email = 'mourinha112@gmail.com';
