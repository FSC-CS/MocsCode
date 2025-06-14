import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
// Configure CORS for Express
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Configure CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,      // 60 seconds
  pingInterval: 25000,     // 25 seconds
  upgradeTimeout: 30000,   // 30 seconds
  maxHttpBufferSize: 1e8,  // 100 MB max buffer size
  allowEIO3: true,
  serveClient: false,
  allowUpgrades: true,
  perMessageDeflate: {
    threshold: 1024, // Size threshold in bytes for compression
    zlibDeflateOptions: {
      level: 3 // Compression level (0-9), 3 is a good balance
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024 // 10 KB chunks
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store active users
const users = new Map();

// Track connections by user ID to prevent duplicates
const userConnections = new Map();

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  

  // Handle user joining a room
  socket.on('enterRoom', ({ name, room, userId, email }) => {
    // If user already has a connection, disconnect the old one
    if (userId && userConnections.has(userId)) {
      const oldSocketId = userConnections.get(userId);
      if (oldSocketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          oldSocket.disconnect(true);
          console.log(`Disconnected duplicate connection for user ${userId}`);
        }
      }
    }
    
    // Store the user's current connection
    if (userId) {
      userConnections.set(userId, socket.id);
    }
    // Leave previous room if any
    const prevRoom = Array.from(users.entries())
      .find(([_, userData]) => userData.socketId === socket.id)?.room;
    
    if (prevRoom) {
      socket.leave(prevRoom);
      io.to(prevRoom).emit('message', {
        user: 'Admin',
        text: `${name} has left the room`,
        timestamp: new Date()
      });
    }

    // Join new room
    socket.join(room);
    users.set(socket.id, { name: email || name, room, socketId: socket.id, email });
    
    // Send welcome message to the user
    // socket.emit('message', {
    //   user: 'Admin',
    //   text: `Welcome to the ${room} room, ${name}!`,
    //   timestamp: new Date()
    // });
    
    // Broadcast to room that a user has joined
    // socket.broadcast.to(room).emit('message', {
    //   user: 'Admin',
    //   text: `${name} has joined the room`,
    //   timestamp: new Date()
    // });

    // Send updated user list to room
    updateUserList(room);
  });

  // Handle new messages
  socket.on('message', (msg) => {
    const user = users.get(socket.id);
    if (user) {
      const message = {
        id: msg.id, // Echo the client-provided id to prevent duplicates
        user: user.email || user.name,
        userId: socket.id,
        text: msg.text,
        timestamp: new Date(),
        color: msg.color || '#6B7280',
        room: user.room
      };
      io.to(user.room).emit('message', message);
    }
  });

  // Handle typing indicator
  socket.on('activity', (username) => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.to(user.room).emit('activity', username);
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
    
    // Only handle cleanup if this was a voluntary disconnect or a timeout
    if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
      const user = users.get(socket.id);
      if (user) {
        // Only send leave message if this was the last connection for this user
        const userHasOtherConnections = Array.from(userConnections.entries())
          .some(([uid, sid]) => uid === user.userId && sid !== socket.id);
          
        if (!userHasOtherConnections) {
          // io.to(user.room).emit('message', {
          //   user: 'Admin',
          //   text: `${user.name} has left the chat`,
          //   timestamp: new Date()
          // });
          users.delete(socket.id);
          updateUserList(user.room);
          
          // Clean up user connections
          if (user.userId) {
            userConnections.delete(user.userId);
          }
        } else {
          // User has other connections, just remove this socket
          users.delete(socket.id);
        }
      }
    }
  });
});

// Helper function to update user list for a room
function updateUserList(room) {
  const usersInRoom = Array.from(users.values())
    .filter(user => user.room === room)
    .map(user => ({
      id: user.socketId,
      name: user.name
    }));
  
  io.to(room).emit('userList', { users: usersInRoom });
}

const PORT = process.env.PORT || 3500;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
