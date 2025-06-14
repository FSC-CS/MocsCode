import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, User, Edit, Trash, Loader2, UserPlus, Users, AlertCircle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

// Type definitions for socket.io events
type SocketMessage = {
  id: string;
  user: string;
  userId: string;
  text: string;
  timestamp: string;
  color: string;
  room: string;
};

interface ChatMessage {
  id: string;
  user: string;
  userId: string;
  message: string;
  timestamp: string;
  color: string;
  isOwn?: boolean;
  room: string;
}

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
    username: string;
    display_name?: string;
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
}: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle tab visibility changes
  useEffect(() => {
    if (!socket) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only reconnect if actually disconnected
        if (socket.disconnected && !isConnected) {
          console.log('Tab visible and socket disconnected, reconnecting...');
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
    let newSocket: Socket;
    let disconnectTimer: NodeJS.Timeout;
    
    if (!socket) {
      newSocket = io('http://localhost:3500', {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        forceNew: false,
        closeOnBeforeunload: false,
        rememberUpgrade: true,
        upgrade: true,
        // Add a unique connection ID to help with debugging
        query: {
          userId: currentUser.id,
          username: currentUser.username || 'Anonymous',
          clientType: 'web'
        }
      });
      
      setSocket(newSocket);
    } else {
      newSocket = socket;
    }

    // Join the general room when connected
    const onConnect = () => {
      console.log('Connected to socket server');
      setIsConnected(true);
      if (currentUser) {
        // Check if we're already in a room by looking at the socket's rooms
        // The socket is always in a room with its own ID, so we need to check for other rooms
        const rooms = Object.keys(newSocket.rooms || {});
        const isInRoom = rooms.some(room => room !== newSocket.id);
        
        if (!isInRoom) {
          newSocket.emit('enterRoom', { 
            name: currentUser.email || currentUser.username || 'Anonymous',
            room: 'general',
            userId: currentUser.id,
            email: currentUser.email
          });
        }
      }
    };

    // Handle connection
    newSocket.on('connect', onConnect);
    
    // Handle disconnection
    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
      setIsConnected(false);
    });

    // Handle reconnection attempts
    newSocket.on('reconnect_attempt', (attempt) => {
      console.log(`Reconnection attempt ${attempt}`);
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
      // Use the server-provided ID if available, otherwise generate a new one
      const messageId = msg.id || generateMessageId();
      
      setMessages(prev => {
        // Check if message with this ID already exists to prevent duplicates
        if (prev.some(m => m.id === messageId)) {
          return prev;
        }
        
        return [...prev, {
          id: messageId,
          user: msg.user,
          userId: msg.userId,
          message: msg.text,
          timestamp: new Date().toISOString(),
          color: msg.color,
          isOwn: msg.userId === currentUser.id,
          room: msg.room || 'general'
        }];
      });
    };

    const handleUserList = (data: { users: Array<{ id: string; name: string }> }) => {
      // Update typing indicators based on user list
      // You can extend this to show who's online
    };

    const handleActivity = (username: string) => {
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

    socket.on('message', handleMessage);
    socket.on('userList', handleUserList);
    socket.on('activity', handleActivity);

    return () => {
      socket.off('message', handleMessage);
      socket.off('userList', handleUserList);
      socket.off('activity', handleActivity);
    };
  }, [socket, currentUser]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (message.trim() && socket && currentUser) {
      const messageId = generateMessageId();
      const newMessage: ChatMessage = {
        id: messageId,
        user: currentUser.username || 'Unknown',
        userId: currentUser.id || '',
        message: message.trim(),
        timestamp: new Date().toISOString(),
        color: getAvatarColor({ user_id: currentUser.id } as any),
        room: currentRoom,
        isOwn: true
      };
      
      socket.emit('message', {
        id: newMessage.id,
        user: currentUser.email || currentUser.username || 'Unknown',
        userId: newMessage.userId,
        text: newMessage.message,
        timestamp: newMessage.timestamp,
        color: newMessage.color,
        room: newMessage.room,
        email: currentUser.email
      });
      
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
      setIsTyping(false);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (socket && currentUser) {
      if (!isTyping) {
        setIsTyping(true);
        socket.emit('activity', currentUser.username || 'Anonymous');
      }
    }
  };

  const startEditing = (messageId: string, currentText: string) => {
    setEditingId(messageId);
    setEditText(currentText);
  };

  const saveEdit = (messageId: string) => {
    setMessages(messages.map(msg => 
      msg.id === messageId ? { ...msg, message: editText } : msg
    ));
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const deleteMessage = (messageId: string) => {
    setMessages(messages.filter(msg => msg.id !== messageId));
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
    return member.user?.display_name || member.user?.username || `User ${member.user_id.substring(0, 6)}`;
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
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">
            {projectMembers.length} {projectMembers.length === 1 ? 'member' : 'members'}
          </span>
          {canManageMembers && onInviteClick && (
            <button
              onClick={onInviteClick}
              className="ml-2 h-8 px-3 text-sm font-medium rounded-md border border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors flex items-center"
              disabled={memberOperationStatus.type === 'adding'}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Invite
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  {msg.user}
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
                      >
                        Save
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
                    <p>{msg.message}</p>
                    <div className="text-xs text-gray-400 mt-1 flex justify-between items-center">
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      {msg.isOwn && (
                        <div className="flex space-x-1">
                          <button 
                            onClick={() => startEditing(msg.id, msg.message)}
                            className="text-gray-300 hover:text-white"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button 
                            onClick={() => deleteMessage(msg.id)}
                            className="text-red-400 hover:bg-red-900/50 hover:text-red-300 h-8 w-8 p-0 flex items-center justify-center rounded-md"
                          >
                            <Trash className="h-3 w-3" />
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
          />
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
