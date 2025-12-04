# ========================================
#  ZUCROPAY - Iniciando Servidor Backend
# ========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " ZUCROPAY - Servidor Backend" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navegar para a pasta do script
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "[OK] Diretorio: $pwd" -ForegroundColor Green
Write-Host ""

# Verificar arquivos
Write-Host "Verificando arquivos PHP..." -ForegroundColor Yellow
if (Test-Path "login.php") {
    Write-Host "[OK] login.php encontrado" -ForegroundColor Green
} else {
    Write-Host "[ERRO] login.php nao encontrado!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit
}

if (Test-Path "products.php") {
    Write-Host "[OK] products.php encontrado" -ForegroundColor Green
}

if (Test-Path "webhook.php") {
    Write-Host "[OK] webhook.php encontrado" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " SERVIDOR RODANDO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend URL:  " -NoNewline
Write-Host "http://localhost:8000" -ForegroundColor Yellow
Write-Host "  Webhook URL:  " -NoNewline
Write-Host "http://localhost:8000/webhook.php" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Para usar com ngrok:" -ForegroundColor Cyan
Write-Host "    ngrok http 8000" -ForegroundColor Gray
Write-Host "    Webhook: https://SEU-NGROK.ngrok.io/webhook.php" -ForegroundColor Gray
Write-Host ""
Write-Host "  Para parar: Pressione Ctrl+C" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Iniciar servidor PHP
php -S localhost:8000
