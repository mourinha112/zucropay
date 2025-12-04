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

if (!isset($input['amount']) || $input['amount'] <= 0) {
    http_response_code(400);
    jsonResponse(['success' => false, 'message' => 'Valor inválido']);
    exit;
}

$amount = (float)$input['amount'];
$description = isset($input['description']) ? $input['description'] : 'Depósito na conta';

try {
    // Autenticar usuário
    $userId = authenticate();
    
    $pdo = db_connect();
    
    // Em vez de adicionar o saldo direto, vamos criar uma cobrança PIX no Asaas
    require_once 'asaas-api.php';
    
    // Buscar dados do usuário para o pagamento
    $stmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Usuário não encontrado']);
        exit;
    }
    
    // Criar cobrança PIX no Asaas
    // Primeiro, precisamos criar ou buscar o cliente no Asaas
    $stmt = $pdo->prepare("SELECT cpf_cnpj FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $userData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $cpfCnpj = $userData['cpf_cnpj'] ?? preg_replace('/[^0-9]/', '', $user['email']); // Usar email como fallback
    
    // Criar cliente no Asaas se não existir
    $customerData = [
        'name' => $user['name'],
        'email' => $user['email'],
        'cpfCnpj' => $cpfCnpj,
    ];
    
    $customerResponse = asaas_create_or_get_customer($customerData);
    
    if (!$customerResponse || !isset($customerResponse['id'])) {
        jsonResponse(['success' => false, 'message' => 'Erro ao criar cliente no Asaas']);
        exit;
    }
    
    $asaasCustomerId = $customerResponse['id'];
    
    // Agora criar o pagamento PIX
    $payment = asaas_create_payment(
        $asaasCustomerId,
        'PIX',
        $amount,
        date('Y-m-d'),
        'Depósito de saldo - ' . $description,
        ['externalReference' => 'DEPOSIT_' . $userId . '_' . time()]
    );
    
    if (!$payment || !isset($payment['id'])) {
        jsonResponse(['success' => false, 'message' => 'Erro ao criar cobrança no Asaas', 'details' => $payment]);
        exit;
    }
    
    // Gerar QR Code PIX
    $pixData = asaas_generate_pix_qrcode($payment['id']);
    
    if (!$pixData || !isset($pixData['payload'])) {
        jsonResponse(['success' => false, 'message' => 'Erro ao gerar QR Code PIX', 'payment_id' => $payment['id']]);
        exit;
    }
    
    // Criar transação PENDENTE (só será completed quando o webhook confirmar)
    $stmt = $pdo->prepare('INSERT INTO transactions (user_id, type, amount, status, description, asaas_payment_id) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $userId, 
        'deposit', 
        $amount, 
        'pending', 
        'Depósito via PIX - ' . $description,
        $payment['id']
    ]);
    
    $transactionId = $pdo->lastInsertId();
    
    // NÃO atualizar saldo aqui! O webhook vai fazer isso quando o pagamento for confirmado
    
    // Buscar saldo atual (não modificado)
    $stmt = $pdo->prepare('SELECT balance FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    // Retornar dados do PIX para exibir o QR Code
    jsonResponse([
        'success' => true,
        'message' => 'QR Code PIX gerado com sucesso',
        'payment' => [
            'id' => $payment['id'],
            'value' => $amount,
            'status' => 'pending'
        ],
        'pix' => [
            'payload' => $pixData['payload'],
            'encodedImage' => $pixData['encodedImage'],
            'expirationDate' => $pixData['expirationDate'] ?? null
        ],
        'transaction' => [
            'id' => (int)$transactionId,
            'amount' => $amount,
            'type' => 'deposit',
            'status' => 'pending'
        ],
        'currentBalance' => (float)$user['balance']
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse(['success' => false, 'message' => 'Erro no servidor: ' . $e->getMessage()]);
}
