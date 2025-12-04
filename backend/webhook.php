<?php
require_once __DIR__ . '/db.php';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Permitir GET para testar se está funcionando
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    jsonResponse([
        'success' => true, 
        'message' => 'Webhook endpoint is active',
        'url' => 'http://localhost:8000/webhook.php',
        'methods' => ['POST'],
        'info' => 'Send POST requests with Asaas webhook events here'
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Receber dados do webhook
$input = file_get_contents('php://input');
$data = json_decode($input, true);

try {
    $pdo = db_connect();
    
    // Salvar no log de webhooks
    $stmt = $pdo->prepare('INSERT INTO webhooks_log (event_type, payload, processed) VALUES (?, ?, ?)');
    $stmt->execute([
        $data['event'] ?? 'unknown',
        $input,
        0 // não processado ainda
    ]);
    
    $webhookId = $pdo->lastInsertId();
    
    // Processar webhook
    if (isset($data['event'])) {
        switch ($data['event']) {
            case 'PAYMENT_RECEIVED':
            case 'PAYMENT_CONFIRMED':
            case 'PAYMENT_RECEIVED_IN_CASH':
                // Pagamento recebido (PIX, Cartão, Boleto ou Dinheiro)
                $paymentId = $data['payment']['id'] ?? null;
                
                if ($paymentId) {
                    // Verificar se é um depósito (pela transação pending)
                    $stmt = $pdo->prepare('SELECT id, user_id, amount FROM transactions WHERE asaas_payment_id = ? AND type = ? AND status = ?');
                    $stmt->execute([$paymentId, 'deposit', 'pending']);
                    $depositTransaction = $stmt->fetch();
                    
                    if ($depositTransaction) {
                        // É um depósito - atualizar transação e saldo
                        $stmt = $pdo->prepare('UPDATE transactions SET status = ? WHERE id = ?');
                        $stmt->execute(['completed', $depositTransaction['id']]);
                        
                        // Adicionar saldo ao usuário
                        $stmt = $pdo->prepare('UPDATE users SET balance = balance + ? WHERE id = ?');
                        $stmt->execute([$depositTransaction['amount'], $depositTransaction['user_id']]);
                        
                        error_log("Depósito confirmado: R$ {$depositTransaction['amount']} para usuário {$depositTransaction['user_id']}");
                    } else {
                        // Não é depósito, é venda de produto/link - lógica antiga
                        // Atualizar status do pagamento
                        $stmt = $pdo->prepare('UPDATE payments SET status = ?, payment_date = NOW() WHERE asaas_payment_id = ?');
                        $stmt->execute([$data['payment']['status'], $paymentId]);
                        
                        // Buscar dados do pagamento
                        $stmt = $pdo->prepare('SELECT user_id, value FROM payments WHERE asaas_payment_id = ?');
                        $stmt->execute([$paymentId]);
                        $payment = $stmt->fetch();
                        
                        if ($payment) {
                            // Verificar se já existe transação para este pagamento
                            $stmt = $pdo->prepare('SELECT id FROM transactions WHERE asaas_payment_id = ?');
                            $stmt->execute([$paymentId]);
                            $existingTransaction = $stmt->fetch();
                            
                            if (!$existingTransaction) {
                                // Criar transação
                                $stmt = $pdo->prepare('INSERT INTO transactions (user_id, type, amount, status, description, asaas_payment_id) VALUES (?, ?, ?, ?, ?, ?)');
                                $stmt->execute([
                                    $payment['user_id'],
                                    'payment_received',
                                    $payment['value'],
                                    'completed',
                                    'Pagamento recebido via Asaas',
                                    $paymentId
                                ]);
                                
                                // Atualizar saldo
                                $stmt = $pdo->prepare('UPDATE users SET balance = balance + ? WHERE id = ?');
                                $stmt->execute([$payment['value'], $payment['user_id']]);
                                
                                error_log("Venda confirmada: R$ {$payment['value']} para usuário {$payment['user_id']}");
                            }
                        }
                    }
                }
                break;
                
            case 'PAYMENT_OVERDUE':
                // Pagamento vencido
                $paymentId = $data['payment']['id'] ?? null;
                if ($paymentId) {
                    $stmt = $pdo->prepare('UPDATE payments SET status = ? WHERE asaas_payment_id = ?');
                    $stmt->execute(['OVERDUE', $paymentId]);
                }
                break;
                
            case 'PAYMENT_REFUNDED':
                // Pagamento reembolsado
                $paymentId = $data['payment']['id'] ?? null;
                if ($paymentId) {
                    $stmt = $pdo->prepare('UPDATE payments SET status = ? WHERE asaas_payment_id = ?');
                    $stmt->execute(['REFUNDED', $paymentId]);
                    
                    // Reverter saldo
                    $stmt = $pdo->prepare('SELECT user_id, value FROM payments WHERE asaas_payment_id = ?');
                    $stmt->execute([$paymentId]);
                    $payment = $stmt->fetch();
                    
                    if ($payment) {
                        $stmt = $pdo->prepare('INSERT INTO transactions (user_id, type, amount, status, description, asaas_payment_id) VALUES (?, ?, ?, ?, ?, ?)');
                        $stmt->execute([
                            $payment['user_id'],
                            'refund',
                            -$payment['value'],
                            'completed',
                            'Reembolso de pagamento',
                            $paymentId
                        ]);
                        
                        $stmt = $pdo->prepare('UPDATE users SET balance = balance - ? WHERE id = ?');
                        $stmt->execute([$payment['value'], $payment['user_id']]);
                    }
                }
                break;
                
            case 'TRANSFER_FINISHED':
                // Transferência finalizada
                $transferId = $data['transfer']['id'] ?? null;
                if ($transferId) {
                    $stmt = $pdo->prepare('UPDATE transactions SET status = ? WHERE asaas_transfer_id = ?');
                    $stmt->execute(['completed', $transferId]);
                }
                break;
        }
        
        // Marcar como processado
        $stmt = $pdo->prepare('UPDATE webhooks_log SET processed = 1 WHERE id = ?');
        $stmt->execute([$webhookId]);
    }
    
    // Responder com sucesso
    http_response_code(200);
    jsonResponse(['success' => true, 'message' => 'Webhook received']);
    
} catch (Exception $e) {
    // Log do erro
    error_log("Webhook Error: " . $e->getMessage() . " | File: " . $e->getFile() . " | Line: " . $e->getLine());
    error_log("Webhook Data: " . ($input ?? 'No data'));
    
    http_response_code(200); // Retornar 200 para o Asaas não reenviar
    jsonResponse(['success' => false, 'message' => 'Error processing webhook', 'error' => $e->getMessage()]);
}

?>
