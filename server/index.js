const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
let server;

if (isProduction) {
    // In production (Render/Vercel), let the platform handle SSL
    const http = require('http');
    server = http.createServer(app);
    console.log("Running in Production Mode (HTTP)");
} else {
    // In local development, use the self-signed certificates for HTTPS
    const https = require('https');
    const options = {
        key: fs.readFileSync(path.join(__dirname, 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
    };
    server = https.createServer(options, app);
    console.log("Running in Local Mode (HTTPS)");
}

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


let queue = [];
const partners = {}; // Map<SocketID, { partnerId: SocketID, roomId: String }> to track active pairs

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', () => {
        // Prevent double-joining if already paired
        if (partners[socket.id]) {
            console.log(`User ${socket.id} tried to join but is already paired.`);
            return;
        }

        // Clean queue of self or stale IDs
        queue = queue.filter(id => id !== socket.id && io.sockets.sockets.has(id));

        if (queue.length > 0) {
            const partnerId = queue.shift();
            const partnerSocket = io.sockets.sockets.get(partnerId);

            if (partnerSocket && partnerSocket.connected) {
                console.log(`Matching ${socket.id} with ${partnerId}`);

                const roomId = `${partnerId}#${socket.id}`;
                socket.join(roomId);
                partnerSocket.join(roomId);

                partners[socket.id] = { partnerId, roomId };
                partners[partnerId] = { partnerId: socket.id, roomId };

                // Initiator is the one who was in the queue
                io.to(partnerId).emit('match', { initiator: true, roomId, partnerId: socket.id });
                io.to(socket.id).emit('match', { initiator: false, roomId, partnerId: partnerId });
            } else {
                queue.push(socket.id);
            }
        } else {
            queue.push(socket.id);
            console.log(`User ${socket.id} added to queue. Current queue:`, queue);
        }
    });

    socket.on('signal', (data) => {
        if (data.target) {
            io.to(data.target).emit('signal', { sender: socket.id, signal: data.signal });
        }
    });

    socket.on('mediaState', (data) => {
        if (data.target) {
            io.to(data.target).emit('mediaState', {
                sender: socket.id,
                isMuted: data.isMuted,
                isVideoOff: data.isVideoOff
            });
        }
    });

    socket.on('chatMessage', (data) => {
        const myId = socket.id;
        const partnerInfo = partners[myId];

        if (partnerInfo && partnerInfo.partnerId) {
            const targetId = partnerInfo.partnerId;
            console.log(`[CHAT] ${myId} -> ${targetId}: "${data.message}"`);

            // Direct relay to target socket
            io.to(targetId).emit('chatMessage', {
                sender: myId,
                message: data.message
            });
        } else {
            console.warn(`[CHAT] Drop msg from ${myId}. No partner found in map.`);
        }
    });

    const cleanupPartner = () => {
        const partnerInfo = partners[socket.id];
        if (partnerInfo) {
            const { partnerId, roomId } = partnerInfo;
            io.to(roomId).emit('partnerDisconnected');
            delete partners[partnerId];
            delete partners[socket.id];
        }
        queue = queue.filter(id => id !== socket.id);
    }

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        cleanupPartner();
    });

    socket.on('next', () => {
        cleanupPartner();
    });
});

// Handle React routing - CATCH ALL
// Using middleware instead of app.get to avoid Express 5 path-to-regexp errors
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend running on port: ${PORT}`);
    if (!isProduction) {
        console.log(`Local HTTPS: https://localhost:${PORT}`);
    }
});
