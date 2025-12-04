@echo off
echo ========================================
echo  ZUCROPAY - Iniciando Servidor Backend
echo ========================================
echo.
echo [*] Servidor rodando em: http://localhost:8000
echo [*] Arquivos estaticos servidos de: ../public
echo [*] Para parar: Ctrl + C
echo.
echo ========================================
echo.

php -S localhost:8000 router.php
