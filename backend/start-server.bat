@echo off
echo ========================================
echo  ZUCROPAY - Iniciando Servidor Backend
echo ========================================
echo.

cd /d "%~dp0"
echo [OK] Diretorio: %cd%
echo.

echo Verificando arquivos PHP...
if exist login.php (
    echo [OK] login.php encontrado
) else (
    echo [ERRO] login.php nao encontrado!
    pause
    exit
)

echo.
echo ========================================
echo  SERVIDOR RODANDO
echo ========================================
echo.
echo  Backend URL: http://localhost:8000
echo  Webhook URL: http://localhost:8000/webhook.php
echo.
echo  Para parar: Pressione Ctrl+C
echo ========================================
echo.

php -S localhost:8000
