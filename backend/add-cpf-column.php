<?php
require_once 'db.php';

try {
    $pdo = db_connect();
    
    // Adicionar coluna cpf_cnpj se não existir
    $pdo->exec("ALTER TABLE users ADD COLUMN cpf_cnpj VARCHAR(20) DEFAULT NULL");
    
    echo "✅ Coluna cpf_cnpj adicionada na tabela users!\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "✅ Coluna cpf_cnpj já existe!\n";
    } else {
        echo "❌ Erro: " . $e->getMessage() . "\n";
    }
}
?>
