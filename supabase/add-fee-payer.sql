-- Adicionar coluna fee_payer na tabela products
-- Quem paga as taxas: 'seller' (vendedor) ou 'buyer' (comprador)

-- Adicionar a coluna
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS fee_payer VARCHAR(10) DEFAULT 'seller';

-- Verificar se foi criada
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'fee_payer';

-- Verificar produtos existentes
SELECT id, name, price, fee_payer FROM products LIMIT 10;
