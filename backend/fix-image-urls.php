<?php
require_once __DIR__ . '/db.php';

echo "=== CORRIGIR URLS DE IMAGENS ===\n\n";

try {
    $pdo = db_connect();
    
    // Detectar ambiente (localhost ou produção)
    $backendUrl = 'http://localhost:8000';
    if (isset($_SERVER['HTTP_HOST'])) {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $backendUrl = $protocol . '://' . $_SERVER['HTTP_HOST'];
    }
    
    echo "Backend URL detectada: $backendUrl\n\n";
    
    // 1. Verificar quantas imagens precisam ser corrigidas
    echo "1. Verificando imagens...\n";
    $stmt = $pdo->query("
        SELECT COUNT(*) as total 
        FROM products 
        WHERE image_url LIKE '/uploads/products/%'
        AND image_url NOT LIKE 'http%'
    ");
    $result = $stmt->fetch();
    $totalImages = $result['total'];
    
    if ($totalImages == 0) {
        echo "✓ Nenhuma imagem precisa ser corrigida!\n";
        exit(0);
    }
    
    echo "→ Encontradas $totalImages imagens para corrigir\n\n";
    
    // 2. Mostrar exemplos antes
    echo "2. Exemplos ANTES da correção:\n";
    $stmt = $pdo->query("
        SELECT id, name, image_url 
        FROM products 
        WHERE image_url LIKE '/uploads/products/%'
        AND image_url NOT LIKE 'http%'
        LIMIT 3
    ");
    while ($row = $stmt->fetch()) {
        echo "  - ID {$row['id']}: {$row['image_url']}\n";
    }
    echo "\n";
    
    // 3. Perguntar confirmação (se rodando no terminal)
    if (php_sapi_name() === 'cli') {
        echo "Deseja continuar com a correção? (s/n): ";
        $handle = fopen("php://stdin", "r");
        $line = fgets($handle);
        if (trim(strtolower($line)) !== 's') {
            echo "Operação cancelada.\n";
            exit(0);
        }
        fclose($handle);
        echo "\n";
    }
    
    // 4. Atualizar URLs de produtos
    echo "3. Atualizando URLs de produtos...\n";
    $stmt = $pdo->prepare("
        UPDATE products 
        SET image_url = CONCAT(?, image_url)
        WHERE image_url LIKE '/uploads/products/%'
        AND image_url NOT LIKE 'http%'
    ");
    $stmt->execute([$backendUrl]);
    $updated = $stmt->rowCount();
    echo "✓ $updated produtos atualizados\n\n";
    
    // 5. Atualizar URLs em customizações
    echo "4. Atualizando URLs em customizações...\n";
    $stmt = $pdo->prepare("
        UPDATE checkout_customization 
        SET settings = REPLACE(settings, '\"/uploads/', ?)
        WHERE settings LIKE '%\"/uploads/%'
    ");
    $stmt->execute(['"' . $backendUrl . '/uploads/']);
    $updated = $stmt->rowCount();
    echo "✓ $updated customizações atualizadas\n\n";
    
    // 6. Mostrar exemplos depois
    echo "5. Exemplos DEPOIS da correção:\n";
    $stmt = $pdo->query("
        SELECT id, name, image_url 
        FROM products 
        WHERE image_url LIKE '%/uploads/products/%'
        LIMIT 3
    ");
    while ($row = $stmt->fetch()) {
        echo "  - ID {$row['id']}: {$row['image_url']}\n";
    }
    echo "\n";
    
    // 7. Verificar se funcionou
    echo "6. Verificação final...\n";
    $stmt = $pdo->query("
        SELECT COUNT(*) as total 
        FROM products 
        WHERE image_url LIKE '/uploads/products/%'
        AND image_url NOT LIKE 'http%'
    ");
    $result = $stmt->fetch();
    $remaining = $result['total'];
    
    if ($remaining == 0) {
        echo "✅ SUCESSO! Todas as URLs foram corrigidas!\n";
    } else {
        echo "⚠️ Ainda restam $remaining URLs para corrigir.\n";
    }
    
    echo "\n=== CONCLUÍDO ===\n";
    
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    exit(1);
}
