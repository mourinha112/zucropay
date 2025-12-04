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

// GET - Listar API Keys do usuário
if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare("
            SELECT id, api_key, name, status, last_used_at, created_at
            FROM api_keys
            WHERE user_id = ? AND status != 'revoked'
            ORDER BY created_at DESC
        ");
        $stmt->execute([$userId]);
        $apiKeys = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Mascarar a chave (mostrar apenas últimos 8 caracteres)
        foreach ($apiKeys as &$key) {
            $key['api_key_masked'] = 'zucropay_live_...' . substr($key['api_key'], -8);
            $key['api_key_full'] = $key['api_key']; // Enviar completa mas usar com cuidado no frontend
        }
        
        echo json_encode([
            'success' => true,
            'apiKeys' => $apiKeys
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao buscar API Keys: ' . $e->getMessage()]);
    }
}

// POST - Criar nova API Key
elseif ($method === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $name = $data['name'] ?? 'Chave Principal';
        
        // Gerar API Key única
        $apiKey = 'zucropay_live_' . bin2hex(random_bytes(24)); // 48 caracteres hexadecimais
        
        $stmt = $pdo->prepare("
            INSERT INTO api_keys (user_id, api_key, name, status)
            VALUES (?, ?, ?, 'active')
        ");
        $stmt->execute([$userId, $apiKey, $name]);
        
        $keyId = $pdo->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'message' => 'API Key criada com sucesso',
            'apiKey' => [
                'id' => $keyId,
                'api_key' => $apiKey,
                'name' => $name,
                'status' => 'active',
                'created_at' => date('Y-m-d H:i:s')
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao criar API Key: ' . $e->getMessage()]);
    }
}

// PUT - Atualizar status da API Key
elseif ($method === 'PUT') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $keyId = $data['id'] ?? null;
        $status = $data['status'] ?? null;
        
        if (!$keyId || !$status) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID e status são obrigatórios']);
            exit();
        }
        
        $stmt = $pdo->prepare("
            UPDATE api_keys
            SET status = ?
            WHERE id = ? AND user_id = ?
        ");
        $stmt->execute([$status, $keyId, $userId]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Status atualizado com sucesso'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao atualizar: ' . $e->getMessage()]);
    }
}

// DELETE - Revogar API Key
elseif ($method === 'DELETE') {
    try {
        parse_str(file_get_contents('php://input'), $data);
        $keyId = $_GET['id'] ?? $data['id'] ?? null;
        
        if (!$keyId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID é obrigatório']);
            exit();
        }
        
        $stmt = $pdo->prepare("
            UPDATE api_keys
            SET status = 'revoked'
            WHERE id = ? AND user_id = ?
        ");
        $stmt->execute([$keyId, $userId]);
        
        echo json_encode([
            'success' => true,
            'message' => 'API Key revogada com sucesso'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao revogar: ' . $e->getMessage()]);
    }
}

else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
}
