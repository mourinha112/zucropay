<?php
require_once 'db.php';

try {
    $pdo = db_connect();
    
    // Buscar a transação RECEIVED_IN_CASH que está com status incorreto
    $stmt = $pdo->prepare("
        SELECT t.*, p.user_id, p.value 
        FROM transactions t
        LEFT JOIN payments p ON t.asaas_payment_id = p.asaas_payment_id
        WHERE t.status = 'pending' 
        AND t.type IN ('payment_received', 'deposit')
        AND t.asaas_payment_id IS NOT NULL
        ORDER BY t.created_at DESC
        LIMIT 10
    ");
    $stmt->execute();
    $pendingTransactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "📋 Transações pendentes encontradas: " . count($pendingTransactions) . "\n\n";
    
    foreach ($pendingTransactions as $transaction) {
        echo "ID: {$transaction['id']}\n";
        echo "Tipo: {$transaction['type']}\n";
        echo "Valor: R$ {$transaction['amount']}\n";
        echo "Status: {$transaction['status']}\n";
        echo "Asaas Payment ID: {$transaction['asaas_payment_id']}\n";
        echo "Usuário: {$transaction['user_id']}\n";
        echo "Criado em: {$transaction['created_at']}\n";
        echo "---\n";
    }
    
    // Processar TODAS as transações pendentes com asaas_payment_id
    if (count($pendingTransactions) > 0) {
        echo "\n🔧 Processando transações...\n\n";
        
        foreach ($pendingTransactions as $transaction) {
            // Atualizar status da transação para completed
            $stmt = $pdo->prepare("UPDATE transactions SET status = 'completed' WHERE id = ?");
            $stmt->execute([$transaction['id']]);
            
            // Adicionar valor ao saldo do usuário
            $stmt = $pdo->prepare("UPDATE users SET balance = balance + ? WHERE id = ?");
            $stmt->execute([$transaction['amount'], $transaction['user_id']]);
            
            echo "✅ Transação #{$transaction['id']} processada: R$ {$transaction['amount']} adicionado ao saldo do usuário {$transaction['user_id']}\n";
            
            // Atualizar status do pagamento se existir
            if ($transaction['type'] === 'payment_received') {
                $stmt = $pdo->prepare("UPDATE payments SET status = 'RECEIVED' WHERE asaas_payment_id = ?");
                $stmt->execute([$transaction['asaas_payment_id']]);
                echo "   → Status do pagamento atualizado\n";
            }
        }
        
        echo "\n✅ Todas as transações foram processadas!\n";
    } else {
        echo "\n✅ Nenhuma transação pendente para processar.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}
?>
