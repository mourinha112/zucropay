-- ============================================
-- RESERVA DE SALDO - 5% por 30 dias
-- Segurança para reembolsos e chargebacks
-- Execute no Supabase SQL Editor
-- ============================================

-- Tabela de reservas de saldo
CREATE TABLE IF NOT EXISTS balance_reserves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Valores
  original_amount DECIMAL(10, 2) NOT NULL,  -- Valor original da venda
  reserve_amount DECIMAL(10, 2) NOT NULL,   -- 5% retido
  released_amount DECIMAL(10, 2) DEFAULT 0, -- Quanto já foi liberado
  
  -- Status
  status VARCHAR(20) DEFAULT 'held' CHECK (status IN ('held', 'released', 'used_chargeback')),
  
  -- Datas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  release_date TIMESTAMP WITH TIME ZONE NOT NULL, -- Data para liberar (30 dias após criação)
  released_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  -- Descrição
  description TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_balance_reserves_user_id ON balance_reserves(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_reserves_status ON balance_reserves(status);
CREATE INDEX IF NOT EXISTS idx_balance_reserves_release_date ON balance_reserves(release_date);
CREATE INDEX IF NOT EXISTS idx_balance_reserves_payment_id ON balance_reserves(payment_id);

-- Adicionar coluna de reserva na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reserved_balance DECIMAL(10, 2) DEFAULT 0.00;

-- View para ver reservas prontas para liberar
CREATE OR REPLACE VIEW reserves_ready_to_release AS
SELECT 
  br.*,
  u.name as user_name,
  u.email as user_email,
  u.balance as current_balance,
  u.reserved_balance
FROM balance_reserves br
JOIN users u ON br.user_id = u.id
WHERE br.status = 'held' 
  AND br.release_date <= NOW();

-- Função para liberar reservas automaticamente (pode ser chamada via cron)
CREATE OR REPLACE FUNCTION release_matured_reserves()
RETURNS INTEGER AS $$
DECLARE
  released_count INTEGER := 0;
  reserve_record RECORD;
BEGIN
  FOR reserve_record IN 
    SELECT * FROM balance_reserves 
    WHERE status = 'held' AND release_date <= NOW()
  LOOP
    -- Atualizar reserva
    UPDATE balance_reserves 
    SET 
      status = 'released',
      released_amount = reserve_amount,
      released_at = NOW()
    WHERE id = reserve_record.id;
    
    -- Atualizar saldo do usuário
    UPDATE users 
    SET 
      balance = balance + reserve_record.reserve_amount,
      reserved_balance = reserved_balance - reserve_record.reserve_amount
    WHERE id = reserve_record.user_id;
    
    released_count := released_count + 1;
  END LOOP;
  
  RETURN released_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE balance_reserves IS 'Reserva de 5% do valor de vendas por 30 dias para segurança contra chargebacks';
COMMENT ON COLUMN balance_reserves.reserve_amount IS '5% do valor original retido';
COMMENT ON COLUMN balance_reserves.release_date IS 'Data em que a reserva será liberada (30 dias após criação)';

