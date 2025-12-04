-- ===================================
-- OTIMIZAÇÃO DE PERFORMANCE DO CHECKOUT
-- ===================================

-- Índice para busca rápida de links por asaas_payment_link_id
CREATE INDEX IF NOT EXISTS idx_payment_links_asaas_id_active 
ON payment_links(asaas_payment_link_id, active);

-- Índice para JOIN com produtos
CREATE INDEX IF NOT EXISTS idx_payment_links_product_id 
ON payment_links(product_id);

-- Índice para busca de clientes por asaas_customer_id
CREATE INDEX IF NOT EXISTS idx_asaas_customers_asaas_id 
ON asaas_customers(asaas_customer_id);

-- Índice composto para pagamentos
CREATE INDEX IF NOT EXISTS idx_payments_user_status 
ON payments(user_id, status);

-- Estatísticas das tabelas para otimizar queries
ANALYZE TABLE payment_links;
ANALYZE TABLE products;
ANALYZE TABLE asaas_customers;
ANALYZE TABLE payments;
