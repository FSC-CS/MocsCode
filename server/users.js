// User and connection management helpers
export const users = new Map();
export const userConnections = new Map();

export function addUser(socketId, user) {
  users.set(socketId, user);
}

export function removeUser(socketId) {
  users.delete(socketId);
}

export function getUser(socketId) {
  return users.get(socketId);
}

export function setUserConnection(userId, socketId) {
  userConnections.set(userId, socketId);
}

export function removeUserConnection(userId) {
  userConnections.delete(userId);
}

export function getUserConnection(userId) {
  return userConnections.get(userId);
}

export function getUsersInRoom(room) {
  return Array.from(users.values())
    .filter(user => user.room === room)
    .map(user => ({
      id: user.socketId,
      name: user.name
    }));
}
