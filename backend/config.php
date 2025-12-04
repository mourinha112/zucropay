<?php
// Asaas API Configuration for ZucroPay

// IMPORTANTE: Troque pela sua chave de API do Asaas
// Sandbox: use a chave de teste do Asaas
// Produção: use a chave de produção
define('ASAAS_API_KEY', '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjI2MzcyM2UwLTI0Y2ItNDg3ZC1hMGUzLTU2MThhZWU2YTM1ZDo6JGFhY2hfMzM0YzViNTEtYzU2ZS00MTk2LWI2ZTYtZDEzMDFhODRlMTQ5');

// URL da API do Asaas
// Sandbox: https://sandbox.asaas.com/api/v3
// Produção: https://api.asaas.com/v3
define('ASAAS_API_URL', 'https://api.asaas.com/v3');

// Headers padrão para requisições ao Asaas
function get_asaas_headers() {
    return [
        'Content-Type: application/json',
        'access_token: ' . ASAAS_API_KEY,
        'User-Agent: ZucroPay/1.0 (PHP/' . PHP_VERSION . ')'
    ];
}

?>
