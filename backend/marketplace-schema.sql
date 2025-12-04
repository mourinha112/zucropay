-- Adicionar coluna marketplace_enabled na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS marketplace_enabled TINYINT(1) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) DEFAULT 30.00;

-- Criar tabela de afiliações
CREATE TABLE IF NOT EXISTS affiliates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    affiliate_user_id INT NOT NULL,
    product_owner_id INT NOT NULL,
    affiliate_link VARCHAR(255) UNIQUE NOT NULL,
    commission_percentage DECIMAL(5,2) DEFAULT 30.00,
    total_sales INT DEFAULT 0,
    total_earned DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (affiliate_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_owner_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_affiliate (product_id, affiliate_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de vendas de afiliados
CREATE TABLE IF NOT EXISTS affiliate_sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    affiliate_id INT NOT NULL,
    payment_id INT NOT NULL,
    product_id INT NOT NULL,
    sale_value DECIMAL(10,2) NOT NULL,
    commission_value DECIMAL(10,2) NOT NULL,
    commission_percentage DECIMAL(5,2) NOT NULL,
    status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL,
    FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
