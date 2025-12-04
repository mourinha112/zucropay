<?php
// Desabilitar exibição de erros HTML e forçar JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Garantir que sempre retorna JSON, mesmo em caso de erro fatal
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Erro interno do servidor',
            'debug' => $error['message']
        ]);
    }
});

require_once __DIR__ . '/db.php';

// CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Log para debug
    error_log("[upload-image] Starting upload process");
    
    // Autenticar usuário (retorna user_id diretamente)
    $userId = authenticate();
    error_log("[upload-image] User authenticated: ID {$userId}");
    
    // Verificar se foi enviado arquivo
    if (!isset($_FILES['image'])) {
        error_log("[upload-image] ERROR: No file in request");
        http_response_code(400);
        jsonResponse(['success' => false, 'message' => 'Nenhuma imagem foi enviada']);
        exit;
    }
    
    if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        $errorMsg = 'Erro no upload: ';
        switch ($_FILES['image']['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $errorMsg .= 'Arquivo muito grande';
                break;
            case UPLOAD_ERR_PARTIAL:
                $errorMsg .= 'Upload incompleto';
                break;
            case UPLOAD_ERR_NO_FILE:
                $errorMsg .= 'Nenhum arquivo enviado';
                break;
            default:
                $errorMsg .= 'Erro desconhecido';
        }
        error_log("[upload-image] ERROR: Upload error code {$_FILES['image']['error']}");
        http_response_code(400);
        jsonResponse(['success' => false, 'message' => $errorMsg]);
        exit;
    }
    
    $file = $_FILES['image'];
    error_log("[upload-image] File received: {$file['name']}, size: {$file['size']} bytes");
    
    // Validar tipo de arquivo
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    error_log("[upload-image] MIME type detected: {$mimeType}");
    
    if (!in_array($mimeType, $allowedTypes)) {
        http_response_code(400);
        jsonResponse(['success' => false, 'message' => 'Tipo de arquivo não permitido. Use JPEG, PNG, GIF ou WEBP']);
        exit;
    }
    
    // Validar tamanho (máx 5MB)
    if ($file['size'] > 5 * 1024 * 1024) {
        http_response_code(400);
        jsonResponse(['success' => false, 'message' => 'Arquivo muito grande. Tamanho máximo: 5MB']);
        exit;
    }
    
    // Criar pasta uploads se não existir
    $uploadsDir = __DIR__ . '/../public/uploads/products';
    if (!file_exists($uploadsDir)) {
        error_log("[upload-image] Creating directory: {$uploadsDir}");
        if (!mkdir($uploadsDir, 0755, true)) {
            error_log("[upload-image] ERROR: Failed to create directory");
            http_response_code(500);
            jsonResponse(['success' => false, 'message' => 'Erro ao criar pasta de uploads']);
            exit;
        }
    }
    
    // Gerar nome único para o arquivo
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid('product_' . $userId . '_') . '.' . $extension;
    $filepath = $uploadsDir . '/' . $filename;
    
    error_log("[upload-image] Saving file to: {$filepath}");
    
    // Mover arquivo
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        error_log("[upload-image] ERROR: Failed to move uploaded file");
        http_response_code(500);
        jsonResponse(['success' => false, 'message' => 'Erro ao salvar arquivo']);
        exit;
    }
    
    error_log("[upload-image] ✓ File saved successfully");
    
    // Retornar URL relativa (o Vite proxy vai resolver)
    $publicUrl = '/uploads/products/' . $filename;
    
    jsonResponse([
        'success' => true,
        'message' => 'Imagem enviada com sucesso',
        'url' => $publicUrl,
        'filename' => $filename
    ]);
    
} catch (Exception $e) {
    error_log("[upload-image] EXCEPTION: " . $e->getMessage());
    http_response_code(500);
    jsonResponse(['success' => false, 'message' => 'Erro ao fazer upload: ' . $e->getMessage()]);
}
?>
