<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/asaas-api.php';

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
if (!isset($input['amount']) || $input['amount'] <= 0) {
    http_response_code(400);
    jsonResponse(['success' => false, 'message' => 'Valor inválido']);
    exit;
}

if (!isset($input['bankAccount']) || !is_array($input['bankAccount'])) {
    http_response_code(400);
    jsonResponse(['success' => false, 'message' => 'Dados bancários inválidos']);
    exit;
}

$amount = (float)$input['amount'];
$bankAccount = $input['bankAccount'];

// Validar dados bancários
$requiredFields = ['bank', 'agency', 'account', 'accountDigit', 'cpfCnpj', 'name'];
foreach ($requiredFields as $field) {
    if (!isset($bankAccount[$field]) || trim($bankAccount[$field]) === '') {
        http_response_code(400);
        jsonResponse(['success' => false, 'message' => 'Campo obrigatório: ' . $field]);
        exit;
    }
}

try {
    // Autenticar usuário
    $userId = authenticate();
    
    $pdo = db_connect();
    
    // Verificar saldo disponível
    $stmt = $pdo->prepare('SELECT balance FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        throw new Exception('Usuário não encontrado');
    }
    
    if ($user['balance'] < $amount) {
        http_response_code(400);
        jsonResponse(['success' => false, 'message' => 'Saldo insuficiente']);
        exit;
    }
    
    // Validar valor mínimo para saque
    if ($amount < 10) {
        http_response_code(400);
        jsonResponse(['success' => false, 'message' => 'Valor mínimo para saque: R$ 10,00']);
        exit;
    }
    
    // Preparar dados bancários para o Asaas
    $bankAccountData = [
        'bank' => [
            'code' => $bankAccount['bank'] // Código do banco (ex: 001 para Banco do Brasil)
        ],
        'accountName' => $bankAccount['name'],
        'ownerName' => $bankAccount['name'],
        'cpfCnpj' => preg_replace('/[^0-9]/', '', $bankAccount['cpfCnpj']),
        'agency' => $bankAccount['agency'],
        'account' => $bankAccount['account'],
        'accountDigit' => $bankAccount['accountDigit'],
        'bankAccountType' => isset($bankAccount['accountType']) ? $bankAccount['accountType'] : 'CONTA_CORRENTE' // CONTA_CORRENTE ou CONTA_POUPANCA
    ];
    
    // Criar transferência no Asaas
    $asaasResponse = asaas_create_transfer($amount, $bankAccountData);
    
    if ($asaasResponse['code'] !== 200 && $asaasResponse['code'] !== 201) {
        $errorMsg = 'Erro ao criar transferência';
        if (isset($asaasResponse['data']['errors']) && is_array($asaasResponse['data']['errors'])) {
            $errorMsg = $asaasResponse['data']['errors'][0]['description'] ?? $errorMsg;
        }
        throw new Exception($errorMsg);
    }
    
    $transferData = $asaasResponse['data'];
    
    // Criar transação de saque
    $description = sprintf(
        'Saque para %s - Banco: %s, Ag: %s, Conta: %s-%s',
        $bankAccount['name'],
        $bankAccount['bank'],
        $bankAccount['agency'],
        $bankAccount['account'],
        $bankAccount['accountDigit']
    );
    
    $stmt = $pdo->prepare('
        INSERT INTO transactions (user_id, type, amount, status, description, asaas_transfer_id) 
        VALUES (?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $userId,
        'withdraw',
        $amount,
        'pending', // Status inicial pendente
        $description,
        $transferData['id'] ?? null
    ]);
    
    $transactionId = $pdo->lastInsertId();
    
    // Subtrair do saldo (reservar o valor)
    $stmt = $pdo->prepare('UPDATE users SET balance = balance - ? WHERE id = ?');
    $stmt->execute([$amount, $userId]);
    
    // Buscar novo saldo
    $stmt = $pdo->prepare('SELECT balance FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    jsonResponse([
        'success' => true,
        'message' => 'Saque solicitado com sucesso! Será processado em até 1 dia útil.',
        'transaction' => [
            'id' => $transactionId,
            'amount' => $amount,
            'type' => 'withdraw',
            'status' => 'pending',
            'asaasTransferId' => $transferData['id'] ?? null
        ],
        'transfer' => $transferData,
        'newBalance' => (float)$user['balance']
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse(['success' => false, 'message' => $e->getMessage()]);
}

?>
