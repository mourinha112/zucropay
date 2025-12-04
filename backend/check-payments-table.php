<?php
require_once 'db.php';

try {
    $pdo = db_connect();
    
    echo "=== ESTRUTURA DA TABELA PAYMENTS ===\n\n";
    
    $result = $pdo->query('DESCRIBE payments');
    foreach($result as $row) {
        echo $row['Field'] . ' - ' . $row['Type'] . "\n";
    }
    
    echo "\n=== DADOS DE UM PAGAMENTO ===\n\n";
    $stmt = $pdo->query('SELECT * FROM payments LIMIT 1');
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($payment) {
        foreach ($payment as $key => $value) {
            echo "$key: " . ($value ?? 'NULL') . "\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}
?>
