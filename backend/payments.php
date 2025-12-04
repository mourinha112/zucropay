<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/asaas-api.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    $userId = authenticate();
    $pdo = db_connect();
    
    // GET - Listar pagamentos
    if ($method === 'GET') {
        $stmt = $pdo->prepare('
            SELECT 
                p.*,
                c.name as customer_name,
                c.email as customer_email,
                c.cpf_cnpj as customer_cpf
            FROM payments p
            LEFT JOIN asaas_customers c ON p.customer_id = c.id
            WHERE p.user_id = ? 
            ORDER BY p.created_at DESC 
            LIMIT 50
        ');
        $stmt->execute([$userId]);
        $payments = $stmt->fetchAll();
        
        jsonResponse(['success' => true, 'payments' => $payments]);
    }
    
    // POST - Criar pagamento/cobrança
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $customerId = $input['customerId'];
        $billingType = $input['billingType']; // BOLETO, CREDIT_CARD, PIX, UNDEFINED
        $value = (float)$input['value'];
        $dueDate = $input['dueDate'];
        $description = $input['description'] ?? null;
        
        // Buscar customer no Asaas
        $stmt = $pdo->prepare('SELECT id, asaas_customer_id FROM asaas_customers WHERE id = ? AND user_id = ?');
        $stmt->execute([$customerId, $userId]);
        $customer = $stmt->fetch();
        
        if (!$customer) {
            throw new Exception('Cliente não encontrado');
        }
        
        // Criar pagamento no Asaas
        $asaasResponse = asaas_create_payment($customer['asaas_customer_id'], $billingType, $value, $dueDate, $description);
        
        if ($asaasResponse['code'] !== 200 && $asaasResponse['code'] !== 201) {
            throw new Exception('Erro ao criar pagamento no Asaas');
        }
        
        $asaasPayment = $asaasResponse['data'];
        
        // Salvar no banco
        $stmt = $pdo->prepare('INSERT INTO payments (user_id, customer_id, asaas_payment_id, billing_type, value, description, due_date, status, invoice_url, bank_slip_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $userId,
            $customer['id'],
            $asaasPayment['id'],
            $billingType,
            $value,
            $description,
            $dueDate,
            $asaasPayment['status'],
            $asaasPayment['invoiceUrl'] ?? null,
            $asaasPayment['bankSlipUrl'] ?? null
        ]);
        
        $paymentId = $pdo->lastInsertId();
        
        // Se for PIX, buscar QR Code
        if ($billingType === 'PIX') {
            $pixResponse = asaas_get_pix_qrcode($asaasPayment['id']);
            if ($pixResponse['code'] === 200) {
                $pixData = $pixResponse['data'];
                $stmt = $pdo->prepare('UPDATE payments SET pix_qrcode = ?, pix_copy_paste = ? WHERE id = ?');
                $stmt->execute([$pixData['encodedImage'] ?? null, $pixData['payload'] ?? null, $paymentId]);
            }
        }
        
        jsonResponse([
            'success' => true,
            'message' => 'Cobrança criada com sucesso',
            'payment' => $asaasPayment
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse(['success' => false, 'message' => $e->getMessage()]);
}
?>
