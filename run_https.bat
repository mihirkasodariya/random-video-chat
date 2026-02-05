@echo off
echo Starting Backend (HTTPS) and Frontend (HTTPS)...

:: Install dependencies if node_modules are missing
if not exist "server\node_modules" (
    echo Installing server dependencies...
    cd server && npm install && cd ..
)

if not exist "client\node_modules" (
    echo Installing client dependencies...
    cd client && npm install && cd ..
)

:: Start Server
start "Backend" cmd /k "cd server && npm start"

:: Wait for server to start
echo Waiting for backend...
timeout /t 5

:: Start Frontend
start "Frontend" cmd /k "cd client && npm run dev"

echo.
echo ==========================================================
echo Both servers are starting!
echo.
echo 1. Backend: https://localhost:5000
echo 2. Frontend: Check the Frontend terminal for the URL (usually https://localhost:5173)
echo.
echo IMPORTANT: Since we use self-signed certificates:
echo - Open https://localhost:5000 in your browser first.
echo - Click "Advanced" and then "Proceed to localhost (unsafe)".
echo - Then open the Frontend URL and do the same if needed.
echo ==========================================================
pause
