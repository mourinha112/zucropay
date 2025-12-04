<?php
require_once __DIR__ . '/db.php';

try {
    $pdo = db_connect();
    
    // Criar tabela checkout_customization se não existir
    $sql = "
    CREATE TABLE IF NOT EXISTS checkout_customization (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        settings TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_product (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    $pdo->exec($sql);
    echo "✅ Tabela 'checkout_customization' criada/verificada com sucesso!\n";
    
} catch (PDOException $e) {
    echo "❌ Erro ao criar tabela: " . $e->getMessage() . "\n";
    exit(1);
}
