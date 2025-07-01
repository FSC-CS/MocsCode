const WebSocket = require('ws');
const http = require('http');
const wss = new WebSocket.Server({ noServer: true });
const setupWSConnection = require('y-websocket/bin/utils').setupConnection;

wss.on('connection', setupWSConnection);

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Y.js WebSocket Server\n');
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

const PORT = 1234;
server.listen(PORT, () => {
  console.log(`Y.js WebSocket server running on ws://localhost:${PORT}`);
});