@echo off
start cmd /k "cd server && npm start"
timeout /t 5
start cmd /k "cd client && npm run dev"
echo Application started! open https://random-video-chat-node.onrender.com or https://random-video-chat-node.onrender.com
