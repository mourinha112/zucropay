<?php
require_once __DIR__ . '/db.php';

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
    
    $pdo = db_connect();
    
    // Parâmetros de paginação
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    $type = isset($_GET['type']) ? $_GET['type'] : null;
    
    // Construir query
    $query = 'SELECT * FROM transactions WHERE user_id = ?';
    $params = [$userId];
    
    if ($type) {
        $query .= ' AND type = ?';
        $params[] = $type;
    }
    
    $query .= ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $transactions = $stmt->fetchAll();
    
    // Formatar transações
    $formattedTransactions = array_map(function($t) {
        return [
            'id' => (int)$t['id'],
            'type' => $t['type'],
            'amount' => (float)$t['amount'],
            'status' => $t['status'],
            'description' => $t['description'],
            'asaasPaymentId' => $t['asaas_payment_id'],
            'asaasTransferId' => $t['asaas_transfer_id'],
            'createdAt' => $t['created_at'],
            'updatedAt' => $t['updated_at']
        ];
    }, $transactions);
    
    jsonResponse([
        'success' => true,
        'transactions' => $formattedTransactions,
        'pagination' => [
            'limit' => $limit,
            'offset' => $offset,
            'count' => count($formattedTransactions)
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse(['success' => false, 'message' => $e->getMessage()]);
}

?>
