// Centralized configuration and constants
export const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
];

export const SOCKET_IO_OPTIONS = {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e8,
  allowEIO3: true,
  serveClient: false,
  allowUpgrades: true,
  perMessageDeflate: {
    threshold: 1024,
    zlibDeflateOptions: { level: 3 },
    zlibInflateOptions: { chunkSize: 10 * 1024 }
  }
};

export const PORT = process.env.PORT || 3500;
export const PORT_YJS = process.env.PORT_YJS || 4500;
export const YJS_PATH = '/ws';
