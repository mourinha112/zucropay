<?php
require_once 'db.php';

$userId = 3; // zucro@zucro.com

try {
    $pdo = db_connect();
    
    echo "=== TESTANDO SALDO DO USUÁRIO ===\n\n";
    
    // 1. Saldo do usuário
    $stmt = $pdo->prepare('SELECT balance FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $userBalance = (float)$user['balance'];
    echo "💰 Saldo disponível: R$ " . number_format($userBalance, 2, ',', '.') . "\n\n";
    
    // 2. Saldo pendente
    $stmt = $pdo->prepare('SELECT SUM(amount) as pending FROM transactions WHERE user_id = ? AND status = ? AND type IN (?, ?)');
    $stmt->execute([$userId, 'pending', 'deposit', 'payment_received']);
    $pendingData = $stmt->fetch(PDO::FETCH_ASSOC);
    $pendingBalance = (float)($pendingData['pending'] ?? 0);
    
    echo "⏳ Saldo pendente: R$ " . number_format($pendingBalance, 2, ',', '.') . "\n\n";
    
    // 3. Saldo total
    $totalBalance = $userBalance + $pendingBalance;
    echo "💵 Saldo total: R$ " . number_format($totalBalance, 2, ',', '.') . "\n\n";
    
    // 4. Histórico de transações
    echo "=== TRANSAÇÕES RECENTES ===\n\n";
    
    $stmt = $pdo->prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10');
    $stmt->execute([$userId]);
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($transactions as $transaction) {
        $signal = in_array($transaction['type'], ['deposit', 'payment_received']) ? '+' : '-';
        echo "{$transaction['created_at']} | {$transaction['type']} | $signal R$ {$transaction['amount']} | {$transaction['status']}\n";
        echo "   Descrição: {$transaction['description']}\n";
        echo "---\n";
    }
    
    echo "\n✅ Teste concluído!\n";
    
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}
?>
