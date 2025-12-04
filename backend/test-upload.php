<?php
// Script de teste para verificar se o upload está funcionando

echo "=== TESTE DE UPLOAD ===\n\n";

// 1. Verificar se a pasta existe
$uploadsDir = __DIR__ . '/../public/uploads/products';
echo "1. Verificando pasta de uploads:\n";
echo "   Caminho: {$uploadsDir}\n";

if (!file_exists($uploadsDir)) {
    echo "   ❌ Pasta não existe. Tentando criar...\n";
    if (mkdir($uploadsDir, 0755, true)) {
        echo "   ✓ Pasta criada com sucesso!\n";
    } else {
        echo "   ❌ ERRO: Não foi possível criar a pasta\n";
        echo "   Verifique as permissões do sistema\n";
        exit(1);
    }
} else {
    echo "   ✓ Pasta existe\n";
}

// 2. Verificar permissões
echo "\n2. Verificando permissões:\n";
if (is_writable($uploadsDir)) {
    echo "   ✓ Pasta tem permissão de escrita\n";
} else {
    echo "   ❌ Pasta NÃO tem permissão de escrita\n";
    echo "   Execute: chmod 755 " . $uploadsDir . "\n";
}

// 3. Verificar db.php
echo "\n3. Verificando db.php:\n";
if (file_exists(__DIR__ . '/db.php')) {
    echo "   ✓ Arquivo db.php existe\n";
    require_once __DIR__ . '/db.php';
    
    // Testar função authenticate
    echo "\n4. Testando função authenticate:\n";
    if (function_exists('authenticate')) {
        echo "   ✓ Função authenticate() existe\n";
        
        // Testar com token falso (vai dar erro, mas pelo menos sabemos que a função existe)
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer fake_token';
        try {
            authenticate();
            echo "   ⚠️ Token falso foi aceito (PROBLEMA!)\n";
        } catch (Exception $e) {
            echo "   ✓ Função authenticate() está funcionando (rejeitou token falso)\n";
        }
    } else {
        echo "   ❌ Função authenticate() NÃO existe\n";
    }
    
    if (function_exists('jsonResponse')) {
        echo "   ✓ Função jsonResponse() existe\n";
    } else {
        echo "   ❌ Função jsonResponse() NÃO existe\n";
    }
} else {
    echo "   ❌ Arquivo db.php NÃO existe\n";
}

// 5. Verificar configurações PHP
echo "\n5. Configurações PHP:\n";
echo "   upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "   post_max_size: " . ini_get('post_max_size') . "\n";
echo "   file_uploads: " . (ini_get('file_uploads') ? 'Habilitado' : 'Desabilitado') . "\n";

echo "\n=== FIM DO TESTE ===\n";
?>
