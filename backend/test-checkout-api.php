<?php
// Ativar exibição de erros para debug
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== TESTE DE DEBUG ===\n\n";

// Testar conexão com banco
echo "1. Testando db.php...\n";
try {
    require_once __DIR__ . '/db.php';
    echo "✓ db.php carregado\n";
    
    $pdo = db_connect();
    echo "✓ Conexão com banco OK\n";
    
    // Testar se a tabela existe
    echo "\n2. Testando tabela checkout_customization...\n";
    $stmt = $pdo->query("SHOW TABLES LIKE 'checkout_customization'");
    if ($stmt->rowCount() > 0) {
        echo "✓ Tabela existe\n";
        
        // Ver estrutura
        echo "\n3. Estrutura da tabela:\n";
        $stmt = $pdo->query("DESCRIBE checkout_customization");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "  - {$row['Field']} ({$row['Type']})\n";
        }
    } else {
        echo "✗ Tabela NÃO existe!\n";
    }
    
    // Testar tabela products
    echo "\n4. Testando tabela products...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM products");
    $result = $stmt->fetch();
    echo "✓ Tabela products tem {$result['count']} produtos\n";
    
    // Listar alguns produtos
    echo "\n5. Primeiros produtos:\n";
    $stmt = $pdo->query("SELECT id, name, user_id FROM products LIMIT 3");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  - ID: {$row['id']}, Nome: {$row['name']}, User ID: {$row['user_id']}\n";
    }
    
    echo "\n✓ TODOS OS TESTES PASSARAM!\n";
    
} catch (Exception $e) {
    echo "\n✗ ERRO: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
