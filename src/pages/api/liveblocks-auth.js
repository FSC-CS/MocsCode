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

    // Allow the user to access the room with full access
    liveblocksSession.allow(room, liveblocksSession.FULL_ACCESS);

    // Authorize and get the response
    const { status, body } = await liveblocksSession.authorize();
    
    // Return the response directly as it already contains the token in the correct format
    return res.status(status).json(body);

  } catch (error) {
    console.error('Liveblocks auth error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}