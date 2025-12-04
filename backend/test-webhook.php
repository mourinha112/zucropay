<?php

// Simular um webhook do Asaas
$webhookData = [
    'event' => 'PAYMENT_RECEIVED',
    'payment' => [
        'id' => 'pay_qhi1zhifgxq85j9e', // ID de um pagamento existente
        'status' => 'RECEIVED',
        'value' => 10.00,
        'netValue' => 9.50,
        'billingType' => 'PIX'
    ]
];

$url = 'http://localhost:8000/webhook.php';
$jsonData = json_encode($webhookData);

echo "🚀 Enviando webhook de teste para: $url\n\n";
echo "Dados:\n";
echo json_encode($webhookData, JSON_PRETTY_PRINT) . "\n\n";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($jsonData)
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Resposta HTTP: $httpCode\n";
echo "Resposta do servidor:\n";
echo $response . "\n";

if ($httpCode === 200) {
    echo "\n✅ Webhook processado com sucesso!\n";
} else {
    echo "\n❌ Erro ao processar webhook!\n";
}
?>
