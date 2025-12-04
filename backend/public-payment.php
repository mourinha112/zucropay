<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/asaas-api.php';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, ngrok-skip-browser-warning');

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

try {
    $pdo = db_connect();
    
    // Validar dados obrigatórios
    if (!isset($input['linkId']) || !isset($input['customer']) || !isset($input['billingType'])) {
        http_response_code(400);
        jsonResponse(['success' => false, 'message' => 'Dados incompletos']);
        exit;
    }
    
    $linkId = trim($input['linkId']);
    $customer = $input['customer'];
    $billingType = $input['billingType'];
    $creditCard = isset($input['creditCard']) ? $input['creditCard'] : null;
    
    // Buscar link de pagamento
    $stmt = $pdo->prepare('SELECT * FROM payment_links WHERE asaas_payment_link_id = ? AND active = 1');
    $stmt->execute([$linkId]);
    $link = $stmt->fetch();
    
    if (!$link) {
        http_response_code(404);
        jsonResponse(['success' => false, 'message' => 'Link de pagamento não encontrado']);
        exit;
    }
    
    // Criar ou buscar cliente no Asaas
    $asaasCustomer = asaas_create_customer(
        $customer['name'],
        $customer['cpfCnpj'],
        $customer['email'] ?? null,
        $customer['phone'] ?? null
    );
    
    if ($asaasCustomer['code'] !== 200 && $asaasCustomer['code'] !== 201) {
        throw new Exception('Erro ao criar cliente');
    }
    
    $customerId = $asaasCustomer['data']['id'];
    
    // Salvar cliente no banco local (se não existir)
    $stmt = $pdo->prepare('SELECT id FROM asaas_customers WHERE asaas_customer_id = ?');
    $stmt->execute([$customerId]);
    $existingCustomer = $stmt->fetch();
    
    if ($existingCustomer) {
        $dbCustomerId = $existingCustomer['id'];
    } else {
        $stmt = $pdo->prepare('
            INSERT INTO asaas_customers (user_id, asaas_customer_id, name, cpf_cnpj, email, phone) 
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $link['user_id'],
            $customerId,
            $customer['name'],
            $customer['cpfCnpj'],
            $customer['email'] ?? null,
            $customer['phone'] ?? null
        ]);
        $dbCustomerId = $pdo->lastInsertId();
    }
    
    // Criar cobrança no Asaas
    $dueDate = date('Y-m-d', strtotime('+3 days'));
    $extraData = [];
    
    // Se for cartão de crédito, adicionar dados do cartão
    if ($billingType === 'CREDIT_CARD' && $creditCard) {
        $extraData['creditCard'] = [
            'holderName' => $creditCard['name'],
            'number' => $creditCard['number'],
            'expiryMonth' => $creditCard['expiryMonth'],
            'expiryYear' => $creditCard['expiryYear'],
            'ccv' => $creditCard['ccv']
        ];
        $extraData['creditCardHolderInfo'] = [
            'name' => $customer['name'],
            'email' => $customer['email'],
            'cpfCnpj' => $customer['cpfCnpj'],
            'postalCode' => '00000000',
            'addressNumber' => '0',
            'phone' => $customer['phone']
        ];
    }
    
    error_log("[public-payment] Creating payment - Type: {$billingType}, Amount: {$link['amount']}, Customer: {$customerId}");
    
    $asaasPayment = asaas_create_payment(
        $customerId,
        $billingType,
        (float)$link['amount'],
        $dueDate,
        $link['name'],
        $extraData
    );
    
    if ($asaasPayment['code'] !== 200 && $asaasPayment['code'] !== 201) {
        error_log("[public-payment] Asaas error response: " . json_encode($asaasPayment));
        $errorMsg = isset($asaasPayment['data']['errors']) ? $asaasPayment['data']['errors'][0]['description'] : 'Erro ao criar cobrança';
        throw new Exception($errorMsg);
    }
    
    $payment = $asaasPayment['data'];
    error_log("[public-payment] Payment created successfully - ID: {$payment['id']}, Has pixQrCodeId: " . (isset($payment['pixQrCodeId']) ? 'YES' : 'NO'));
    
    // Salvar pagamento no banco
    $stmt = $pdo->prepare('
        INSERT INTO payments 
        (user_id, customer_id, asaas_payment_id, value, status, billing_type, due_date, description) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $link['user_id'],
        $dbCustomerId,
        $payment['id'],
        $payment['value'],
        $payment['status'],
        $payment['billingType'],
        $payment['dueDate'],
        $payment['description']
    ]);
    
    // Preparar resposta
    $response = [
        'success' => true,
        'message' => 'Pagamento criado com sucesso',
        'payment' => [
            'id' => $payment['id'],
            'status' => $payment['status'],
            'value' => $payment['value'],
            'dueDate' => $payment['dueDate'],
            'billingType' => $payment['billingType']
        ]
    ];
    
    // Adicionar dados específicos por tipo de pagamento
    if ($billingType === 'PIX') {
        error_log("[public-payment] PIX - Gerando QR Code para payment ID: {$payment['id']}");
        
        // GERAR QR Code PIX (necessário em PRODUCTION)
        $pixGenerate = asaas_generate_pix_qrcode($payment['id']);
        error_log("[public-payment] Generate PIX response: " . json_encode($pixGenerate));
        
        if ($pixGenerate['code'] === 200 && isset($pixGenerate['data']['payload'])) {
            // QR Code gerado com sucesso
            $response['payment']['pixCode'] = $pixGenerate['data']['payload'];
            $response['payment']['pixQrCode'] = $pixGenerate['data']['encodedImage'];
            error_log("[public-payment] ✓ QR Code gerado com sucesso!");
        } else {
            // Tentar buscar (talvez já exista)
            error_log("[public-payment] Falhou ao gerar, tentando buscar QR Code existente...");
            $pixDetails = asaas_get_pix_qrcode($payment['id']);
            error_log("[public-payment] Get PIX response: " . json_encode($pixDetails));
            
            if ($pixDetails['code'] === 200 && isset($pixDetails['data']['payload'])) {
                $response['payment']['pixCode'] = $pixDetails['data']['payload'];
                $response['payment']['pixQrCode'] = $pixDetails['data']['encodedImage'];
            } else {
                error_log("[public-payment] ERROR: Não conseguiu gerar nem buscar QR Code PIX");
                throw new Exception('Erro ao gerar QR Code PIX. Verifique se a conta Asaas suporta PIX.');
            }
        }
    } elseif ($billingType === 'BOLETO') {
        error_log("[public-payment] BOLETO - Payment data: " . json_encode($payment));
        
        if (isset($payment['bankSlipUrl'])) {
            $response['payment']['bankSlipUrl'] = $payment['bankSlipUrl'];
            error_log("[public-payment] ✓ Boleto URL: {$payment['bankSlipUrl']}");
        } else {
            error_log("[public-payment] ERROR: bankSlipUrl não encontrado na resposta do Asaas");
            throw new Exception('Erro ao gerar boleto. Tente novamente.');
        }
    } elseif ($billingType === 'CREDIT_CARD') {
        $response['payment']['invoiceUrl'] = $payment['invoiceUrl'] ?? null;
        $response['payment']['transactionReceiptUrl'] = $payment['transactionReceiptUrl'] ?? null;
    }
    
    jsonResponse($response);
    
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse(['success' => false, 'message' => $e->getMessage()]);
}
?>
