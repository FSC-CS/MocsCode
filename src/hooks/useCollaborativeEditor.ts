import { useCallback, useEffect, useState } from 'react';
import { useObject, useRoom, useUpdateMyPresence } from '../components/providers/LiveblocksProvider';

interface UseCollaborativeEditorProps {
  roomId: string;
  initialContent?: string;
}

export function useCollaborativeEditor({ roomId, initialContent = '' }: UseCollaborativeEditorProps) {
  const updateMyPresence = useUpdateMyPresence();
  const room = useRoom();
  const code = useObject('code');
  
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial content
  useEffect(() => {
    if (code?.get('content') && !content) {
      setContent(code.get('content'));
      setIsLoading(false);
    } else if (initialContent) {
      // If we have initial content but no storage yet, initialize it
      code?.set('content', initialContent);
      setContent(initialContent);
      setIsLoading(false);
    }
  }, [code, initialContent]);

  // Handle changes from other users
  useEffect(() => {
    if (!code) return;

    const handleChange = () => {
      const newContent = code.get('content');
      if (newContent !== content) {
        setContent(newContent);
      }
    };

    code.subscribe(handleChange);
    return () => {
      code.unsubscribe(handleChange);
    };
  }, [code, content]);

  // Update content in the room
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    code?.set('content', newContent);
  }, [code]);

  // Update cursor position
  const updateCursor = useCallback((selection: any) => {
    if (!selection) {
      updateMyPresence({ cursor: null });
      return;
    }

    const cursor = selection.ranges[0].head;
    updateMyPresence({
      cursor: { x: cursor.line, y: cursor.column },
      selection: selection.ranges.map((range: any) => range.anchor + '-' + range.head),
    });
  }, [updateMyPresence]);

  return {
    content,
    updateContent,
    updateCursor,
    isLoading,
    room,
  };
}
