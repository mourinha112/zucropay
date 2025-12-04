<?php
require_once 'db.php';

try {
    $pdo = db_connect();
    
    $pdo->exec("ALTER TABLE transactions ADD COLUMN asaas_transfer_id VARCHAR(100) DEFAULT NULL");
    
    echo "✅ Coluna asaas_transfer_id adicionada!\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "✅ Coluna asaas_transfer_id já existe!\n";
    } else {
        echo "❌ Erro: " . $e->getMessage() . "\n";
    }
}
?>
