<?php
// Database connection for ZucroPay
function db_connect() {
    $host = 'localhost';
    $db   = 'zucropay';
    $user = 'root';
    $pass = '';
    $charset = 'utf8mb4';

    $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
         return new PDO($dsn, $user, $pass, $options);
    } catch (PDOException $e) {
         http_response_code(500);
         echo json_encode(['success' => false, 'message' => 'DB connection failed: ' . $e->getMessage()]);
         exit;
    }
}

function jsonResponse($data) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
}

// JWT-like token generation (HMAC-based)
function token_secret() {
    return 'zucropay_secret_key_change_in_production_2025';
}

function generate_token($userId, $userName = null, $userEmail = null) {
    $header = rtrim(strtr(base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'])), '+/', '-_'), '=');
    $payload = rtrim(strtr(base64_encode(json_encode([
        'sub' => $userId,
        'name' => $userName,
        'email' => $userEmail,
        'iat' => time(),
        'exp' => time() + 60*60*24*30
    ])), '+/', '-_'), '='); // 30 days
    $sig = hash_hmac('sha256', "$header.$payload", token_secret(), true);
    $sig_enc = rtrim(strtr(base64_encode($sig), '+/', '-_'), '=');
    return "$header.$payload.$sig_enc";
}

function verify_token($token) {
    if (!$token) return false;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    list($header_b64, $payload_b64, $sig_b64) = $parts;
    
    // Verify signature using original parts (without padding)
    $sig_received = base64_decode(strtr($sig_b64 . str_repeat('=', (4 - strlen($sig_b64) % 4) % 4), '-_', '+/'));
    $sig_expected = hash_hmac('sha256', "$header_b64.$payload_b64", token_secret(), true);
    
    if (!hash_equals($sig_expected, $sig_received)) return false;
    
    // Add padding to decode payload
    $payload_b64_padded = $payload_b64 . str_repeat('=', (4 - strlen($payload_b64) % 4) % 4);
    $payload_json = base64_decode(strtr($payload_b64_padded, '-_', '+/'));
    $payload = json_decode($payload_json, true);
    if (!$payload) return false;
    if (isset($payload['exp']) && time() > $payload['exp']) return false;
    return $payload;
}

// Get Bearer token from request
function get_bearer_token() {
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
    if (!empty($headers)) {
        if (preg_match('/Bearer\s+(\S+)/', $headers, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

// Verify authentication and return user ID
function authenticate() {
    $token = get_bearer_token();
    $payload = verify_token($token);
    if (!$payload || !isset($payload['sub'])) {
        http_response_code(401);
        jsonResponse(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
    return $payload['sub'];
}

?>
