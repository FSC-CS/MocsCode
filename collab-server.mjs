import WebSocket from 'ws';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupWSConnection } from 'y-websocket/bin/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Yjs Collaboration Server\n');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (conn, req) => {
  console.log('New WebSocket connection');
  setupWSConnection(conn, req);
});

const PORT = process.env.PORT || 1234;
server.listen(PORT, () => {
  console.log(`Collaboration server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});
