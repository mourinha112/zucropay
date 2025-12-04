<?php
require_once __DIR__ . '/db.php';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, ngrok-skip-browser-warning');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    jsonResponse(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $startTime = microtime(true);
    
    // Pegar o ID do link pela URL
    $linkId = isset($_GET['id']) ? trim($_GET['id']) : null;
    
    if (!$linkId) {
        http_response_code(400);
        jsonResponse(['success' => false, 'message' => 'ID do link é obrigatório']);
        exit;
    }
    
    $pdo = db_connect();
    error_log("[public-payment-link] DB connect time: " . (microtime(true) - $startTime) . "s");
    
    // Buscar link de pagamento (sem autenticação - é público!)
    $stmt = $pdo->prepare('
        SELECT 
            pl.*,
            p.name as product_name,
            p.description as product_description,
            p.image_url as product_image
        FROM payment_links pl
        LEFT JOIN products p ON pl.product_id = p.id
        WHERE pl.asaas_payment_link_id = ? AND pl.active = 1
    ');
    $stmt->execute([$linkId]);
    $link = $stmt->fetch();
    
    if (!$link) {
        http_response_code(404);
        jsonResponse(['success' => false, 'message' => 'Link de pagamento não encontrado ou inativo']);
        exit;
    }
    
    // Incrementar contador de visualizações (async - não espera)
    // Removido para não causar delay - pode ser feito via webhook ou background job
    // $stmt = $pdo->prepare('UPDATE payment_links SET clicks = clicks + 1 WHERE id = ?');
    // $stmt->execute([$link['id']]);
    
    error_log("[public-payment-link] Query time: " . (microtime(true) - $startTime) . "s");
    
    // Retornar dados do link diretamente (não dentro de 'paymentLink')
    $totalTime = microtime(true) - $startTime;
    error_log("[public-payment-link] Total request time: {$totalTime}s");
    
    jsonResponse([
        'success' => true,
        'id' => $link['asaas_payment_link_id'],
        'name' => $link['name'],
        'description' => $link['description'] ?: $link['product_description'],
        'amount' => (float)$link['amount'],
        'billingType' => $link['billing_type'],
        'productName' => $link['product_name'],
        'productImage' => $link['product_image'],
        'userId' => (int)$link['user_id']
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse(['success' => false, 'message' => 'Erro ao buscar link de pagamento: ' . $e->getMessage()]);
}
?>
