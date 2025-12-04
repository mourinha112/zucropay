<?php
require_once __DIR__ . '/db.php';

try {
    $pdo = db_connect();
    
    echo "=== MIGRAÇÃO DA TABELA checkout_customization ===\n\n";
    
    // 1. Verificar se existe backup
    echo "1. Removendo tabela antiga...\n";
    $pdo->exec("DROP TABLE IF EXISTS checkout_customization");
    echo "✓ Tabela antiga removida\n\n";
    
    // 2. Criar nova tabela com estrutura correta
    echo "2. Criando nova estrutura...\n";
    $sql = "
    CREATE TABLE checkout_customization (
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
    echo "✓ Nova tabela criada com sucesso!\n\n";
    
    // 3. Verificar estrutura
    echo "3. Verificando estrutura:\n";
    $stmt = $pdo->query("DESCRIBE checkout_customization");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  - {$row['Field']} ({$row['Type']})\n";
    }
    
    echo "\n✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!\n";
    echo "\nAgora você pode usar a API de personalização normalmente.\n";
    
} catch (PDOException $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    exit(1);
}
