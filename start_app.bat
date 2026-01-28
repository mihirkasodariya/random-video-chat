@echo off
start cmd /k "cd server && npm start"
timeout /t 5
start cmd /k "cd client && npm run dev"
echo Application started! Access via https://192.168.1.6:5173 (Ensure you accept the self-signed certificate)
