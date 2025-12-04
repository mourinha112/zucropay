<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/asaas-api.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    $userId = authenticate();
    $pdo = db_connect();
    
    // GET - Listar clientes
    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT * FROM asaas_customers WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$userId]);
        $customers = $stmt->fetchAll();
        
        jsonResponse(['success' => true, 'customers' => $customers]);
    }
    
    // POST - Criar cliente
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $name = $input['name'];
        $cpfCnpj = preg_replace('/[^0-9]/', '', $input['cpfCnpj']);
        $email = $input['email'] ?? null;
        $phone = $input['phone'] ?? null;
        
        // Criar no Asaas
        $asaasResponse = asaas_create_customer($name, $cpfCnpj, $email, $phone);
        
        if ($asaasResponse['code'] !== 200 && $asaasResponse['code'] !== 201) {
            throw new Exception('Erro ao criar cliente no Asaas');
        }
        
        $asaasCustomer = $asaasResponse['data'];
        
        // Salvar no banco
        $stmt = $pdo->prepare('INSERT INTO asaas_customers (user_id, asaas_customer_id, name, email, phone, cpf_cnpj) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $asaasCustomer['id'], $name, $email, $phone, $cpfCnpj]);
        
        jsonResponse(['success' => true, 'message' => 'Cliente criado com sucesso', 'customer' => $asaasCustomer]);
    }
    
    // DELETE - Excluir cliente
    elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $customerId = $input['id'];
        
        $stmt = $pdo->prepare('SELECT asaas_customer_id FROM asaas_customers WHERE id = ? AND user_id = ?');
        $stmt->execute([$customerId, $userId]);
        $customer = $stmt->fetch();
        
        if ($customer) {
            asaas_delete_customer($customer['asaas_customer_id']);
            $stmt = $pdo->prepare('DELETE FROM asaas_customers WHERE id = ? AND user_id = ?');
            $stmt->execute([$customerId, $userId]);
        }
        
        jsonResponse(['success' => true, 'message' => 'Cliente excluído']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse(['success' => false, 'message' => $e->getMessage()]);
}
?>
