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
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors());
app.use(express.json());

// Store active users
const users = new Map();

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining a room
  socket.on('enterRoom', ({ name, room }) => {
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
    users.set(socket.id, { name, room, socketId: socket.id });
    
    // Send welcome message to the user
    socket.emit('message', {
      user: 'Admin',
      text: `Welcome to the ${room} room, ${name}!`,
      timestamp: new Date()
    });
    
    // Broadcast to room that a user has joined
    socket.broadcast.to(room).emit('message', {
      user: 'Admin',
      text: `${name} has joined the room`,
      timestamp: new Date()
    });

    // Send updated user list to room
    updateUserList(room);
  });

  // Handle new messages
  socket.on('message', (msg) => {
    const user = users.get(socket.id);
    if (user) {
      const message = {
        user: user.name,
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
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      const { name, room } = user;
      users.delete(socket.id);
      
      // Notify room that user has left
      io.to(room).emit('message', {
        user: 'Admin',
        text: `${name} has left the room`,
        timestamp: new Date()
      });
      
      // Update user list
      updateUserList(room);
    }
    console.log(`User disconnected: ${socket.id}`);
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
