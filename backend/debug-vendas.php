<?php
require_once 'db.php';

try {
    $pdo = db_connect();
    
    echo "=== VERIFICANDO VENDAS E TRANSAÇÕES ===\n\n";
    
    // 1. Verificar pagamentos
    echo "📦 PAGAMENTOS:\n";
    $stmt = $pdo->prepare("
        SELECT p.*, u.email, u.balance 
        FROM payments p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC 
        LIMIT 5
    ");
    $stmt->execute();
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($payments as $payment) {
        echo "ID: {$payment['id']}\n";
        echo "Asaas Payment ID: {$payment['asaas_payment_id']}\n";
        echo "Usuário: {$payment['email']} (Saldo: R$ {$payment['balance']})\n";
        echo "Valor: R$ {$payment['value']}\n";
        echo "Status: {$payment['status']}\n";
        echo "Criado em: {$payment['created_at']}\n";
        echo "---\n";
    }
    
    // 2. Verificar transações
    echo "\n💰 TRANSAÇÕES:\n";
    $stmt = $pdo->prepare("
        SELECT t.*, u.email 
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC 
        LIMIT 5
    ");
    $stmt->execute();
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($transactions as $transaction) {
        echo "ID: {$transaction['id']}\n";
        echo "Usuário: {$transaction['email']}\n";
        echo "Tipo: {$transaction['type']}\n";
        echo "Valor: R$ {$transaction['amount']}\n";
        echo "Status: {$transaction['status']}\n";
        echo "Asaas Payment ID: " . ($transaction['asaas_payment_id'] ?? 'N/A') . "\n";
        echo "Criado em: {$transaction['created_at']}\n";
        echo "---\n";
    }
    
    // 3. Verificar webhooks recebidos
    echo "\n📨 ÚLTIMOS WEBHOOKS:\n";
    $stmt = $pdo->prepare("
        SELECT * FROM webhooks_log 
        ORDER BY created_at DESC 
        LIMIT 5
    ");
    $stmt->execute();
    $webhooks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($webhooks as $webhook) {
        $payload = json_decode($webhook['payload'], true);
        echo "ID: {$webhook['id']}\n";
        echo "Evento: {$webhook['event_type']}\n";
        echo "Processado: " . ($webhook['processed'] ? 'Sim' : 'Não') . "\n";
        echo "Payment ID: " . ($payload['payment']['id'] ?? 'N/A') . "\n";
        echo "Status: " . ($payload['payment']['status'] ?? 'N/A') . "\n";
        echo "Criado em: {$webhook['created_at']}\n";
        echo "---\n";
    }
    
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}
?>
