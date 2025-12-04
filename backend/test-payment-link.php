<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/asaas-api.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: text/plain; charset=utf-8');

echo "=== TESTE DE CRIAÇÃO DE PAYMENT LINK ===\n\n";

// Testar criação direta
$name = "Produto Teste - " . date('H:i:s');
$amount = 99.90;
$billingType = "UNDEFINED";
$description = "Teste de payment link";

echo "1. Dados a enviar:\n";
echo "Name: $name\n";
echo "Amount: $amount\n";
echo "Billing Type: $billingType\n";
echo "Description: $description\n\n";

echo "2. Configuração Asaas:\n";
echo "API Key: " . substr(ASAAS_API_KEY, 0, 20) . "...\n";
echo "API URL: " . ASAAS_API_URL . "\n\n";

echo "3. Chamando API do Asaas...\n";
$response = asaas_create_payment_link($name, $amount, $billingType, $description);

echo "Status Code: " . $response['code'] . "\n";
echo "Has Data: " . (isset($response['data']) ? 'YES' : 'NO') . "\n";
echo "Has CURL Error: " . (isset($response['curl_error']) ? 'YES' : 'NO') . "\n\n";

if (isset($response['curl_error'])) {
    echo "❌ ERRO DO CURL:\n" . $response['curl_error'] . "\n\n";
}

if (isset($response['raw_response'])) {
    echo "Resposta bruta da API:\n";
    echo $response['raw_response'] . "\n\n";
}

echo "4. Resposta completa:\n";
echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

if ($response['code'] === 200 || $response['code'] === 201) {
    echo "✅ SUCESSO!\n";
    if (isset($response['data']['id'])) {
        echo "Link ID: " . $response['data']['id'] . "\n";
        echo "URL: " . $response['data']['url'] . "\n";
    }
} else {
    echo "❌ ERRO!\n\n";
    
    // Mostrar erros detalhados
    if (isset($response['data']['errors']) && is_array($response['data']['errors'])) {
        echo "Erros retornados pela API:\n";
        foreach ($response['data']['errors'] as $error) {
            echo "- [" . ($error['code'] ?? 'N/A') . "] " . ($error['description'] ?? 'Sem descrição') . "\n";
        }
    } elseif (isset($response['data']['error'])) {
        echo "Erro: " . $response['data']['error'] . "\n";
    } elseif ($response['data'] === null) {
        echo "ATENÇÃO: A API retornou 'data: null'\n";
        echo "Isso geralmente significa:\n";
        echo "- Erro de autenticação (chave inválida)\n";
        echo "- Dados inválidos enviados\n";
        echo "- Problema na estrutura da requisição\n\n";
        
        // Testar se a chave está funcionando
        echo "Testando autenticação...\n";
        $testAuth = asaas_request('GET', '/customers?limit=1');
        echo "Teste de autenticação: " . $testAuth['code'] . "\n";
        if ($testAuth['code'] === 200) {
            echo "✅ Autenticação OK! O problema está nos dados do payment link.\n";
        } else {
            echo "❌ Autenticação falhou!\n";
            echo json_encode($testAuth, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
        }
    }
}
?>
