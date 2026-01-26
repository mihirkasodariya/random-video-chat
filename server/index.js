const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for dev, restrict in prod
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

// Handle React routing, return all requests to React app
app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// SPA Fallback
app.use((req, res) => {
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
