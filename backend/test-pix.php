<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/asaas-api.php';

echo "=== TESTE DE CRIAÇÃO DE PAGAMENTO PIX ===\n\n";

// 1. Criar um cliente de teste
echo "1. Criando cliente de teste...\n";
$customer = asaas_create_customer(
    'Cliente Teste PIX',
    '12345678909',
    'teste@email.com',
    '11987654321' // Formato correto: 11 + 9 dígitos
);

if ($customer['code'] !== 200 && $customer['code'] !== 201) {
    echo "❌ Erro ao criar cliente: " . json_encode($customer) . "\n";
    exit(1);
}

$customerId = $customer['data']['id'];
echo "✓ Cliente criado: {$customerId}\n\n";

// 2. Criar cobrança PIX
echo "2. Criando cobrança PIX...\n";
$payment = asaas_create_payment(
    $customerId,
    'PIX',
    10.00,
    date('Y-m-d', strtotime('+3 days')),
    'Teste PIX ZucroPay'
);

echo "Resposta completa da API Asaas:\n";
echo json_encode($payment, JSON_PRETTY_PRINT) . "\n\n";

if ($payment['code'] !== 200 && $payment['code'] !== 201) {
    echo "❌ Erro ao criar pagamento\n";
    exit(1);
}

$paymentData = $payment['data'];
echo "✓ Pagamento criado: {$paymentData['id']}\n";
echo "Status: {$paymentData['status']}\n\n";

// SEMPRE gera QR Code em seguida (não precisa verificar pixQrCodeId)
echo "3. GERANDO QR Code PIX...\n";
$pixGenerate = asaas_generate_pix_qrcode($paymentData['id']);

echo "Resposta da geração:\n";
echo json_encode($pixGenerate, JSON_PRETTY_PRINT) . "\n\n";

if ($pixGenerate['code'] === 200 && isset($pixGenerate['data']['payload'])) {
    echo "✅ QR Code GERADO com sucesso!\n";
    echo "Código PIX: " . substr($pixGenerate['data']['payload'], 0, 50) . "...\n";
    echo "\n✅ TESTE PASSOU! O sistema está funcionando corretamente.\n";
} else {
    echo "❌ Erro ao gerar QR Code\n";
    echo "⚠️ Verifique se a conta Asaas tem PIX habilitado em PRODUCTION\n";
    exit(1);
}
?>
