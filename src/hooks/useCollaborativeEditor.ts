import { useCallback, useEffect, useState, useRef } from 'react';
import { useRoom, useUpdateMyPresence } from '@liveblocks/react/suspense';
import * as Y from 'yjs';
import { yCollab } from 'y-codemirror.next';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';

// Helper function to generate a random color
const getRandomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}deg, 90%, 60%)`;
};

interface UseCollaborativeEditorProps {
  roomId: string;
  initialContent?: string;
}

export function useCollaborativeEditor({ roomId, initialContent = '' }: UseCollaborativeEditorProps) {
  const updateMyPresence = useUpdateMyPresence();
  const room = useRoom();
  const [isLoading, setIsLoading] = useState(true);
  const yDocRef = useRef<Y.Doc | null>(null);
  const yTextRef = useRef<Y.Text | null>(null);
  const providerRef = useRef<LiveblocksYjsProvider | null>(null);
  const [content, setContent] = useState(initialContent);

  // Initialize Y.Doc and provider
  useEffect(() => {
    if (!room) return;

    let yDoc: Y.Doc;
    let yText: Y.Text;
    let provider: LiveblocksYjsProvider;

    // Local variables to hold cleanup functions
    let cleanupYText: (() => void) | null = null;
    let isMounted = true;

    const init = () => {
      try {
        // Create a new Y.Doc
        const yDoc = new Y.Doc();
        yDocRef.current = yDoc;

        // Create a Y.Text type for the editor content
        const yText = yDoc.getText('codemirror');
        yTextRef.current = yText;

        // Set initial content if provided
        if (initialContent) {
          yDoc.transact(() => {
            yText.delete(0, yText.length);
            yText.insert(0, initialContent);
          }, 'initial-content');
          setContent(initialContent);
        }


        // Set up Liveblocks Yjs provider
        const provider = new LiveblocksYjsProvider(room, yDoc);
        providerRef.current = provider;

        // Listen for changes from other clients
        const handleYTextChange = () => {
          const currentContent = yText.toString();
          if (isMounted) {
            setContent(currentContent);
          }
        };

        yText.observe(handleYTextChange);

        // Set up presence
        updateMyPresence({
          cursor: null,
          selection: [],
          name: `User-${Math.floor(Math.random() * 1000)}`,
          color: getRandomColor(),
        });

        if (isMounted) {
          setIsLoading(false);
        }

        // Set up cleanup function
        cleanupYText = () => {
          yText.unobserve(handleYTextChange);
          provider.destroy();
          yDoc.destroy();
          yDocRef.current = null;
          yTextRef.current = null;
          providerRef.current = null;
        };
      } catch (error) {
        console.error('Error initializing Yjs:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    // Cleanup function
    return () => {
      isMounted = false;
      if (cleanupYText) {
        cleanupYText();
      }
    };
  }, [room, initialContent, updateMyPresence]);



  // Get the Yjs bindings for CodeMirror
  const getYjsBindings = useCallback(() => {
    if (!yTextRef.current) return [];

    // Basic Yjs bindings for CodeMirror
    return [
      yCollab(yTextRef.current, new Y.UndoManager(yTextRef.current)),
    ];
  }, []);

  // Update content in the room
  const updateContent = useCallback((newContent: string) => {
    const yText = yTextRef.current;
    const yDoc = yDocRef.current;
    
    if (!yText || !yDoc) return;
    
    try {
      // Only update if content has actually changed
      const currentContent = yText.toString();
      if (newContent !== currentContent) {
        yDoc.transact(() => {
          yText.delete(0, yText.length);
          if (newContent) {
            yText.insert(0, newContent);
          }
        }, 'local-edit');
      }
    } catch (error) {
      console.error('Error updating Yjs content:', error);
    }
  }, []);

  // Update cursor position
  const updateCursor = useCallback((selection: any) => {
    try {
      if (!selection?.main) return;
      
      const cursor = {
        x: selection.main.head,
        y: selection.main.anchor,
      };
      
      updateMyPresence({
        cursor,
        selection: [],
        name: `User-${Math.floor(Math.random() * 1000)}`,
        color: getRandomColor(),
      });
    } catch (error) {
      console.error('Error updating cursor:', error);
    }
  }, [updateMyPresence]);

  return {
    content,
    updateContent,
    updateCursor,
    isLoading,
    room,
    yText: yTextRef.current,
    getYjsBindings,
  };
}
