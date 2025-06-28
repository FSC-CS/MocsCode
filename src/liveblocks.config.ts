import { createClient } from '@liveblocks/client';
import { createRoomContext } from '@liveblocks/react';
import * as Y from 'yjs';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';

type Presence = {
  cursor: { x: number; y: number } | null;
  selection: string[];
  name: string;
  color: string;
};

type Storage = {
  // No storage needed as we're using Y.Doc directly
};

type UserMeta = {
  id: string;
  info: {
    name: string;
    avatar?: string;
  };
};

type RoomEvent = {
  // Define your custom room events here
};

// Create the Liveblocks client
const client = createClient({
  authEndpoint: async (room) => {
    try {
      console.log('Initiating auth for room:', room);
      const response = await fetch('/api/liveblocks-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ room }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Auth response error:', errorText);
        // For testing purposes, return a mock token
        if (process.env.NODE_ENV === 'development') {
          console.warn('Using mock authentication for development');
          return { token: 'mock-token' };
        }
        throw new Error(`Auth failed: ${response.status} - ${errorText}`);
      }

      // Parse the response data
      const data = await response.json();
      console.log('Auth response data:', data);
      
      // Handle different response formats
      let token;
      
      if (data.token) {
        // Direct token format: { token: "..." }
        token = data.token;
      } else if (data.body) {
        // Nested format: { status: 200, body: '{"token":"..."}' }
        try {
          const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
          token = parsedBody.token;
        } catch (parseError) {
          console.error('Failed to parse body:', data.body, parseError);
          throw new Error('Failed to parse auth response body');
        }
      } else {
        // Legacy format: token is the entire response
        token = data;
      }
      
      if (!token) {
        console.error('No token in auth response:', data);
        throw new Error('No token in auth response');
      }
      
      // Verify token format (Liveblocks tokens should be JWT strings)
      if (typeof token !== 'string' || !token.startsWith('eyJ')) {
        console.error('Invalid token format:', token);
        throw new Error('Invalid token format received');
      }
      
      return { token };
    } catch (error) {
      console.error('Auth endpoint error:', error);
      throw error;
    }
  },
  throttle: 16,
  resolveUsers: async ({ userIds }) => {
    // Return mock user data for development
    if (process.env.NODE_ENV === 'development') {
      return userIds.map(userId => ({
        id: userId,
        info: {
          name: `User ${userId.slice(0, 4)}`,
          avatar: `https://ui-avatars.com/api/?name=User+${userId.slice(0, 4)}&background=random`
        }
      }));
    }
    // In production, you would fetch real user data here
    return [];
  },
  resolveMentionSuggestions: async ({ text }) => {
    // Return mock mention suggestions for development
    if (process.env.NODE_ENV === 'development') {
      return ['alice', 'bob', 'charlie'].filter(name => 
        name.toLowerCase().includes(text.toLowerCase())
      );
    }
    // In production, you would fetch real mention suggestions here
    return [];
  },
});

// Create the RoomContext with proper typing
const context = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);

// Export all the hooks and components
export const {
  RoomProvider,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useSelf,
  useOthers,
  useStorage,
  useMutation,
  useRedo,
  useUndo,
  useCanRedo,
  useCanUndo,
  useHistory,
  useErrorListener,
  useEventListener,
  useLostConnectionListener,
  useOthersListener,
  useStatus,
} = context;

// Export the client for direct use if needed
export { client };

// Export types
export type { Presence, Storage, UserMeta, RoomEvent };