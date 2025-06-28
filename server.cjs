const express = require('express');
const cors = require('cors');
const { Liveblocks } = require('@liveblocks/node');
require('dotenv').config();

const app = express();
const port = 3000;

// Initialize Liveblocks client
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY || '',
});

// Middleware
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Liveblocks auth endpoint
app.post('/liveblocks-auth', async (req, res) => {
  try {
    const { room } = req.body;
    
    if (!room) {
      return res.status(400).json({ error: 'Room ID is required' });
    }
    
    // In a real app, you would verify the user's session here
    // For now, we'll use a mock user
    const user = {
      id: 'user-' + Math.random().toString(36).substring(2, 9),
      info: {
        name: 'Anonymous User',
        avatar: undefined,
      },
    };

    // Authorize the user
    const authResponse = await liveblocks.identifyUser(
      { 
        userId: user.id,
        groupIds: [],
      },
      {
        userInfo: user.info,
      }
    );

    // Add room access
    const roomAccess = {
      [room]: {
        '*': true, // Grant all permissions for this room
      },
    };

    res.status(200).json({
      ...authResponse,
      roomAccess,
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
