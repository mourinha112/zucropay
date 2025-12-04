# ZUCROPAY - Iniciar Servidor Backend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " ZUCROPAY - Iniciando Servidor Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[*] Servidor rodando em: http://localhost:8000" -ForegroundColor Green
Write-Host "[*] Arquivos estaticos servidos de: ../public" -ForegroundColor Green
Write-Host "[*] Para parar: Ctrl + C" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

php -S localhost:8000 router.php
