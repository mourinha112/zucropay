<?php
require_once 'db.php';

try {
    $pdo = db_connect();
    
    // Pagamento que precisa ser processado
    $asaasPaymentId = 'pay_qhi1zhifgxq85j9e';
    
    echo "🔧 Processando pagamento: $asaasPaymentId\n\n";
    
    // 1. Buscar dados do pagamento
    $stmt = $pdo->prepare("SELECT * FROM payments WHERE asaas_payment_id = ?");
    $stmt->execute([$asaasPaymentId]);
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$payment) {
        echo "❌ Pagamento não encontrado!\n";
        exit;
    }
    
    echo "📦 Pagamento encontrado:\n";
    echo "   Usuário ID: {$payment['user_id']}\n";
    echo "   Valor: R$ {$payment['value']}\n";
    echo "   Status atual: {$payment['status']}\n\n";
    
    // 2. Verificar se já existe transação para este pagamento
    $stmt = $pdo->prepare("SELECT * FROM transactions WHERE asaas_payment_id = ?");
    $stmt->execute([$asaasPaymentId]);
    $existingTransaction = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingTransaction) {
        echo "⚠️ Transação já existe (ID: {$existingTransaction['id']})\n";
        
        if ($existingTransaction['status'] === 'completed') {
            echo "✅ Transação já está como 'completed'. Nada a fazer.\n";
            exit;
        } else {
            echo "🔄 Atualizando status da transação para 'completed'...\n";
            $stmt = $pdo->prepare("UPDATE transactions SET status = 'completed' WHERE id = ?");
            $stmt->execute([$existingTransaction['id']]);
        }
    } else {
        echo "📝 Criando nova transação...\n";
        // Criar transação
        $stmt = $pdo->prepare("
            INSERT INTO transactions (user_id, type, amount, status, description, asaas_payment_id) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $payment['user_id'],
            'payment_received',
            $payment['value'],
            'completed',
            'Pagamento recebido via Asaas (RECEIVED_IN_CASH)',
            $asaasPaymentId
        ]);
        echo "✅ Transação criada (ID: " . $pdo->lastInsertId() . ")\n";
    }
    
    // 3. Adicionar valor ao saldo do usuário
    echo "💰 Adicionando R$ {$payment['value']} ao saldo...\n";
    $stmt = $pdo->prepare("UPDATE users SET balance = balance + ? WHERE id = ?");
    $stmt->execute([$payment['value'], $payment['user_id']]);
    
    // 4. Atualizar status do pagamento
    echo "📦 Atualizando status do pagamento para 'RECEIVED'...\n";
    $stmt = $pdo->prepare("UPDATE payments SET status = 'RECEIVED', payment_date = NOW() WHERE asaas_payment_id = ?");
    $stmt->execute([$asaasPaymentId]);
    
    // 5. Marcar webhooks como processados
    echo "📨 Marcando webhooks como processados...\n";
    $stmt = $pdo->prepare("UPDATE webhooks_log SET processed = 1 WHERE event_type = 'PAYMENT_RECEIVED' AND payload LIKE ?");
    $stmt->execute(['%' . $asaasPaymentId . '%']);
    
    // 6. Verificar novo saldo
    $stmt = $pdo->prepare("SELECT balance FROM users WHERE id = ?");
    $stmt->execute([$payment['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "\n✅ PROCESSAMENTO CONCLUÍDO!\n";
    echo "   Novo saldo: R$ {$user['balance']}\n";
    
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}
?>
