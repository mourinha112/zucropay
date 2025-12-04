<?php
require_once __DIR__ . '/db.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// Simular criação de token
$userId = 3;
$token = generate_token($userId);

echo "=== TESTE DE TOKEN ===\n\n";
echo "1. Token gerado:\n";
echo $token . "\n\n";

// Verificar imediatamente
$resultado = verify_token($token);

echo "2. Resultado da verificação:\n";
if ($resultado === false) {
    echo "❌ FALHOU!\n\n";
} else {
    echo "✅ SUCESSO!\n";
    echo "User ID: " . $resultado['sub'] . "\n";
    echo "Issued at: " . date('Y-m-d H:i:s', $resultado['iat']) . "\n";
    echo "Expires at: " . date('Y-m-d H:i:s', $resultado['exp']) . "\n\n";
}

// Testar o token que você recebeu no login
$tokenRecebido = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsImlhdCI6MTc1OTM1NjUwOSwiZXhwIjoxNzYxOTQ4NTA5fQ.Yycr3quCL05YfTrj-HpyiUjlG0h8pvx0UN2k-BcxlMA";

echo "3. Testando token do seu login:\n";
$resultado2 = verify_token($tokenRecebido);

if ($resultado2 === false) {
    echo "❌ FALHOU!\n";
    
    // Debug detalhado
    $parts = explode('.', $tokenRecebido);
    echo "\nDEBUG:\n";
    echo "Parts count: " . count($parts) . "\n";
    
    if (count($parts) === 3) {
        list($header_b64, $payload_b64, $sig_b64) = $parts;
        
        // Add padding
        $payload_b64_padded = str_pad($payload_b64, strlen($payload_b64) + (4 - strlen($payload_b64) % 4) % 4, '=');
        $payload_json = base64_decode($payload_b64_padded);
        echo "Payload JSON: " . $payload_json . "\n";
        
        $payload = json_decode($payload_json, true);
        if ($payload) {
            echo "Payload decoded: " . json_encode($payload, JSON_PRETTY_PRINT) . "\n";
            echo "Current time: " . time() . "\n";
            echo "Token exp: " . $payload['exp'] . "\n";
            echo "Token expired? " . (time() > $payload['exp'] ? 'SIM' : 'NÃO') . "\n";
        }
        
        // Test signature
        $sig = base64_decode(strtr($sig_b64, '-_', '+/'));
        $expected = hash_hmac('sha256', "$parts[0].$parts[1]", token_secret(), true);
        
        echo "\nSignature match? " . (hash_equals($expected, $sig) ? 'SIM' : 'NÃO') . "\n";
        echo "Signature (base64): " . base64_encode($sig) . "\n";
        echo "Expected (base64): " . base64_encode($expected) . "\n";
    }
} else {
    echo "✅ SUCESSO!\n";
    echo "User ID: " . $resultado2['sub'] . "\n";
}
?>
