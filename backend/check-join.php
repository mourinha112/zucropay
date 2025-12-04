<?php
require_once 'db.php';

try {
    $pdo = db_connect();
    
    echo "=== CLIENTES (asaas_customers) ===\n\n";
    
    $stmt = $pdo->query('SELECT * FROM asaas_customers LIMIT 5');
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "ID: {$row['id']}\n";
        echo "Nome: {$row['name']}\n";
        echo "Email: {$row['email']}\n";
        echo "CPF/CNPJ: {$row['cpf_cnpj']}\n";
        echo "---\n";
    }
    
    echo "\n=== PAGAMENTOS COM JOIN ===\n\n";
    
    $stmt = $pdo->query('
        SELECT 
            p.id,
            p.description,
            p.value,
            p.status,
            c.name as customer_name,
            c.email as customer_email
        FROM payments p
        LEFT JOIN asaas_customers c ON p.customer_id = c.id
        ORDER BY p.created_at DESC
        LIMIT 5
    ');
    
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "Pagamento ID: {$row['id']}\n";
        echo "Cliente: {$row['customer_name']}\n";
        echo "Email: {$row['customer_email']}\n";
        echo "Produto: {$row['description']}\n";
        echo "Valor: R$ {$row['value']}\n";
        echo "Status: {$row['status']}\n";
        echo "---\n";
    }
    
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}
?>
