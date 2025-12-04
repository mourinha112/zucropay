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
    $pdo = db_connect();
    
    // GET - Listar produtos do marketplace ou afiliações do usuário
    if ($method === 'GET') {
        if (isset($_GET['my-products'])) {
            // Produtos do próprio usuário para habilitar/desabilitar no marketplace
            $userId = authenticate();
            
            $stmt = $pdo->prepare('
                SELECT 
                    p.*,
                    COUNT(DISTINCT a.id) as affiliate_count,
                    COALESCE(SUM(a.total_sales), 0) as total_marketplace_sales
                FROM products p
                LEFT JOIN affiliates a ON a.product_id = p.id AND a.status = "active"
                WHERE p.user_id = ?
                GROUP BY p.id
                ORDER BY p.created_at DESC
            ');
            $stmt->execute([$userId]);
            $products = $stmt->fetchAll();
            
            jsonResponse(['success' => true, 'products' => $products]);
            
        } elseif (isset($_GET['my-affiliates'])) {
            // Afiliações do usuário (produtos que ele está promovendo)
            $userId = authenticate();
            
            $stmt = $pdo->prepare('
                SELECT 
                    a.*,
                    p.name as product_name,
                    p.description as product_description,
                    p.price as product_price,
                    p.image_url as product_image,
                    u.name as owner_name,
                    u.email as owner_email
                FROM affiliates a
                JOIN products p ON p.id = a.product_id
                JOIN users u ON u.id = a.product_owner_id
                WHERE a.affiliate_user_id = ?
                ORDER BY a.created_at DESC
            ');
            $stmt->execute([$userId]);
            $affiliates = $stmt->fetchAll();
            
            jsonResponse(['success' => true, 'affiliates' => $affiliates]);
            
        } else {
            // Listar todos os produtos disponíveis no marketplace (não precisa autenticação)
            $userId = null;
            try {
                $userId = authenticate();
            } catch (Exception $e) {
                // Usuário não autenticado, ok para ver marketplace
            }
            
            $stmt = $pdo->prepare('
                SELECT 
                    p.*,
                    u.name as owner_name,
                    COUNT(DISTINCT a.id) as affiliate_count,
                    CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END as is_affiliated
                FROM products p
                JOIN users u ON u.id = p.user_id
                LEFT JOIN affiliates a ON a.product_id = p.id AND a.status = "active"
                LEFT JOIN affiliates ua ON ua.product_id = p.id AND ua.affiliate_user_id = ? AND ua.status = "active"
                WHERE p.active = 1 
                AND p.marketplace_enabled = 1
                GROUP BY p.id
                ORDER BY p.created_at DESC
            ');
            $stmt->execute([$userId]);
            $products = $stmt->fetchAll();
            
            jsonResponse(['success' => true, 'products' => $products]);
        }
        exit;
    }
    
    // POST - Afiliar-se a um produto
    if ($method === 'POST' && isset($_GET['affiliate'])) {
        $userId = authenticate();
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['productId'])) {
            http_response_code(400);
            jsonResponse(['success' => false, 'message' => 'ID do produto é obrigatório']);
            exit;
        }
        
        $productId = (int)$input['productId'];
        
        // Verificar se o produto existe e está habilitado no marketplace
        $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ? AND active = 1 AND marketplace_enabled = 1');
        $stmt->execute([$productId]);
        $product = $stmt->fetch();
        
        if (!$product) {
            http_response_code(404);
            jsonResponse(['success' => false, 'message' => 'Produto não encontrado ou não está disponível no marketplace']);
            exit;
        }
        
        // Não pode se afiliar ao próprio produto
        if ($product['user_id'] == $userId) {
            http_response_code(400);
            jsonResponse(['success' => false, 'message' => 'Você não pode se afiliar ao seu próprio produto']);
            exit;
        }
        
        // Verificar se já está afiliado
        $stmt = $pdo->prepare('SELECT * FROM affiliates WHERE product_id = ? AND affiliate_user_id = ?');
        $stmt->execute([$productId, $userId]);
        if ($stmt->fetch()) {
            http_response_code(400);
            jsonResponse(['success' => false, 'message' => 'Você já está afiliado a este produto']);
            exit;
        }
        
        // Gerar link único de afiliado
        $affiliateLink = 'aff_' . uniqid() . '_' . $userId . '_' . $productId;
        
        // Criar afiliação
        $stmt = $pdo->prepare('
            INSERT INTO affiliates (product_id, affiliate_user_id, product_owner_id, affiliate_link, commission_percentage)
            VALUES (?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $productId,
            $userId,
            $product['user_id'],
            $affiliateLink,
            $product['commission_percentage']
        ]);
        
        $affiliateId = $pdo->lastInsertId();
        
        // Buscar afiliação criada
        $stmt = $pdo->prepare('
            SELECT 
                a.*,
                p.name as product_name,
                p.price as product_price
            FROM affiliates a
            JOIN products p ON p.id = a.product_id
            WHERE a.id = ?
        ');
        $stmt->execute([$affiliateId]);
        $affiliate = $stmt->fetch();
        
        jsonResponse([
            'success' => true,
            'message' => 'Afiliação realizada com sucesso!',
            'affiliate' => $affiliate
        ]);
        exit;
    }
    
    // PUT - Habilitar/desabilitar produto no marketplace
    if ($method === 'PUT') {
        $userId = authenticate();
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['productId'])) {
            http_response_code(400);
            jsonResponse(['success' => false, 'message' => 'ID do produto é obrigatório']);
            exit;
        }
        
        $productId = (int)$input['productId'];
        $marketplaceEnabled = isset($input['marketplaceEnabled']) ? (int)$input['marketplaceEnabled'] : 0;
        $commissionPercentage = isset($input['commissionPercentage']) ? (float)$input['commissionPercentage'] : 30.00;
        
        // Verificar se o produto pertence ao usuário
        $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ? AND user_id = ?');
        $stmt->execute([$productId, $userId]);
        $product = $stmt->fetch();
        
        if (!$product) {
            http_response_code(404);
            jsonResponse(['success' => false, 'message' => 'Produto não encontrado ou você não tem permissão']);
            exit;
        }
        
        // Atualizar produto
        $stmt = $pdo->prepare('
            UPDATE products 
            SET marketplace_enabled = ?, commission_percentage = ?
            WHERE id = ? AND user_id = ?
        ');
        $stmt->execute([$marketplaceEnabled, $commissionPercentage, $productId, $userId]);
        
        jsonResponse([
            'success' => true,
            'message' => $marketplaceEnabled ? 'Produto habilitado no marketplace!' : 'Produto removido do marketplace'
        ]);
        exit;
    }
    
    // DELETE - Cancelar afiliação
    if ($method === 'DELETE') {
        $userId = authenticate();
        
        if (!isset($_GET['id'])) {
            http_response_code(400);
            jsonResponse(['success' => false, 'message' => 'ID da afiliação é obrigatório']);
            exit;
        }
        
        $affiliateId = (int)$_GET['id'];
        
        // Verificar se a afiliação pertence ao usuário
        $stmt = $pdo->prepare('SELECT * FROM affiliates WHERE id = ? AND affiliate_user_id = ?');
        $stmt->execute([$affiliateId, $userId]);
        $affiliate = $stmt->fetch();
        
        if (!$affiliate) {
            http_response_code(404);
            jsonResponse(['success' => false, 'message' => 'Afiliação não encontrada']);
            exit;
        }
        
        // Inativar afiliação (não deletar para manter histórico)
        $stmt = $pdo->prepare('UPDATE affiliates SET status = "inactive" WHERE id = ?');
        $stmt->execute([$affiliateId]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Afiliação cancelada com sucesso'
        ]);
        exit;
    }
    
    http_response_code(405);
    jsonResponse(['success' => false, 'message' => 'Método não permitido']);
    
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse(['success' => false, 'message' => 'Erro no servidor: ' . $e->getMessage()]);
}
?>
