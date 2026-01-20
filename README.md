# RandomCam - Random Video Chat App

A production-ready random video calling application built with React, Node.js, Socket.IO, and WebRTC.

## Features
- **Instant Random Matching**: Connect with strangers instantly.
- **Auto-Queue**: Automatically joins the queue when you are ready.
- **Safety**: Client-side NSFW detection (using `nsfwjs`) automatically blurs inappropriate content.
- **Responsive**: Works on Mobile and Desktop.

## Project Structure
- `/client`: React Vite Frontend.
- `/server`: Node.js Express + Socket.IO Backend.

## How to Run
### Quick Start (Windows)
Double click `start_app.bat`.

### Manual Start
1. **Backend**:
   ```bash
   cd server
   npm install
   npm start
   ```
2. **Frontend**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

## Production Deployment
1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```
2. The server is already configured to serve the `client/dist` folder.
   ```bash
   cd server
   npm start
   ```

## TURN Server (Important)
For production use outside of localhost (e.g. over the internet), you **MUST** configure a TURN server.
Edit `client/src/components/VideoChat.jsx`.
