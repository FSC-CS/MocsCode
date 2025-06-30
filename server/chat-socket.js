// Socket.IO chat and presence logic
import { getUsersInRoom, addUser, removeUser, getUser, setUserConnection, removeUserConnection, getUserConnection } from './users.js';

export function setupChatSocket(io) {
  io.on('connection', (socket) => {
    socket.on('enterRoom', ({ name, room, userId, email }) => {
      // Disconnect duplicate user connections
      if (userId && getUserConnection(userId)) {
        const oldSocketId = getUserConnection(userId);
        if (oldSocketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(oldSocketId);
          if (oldSocket) {
            oldSocket.disconnect(true);
            console.log(`Disconnected duplicate connection for user ${userId}`);
          }
        }
      }
      if (userId) setUserConnection(userId, socket.id);
      socket.join(room);
      addUser(socket.id, { name: email || name, room, socketId: socket.id, email });
      updateUserList(io, room);
    });

    socket.on('message', (msg) => {
      const user = getUser(socket.id);
      if (user) {
        const message = {
          id: msg.id,
          user: msg.user || 'Unknown',
          userId: socket.id,
          content: msg.content,
          timestamp: new Date(),
          color: msg.color || '#6B7280',
          room: msg.room
        };
        io.to(msg.room).emit('message', message);
      }
    });

    socket.on('activity', (username) => {
      const user = getUser(socket.id);
      if (user) {
        socket.broadcast.to(user.room).emit('activity', username);
      }
    });

    socket.on('disconnect', (reason) => {
      const user = getUser(socket.id);
      if (user) {
        // Only send leave message if this was the last connection for this user
        let userHasOtherConnections = false;
        // You can implement logic to check for other connections here if needed
        removeUser(socket.id);
        updateUserList(io, user.room);
        if (user.userId) removeUserConnection(user.userId);
      }
    });
  });
}

function updateUserList(io, room) {
  const usersInRoom = getUsersInRoom(room);
  io.to(room).emit('userList', { users: usersInRoom });
}
