<?php
require_once __DIR__ . '/config.php';

// Função genérica para fazer requisições à API do Asaas
function asaas_request($method, $endpoint, $data = null) {
    $url = ASAAS_API_URL . $endpoint;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, get_asaas_headers());
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true); // Verificar SSL
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2); // Verificar hostname
    
    if ($data && in_array($method, ['POST', 'PUT'])) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    // Se houver erro do CURL, retornar erro detalhado
    if ($curlError) {
        return [
            'code' => 0,
            'data' => ['error' => 'CURL Error: ' . $curlError],
            'curl_error' => $curlError
        ];
    }
    
    return [
        'code' => $httpCode,
        'data' => json_decode($response, true),
        'raw_response' => $response // Adicionar resposta bruta para debug
    ];
}

// ========== SALDO ==========
function asaas_get_balance() {
    return asaas_request('GET', '/finance/balance');
}

// ========== TRANSFERÊNCIAS/SAQUES ==========
function asaas_create_transfer($value, $bankAccount) {
    $data = [
        'value' => $value,
        'bankAccount' => $bankAccount
    ];
    return asaas_request('POST', '/transfers', $data);
}

function asaas_list_transfers($limit = 10) {
    return asaas_request('GET', '/transfers?limit=' . $limit);
}

// ========== CLIENTES ==========
function asaas_create_customer($name, $cpfCnpj, $email = null, $phone = null) {
    $data = [
        'name' => $name,
        'cpfCnpj' => $cpfCnpj
    ];
    if ($email) $data['email'] = $email;
    if ($phone) $data['phone'] = $phone;
    
    return asaas_request('POST', '/customers', $data);
}

function asaas_get_customer($customerId) {
    return asaas_request('GET', '/customers/' . $customerId);
}

function asaas_list_customers($limit = 100) {
    return asaas_request('GET', '/customers?limit=' . $limit);
}

function asaas_update_customer($customerId, $data) {
    return asaas_request('PUT', '/customers/' . $customerId, $data);
}

function asaas_delete_customer($customerId) {
    return asaas_request('DELETE', '/customers/' . $customerId);
}

// Criar ou buscar cliente existente
function asaas_create_or_get_customer($customerData) {
    // Buscar por CPF ou email
    $searchKey = isset($customerData['cpfCnpj']) ? 'cpfCnpj' : 'email';
    $searchValue = $customerData[$searchKey];
    
    $response = asaas_request('GET', '/customers?' . $searchKey . '=' . urlencode($searchValue));
    
    if ($response['code'] === 200 && isset($response['data']['data']) && count($response['data']['data']) > 0) {
        // Cliente já existe
        return $response['data']['data'][0];
    }
    
    // Cliente não existe, criar novo
    $createResponse = asaas_create_customer(
        $customerData['name'],
        $customerData['cpfCnpj'],
        $customerData['email'] ?? null,
        $customerData['phone'] ?? null
    );
    
    if ($createResponse['code'] === 200 || $createResponse['code'] === 201) {
        return $createResponse['data'];
    }
    
    return null;
}

// ========== COBRANÇAS (PAYMENTS) ==========
function asaas_create_payment($customerId, $billingType, $value, $dueDate, $description = null, $extraData = []) {
    // billingType: BOLETO, CREDIT_CARD, PIX, UNDEFINED
    $data = [
        'customer' => $customerId,
        'billingType' => $billingType,
        'value' => $value,
        'dueDate' => $dueDate
    ];
    if ($description) $data['description'] = $description;
    
    // Adicionar dados extras (creditCard, creditCardHolderInfo, etc)
    if (!empty($extraData)) {
        $data = array_merge($data, $extraData);
    }
    
    error_log("[asaas_create_payment] Sending data: " . json_encode($data));
    $result = asaas_request('POST', '/payments', $data);
    error_log("[asaas_create_payment] Response code: {$result['code']}, has pixQrCodeId: " . (isset($result['data']['pixQrCodeId']) ? 'YES' : 'NO'));
    
    return $result;
}

function asaas_get_payment($paymentId) {
    return asaas_request('GET', '/payments/' . $paymentId);
}

function asaas_list_payments($limit = 100) {
    return asaas_request('GET', '/payments?limit=' . $limit);
}

function asaas_delete_payment($paymentId) {
    return asaas_request('DELETE', '/payments/' . $paymentId);
}

// ========== LINKS DE PAGAMENTO ==========
function asaas_create_payment_link($name, $value, $billingType = 'UNDEFINED', $description = null) {
    $data = [
        'name' => $name,
        'billingType' => $billingType,
        'chargeType' => 'DETACHED',
        'value' => $value,
        'dueDateLimitDays' => 30 // Prazo de 30 dias para vencimento
    ];
    if ($description) $data['description'] = $description;
    
    return asaas_request('POST', '/paymentLinks', $data);
}

function asaas_get_payment_link($paymentLinkId) {
    return asaas_request('GET', '/paymentLinks/' . $paymentLinkId);
}

function asaas_list_payment_links($limit = 100) {
    return asaas_request('GET', '/paymentLinks?limit=' . $limit);
}

function asaas_delete_payment_link($paymentLinkId) {
    return asaas_request('DELETE', '/paymentLinks/' . $paymentLinkId);
}

// ========== ASSINATURAS (SUBSCRIPTIONS) ==========
function asaas_create_subscription($customerId, $billingType, $value, $cycle, $description = null) {
    // cycle: WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, SEMIANNUALLY, YEARLY
    $data = [
        'customer' => $customerId,
        'billingType' => $billingType,
        'value' => $value,
        'cycle' => $cycle,
        'nextDueDate' => date('Y-m-d', strtotime('+1 day'))
    ];
    if ($description) $data['description'] = $description;
    
    return asaas_request('POST', '/subscriptions', $data);
}

function asaas_get_subscription($subscriptionId) {
    return asaas_request('GET', '/subscriptions/' . $subscriptionId);
}

function asaas_list_subscriptions($limit = 100) {
    return asaas_request('GET', '/subscriptions?limit=' . $limit);
}

function asaas_delete_subscription($subscriptionId) {
    return asaas_request('DELETE', '/subscriptions/' . $subscriptionId);
}

// ========== PIX ==========
// ========== PIX ==========
function asaas_generate_pix_qrcode($paymentId) {
    // Gera o QR Code PIX (necessário em PRODUCTION)
    return asaas_request('POST', '/payments/' . $paymentId . '/pixQrCode');
}

function asaas_get_pix_qrcode($paymentId) {
    // Busca o QR Code PIX já gerado
    return asaas_request('GET', '/payments/' . $paymentId . '/pixQrCode');
}

?>
