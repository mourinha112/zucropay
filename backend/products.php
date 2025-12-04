<?php
require_once __DIR__ . '/db.php';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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
    
    // GET - Listar produtos
    if ($method === 'GET') {
        $productId = isset($_GET['id']) ? (int)$_GET['id'] : null;
        
        if ($productId) {
            // Buscar produto específico
            $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ? AND user_id = ?');
            $stmt->execute([$productId, $userId]);
            $product = $stmt->fetch();
            
            if (!$product) {
                http_response_code(404);
                jsonResponse(['success' => false, 'message' => 'Produto não encontrado']);
                exit;
            }
            
            jsonResponse([
                'success' => true,
                'product' => [
                    'id' => (int)$product['id'],
                    'name' => $product['name'],
                    'description' => $product['description'],
                    'price' => (float)$product['price'],
                    'imageUrl' => $product['image_url'],
                    'stock' => $product['stock'] ? (int)$product['stock'] : null,
                    'active' => (bool)$product['active'],
                    'createdAt' => $product['created_at'],
                    'updatedAt' => $product['updated_at']
                ]
            ]);
        } else {
            // Listar todos os produtos
            $stmt = $pdo->prepare('SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC');
            $stmt->execute([$userId]);
            $products = $stmt->fetchAll();
            
            $formattedProducts = array_map(function($p) {
                return [
                    'id' => (int)$p['id'],
                    'name' => $p['name'],
                    'description' => $p['description'],
                    'price' => (float)$p['price'],
                    'imageUrl' => $p['image_url'],
                    'stock' => $p['stock'] ? (int)$p['stock'] : null,
                    'active' => (bool)$p['active'],
                    'createdAt' => $p['created_at'],
                    'updatedAt' => $p['updated_at']
                ];
            }, $products);
            
            jsonResponse([
                'success' => true,
                'products' => $formattedProducts
            ]);
        }
    }
    
    // POST - Criar produto
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validações
        if (!isset($input['name']) || trim($input['name']) === '') {
            http_response_code(400);
            jsonResponse(['success' => false, 'message' => 'Nome é obrigatório']);
            exit;
        }
        
        if (!isset($input['price']) || $input['price'] <= 0) {
            http_response_code(400);
            jsonResponse(['success' => false, 'message' => 'Preço inválido']);
            exit;
        }
        
        $name = trim($input['name']);
        $description = isset($input['description']) ? trim($input['description']) : null;
        $price = (float)$input['price'];
        $imageUrl = isset($input['imageUrl']) ? trim($input['imageUrl']) : null;
        $stock = isset($input['stock']) ? (int)$input['stock'] : null;
        $active = isset($input['active']) ? (bool)$input['active'] : true;
        
        $stmt = $pdo->prepare('INSERT INTO products (user_id, name, description, price, image_url, stock, active) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $name, $description, $price, $imageUrl, $stock, $active]);
        
        $productId = $pdo->lastInsertId();
        
        jsonResponse([
            'success' => true,
            'message' => 'Produto criado com sucesso',
            'product' => [
                'id' => (int)$productId,
                'name' => $name,
                'description' => $description,
                'price' => $price,
                'imageUrl' => $imageUrl,
                'stock' => $stock,
                'active' => $active
            ]
        ]);
    }
    
    // PUT - Atualizar produto
    elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['id'])) {
            http_response_code(400);
            jsonResponse(['success' => false, 'message' => 'ID do produto é obrigatório']);
            exit;
        }
        
        $productId = (int)$input['id'];
        
        // Verificar se o produto pertence ao usuário
        $stmt = $pdo->prepare('SELECT id FROM products WHERE id = ? AND user_id = ?');
        $stmt->execute([$productId, $userId]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            jsonResponse(['success' => false, 'message' => 'Produto não encontrado']);
            exit;
        }
        
        // Construir query de update dinamicamente
        $updates = [];
        $params = [];
        
        if (isset($input['name'])) {
            $updates[] = 'name = ?';
            $params[] = trim($input['name']);
        }
        if (isset($input['description'])) {
            $updates[] = 'description = ?';
            $params[] = trim($input['description']);
        }
        if (isset($input['price'])) {
            $updates[] = 'price = ?';
            $params[] = (float)$input['price'];
        }
        if (isset($input['imageUrl'])) {
            $updates[] = 'image_url = ?';
            $params[] = trim($input['imageUrl']);
        }
        if (isset($input['stock'])) {
            $updates[] = 'stock = ?';
            $params[] = (int)$input['stock'];
        }
        if (isset($input['active'])) {
            $updates[] = 'active = ?';
            $params[] = (bool)$input['active'];
        }
        
        if (empty($updates)) {
            http_response_code(400);
            jsonResponse(['success' => false, 'message' => 'Nenhum campo para atualizar']);
            exit;
        }
        
        $params[] = $productId;
        $params[] = $userId;
        
        $query = 'UPDATE products SET ' . implode(', ', $updates) . ' WHERE id = ? AND user_id = ?';
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        
        jsonResponse([
            'success' => true,
            'message' => 'Produto atualizado com sucesso'
        ]);
    }
    
    // DELETE - Excluir produto
    elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['id'])) {
            http_response_code(400);
            jsonResponse(['success' => false, 'message' => 'ID do produto é obrigatório']);
            exit;
        }
        
        $productId = (int)$input['id'];
        
        $stmt = $pdo->prepare('DELETE FROM products WHERE id = ? AND user_id = ?');
        $stmt->execute([$productId, $userId]);
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            jsonResponse(['success' => false, 'message' => 'Produto não encontrado']);
            exit;
        }
        
        jsonResponse([
            'success' => true,
            'message' => 'Produto excluído com sucesso'
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
