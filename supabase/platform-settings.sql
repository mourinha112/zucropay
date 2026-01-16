-- =============================================
-- TABELA DE CONFIGURAÇÕES DA PLATAFORMA
-- =============================================

-- Tabela para armazenar configurações de taxas
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Taxas principais
  pix_fee_percent NUMERIC(5, 4) DEFAULT 0.0599,      -- 5.99% para PIX
  boleto_fee_percent NUMERIC(5, 4) DEFAULT 0.0599,   -- 5.99% para Boleto
  card_fee_percent NUMERIC(5, 4) DEFAULT 0.0599,     -- 5.99% para Cartão (base)
  card_installment_fee NUMERIC(5, 4) DEFAULT 0.0249, -- 2.49% por parcela adicional
  
  -- Taxa fixa por transação
  fixed_fee_pix NUMERIC(10, 2) DEFAULT 2.50,         -- R$2.50 fixo para PIX
  fixed_fee_boleto NUMERIC(10, 2) DEFAULT 2.50,      -- R$2.50 fixo para Boleto
  fixed_fee_card NUMERIC(10, 2) DEFAULT 0.00,        -- Sem taxa fixa para cartão
  
  -- Valor mínimo para aplicar taxa fixa
  min_value_for_fixed_fee NUMERIC(10, 2) DEFAULT 5.00,
  
  -- Reserva (retenção)
  reserve_percent NUMERIC(5, 4) DEFAULT 0.05,        -- 5% de reserva
  reserve_days INT DEFAULT 14,                        -- Dias para liberar reserva
  
  -- Taxa de saque
  withdrawal_fee NUMERIC(10, 2) DEFAULT 3.00,        -- R$3.00 por saque
  min_withdrawal NUMERIC(10, 2) DEFAULT 10.00,       -- Mínimo para sacar
  
  -- Metadados
  updated_by UUID REFERENCES admin_credentials(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configuração padrão se não existir
INSERT INTO platform_settings (id)
SELECT uuid_generate_v4()
WHERE NOT EXISTS (SELECT 1 FROM platform_settings LIMIT 1);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_platform_settings_updated ON platform_settings(updated_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_platform_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_platform_settings_updated ON platform_settings;
CREATE TRIGGER trigger_platform_settings_updated
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_settings_timestamp();

-- Log de alterações de configuração
CREATE TABLE IF NOT EXISTS platform_settings_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES admin_credentials(id),
  setting_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings_log ENABLE ROW LEVEL SECURITY;

-- Política: apenas service role pode modificar
CREATE POLICY "Service role full access to platform_settings" ON platform_settings
  FOR ALL USING (true);

CREATE POLICY "Service role full access to platform_settings_log" ON platform_settings_log
  FOR ALL USING (true);
