<?php
require_once 'db.php';

// Usar ID do usuário direto
$userId = 3; // zucro@zucro.com

try {
    $pdo = db_connect();
    
    echo "=== TESTANDO API DE PAYMENTS ===\n\n";
    
    $stmt = $pdo->prepare('
        SELECT 
            p.*,
            c.name as customer_name,
            c.email as customer_email,
            c.cpf_cnpj as customer_cpf
        FROM payments p
        LEFT JOIN asaas_customers c ON p.customer_id = c.id
        WHERE p.user_id = ? 
        ORDER BY p.created_at DESC 
        LIMIT 5
    ');
    $stmt->execute([$userId]);
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Total de pagamentos: " . count($payments) . "\n\n";
    
    foreach ($payments as $payment) {
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "ID: {$payment['id']}\n";
        echo "Asaas Payment ID: {$payment['asaas_payment_id']}\n";
        echo "Cliente: {$payment['customer_name']}\n";
        echo "Email: {$payment['customer_email']}\n";
        echo "CPF/CNPJ: {$payment['customer_cpf']}\n";
        echo "Produto: {$payment['description']}\n";
        echo "Valor: R$ {$payment['value']}\n";
        echo "Valor Líquido: R$ {$payment['net_value']}\n";
        echo "Método: {$payment['billing_type']}\n";
        echo "Status: {$payment['status']}\n";
        echo "Data: {$payment['created_at']}\n";
    }
    
    echo "\n✅ API funcionando corretamente!\n";
    
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}
?>
