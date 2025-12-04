<?php
/**
 * API Pública de Pagamentos - ZucroPay
 * Endpoint para criar pagamentos sem precisar configurar banco de dados
 * 
 * Uso:
 * POST https://zucropay.com/api/v1/payments/create
 * Headers: X-API-Key: sua_api_key
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db.php';

// Apenas POST permitido
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido. Use POST']);
    exit();
}

// Pegar API Key do header
$headers = getallheaders();
$apiKey = $headers['X-Api-Key'] ?? $headers['X-API-Key'] ?? null;

if (!$apiKey) {
    http_response_code(401);
    echo json_encode([
        'error' => 'API Key não fornecida',
        'message' => 'Inclua o header: X-API-Key: sua_api_key'
    ]);
    exit();
}

try {
    $pdo = db_connect();
    
    // Verificar se API Key é válida
    $stmt = $pdo->prepare("
        SELECT ak.*, u.id as user_id, u.name as user_name, u.email as user_email
        FROM api_keys ak
        JOIN users u ON u.id = ak.user_id
        WHERE ak.api_key = ? AND ak.status = 'active'
    ");
    $stmt->execute([$apiKey]);
    $apiKeyData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$apiKeyData) {
        http_response_code(401);
        echo json_encode([
            'error' => 'API Key inválida ou inativa',
            'message' => 'Verifique sua API Key no painel ZucroPay'
        ]);
        exit();
    }
    
    $userId = $apiKeyData['user_id'];
    
    // Atualizar last_used_at da API Key
    $pdo->prepare("UPDATE api_keys SET last_used_at = NOW() WHERE api_key = ?")->execute([$apiKey]);
    
    // Pegar dados da requisição
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validar campos obrigatórios
    $required = ['amount', 'customer'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            http_response_code(400);
            echo json_encode([
                'error' => "Campo '$field' é obrigatório",
                'required_fields' => ['amount', 'customer' => ['name', 'email', 'document']]
            ]);
            exit();
        }
    }
    
    // Validar dados do cliente
    if (!isset($data['customer']['name']) || !isset($data['customer']['email'])) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Dados do cliente incompletos',
            'required' => ['name', 'email', 'document (CPF/CNPJ)']
        ]);
        exit();
    }
    
    // Validar valor
    $amount = floatval($data['amount']);
    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Valor deve ser maior que zero']);
        exit();
    }
    
    // Criar ID único do pagamento
    $paymentId = 'pay_' . bin2hex(random_bytes(16));
    
    // Criar pagamento no banco
    $stmt = $pdo->prepare("
        INSERT INTO payments (
            id,
            user_id,
            customer_name,
            customer_email,
            customer_cpf_cnpj,
            customer_phone,
            value,
            billing_type,
            status,
            description,
            external_reference,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, NOW())
    ");
    
    $billingType = strtoupper($data['billing_type'] ?? 'PIX');
    $description = $data['description'] ?? 'Pagamento via ZucroPay';
    $externalReference = $data['external_reference'] ?? null;
    
    $stmt->execute([
        $paymentId,
        $userId,
        $data['customer']['name'],
        $data['customer']['email'],
        $data['customer']['document'] ?? $data['customer']['cpf_cnpj'] ?? null,
        $data['customer']['phone'] ?? $data['customer']['mobile_phone'] ?? null,
        $amount,
        $billingType,
        $description,
        $externalReference
    ]);
    
    // Gerar QR Code PIX (simulado)
    $pixCode = generatePixCode($paymentId, $amount, $data['customer']['name']);
    $pixQrCode = generateQrCodeBase64($pixCode);
    
    // Salvar código PIX no banco
    $pdo->prepare("
        UPDATE payments 
        SET pix_copy_paste = ?, pix_qrcode_base64 = ?
        WHERE id = ?
    ")->execute([$pixCode, $pixQrCode, $paymentId]);
    
    // Resposta
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'payment' => [
            'id' => $paymentId,
            'status' => 'PENDING',
            'amount' => $amount,
            'billing_type' => $billingType,
            'customer' => [
                'name' => $data['customer']['name'],
                'email' => $data['customer']['email']
            ],
            'external_reference' => $externalReference,
            'created_at' => date('Y-m-d H:i:s')
        ],
        'pix' => [
            'qr_code_base64' => $pixQrCode,
            'copy_paste' => $pixCode
        ],
        'checkout_url' => "http://localhost:5173/checkout/{$paymentId}",
        'webhook_url' => $data['webhook_url'] ?? null
    ]);
    
    // Disparar webhook se fornecido
    if (isset($data['webhook_url'])) {
        dispatchWebhook($data['webhook_url'], [
            'event' => 'PAYMENT_CREATED',
            'payment' => [
                'id' => $paymentId,
                'status' => 'PENDING',
                'amount' => $amount,
                'external_reference' => $externalReference
            ]
        ]);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Erro interno do servidor',
        'message' => $e->getMessage()
    ]);
}

// Funções auxiliares
function generatePixCode($paymentId, $amount, $customerName) {
    // Gerar código PIX real (integrar com banco ou gateway PIX)
    // Por enquanto retorna um código simulado
    return "00020126580014br.gov.bcb.pix0136{$paymentId}52040000530398654{$amount}5802BR5913{$customerName}6009SAO PAULO62070503***6304";
}

function generateQrCodeBase64($pixCode) {
    // Gerar QR Code real usando biblioteca
    // Por enquanto retorna uma imagem placeholder
    return base64_encode(file_get_contents('data:image/svg+xml,' . urlencode('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#fff"/><text x="50%" y="50%" text-anchor="middle" font-size="12">QR Code PIX</text></svg>')));
}

function dispatchWebhook($url, $data) {
    // Disparar webhook de forma assíncrona (em produção use fila/background job)
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-ZucroPay-Signature: ' . hash_hmac('sha256', json_encode($data), 'webhook_secret')
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5
    ]);
    curl_exec($ch);
    curl_close($ch);
}
