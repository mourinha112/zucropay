<?php
require_once __DIR__ . '/db.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Usar a função authenticate() do db.php
$userId = authenticate();
$method = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = db_connect();
    
    if ($method === 'GET') {
        $productId = $_GET['productId'] ?? $_GET['product_id'] ?? null;
        
        if (!$productId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'productId is required']);
            exit;
        }
        
        $stmt = $pdo->prepare('SELECT id FROM products WHERE id = ? AND user_id = ?');
        $stmt->execute([$productId, $userId]);
        
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Product not found']);
            exit;
        }
        
        $stmt = $pdo->prepare('SELECT * FROM checkout_customization WHERE product_id = ?');
        $stmt->execute([$productId]);
        $customization = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($customization) {
            echo json_encode(['success' => true, 'customization' => $customization]);
        } else {
            echo json_encode(['success' => false, 'message' => 'No customization found', 'customization' => null]);
        }
        exit;
    }
    
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $productId = $data['productId'] ?? null;
        $settings = $data['settings'] ?? null;
        
        if (!$productId || !$settings) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'productId and settings are required']);
            exit;
        }
        
        $stmt = $pdo->prepare('SELECT id FROM products WHERE id = ? AND user_id = ?');
        $stmt->execute([$productId, $userId]);
        
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Product not found']);
            exit;
        }
        
        $stmt = $pdo->prepare('SELECT id FROM checkout_customization WHERE product_id = ?');
        $stmt->execute([$productId]);
        $exists = $stmt->fetch();
        
        if ($exists) {
            $stmt = $pdo->prepare('UPDATE checkout_customization SET settings = ?, updated_at = NOW() WHERE product_id = ?');
            $stmt->execute([$settings, $productId]);
        } else {
            $stmt = $pdo->prepare('INSERT INTO checkout_customization (product_id, settings) VALUES (?, ?)');
            $stmt->execute([$productId, $settings]);
        }
        
        echo json_encode(['success' => true, 'message' => 'Customization saved successfully']);
        exit;
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
