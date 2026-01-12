-- ============================================
-- ZUCROPAY - MIGRAÇÃO PARA VERIFICAÇÃO DE USUÁRIOS
-- ============================================

-- Adicionar campos de verificação na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending' 
  CHECK (verification_status IN ('pending', 'submitted', 'approved', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_reviewed_by UUID DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT DEFAULT NULL;

-- Tabela para armazenar documentos de verificação
CREATE TABLE IF NOT EXISTS user_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Documento de identidade (CNH ou RG)
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('cnh', 'rg', 'passport')),
  document_front_url VARCHAR(512) NOT NULL,
  document_back_url VARCHAR(512) DEFAULT NULL, -- Opcional para CNH
  
  -- Selfie com documento
  selfie_url VARCHAR(512) NOT NULL,
  
  -- Dados adicionais
  full_name VARCHAR(200) NOT NULL,
  birth_date DATE NOT NULL,
  document_number VARCHAR(50) NOT NULL, -- CPF ou número do documento
  
  -- Status e revisão
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  reviewed_by UUID DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  admin_notes TEXT DEFAULT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_verifications_user_id ON user_verifications(user_id);
CREATE INDEX idx_user_verifications_status ON user_verifications(status);
CREATE INDEX idx_user_verifications_created_at ON user_verifications(created_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_verifications_updated_at BEFORE UPDATE ON user_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;

-- Policies para user_verifications
CREATE POLICY "Users can view own verifications" ON user_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verifications" ON user_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verifications" ON user_verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
