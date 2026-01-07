-- ============================================
-- MIGRAÇÃO: Adicionar colunas para EfiBank
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Adicionar colunas na tabela payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS efi_txid VARCHAR(100),
ADD COLUMN IF NOT EXISTS efi_charge_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_payments_efi_txid ON payments(efi_txid);
CREATE INDEX IF NOT EXISTS idx_payments_efi_charge_id ON payments(efi_charge_id);

-- Adicionar coluna link_id diretamente (alternativa ao metadata)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_link_id UUID REFERENCES payment_links(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_payment_link_id ON payments(payment_link_id);

-- Atualizar tabela users para EfiBank
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS efi_customer_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_users_efi_customer ON users(efi_customer_id);

-- Atualizar payment_links para não exigir asaas_payment_link_id
ALTER TABLE payment_links 
ALTER COLUMN asaas_payment_link_id DROP NOT NULL,
ALTER COLUMN asaas_link_url DROP NOT NULL;

-- Adicionar colunas EfiBank em payment_links
ALTER TABLE payment_links
ADD COLUMN IF NOT EXISTS efi_charge_id VARCHAR(100);

-- Atualizar tabela transactions para EfiBank
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS efi_txid VARCHAR(100),
ADD COLUMN IF NOT EXISTS efi_charge_id VARCHAR(100);

-- Verificar se as alterações foram aplicadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;

