<?php
require_once __DIR__ . '/db.php';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['email']) || !isset($input['password'])) {
    http_response_code(400);
    jsonResponse(['success' => false, 'message' => 'Email e senha são obrigatórios']);
    exit;
}

$email = trim($input['email']);
$password = $input['password'];

try {
    $pdo = db_connect();
    
    // Buscar usuário
    $stmt = $pdo->prepare('SELECT id, name, email, password_hash, cpf_cnpj, phone, avatar, balance, asaas_customer_id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(401);
        jsonResponse(['success' => false, 'message' => 'Email ou senha incorretos']);
        exit;
    }
    
    // Verificar senha
    if (!password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        jsonResponse(['success' => false, 'message' => 'Email ou senha incorretos']);
        exit;
    }
    
    // Gerar token com nome e email
    $token = generate_token($user['id'], $user['name'], $user['email']);
    
    // Preparar resposta
    $userData = [
        'id' => (int)$user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'cpfCnpj' => $user['cpf_cnpj'],
        'phone' => $user['phone'],
        'avatar' => $user['avatar'],
        'balance' => (float)$user['balance'],
        'asaasCustomerId' => $user['asaas_customer_id']
    ];
    
    jsonResponse([
        'success' => true,
        'message' => 'Login realizado com sucesso',
        'token' => $token,
        'user' => $userData
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse(['success' => false, 'message' => 'Erro no servidor: ' . $e->getMessage()]);
}

?>
