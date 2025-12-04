<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/asaas-api.php';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    jsonResponse(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Autenticar usuário
    $userId = authenticate();
    
    // Buscar saldo do usuário no banco de dados
    $pdo = db_connect();
    $stmt = $pdo->prepare('SELECT balance FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        throw new Exception('Usuário não encontrado');
    }
    
    $userBalance = (float)$user['balance'];
    
    // Calcular saldo pendente (transações pending)
    $stmt = $pdo->prepare('SELECT SUM(amount) as pending FROM transactions WHERE user_id = ? AND status = ? AND type IN (?, ?)');
    $stmt->execute([$userId, 'pending', 'deposit', 'payment_received']);
    $pendingData = $stmt->fetch(PDO::FETCH_ASSOC);
    $pendingBalance = (float)($pendingData['pending'] ?? 0);
    
    jsonResponse([
        'success' => true,
        'balance' => [
            'available' => $userBalance,
            'pending' => $pendingBalance,
            'total' => $userBalance + $pendingBalance
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse(['success' => false, 'message' => $e->getMessage()]);
}

?>
