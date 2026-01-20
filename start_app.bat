@echo off
start cmd /k "cd server && npm start"
timeout /t 5
start cmd /k "cd client && npm run dev"
echo Application started! open http://localhost:5173 or http://localhost:5174
