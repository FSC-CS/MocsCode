import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, User, Edit, Trash, Loader2, UserPlus, Users, AlertCircle } from 'lucide-react';
import { Socket } from 'socket.io-client';
import io from 'socket.io-client';
import { ChatMessageApi, ChatRoomApi } from '@/lib/api/chat';
import { supabase } from '@/lib/supabase';
import { ApiConfig, ChatMessage } from '@/lib/api/types';

type SocketMessage = {
  id: string;
  user_id: string;
  username: string;
  content: string;
  timestamp: string;
  room: string;
};

// Unified message type for UI
type UIMessage = {
  id: string;
  user: string; // Display name for message
  content: string;
  timestamp: string;
  room: string;
  color: string;
  isOwn: boolean;
  isPending?: boolean; // Optimistic update pending
  isFailed?: boolean; // Failed to send
};

interface Collaborator {
  id: number;
  name: string;
  color: string;
  cursor: { line: number; column: number } | null;
  isTyping: boolean;
  accessLevel: 'owner' | 'edit' | 'view';
}

interface EnhancedMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  permissions: Record<string, unknown>;
  invited_by?: string;
  joined_at: string;
  user?: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
  };
}

interface ChatPanelProps {
  collaborators: Collaborator[];
  projectMembers: EnhancedMember[];
  currentUser: any;
  isLoadingMembers: boolean;
  memberOperationStatus: {
    type: 'idle' | 'adding' | 'updating' | 'removing' | 'error';
    error?: Error;
    memberId?: string;
  };
  onInviteClick?: () => void;
  onMemberClick?: (member: EnhancedMember) => void;
  onMemberRoleChange?: (memberId: string, newRole: 'owner' | 'editor' | 'viewer') => void;
  onRemoveMember?: (memberId: string) => void;
  canManageMembers?: boolean;
  projectId?: string; // Added to make projectId available
}

const ChatPanel = ({
  collaborators,
  projectMembers,
  currentUser,
  isLoadingMembers,
  memberOperationStatus,
  onInviteClick,
  onMemberClick,
  onMemberRoleChange,
  onRemoveMember,
  canManageMembers = false,
  projectId, // Added projectId prop
}: ChatPanelProps) => {
  const [messages, setMessages] = useState<UIMessage[]>([]); // Fixed: Changed from ChatMessag[] to UIMessage[]
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [socket, setSocket] = useState<typeof Socket | null>(null);
  const [currentRoom, setCurrentRoom] = useState('General Discussion');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [loadingStates, setLoadingStates] = useState<{
    sending: boolean;
    messageIds: { [key: string]: { editing?: boolean; deleting?: boolean } };
  }>({
    sending: false,
    messageIds: {},
  });
  const [joinedRooms, setJoinedRooms] = useState<string[]>([]); // Add state to track joined rooms
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null); // Ref for scrollable chat container

  // Helper: Scroll to bottom only when sending or joining, not when loading older messages
  const scrollToBottom = () => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  };

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationCursor, setPaginationCursor] = useState<string | null>(null); // e.g., oldest message id or timestamp

  // Chat API instances
  const chatApi = React.useMemo(() => new ChatMessageApi({ client: supabase }), []);
  const chatRoomApi = React.useMemo(() => new ChatRoomApi({ client: supabase }), []);

  // Fetch messages from Supabase on mount and room change
  useEffect(() => {
    let mounted = true;
    
    async function fetchMessages() {
      setLoadingMore(true);
      
      try {
        // Get room id using project id and room name
        const { data: roomId } = await chatRoomApi.getRoomIdByNameAndProject(currentRoom, projectId);
        
        if (!projectId || !projectMembers || projectMembers.length === 0) {
          setLoadingMore(false);
          return;
        }

        const res = await chatApi.listByRoom(
          roomId,
          { page: 1, per_page: 256 },
          { field: 'created_at', direction: 'desc' },
        );
        
        if (mounted && res?.data?.items) {
          // Normalize messages for UI compatibility
          const normalizedMessages: UIMessage[] = res.data.items.map(msg => ({
            id: msg.id,
            user: msg.user.name,
            content: msg.content,
            timestamp: msg.created_at,
            color: getAvatarColor({ user_id: msg.user_id }), // Generate color based on user
            isOwn: msg.user_id === currentUser?.id,
            room: currentRoom,
          }))
          .reverse();
          
          setMessages(normalizedMessages);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoadingMore(false);
      }
    }
    
    if (currentRoom) {
      fetchMessages();
    }
    
    return () => { 
      mounted = false; 
    };
  }, [currentRoom, chatApi, chatRoomApi, projectMembers, projectId, currentUser?.id]);

  // Send a message to Supabase
  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || !currentUser) return;
    
    setLoadingStates(prev => ({ ...prev, sending: true }));
    
    try {
      // Get projectId from ChatPanel prop      
      if (!projectId) {
        console.error('No project ID available');
        setLoadingStates(prev => ({ ...prev, sending: false }));
        return;
      }

      const { data: roomId } = await chatRoomApi.getRoomIdByNameAndProject(currentRoom, projectId);

      
      if (!roomId) {
        console.error('Could not resolve room ID');
        setLoadingStates(prev => ({ ...prev, sending: false }));
        return;
      }

      const res = await chatApi.create<ChatMessage>({
        room_id: roomId,
        user_id: currentUser.id,
        content: message,
        message_type: 'text',
        metadata: null,
        reply_to_id: null,
        is_deleted: false,
      });

      if (res?.data) {
        // Add message to local state immediately for better UX
        const newMessage: UIMessage = {
          id: res.data.id,
          user: currentUser.name,
          content: message,
          timestamp: new Date().toISOString(),
          isOwn: true,
          color: getAvatarColor({ user_id: currentUser.id }),
          room: currentRoom,
        };
        
        setMessages((msgs) => [...msgs, newMessage]);
        
        // Also emit to socket for real-time updates to other users
        if (socket && isConnected) {
          socket.emit('send_message', {
            id: res.data.id,
            user_id: currentUser.id,
            username: currentUser.name,
            content: message,
            timestamp: new Date().toISOString(),
            room: currentRoom,
          });
        }
      }
      
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, sending: false }));
    }
  };

  // --- Infinite Scroll: Attach scroll event listener ---
  useEffect(() => {
    if (!chatListRef.current) return;
    let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

    const debouncedScroll = () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        if (!chatListRef.current || loadingMore || !hasMore) return;
        if (chatListRef.current.scrollTop < 100) {
          loadOlderMessages();
        }
      }, 100); // 100ms debounce
    };

    const node = chatListRef.current;
    node.addEventListener('scroll', debouncedScroll);
    return () => {
      node.removeEventListener('scroll', debouncedScroll);
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [chatListRef.current, loadingMore, hasMore]);

  // Placeholder: implement this in the next step
  const loadOlderMessages = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    // Save scroll position relative to the first visible message
    let prevScrollHeight = 0;
    let prevScrollTop = 0;
    if (chatListRef.current) {
      prevScrollHeight = chatListRef.current.scrollHeight;
      prevScrollTop = chatListRef.current.scrollTop;
    }

    try {
      // Get projectId and roomId
      if (!projectId) {
        setLoadingMore(false);
        return;
      }
      const { data: roomId } = await chatRoomApi.getRoomIdByNameAndProject(currentRoom, projectId);
      if (!roomId) {
        setLoadingMore(false);
        return;
      }
      // Use the oldest message's timestamp or id as the cursor
      const oldest = messages[0];
      const cursor = oldest ? oldest.timestamp : null;
      const res = await chatApi.listByRoom(
        roomId,
        { per_page: 50, cursor: cursor },
        { field: 'created_at', direction: 'desc' },
      );
      const newItems = res?.data?.items || [];
      if (newItems.length === 0) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }
      // Normalize and reverse (oldest first)
      const normalized: UIMessage[] = newItems.map(msg => ({
        id: msg.id,
        user: msg.user.name,
        content: msg.content,
        timestamp: msg.created_at,
        color: getAvatarColor({ user_id: msg.user_id }),
        isOwn: msg.user_id === currentUser?.id,
        room: currentRoom,
      })).reverse();

      // Deduplicate: only prepend messages that are not already present
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const deduped = normalized.filter(m => !existingIds.has(m.id));
        return [...deduped, ...prev];
      });

    } finally {
      setLoadingMore(false);
    }
  };

  // Edit a message in Supabase
  const saveEdit = async (messageId: string) => {
    if (!editText.trim()) return;
    
    setLoadingStates(prev => ({
      ...prev,
      messageIds: {
        ...prev.messageIds,
        [messageId]: { ...prev.messageIds[messageId], editing: true }
      }
    }));
    
    try {
      const result = await chatApi.update<ChatMessage>(messageId, {
        content: editText,
      });
      
      if (result?.data) {
        setMessages(messages.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: editText } 
            : msg
        ));
      }
      
      setEditingId(null);
      setEditText('');
    } catch (error) {
      console.error('Error updating message:', error);
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        messageIds: {
          ...prev.messageIds,
          [messageId]: { ...prev.messageIds[messageId], editing: false }
        }
      }));
    }
  };

  // Soft-delete a message in Supabase
  const deleteMessage = async (messageId: string) => {
    setLoadingStates(prev => ({
      ...prev,
      messageIds: {
        ...prev.messageIds,
        [messageId]: { ...prev.messageIds[messageId], deleting: true }
      }
    }));
    
    try {
      await chatApi.update<ChatMessage>(messageId, { is_deleted: true });
      setMessages(messages.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        messageIds: {
          ...prev.messageIds,
          [messageId]: { ...prev.messageIds[messageId], deleting: false }
        }
      }));
    }
  };

  // Start editing
  const startEditing = (messageId: string, currentText: string) => {
    setEditingId(messageId);
    setEditText(currentText);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  // Handle visibility change for socket reconnection
  useEffect(() => {
    if (!socket) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only reconnect if actually disconnected
        if (socket.disconnected && !isConnected) {
          socket.connect();
        }
      }
      // Don't force disconnect when tab becomes hidden
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket, isConnected]);

  // Initialize socket connection
  useEffect(() => {
    if (!currentUser) return;

    // Create a single socket instance if it doesn't exist
    let newSocket: typeof Socket;
    let disconnectTimer: NodeJS.Timeout;
    
    if (!socket) {
      newSocket = io('https://mocscode-backend-socketio-production.up.railway.app', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        forceNew: false,
        rememberUpgrade: true,
        upgrade: true,
        // Add a unique connection ID to help with debugging
        query: {
          user: currentUser.id,
          username: currentUser.name || 'Anonymous',
          clientType: 'web'
        }
      });
      
      setSocket(newSocket);
    } else {
      newSocket = socket;
    }

    // Join the general room when connected
    const onConnect = () => {
      setIsConnected(true);
      if (currentUser) {
        // Check if we're already in the current room using our local state
        const isInRoom = joinedRooms.includes(currentRoom);
        
        if (!isInRoom) {
          newSocket.emit('join_room', { 
            userId: currentUser.id,
            userName: currentUser.name || 'Anonymous',
            projectId: projectId,
            room: currentRoom,
          });
          
          // Update our local state to track that we've joined this room
          setJoinedRooms(prev => [...prev, currentRoom]);
        }
      }
    };

    // Handle connection
    newSocket.on('connect', onConnect);
    
    // Handle disconnection
    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    // Handle reconnection attempts
    newSocket.on('reconnect_attempt', (attempt) => {
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to socket server');
    });

    // Handle connection errors
    const onConnectError = (error: Error) => {
      console.error('Socket connection error:', error);
    };
    newSocket.on('connect_error', onConnectError);

    // Cleanup function for when the component unmounts
    const cleanup = () => {
      if (!newSocket) return;
      
      // Only cleanup if we're the last tab
      const isLastTab = !window.localStorage.getItem('socket:disconnecting');
      
      if (isLastTab) {
        window.localStorage.setItem('socket:disconnecting', 'true');
        
        // Clean up listeners
        newSocket.off('connect');
        newSocket.off('disconnect');
        newSocket.off('connect_error', onConnectError);
        
        // Disconnect after a delay to allow other tabs to take over
        disconnectTimer = setTimeout(() => {
          if (window.localStorage.getItem('socket:disconnecting')) {
            newSocket.disconnect();
            window.localStorage.removeItem('socket:disconnecting');
          }
        }, 1000);
      }
    };
    
    // Set up cleanup on window unload
    window.addEventListener('beforeunload', cleanup);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      if (disconnectTimer) {
        clearTimeout(disconnectTimer);
      }
      cleanup();
    };
  }, [socket, currentUser]);

  // Generate a unique ID for messages
  const generateMessageId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Listen for messages and update state
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleMessage = (msg: SocketMessage) => {
      console.log('Received message:', msg);
      // Don't add our own messages from socket (they're already added when sending)
      if (msg.username === currentUser.id) return;
      
      // Use the server-provided ID if available, otherwise generate a new one
      const messageId = msg.id || generateMessageId();
      
      setMessages(prev => {
        // Check if message with this ID already exists to prevent duplicates
        if (prev.some(m => m.id === messageId)) {
          return prev;
        }
        
        const newMessage: UIMessage = {
          id: messageId,
          user: msg.username,
          content: msg.content,
          timestamp: msg.timestamp,
          color: getAvatarColor({ user_id: msg.user_id }),
          isOwn: false,
          room: msg.room,
        };
        
        return [...prev, newMessage];
      });
    };

    const handleUserList = (data: { users: Array<{ id: string; name: string }> }) => {
      // Update typing indicators based on user list
      // You can extend this to show who's online
    };

    const handleActivity = (username: string) => {
      // Don't show typing indicator for current user
      if (username === (currentUser.username || currentUser.email)) return;
      
      // Handle typing indicators
      setTypingUsers(prev => {
        const newTypingUsers = new Set(prev);
        newTypingUsers.add(username);
        
        // Clear the typing indicator after 2 seconds
        setTimeout(() => {
          setTypingUsers(prev => {
            const updated = new Set(prev);
            updated.delete(username);
            return updated;
          });
        }, 2000);
        
        return newTypingUsers;
      });
    };

    socket.on('new_message', handleMessage);
    socket.on('userList', handleUserList);
    socket.on('activity', handleActivity);

    return () => {
      socket.off('new_message', handleMessage);
      socket.off('userList', handleUserList);
      socket.off('activity', handleActivity);
    };
  }, [socket, currentUser]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (socket && currentUser && isConnected) {
      if (!isTyping) {
        setIsTyping(true);
        socket.emit('typing', currentUser.username || currentUser.email || 'Anonymous');
        
        // Reset typing state after a delay
        setTimeout(() => {
          setIsTyping(false);
        }, 1500);
      }
    }
  };

  const getAccessLevelText = (level: string) => {
    switch (level) {
      case 'owner': return 'Owner';
      case 'editor': return 'Editor';
      case 'viewer': return 'Viewer';
      default: return level;
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'editor': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDisplayName = (member: EnhancedMember): string => {
    return member.user?.name || `User ${member.user_id.substring(0, 6)}`;
  };

  const getInitials = (member: EnhancedMember): string => {
    const name = getDisplayName(member);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getAvatarColor = (member: Partial<EnhancedMember>): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
      '#D4A5A5', '#9B97B2', '#E8F7EE', '#B8F3FF', '#D5A6BD'
    ];
    
    // Handle cases where member might be undefined or null
    if (!member) return colors[0];
    
    // Use user_id, id, or fallback to a default value
    const id = member.user_id || member.id || 'default';
    
    // Ensure we have a valid string to work with
    if (typeof id !== 'string') return colors[0];
    
    // Calculate a stable index based on the ID
    const index = id.split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
      
    return colors[Math.abs(index)];
  };

  const handleMemberClick = (member: EnhancedMember) => {
    if (onMemberClick) {
      onMemberClick(member);
    }
  };

  // Member statistics
  const memberStats = {
    total: projectMembers.length,
    owners: projectMembers.filter(m => m.role === 'owner').length,
    editors: projectMembers.filter(m => m.role === 'editor').length,
    viewers: projectMembers.filter(m => m.role === 'viewer').length
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 text-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Chat Room
          <div className="flex items-center ml-4 space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </h2>
        <div className="flex items-center">
          <span className="text-sm text-gray-400">
            {projectMembers.length} {projectMembers.length === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatListRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingMore && messages.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Loading messages...</span>
          </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${msg.isOwn ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              {!msg.isOwn && (
                <div className="font-semibold text-sm" style={{ color: msg.color }}>
                  {(() => {
                    const member = projectMembers.find(m => 
                      m.user_id === msg.user
                    );
                    return member ? getDisplayName(member) : (msg.user || 'Unknown');
                  })()}
                </div>
              )}
              <div className="text-sm">
                {editingId === msg.id ? (
                  <div className="flex flex-col space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="bg-gray-800 text-white border-gray-600"
                      autoFocus
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => saveEdit(msg.id)}
                        className="px-3 py-1 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        disabled={loadingStates.messageIds[msg.id]?.editing}
                      >
                        {loadingStates.messageIds[msg.id]?.editing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 text-sm rounded-md border border-gray-600 hover:bg-gray-700 text-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p>{msg.content}</p>
                    <div className="text-xs text-gray-400 mt-1 flex justify-between items-center">
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      {msg.isOwn && (
                        <div className="flex space-x-1">
                          <button 
                            onClick={() => startEditing(msg.id, msg.content || '')}
                            className="text-gray-300 hover:text-white p-1 rounded"
                            disabled={loadingStates.messageIds[msg.id]?.editing || loadingStates.messageIds[msg.id]?.deleting}
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button 
                            onClick={() => deleteMessage(msg.id)}
                            className="text-red-400 hover:bg-red-900/50 hover:text-red-300 h-6 w-6 p-1 flex items-center justify-center rounded"
                            disabled={loadingStates.messageIds[msg.id]?.editing || loadingStates.messageIds[msg.id]?.deleting}
                          >
                            {loadingStates.messageIds[msg.id]?.deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {typingUsers.size > 0 && (
          <div className="text-xs text-gray-400 italic">
            {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={sendMessage} className="flex space-x-2">
          <Textarea
            value={message}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            disabled={loadingStates.sending || !isConnected}
          />
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!message.trim() || loadingStates.sending || !isConnected}
          >
            {loadingStates.sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;