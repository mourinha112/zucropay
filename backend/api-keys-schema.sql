-- Tabela de API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  api_key VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(100) DEFAULT 'Chave Principal',
  status ENUM('active', 'inactive', 'revoked') DEFAULT 'active',
  last_used_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_api_key (api_key),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  url VARCHAR(512) NOT NULL,
  secret VARCHAR(64) NOT NULL,
  events JSON DEFAULT NULL,
  status ENUM('active', 'inactive', 'failed') DEFAULT 'active',
  last_success_at TIMESTAMP NULL DEFAULT NULL,
  last_failure_at TIMESTAMP NULL DEFAULT NULL,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Logs de Webhook
CREATE TABLE IF NOT EXISTS webhook_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  webhook_id INT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  payload JSON NOT NULL,
  response_code INT DEFAULT NULL,
  response_body TEXT DEFAULT NULL,
  success TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE,
  INDEX idx_webhook_id (webhook_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
