<?php
// Router para servidor PHP embutido
// Este arquivo permite servir arquivos estáticos e rotear requisições PHP

// CORS headers - DEVEM vir ANTES de qualquer outra resposta
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, ngrok-skip-browser-warning');
header('Access-Control-Max-Age: 86400'); // Cache preflight por 1 dia

// Tratar OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Se for um arquivo estático (imagens, CSS, JS), servir diretamente
if (preg_match('/\.(?:png|jpg|jpeg|gif|webp|css|js|ico|svg)$/', $path)) {
    // Verificar se o arquivo existe no diretório público
    $publicFile = __DIR__ . '/../public' . $path;
    
    if (file_exists($publicFile) && is_file($publicFile)) {
        // Determinar o tipo MIME
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'css' => 'text/css',
            'js' => 'application/javascript',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
        ];
        
        $extension = pathinfo($publicFile, PATHINFO_EXTENSION);
        $mimeType = $mimeTypes[$extension] ?? 'application/octet-stream';
        
        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . filesize($publicFile));
        header('Cache-Control: public, max-age=86400'); // Cache por 1 dia
        readfile($publicFile);
        exit;
    }
    
    // Arquivo não encontrado
    http_response_code(404);
    echo '404 - Arquivo não encontrado';
    exit;
}

// Para arquivos PHP, continuar o processamento normal
return false;
?>
