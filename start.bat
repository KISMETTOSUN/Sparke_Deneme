@echo off
echo Sparke Projesi Baslatiliyor...

:: Backend'i baslat
start cmd /k "echo Backend Calistiriliyor... && cd backend && npm start"

:: Frontend'i baslat
start cmd /k "echo Frontend Calistiriliyor... && cd frontend && npm run dev"

echo.
echo Sunucular ayri pencerelerde acildi. 
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
pause
