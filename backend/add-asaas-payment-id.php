<?php
require_once 'db.php';

try {
    $pdo = db_connect();
    
    // Adicionar coluna asaas_payment_id na tabela transactions
    $pdo->exec("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS asaas_payment_id VARCHAR(100) DEFAULT NULL");
    
    echo "✅ Coluna asaas_payment_id adicionada com sucesso!\n";
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}
?>
