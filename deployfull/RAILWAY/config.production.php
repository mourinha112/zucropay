<?php
/**
 * Configuração de Produção - Railway
 */

// Banco de Dados
define('DB_HOST', getenv('MYSQLHOST') ?: 'localhost');
define('DB_PORT', getenv('MYSQLPORT') ?: '3306');
define('DB_NAME', getenv('MYSQLDATABASE') ?: 'railway');
define('DB_USER', getenv('MYSQLUSER') ?: 'root');
define('DB_PASSWORD', getenv('MYSQLPASSWORD') ?: '');

// Asaas API
define('ASAAS_API_KEY', getenv('ASAAS_API_KEY'));
define('ASAAS_ENVIRONMENT', getenv('ASAAS_ENVIRONMENT') ?: 'production');
define('ASAAS_BASE_URL', ASAAS_ENVIRONMENT === 'sandbox' 
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://www.asaas.com/api/v3'
);

// URLs
define('FRONTEND_URL', getenv('FRONTEND_URL') ?: 'https://zucropay.vercel.app');
define('BACKEND_URL', getenv('RAILWAY_PUBLIC_DOMAIN') 
    ? 'https://' . getenv('RAILWAY_PUBLIC_DOMAIN')
    : 'http://localhost:8000'
);

// JWT
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'change_this_in_production');
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRATION', 86400); // 24 horas

// Uploads
define('UPLOAD_DIR', getenv('UPLOAD_DIR') ?: __DIR__ . '/uploads');
define('MAX_UPLOAD_SIZE', getenv('MAX_UPLOAD_SIZE') ?: 5242880); // 5MB

// CORS
define('CORS_ALLOWED_ORIGINS', [
    FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
]);

// Timezone
date_default_timezone_set('America/Sao_Paulo');

// Error Reporting (produção)
error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', '/tmp/php_errors.log');
