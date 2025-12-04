-- ===================================
-- ATUALIZAÇÃO DE TABELAS PARA CHECKOUT CUSTOMIZADO
-- ===================================

-- Adicionar campos para personalização do checkout
ALTER TABLE checkout_customization 
ADD COLUMN IF NOT EXISTS mobile_optimized BOOLEAN DEFAULT TRUE AFTER custom_css;

-- Adicionar campo para armazenar configurações do vendedor
ALTER TABLE users
ADD COLUMN IF NOT EXISTS merchant_settings JSON DEFAULT NULL AFTER asaas_customer_id;

-- Criar índice para melhor performance em buscas de links públicos
CREATE INDEX IF NOT EXISTS idx_payment_links_asaas_id ON payment_links(asaas_payment_link_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_active ON payment_links(active);

-- Adicionar campo para rastrear conversões
ALTER TABLE payment_links
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,2) DEFAULT 0.00 AFTER total_received;

-- Criar tabela para estatísticas detalhadas de checkout
CREATE TABLE IF NOT EXISTS checkout_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_link_id INT NOT NULL,
    visitor_id VARCHAR(100) NOT NULL,
    device_type ENUM('desktop', 'mobile', 'tablet') DEFAULT 'desktop',
    payment_method VARCHAR(50) NULL,
    step_reached ENUM('viewed', 'filled_form', 'selected_payment', 'completed', 'abandoned') DEFAULT 'viewed',
    conversion_time INT NULL COMMENT 'Tempo em segundos até conversão',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_link_id) REFERENCES payment_links(id) ON DELETE CASCADE,
    INDEX idx_payment_link (payment_link_id),
    INDEX idx_step (step_reached),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Atualizar comentários das tabelas
ALTER TABLE payment_links COMMENT = 'Links de pagamento com checkout customizado do ZucroPay';
ALTER TABLE checkout_customization COMMENT = 'Configurações de personalização do checkout por produto';

-- Inserir configuração padrão de merchant para usuário de teste
UPDATE users 
SET merchant_settings = JSON_OBJECT(
    'checkout_logo', NULL,
    'checkout_primary_color', '#667eea',
    'checkout_secondary_color', '#764ba2',
    'support_whatsapp', NULL,
    'support_email', email,
    'thankyou_message', 'Obrigado pela sua compra!',
    'redirect_url', NULL
)
WHERE merchant_settings IS NULL;

COMMIT;
