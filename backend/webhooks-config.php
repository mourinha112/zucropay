<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

// Verificar autenticação
$headers = getallheaders();
$token = null;

if (isset($headers['Authorization'])) {
    $authHeader = $headers['Authorization'];
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = $matches[1];
    }
}

if (!$token) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Token não fornecido']);
    exit();
}

// Decodificar o token JWT para pegar o user_id
try {
    $tokenParts = explode('.', $token);
    if (count($tokenParts) !== 3) {
        throw new Exception('Token inválido');
    }
    
    $payload = json_decode(base64_decode($tokenParts[1]), true);
    if (!$payload || !isset($payload['userId'])) {
        throw new Exception('Token inválido');
    }
    
    $userId = $payload['userId'];
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Token inválido']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

// GET - Listar Webhooks do usuário
if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare("
            SELECT id, url, events, status, last_success_at, last_failure_at, failure_count, created_at
            FROM webhooks
            WHERE user_id = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$userId]);
        $webhooks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decodificar JSON de eventos
        foreach ($webhooks as &$webhook) {
            $webhook['events'] = json_decode($webhook['events'], true);
        }
        
        echo json_encode([
            'success' => true,
            'webhooks' => $webhooks
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao buscar webhooks: ' . $e->getMessage()]);
    }
}

// POST - Criar novo Webhook
elseif ($method === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $url = $data['url'] ?? null;
        $events = $data['events'] ?? ['PAYMENT_RECEIVED', 'PAYMENT_PENDING', 'PAYMENT_OVERDUE'];
        
        if (!$url) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'URL é obrigatória']);
            exit();
        }
        
        // Validar URL
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'URL inválida']);
            exit();
        }
        
        // Gerar secret para validação de assinatura
        $secret = bin2hex(random_bytes(32));
        
        $stmt = $pdo->prepare("
            INSERT INTO webhooks (user_id, url, secret, events, status)
            VALUES (?, ?, ?, ?, 'active')
        ");
        $stmt->execute([$userId, $url, $secret, json_encode($events)]);
        
        $webhookId = $pdo->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'message' => 'Webhook criado com sucesso',
            'webhook' => [
                'id' => $webhookId,
                'url' => $url,
                'secret' => $secret,
                'events' => $events,
                'status' => 'active',
                'created_at' => date('Y-m-d H:i:s')
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao criar webhook: ' . $e->getMessage()]);
    }
}

// PUT - Atualizar Webhook
elseif ($method === 'PUT') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $webhookId = $data['id'] ?? null;
        $url = $data['url'] ?? null;
        $events = $data['events'] ?? null;
        $status = $data['status'] ?? null;
        
        if (!$webhookId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID é obrigatório']);
            exit();
        }
        
        $updates = [];
        $params = [];
        
        if ($url) {
            $updates[] = "url = ?";
            $params[] = $url;
        }
        if ($events) {
            $updates[] = "events = ?";
            $params[] = json_encode($events);
        }
        if ($status) {
            $updates[] = "status = ?";
            $params[] = $status;
        }
        
        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nenhum campo para atualizar']);
            exit();
        }
        
        $params[] = $webhookId;
        $params[] = $userId;
        
        $sql = "UPDATE webhooks SET " . implode(', ', $updates) . " WHERE id = ? AND user_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode([
            'success' => true,
            'message' => 'Webhook atualizado com sucesso'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao atualizar: ' . $e->getMessage()]);
    }
}

// DELETE - Deletar Webhook
elseif ($method === 'DELETE') {
    try {
        parse_str(file_get_contents('php://input'), $data);
        $webhookId = $_GET['id'] ?? $data['id'] ?? null;
        
        if (!$webhookId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID é obrigatório']);
            exit();
        }
        
        $stmt = $pdo->prepare("
            DELETE FROM webhooks
            WHERE id = ? AND user_id = ?
        ");
        $stmt->execute([$webhookId, $userId]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Webhook deletado com sucesso'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao deletar: ' . $e->getMessage()]);
    }
}

else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
}
