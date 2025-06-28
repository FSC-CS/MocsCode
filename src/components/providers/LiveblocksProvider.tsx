import { ReactNode, useEffect, useRef } from 'react';
import { ClientSideSuspense, useRoom } from '@liveblocks/react';
import { RoomProvider } from '@/liveblocks.config';
import * as Y from 'yjs';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';

type LiveblocksProviderProps = {
  children: ReactNode;
  roomId: string;
};

// YjsProvider component to handle Yjs document and provider
function YjsProvider({ children, room }: { children: ReactNode; room: any }) {
  const yDocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<LiveblocksYjsProvider | null>(null);

  useEffect(() => {
    if (!room) return;
    
    // Create a new Y.Doc
    const yDoc = new Y.Doc();
    yDocRef.current = yDoc;

    // Set up Liveblocks Yjs provider
    const provider = new LiveblocksYjsProvider(room, yDoc);
    providerRef.current = provider;

    // Cleanup
    return () => {
      provider.destroy();
      yDoc.destroy();
      yDocRef.current = null;
      providerRef.current = null;
    };
  }, [room]);

  return <>{children}</>;
}

// Wrapper component to access the room inside ClientSideSuspense
function YjsWrapper({ children, roomId }: { children: ReactNode; roomId: string }) {
  const room = useRoom();
  return <YjsProvider room={room}>{children}</YjsProvider>;
}

export function LiveblocksProvider({ children, roomId }: LiveblocksProviderProps) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        selection: [],
        name: `User-${Math.floor(Math.random() * 1000)}`,
        color: `hsl(${Math.floor(Math.random() * 360)} 80% 60%)`,
      }}
    >
      <ClientSideSuspense fallback={<div>Loading...</div>}>
        <YjsWrapper roomId={roomId}>
          {children}
        </YjsWrapper>
      </ClientSideSuspense>
    </RoomProvider>
  );
}

export default LiveblocksProvider;