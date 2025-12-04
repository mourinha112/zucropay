@echo off
cls
echo.
echo ========================================
echo    ZUCROPAY - Inicializacao Completa
echo ========================================
echo.

echo [1/3] Iniciando Backend (PHP)...
start "ZucroPay Backend" cmd /k "cd /d C:\Users\Mourinha\Desktop\zucropay\backend && start-server-fixed.bat"
timeout /t 3 /nobreak > nul

echo [2/3] Iniciando Frontend (React)...
start "ZucroPay Frontend" cmd /k "cd /d C:\Users\Mourinha\Desktop\zucropay && npm run dev"
timeout /t 2 /nobreak > nul

echo [3/3] Abrindo navegador...
timeout /t 3 /nobreak > nul
start http://localhost:5173

echo.
echo ========================================
echo    ZucroPay iniciado com sucesso!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Login:    zucro@zucro.com
echo Senha:    zucro2025
echo.
echo Para parar: Feche as janelas do terminal
echo ========================================
echo.
pause
