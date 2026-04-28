@echo off
echo Sparke Baslatiliyor...

cd backend
start /min cmd /c "npm start"

cd ../frontend
start /min cmd /c "npm run dev"

timeout /t 2 /nobreak > nul
start http://localhost:3000

echo.
echo Sunucular ayri pencerelerde acildi. 
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
pause
