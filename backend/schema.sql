-- ZucroPay Database Schema
-- Criado para integração com Asaas API v3

CREATE DATABASE IF NOT EXISTS zucropay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zucropay;

-- ========== USUÁRIOS ==========
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(20),
  phone VARCHAR(20),
  avatar VARCHAR(512) DEFAULT NULL,
  asaas_customer_id VARCHAR(100) DEFAULT NULL,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_asaas_customer (asaas_customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== TRANSAÇÕES ==========
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('deposit', 'withdraw', 'payment_received', 'payment_sent', 'fee', 'refund') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  description TEXT,
  asaas_payment_id VARCHAR(100) DEFAULT NULL,
  asaas_transfer_id VARCHAR(100) DEFAULT NULL,
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== PRODUTOS ==========
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(512) DEFAULT NULL,
  stock INT DEFAULT NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== PERSONALIZAÇÃO DE CHECKOUT ==========
CREATE TABLE IF NOT EXISTS checkout_customization (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL UNIQUE,
  user_id INT NOT NULL,
  
  -- Imagens
  logo_url VARCHAR(512) DEFAULT NULL,
  banner_url VARCHAR(512) DEFAULT NULL,
  background_image_url VARCHAR(512) DEFAULT NULL,
  
  -- Cores
  primary_color VARCHAR(20) DEFAULT '#667eea',
  secondary_color VARCHAR(20) DEFAULT '#764ba2',
  text_color VARCHAR(20) DEFAULT '#333333',
  background_color VARCHAR(20) DEFAULT '#ffffff',
  
  -- Cronômetro/Timer
  countdown_enabled TINYINT(1) DEFAULT 0,
  countdown_minutes INT DEFAULT 30,
  countdown_text VARCHAR(200) DEFAULT 'Oferta expira em:',
  
  -- Garantia
  guarantee_enabled TINYINT(1) DEFAULT 0,
  guarantee_days INT DEFAULT 7,
  guarantee_text TEXT DEFAULT 'Garantia de 7 dias',
  
  -- Depoimentos/Provas Sociais
  testimonials_enabled TINYINT(1) DEFAULT 0,
  testimonials JSON DEFAULT NULL,
  
  -- FAQ
  faq_enabled TINYINT(1) DEFAULT 0,
  faq JSON DEFAULT NULL,
  
  -- Extras
  security_badges_enabled TINYINT(1) DEFAULT 1,
  whatsapp_support VARCHAR(20) DEFAULT NULL,
  custom_css TEXT DEFAULT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_product_id (product_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== LINKS DE PAGAMENTO ==========
CREATE TABLE IF NOT EXISTS payment_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT DEFAULT NULL,
  asaas_payment_link_id VARCHAR(100) NOT NULL,
  asaas_link_url VARCHAR(512) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  billing_type ENUM('BOLETO', 'CREDIT_CARD', 'PIX', 'UNDEFINED') DEFAULT 'UNDEFINED',
  active TINYINT(1) DEFAULT 1,
  clicks INT DEFAULT 0,
  payments_count INT DEFAULT 0,
  total_received DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_product_id (product_id),
  INDEX idx_asaas_payment_link (asaas_payment_link_id),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== CLIENTES DO ASAAS ==========
CREATE TABLE IF NOT EXISTS asaas_customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  asaas_customer_id VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(20),
  cpf_cnpj VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_asaas_customer (asaas_customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== COBRANÇAS ==========
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  customer_id INT DEFAULT NULL,
  asaas_payment_id VARCHAR(100) NOT NULL,
  billing_type ENUM('BOLETO', 'CREDIT_CARD', 'PIX', 'UNDEFINED') NOT NULL,
  status ENUM('PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE', 'REFUNDED', 'RECEIVED_IN_CASH', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 'DUNNING_REQUESTED', 'DUNNING_RECEIVED', 'AWAITING_RISK_ANALYSIS') DEFAULT 'PENDING',
  value DECIMAL(10, 2) NOT NULL,
  net_value DECIMAL(10, 2) DEFAULT 0.00,
  description TEXT,
  due_date DATE NOT NULL,
  payment_date DATETIME DEFAULT NULL,
  invoice_url VARCHAR(512) DEFAULT NULL,
  bank_slip_url VARCHAR(512) DEFAULT NULL,
  pix_qrcode TEXT DEFAULT NULL,
  pix_copy_paste TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES asaas_customers(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_asaas_payment (asaas_payment_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== ASSINATURAS ==========
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  customer_id INT NOT NULL,
  asaas_subscription_id VARCHAR(100) NOT NULL,
  billing_type ENUM('BOLETO', 'CREDIT_CARD', 'PIX', 'UNDEFINED') NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'EXPIRED') DEFAULT 'ACTIVE',
  value DECIMAL(10, 2) NOT NULL,
  cycle ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY') NOT NULL,
  description TEXT,
  next_due_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES asaas_customers(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_asaas_subscription (asaas_subscription_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== DADOS BANCÁRIOS PARA SAQUE ==========
CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bank_code VARCHAR(10) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  agency VARCHAR(20) NOT NULL,
  account VARCHAR(20) NOT NULL,
  account_digit VARCHAR(5) NOT NULL,
  account_type ENUM('CHECKING', 'SAVINGS') DEFAULT 'CHECKING',
  cpf_cnpj VARCHAR(20) NOT NULL,
  holder_name VARCHAR(200) NOT NULL,
  is_default TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== WEBHOOKS (Log de notificações do Asaas) ==========
CREATE TABLE IF NOT EXISTS webhooks_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  processed TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_type (event_type),
  INDEX idx_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== DADOS SEED ==========
-- Senha: 123456 (use password_hash('123456', PASSWORD_DEFAULT) no PHP)
-- Hash: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

-- Senha: zucro2025
-- Hash: $2y$10$XAKvwzE6z/qMPzF.LJZMVOgHJXB3nKq3lO/dYQXqZ5TfN7Y5rJ7tW
INSERT INTO users (name, email, password_hash, cpf_cnpj, phone, balance) VALUES
('Admin ZucroPay', 'admin@zucropay.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '12345678901', '11999999999', 1000.00),
('João Silva', 'joao@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '98765432100', '11988888888', 500.00),
('Zucro Test', 'zucro@zucro.com', '$2y$10$XAKvwzE6z/qMPzF.LJZMVOgHJXB3nKq3lO/dYQXqZ5TfN7Y5rJ7tW', '11122233344', '11977777777', 2000.00);

