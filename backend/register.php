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

// Validações
$requiredFields = ['name', 'email', 'password'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field]) || trim($input[$field]) === '') {
        http_response_code(400);
        jsonResponse(['success' => false, 'message' => 'Campo obrigatório: ' . $field]);
        exit;
    }
}

$name = trim($input['name']);
$email = trim($input['email']);
$password = $input['password'];
$cpfCnpj = isset($input['cpfCnpj']) ? trim($input['cpfCnpj']) : null;
$phone = isset($input['phone']) ? trim($input['phone']) : null;

// Validar email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    jsonResponse(['success' => false, 'message' => 'Email inválido']);
    exit;
}

// Validar senha (mínimo 6 caracteres)
if (strlen($password) < 6) {
    http_response_code(400);
    jsonResponse(['success' => false, 'message' => 'A senha deve ter no mínimo 6 caracteres']);
    exit;
}

try {
    $pdo = db_connect();
    
    // Verificar se email já existe
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(409);
        jsonResponse(['success' => false, 'message' => 'Este email já está cadastrado']);
        exit;
    }
    
    // Hash da senha
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    // Inserir usuário
    $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, cpf_cnpj, phone) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$name, $email, $passwordHash, $cpfCnpj, $phone]);
    
    $userId = $pdo->lastInsertId();
    
    // Gerar token
    $token = generate_token($userId);
    
    // Preparar resposta
    $userData = [
        'id' => (int)$userId,
        'name' => $name,
        'email' => $email,
        'cpfCnpj' => $cpfCnpj,
        'phone' => $phone,
        'avatar' => null,
        'balance' => 0.00,
        'asaasCustomerId' => null
    ];
    
    jsonResponse([
        'success' => true,
        'message' => 'Cadastro realizado com sucesso',
        'token' => $token,
        'user' => $userData
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse(['success' => false, 'message' => 'Erro no servidor: ' . $e->getMessage()]);
}

?>
