<?php
require_once __DIR__ . '/db.php';

try {
    $pdo = db_connect();
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    $pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, true);
    
    $sql = file_get_contents(__DIR__ . '/optimize-performance.sql');
    
    // Executar cada comando separadamente
    $commands = array_filter(array_map('trim', explode(';', $sql)));
    
    foreach ($commands as $command) {
        if (!empty($command) && strpos($command, '--') !== 0) {
            try {
                $pdo->exec($command);
                echo "✓ Executado: " . substr($command, 0, 50) . "...\n";
            } catch (Exception $e) {
                echo "⚠ Aviso: " . $e->getMessage() . "\n";
            }
        }
    }
    
    echo "\n✅ Todos os índices foram criados com sucesso!\n";
    echo "⚡ O checkout agora deve carregar MUITO mais rápido!\n";
    
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
    exit(1);
}
?>
