import { ReactNode } from 'react';
import { ClientSideSuspense } from '@liveblocks/react';
import { LiveMap } from '@liveblocks/client';
import { RoomProvider } from '@/liveblocks.config'; // Using @ alias for src directory

interface LiveblocksProviderProps {
  children: ReactNode;
  roomId: string;
}

export function LiveblocksProvider({ children, roomId }: LiveblocksProviderProps) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        selection: [],
        name: '',
        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      }}
      initialStorage={{
        code: new LiveMap(),
      }}
    >
      <ClientSideSuspense fallback={<div>Loading...</div>}>
        {() => children}
      </ClientSideSuspense>
    </RoomProvider>
  );
}

export default LiveblocksProvider;