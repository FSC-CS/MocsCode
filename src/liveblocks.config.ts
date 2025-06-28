import { createClient } from '@liveblocks/client';
import { createRoomContext } from '@liveblocks/react';

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
});

// Type for the presence data
type Presence = {
  cursor: { x: number; y: number } | null;
  selection: string[];
  name: string;
  color: string;
};

// Type for the storage
type Storage = {
  code: any; // Replace 'any' with your specific storage type
};

// Type for user info
type UserMeta = {
  id: string;
  info: {
    name: string;
    avatar?: string;
  };
};

// Type for room events
type RoomEvent = {
  // Define your room events here if needed
};

// Create the RoomContext
const context = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);

// Export the client
export { client };

// Export all the Liveblocks hooks and components
export const {
  RoomProvider,
  useMyPresence,
  useUpdateMyPresence,
  useSelf,
  useOthers,
  useStorage,
  useMutation,
  useRoom,
  useHistory,
  useUndo,
  useRedo,
  useCanUndo,
  useCanRedo,
} = context;

// Export types
export type { Presence, Storage, UserMeta, RoomEvent };