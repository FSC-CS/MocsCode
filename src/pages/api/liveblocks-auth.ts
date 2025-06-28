import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { Liveblocks } from '@liveblocks/node';

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });

    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { room } = req.body;
    if (!room) {
      return res.status(400).json({ message: 'Room ID is required' });
    }

    // Create a session for the user
    const liveblocksSession = liveblocks.prepareSession(
      session.user.email || 'anonymous',
      {
        userInfo: {
          name: session.user.name || 'Anonymous',
          avatar: session.user.image,
        },
      }
    );

    // Allow the user to access the room
    liveblocksSession.allow(room, liveblocksSession.FULL_ACCESS);

    // Authorize and get the response
    const authResponse = await liveblocksSession.authorize();
    
    console.log('Liveblocks auth response:', authResponse);
    
    // Extract token from different possible response formats
    let token;
    
    if (typeof authResponse === 'string') {
      // Direct token string
      token = authResponse;
    } else if (authResponse.token) {
      // Response object with token property
      token = authResponse.token;
    } else if (authResponse.body) {
      // Response with body property (parse if needed)
      try {
        const bodyData = typeof authResponse.body === 'string' 
          ? JSON.parse(authResponse.body) 
          : authResponse.body;
        token = bodyData.token || bodyData;
      } catch (parseError) {
        console.error('Failed to parse auth response body:', authResponse.body);
        token = authResponse.body; // Use as-is if parsing fails
      }
    } else {
      // Fallback: use the entire response as token
      token = authResponse;
    }
    
    console.log('Extracted token for room:', room, 'Token exists:', !!token, 'Token type:', typeof token);
    
    if (!token) {
      console.error('No token received from Liveblocks', authResponse);
      return res.status(500).json({ error: 'Authentication failed: No token received' });
    }
    
    // Return the token in the expected format
    return res.status(200).json({ token });

  } catch (error) {
    console.error('Liveblocks auth error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}