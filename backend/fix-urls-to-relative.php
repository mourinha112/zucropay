<?php
require_once __DIR__ . '/db.php';

echo "=== CONVERTER URLS PARA RELATIVAS ===\n\n";

try {
    $pdo = db_connect();
    
    // Atualizar produtos
    echo "1. Atualizando URLs de produtos...\n";
    $stmt = $pdo->exec("
        UPDATE products 
        SET image_url = REPLACE(image_url, 'http://localhost:8000', '')
        WHERE image_url LIKE 'http://localhost:8000%'
    ");
    echo "✓ $stmt URLs atualizadas\n\n";
    
    // Atualizar customizações
    echo "2. Atualizando URLs em customizações...\n";
    $stmt = $pdo->exec("
        UPDATE checkout_customization 
        SET settings = REPLACE(settings, 'http://localhost:8000', '')
        WHERE settings LIKE '%http://localhost:8000%'
    ");
    echo "✓ $stmt customizações atualizadas\n\n";
    
    // Verificar resultado
    echo "3. Verificando resultado...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as c FROM products WHERE image_url LIKE '/uploads/%'");
    $count = $stmt->fetch()['c'];
    echo "✓ $count produtos com URLs relativas\n\n";
    
    // Mostrar exemplos
    echo "4. Exemplos:\n";
    $stmt = $pdo->query("SELECT id, name, image_url FROM products WHERE image_url LIKE '/uploads/%' LIMIT 3");
    while ($row = $stmt->fetch()) {
        echo "  - ID {$row['id']}: {$row['image_url']}\n";
    }
    
    echo "\n✅ CONCLUÍDO!\n";
    echo "Agora as imagens vão carregar via proxy do Vite.\n";
    
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    exit(1);
}
