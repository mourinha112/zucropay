<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/asaas-api.php';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    // Autenticar usuário
    $userId = authenticate();
    $pdo = db_connect();
    
    // GET - Listar payment links
    if ($method === 'GET') {
        $linkId = isset($_GET['id']) ? (int)$_GET['id'] : null;
        
        if ($linkId) {
            // Buscar link específico
            $stmt = $pdo->prepare('SELECT pl.*, p.name as product_name FROM payment_links pl LEFT JOIN products p ON pl.product_id = p.id WHERE pl.id = ? AND pl.user_id = ?');
            $stmt->execute([$linkId, $userId]);
            $link = $stmt->fetch();
            
            if (!$link) {
                http_response_code(404);
                jsonResponse(['success' => false, 'message' => 'Link não encontrado']);
                exit;
            }
            
            jsonResponse([
                'success' => true,
                'paymentLink' => [
                    'id' => (int)$link['id'],
                    'productId' => $link['product_id'] ? (int)$link['product_id'] : null,
                    'productName' => $link['product_name'],
                    'asaasPaymentLinkId' => $link['asaas_payment_link_id'],
                    'url' => $link['asaas_link_url'],
                    'name' => $link['name'],
                    'description' => $link['description'],
                    'amount' => (float)$link['amount'],
                    'billingType' => $link['billing_type'],
                    'active' => (bool)$link['active'],
                    'clicks' => (int)$link['clicks'],
                    'paymentsCount' => (int)$link['payments_count'],
                    'totalReceived' => (float)$link['total_received'],
                    'createdAt' => $link['created_at']
                ]
            ]);
        } else {
            // Listar todos os links
            $stmt = $pdo->prepare('SELECT pl.*, p.name as product_name FROM payment_links pl LEFT JOIN products p ON pl.product_id = p.id WHERE pl.user_id = ? ORDER BY pl.created_at DESC');
            $stmt->execute([$userId]);
            $links = $stmt->fetchAll();
            
            $formattedLinks = array_map(function($link) {
                return [
                    'id' => (int)$link['id'],
                    'productId' => $link['product_id'] ? (int)$link['product_id'] : null,
                    'productName' => $link['product_name'],
                    'asaasPaymentLinkId' => $link['asaas_payment_link_id'],
                    'url' => $link['asaas_link_url'],
                    'name' => $link['name'],
                    'description' => $link['description'],
                    'amount' => (float)$link['amount'],
                    'billingType' => $link['billing_type'],
                    'active' => (bool)$link['active'],
                    'clicks' => (int)$link['clicks'],
                    'paymentsCount' => (int)$link['payments_count'],
                    'totalReceived' => (float)$link['total_received'],
                    'createdAt' => $link['created_at']
                ];
            }, $links);
            
            jsonResponse([
                'success' => true,
                'paymentLinks' => $formattedLinks
            ]);
        }
    }
    
    // POST - Criar payment link
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validações
        if (!isset($input['name']) || trim($input['name']) === '') {
            http_response_code(400);
            jsonResponse(['success' => false, 'message' => 'Nome é obrigatório']);
            exit;
        }
        
        if (!isset($input['amount']) || $input['amount'] <= 0) {
            http_response_code(400);
            jsonResponse(['success' => false, 'message' => 'Valor inválido']);
            exit;
        }
        
        $name = trim($input['name']);
        $description = isset($input['description']) ? trim($input['description']) : null;
        $amount = (float)$input['amount'];
        $billingType = isset($input['billingType']) ? $input['billingType'] : 'UNDEFINED';
        $productId = isset($input['productId']) ? (int)$input['productId'] : null;
        
        // Criar payment link no Asaas
        $asaasResponse = asaas_create_payment_link($name, $amount, $billingType, $description);
        
        if ($asaasResponse['code'] !== 200 && $asaasResponse['code'] !== 201) {
            $errorMsg = isset($asaasResponse['data']['errors']) ? $asaasResponse['data']['errors'][0]['description'] : 'Erro ao criar link de pagamento';
            throw new Exception($errorMsg);
        }
        
        $asaasLink = $asaasResponse['data'];
        
        // Gerar URL do nosso checkout customizado
        // Em produção, use sua URL real
        $frontendUrl = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : 'http://localhost:5173';
        $customCheckoutUrl = $frontendUrl . '/checkout/' . $asaasLink['id'];
        
        // Salvar no banco
        $stmt = $pdo->prepare('INSERT INTO payment_links (user_id, product_id, asaas_payment_link_id, asaas_link_url, name, description, amount, billing_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $userId,
            $productId,
            $asaasLink['id'],
            $customCheckoutUrl, // Salvar URL customizada
            $name,
            $description,
            $amount,
            $billingType
        ]);
        
        $linkId = $pdo->lastInsertId();
        
        jsonResponse([
            'success' => true,
            'message' => 'Link de pagamento criado com sucesso',
            'paymentLink' => [
                'id' => (int)$linkId,
                'productId' => $productId,
                'asaasPaymentLinkId' => $asaasLink['id'],
                'url' => $customCheckoutUrl, // Retornar URL customizada
                'asaasUrl' => $asaasLink['url'], // URL original do Asaas para referência
                'name' => $name,
                'description' => $description,
                'amount' => $amount,
                'billingType' => $billingType,
                'active' => true
            ]
        ]);
    }
    
    // DELETE - Excluir payment link
    elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['id'])) {
            http_response_code(400);
            jsonResponse(['success' => false, 'message' => 'ID do link é obrigatório']);
            exit;
        }
        
        $linkId = (int)$input['id'];
        
        // Buscar link
        $stmt = $pdo->prepare('SELECT asaas_payment_link_id FROM payment_links WHERE id = ? AND user_id = ?');
        $stmt->execute([$linkId, $userId]);
        $link = $stmt->fetch();
        
        if (!$link) {
            http_response_code(404);
            jsonResponse(['success' => false, 'message' => 'Link não encontrado']);
            exit;
        }
        
        // Deletar no Asaas
        $asaasResponse = asaas_delete_payment_link($link['asaas_payment_link_id']);
        
        // Deletar no banco (mesmo que falhe no Asaas)
        $stmt = $pdo->prepare('DELETE FROM payment_links WHERE id = ? AND user_id = ?');
        $stmt->execute([$linkId, $userId]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Link de pagamento excluído com sucesso'
        ]);
    }
    
    else {
        http_response_code(405);
        jsonResponse(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse(['success' => false, 'message' => $e->getMessage()]);
}

?>
