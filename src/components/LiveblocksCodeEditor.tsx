import React, { useEffect, useCallback } from 'react';
import { LiveblocksProvider, RoomProvider, useOthers, useUpdateMyPresence } from '@liveblocks/react';
import { ClientSideSuspense } from '@liveblocks/react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '@/contexts/ApiContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import CodeEditor from './CodeEditor';
import { toast } from '@/components/ui/use-toast';

const LIVEBLOCKS_PUBLIC_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY || 'pk_dev_0x89QMZxMWfJrk__frevVtdm06jzUE9e5BkJVp2TJMAIU3dhWYJELEdE70II3rpN';

interface LiveblocksCodeEditorProps {
  project: any;
  onBack: () => void;
}

// Inner component that uses Liveblocks hooks
function LiveblocksEditor({ project, onBack }: LiveblocksCodeEditorProps) {
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers();
  const { user } = useAuth();

  // Update presence when user data changes
  useEffect(() => {
    if (!user) return;
    
    updateMyPresence({
      userId: user.id,
      name: user.name || user.email || 'Anonymous',
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
      cursor: null,
    });
  }, [user, updateMyPresence]);

  // Convert others to collaborators format expected by CodeEditor
  const collaborators = React.useMemo(() => {
    return others
      .filter(other => other.presence?.userId !== user?.id)
      .map(other => ({
        id: other.connectionId,
        name: other.presence?.name || 'Anonymous',
        color: other.presence?.color || '#000000',
        cursor: other.presence?.cursor || null,
        isTyping: false, // You can implement typing indicators if needed
        accessLevel: 'edit' as const, // Default to edit, implement proper role-based access
      }));
  }, [others, user?.id]);

  return (
    <CodeEditor 
      project={project} 
      onBack={onBack}
      collaborators={collaborators}
    />
  );
}

// Main component that sets up the Liveblocks room
function LiveblocksCodeEditor({ project, onBack }: LiveblocksCodeEditorProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!projectId) {
    navigate('/');
    return null;
  }

  // Room ID should be consistent for the same project
  const roomId = `project-${projectId}`;

  return (
    <LiveblocksProvider publicApiKey={LIVEBLOCKS_PUBLIC_KEY}>
      <RoomProvider
        id={roomId}
        initialPresence={{
          userId: user?.id || '',
          name: user?.name || user?.email || 'Anonymous',
          color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
          cursor: null,
        }}
        initialStorageRoot={{
          files: {}
        }}
      >
        <ClientSideSuspense fallback={
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        }>
          <LiveblocksEditor project={project} onBack={onBack} />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

export default LiveblocksCodeEditor;
