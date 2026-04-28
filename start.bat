@echo off
title Sparke Launcher
echo ============================================
echo   SPARKE - Otomatik Baslatiyor...
echo ============================================
echo.

REM ---- [1/3] MySQL Kontrol ve Baslat ----
echo [1/3] MySQL kontrol ediliyor...
netstat -an 2>nul | find "3306" | find "LISTENING" >nul 2>&1
if %errorlevel% == 0 (
    echo        MySQL zaten calisiyor. [OK]
) else (
    echo        MySQL baslatiliyor...
    if exist "C:\xampp\mysql\bin\mysqld.exe" (
        start /min "MySQL" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
        echo        MySQL icin bekleniyor...
        timeout /t 5 /nobreak > nul
    ) else (
        echo        UYARI: XAMPP MySQL bulunamadi! Lutfen XAMPP'i kontrol edin.
        pause
        exit /b 1
    )
)

REM ---- [2/3] Backend ----
echo [2/3] Backend baslatiliyor (port 5000)...
start /min cmd /k "cd /d "%~dp0backend" && npm start"
timeout /t 3 /nobreak > nul

REM ---- [3/3] Frontend ----
echo [3/3] Frontend baslatiliyor (port 3000)...
start /min cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 4 /nobreak > nul

REM ---- Tarayici ----
echo.
echo ============================================
echo   Sparke hazir!
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:5000
echo ============================================
echo.
start http://localhost:3000
