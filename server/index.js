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


let waitingUser = null;
const partners = {}; // Map<SocketID, SocketID> to track active pairs

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', () => {
        // Prevent double-joining if already paired
        if (partners[socket.id]) {
            console.log(`User ${socket.id} tried to join but is already paired.`);
            return;
        }

        // If there is a waiting user and it's not the same user
        if (waitingUser && waitingUser.id !== socket.id) {
            // Monitor if the waiting user is still connected
            if (waitingUser.connected) {
                console.log(`Matching ${socket.id} with ${waitingUser.id}`);

                // Notify both users
                const roomId = waitingUser.id + '#' + socket.id;
                socket.join(roomId);
                waitingUser.join(roomId);

                // Track partners
                partners[socket.id] = waitingUser.id;
                partners[waitingUser.id] = socket.id;

                // Tell waiting user to send offer (they are the initiator)
                io.to(waitingUser.id).emit('match', { initiator: true, roomId, partnerId: socket.id });
                // Tell current user to wait for offer
                io.to(socket.id).emit('match', { initiator: false, roomId, partnerId: waitingUser.id });

                waitingUser = null; // Queue is empty
            } else {
                // Waiting user disconnected, this user becomes the waiting user
                waitingUser = socket;
                console.log(`User ${socket.id} added to queue (previous waiter missing)`);
            }
        } else {
            // No one waiting, add this user to queue
            if (waitingUser && waitingUser.id === socket.id) {
                // Already waiting, do nothing
            } else {
                waitingUser = socket;
                console.log(`User ${socket.id} added to queue`);
            }
        }
    });

    socket.on('signal', (data) => {
        // data: { target: string, signal: any }
        io.to(data.target).emit('signal', { sender: socket.id, signal: data.signal });
    });

    const cleanupPartner = () => {
        const partnerId = partners[socket.id];
        if (partnerId) {
            // Notify partner
            io.to(partnerId).emit('partnerDisconnected');
            // Cleanup
            delete partners[partnerId];
            delete partners[socket.id];
        }
    }

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (waitingUser && waitingUser.id === socket.id) {
            waitingUser = null;
        }
        cleanupPartner();
    });

    // Custom 'next' event to explicitly leave and re-queue
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
