<?php
// Debug de autenticação

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Coletar informações de debug
$debug = [
    'headers_all' => getallheaders(),
    'server_auth' => $_SERVER['HTTP_AUTHORIZATION'] ?? 'não existe',
    'bearer_extraction' => null,
    'token_decoded' => null,
    'error' => null
];

// Tentar extrair Bearer token
$headers = null;
if (isset($_SERVER['Authorization'])) {
    $headers = trim($_SERVER['Authorization']);
} else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $headers = trim($_SERVER['HTTP_AUTHORIZATION']);
} elseif (function_exists('apache_request_headers')) {
    $requestHeaders = apache_request_headers();
    if (isset($requestHeaders['Authorization'])) {
        $headers = trim($requestHeaders['Authorization']);
    }
}

$debug['headers_raw'] = $headers;

if (!empty($headers)) {
    if (preg_match('/Bearer\s+(\S+)/', $headers, $matches)) {
        $token = $matches[1];
        $debug['bearer_extraction'] = 'sucesso';
        $debug['token_preview'] = substr($token, 0, 20) . '...';
        
        // Tentar decodificar
        require_once __DIR__ . '/db.php';
        $payload = verify_token($token);
        
        if ($payload) {
            $debug['token_decoded'] = 'sucesso';
            $debug['user_id'] = $payload['sub'] ?? 'não encontrado';
        } else {
            $debug['token_decoded'] = 'falhou';
            $debug['error'] = 'Token inválido ou expirado';
        }
    } else {
        $debug['bearer_extraction'] = 'falhou';
        $debug['error'] = 'Formato do header Authorization inválido';
    }
} else {
    $debug['bearer_extraction'] = 'não encontrado';
    $debug['error'] = 'Header Authorization não presente na requisição';
}

// Verificar se token está no localStorage (simulação)
$debug['instrucoes'] = [
    'passo_1' => 'Abra o Console do navegador (F12)',
    'passo_2' => 'Execute: console.log(localStorage.getItem("zucropay_token"))',
    'passo_3' => 'Copie o token e faça uma requisição de teste',
    'teste' => 'fetch("http://localhost:8000/debug-auth.php", {headers: {"Authorization": "Bearer SEU_TOKEN_AQUI"}})'
];

echo json_encode($debug, JSON_PRETTY_PRINT);
?>
