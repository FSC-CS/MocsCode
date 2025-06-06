import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, User, Edit, Trash, Loader2, UserPlus, Users, AlertCircle } from 'lucide-react';

interface ChatMessage {
  id: number;
  user: string;
  message: string;
  timestamp: string;
  color: string;
  isOwn?: boolean;
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
    type: 'idle' | 'adding' | 'updating' | 'removing';
    memberId?: string;
  };
  lastRefresh: Date;
  autoRefreshEnabled: boolean;
  onMemberClick?: (member: EnhancedMember) => void;
  onInviteClick?: () => void;
  canManageMembers: boolean;
}

const ChatPanel = ({ 
  collaborators, 
  projectMembers, 
  currentUser,
  isLoadingMembers,
  memberOperationStatus,
  lastRefresh,
  autoRefreshEnabled,
  onMemberClick,
  onInviteClick,
  canManageMembers
}: ChatPanelProps) => {
  const [message, setMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      user: 'Alice Chen',
      message: 'Hey everyone! Ready to work on this assignment?',
      timestamp: '2:30 PM',
      color: '#3B82F6',
      isOwn: false
    },
    {
      id: 2,
      user: 'Bob Smith',
      message: 'Yes! I think we should start with the main function.',
      timestamp: '2:31 PM',
      color: '#10B981',
      isOwn: false
    }
  ]);

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now(),
        user: 'You',
        message: message.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        color: '#6B7280',
        isOwn: true
      };
      setMessages([...messages, newMessage]);
      setMessage('');
    }
  };

  const startEditing = (messageId: number, currentText: string) => {
    setEditingMessage(messageId);
    setEditText(currentText);
  };

  const saveEdit = (messageId: number) => {
    setMessages(messages.map(msg => 
      msg.id === messageId ? { ...msg, message: editText } : msg
    ));
    setEditingMessage(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const deleteMessage = (messageId: number) => {
    setMessages(messages.filter(msg => msg.id !== messageId));
  };

  const getAccessLevelText = (level: string) => {
    switch (level) {
      case 'owner': return 'Owner';
      case 'editor': 
      case 'edit': return 'Edit';
      case 'viewer':
      case 'view': return 'View';
      default: return 'View';
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'owner': return 'bg-yellow-100 text-yellow-800';
      case 'editor':
      case 'edit': return 'bg-green-100 text-green-800';
      case 'viewer':
      case 'view': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDisplayName = (member: EnhancedMember): string => {
    if (!member.user) return 'Unknown User';
    return member.user.display_name || member.user.username || member.user.email?.split('@')[0] || 'Unknown';
  };

  const getInitials = (member: EnhancedMember): string => {
    const name = getDisplayName(member);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (member: EnhancedMember): string => {
    // Generate consistent color based on user ID
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ];
    const index = member.user_id ? 
      member.user_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length :
      0;
    return colors[index];
  };

  const handleMemberClick = (member: EnhancedMember) => {
    // Only allow clicking if user can manage members and it's not themselves
    if (canManageMembers && member.user_id !== currentUser?.id && onMemberClick) {
      onMemberClick(member);
    }
  };

  // Member statistics
  const memberStats = {
    total: projectMembers.length,
    owners: projectMembers.filter(m => m.role === 'owner').length,
    editors: projectMembers.filter(m => m.role === 'editor').length,
    viewers: projectMembers.filter(m => m.role === 'viewer').length,
    online: projectMembers.filter(m => {
      // Mock online status - in real implementation, this would come from real-time data
      return Math.random() > 0.3;
    }).length
  };

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Collaborators List */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">
            Collaborators
            {!isLoadingMembers && (
              <span className="ml-2 text-xs text-gray-500">({memberStats.total})</span>
            )}
          </h3>
          {isLoadingMembers && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>

        {/* Member Operation Status */}
        {memberOperationStatus.type !== 'idle' && (
          <div className="mb-3 p-2 bg-blue-600/20 border border-blue-500 rounded">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs text-blue-400">
                {memberOperationStatus.type === 'adding' && 'Adding collaborator...'}
                {memberOperationStatus.type === 'updating' && 'Updating permissions...'}
                {memberOperationStatus.type === 'removing' && 'Removing member...'}
              </span>
            </div>
          </div>
        )}

        {/* Member Statistics */}
        <div className="mb-3 p-2 bg-gray-700 rounded text-xs text-gray-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span>{memberStats.total} total</span>
              {memberStats.online > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>{memberStats.online} online</span>
                </div>
              )}
              {!navigator.onLine && (
                <Badge variant="destructive" className="text-xs">
                  Offline
                </Badge>
              )}
            </div>
          </div>
          
          {/* Member breakdown */}
          <div className="mt-1 flex items-center space-x-2">
            {memberStats.owners > 0 && <span>{memberStats.owners} owner{memberStats.owners !== 1 ? 's' : ''}</span>}
            {memberStats.editors > 0 && <span>• {memberStats.editors} editor{memberStats.editors !== 1 ? 's' : ''}</span>}
            {memberStats.viewers > 0 && <span>• {memberStats.viewers} viewer{memberStats.viewers !== 1 ? 's' : ''}</span>}
          </div>
          
          {/* Auto-refresh status */}
          {autoRefreshEnabled && (
            <div className="mt-1 text-xs text-gray-500">
              Last sync: {Math.floor((Date.now() - lastRefresh.getTime()) / 1000)}s ago
            </div>
          )}
        </div>

        {/* Project Members List */}
        {isLoadingMembers ? (
          // Loading skeletons
          <>
            {[...Array(3)].map((_, index) => (
              <Card key={index} className="p-3 bg-gray-700 border-gray-600 animate-pulse mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-600 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-600 rounded w-24 mb-1" />
                    <div className="h-3 bg-gray-600 rounded w-16" />
                  </div>
                </div>
              </Card>
            ))}
          </>
        ) : projectMembers.length === 0 ? (
          // Empty state
          <Card className="p-4 bg-gray-700 border-gray-600 text-center">
            <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-400 mb-2">No collaborators yet</p>
            {canManageMembers && onInviteClick && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onInviteClick}
                className="border-gray-600 text-gray-300 hover:bg-gray-600"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Invite People
              </Button>
            )}
          </Card>
        ) : (
          // Members list
          <div className="space-y-2">
            {projectMembers.map((member) => (
              <Card 
                key={member.id} 
                className={`p-3 bg-gray-700 border-gray-600 transition-colors group ${
                  canManageMembers && member.user_id !== currentUser?.id ? 'cursor-pointer hover:bg-gray-600' : ''
                }`}
                onClick={() => handleMemberClick(member)}
                role={canManageMembers && member.user_id !== currentUser?.id ? "button" : undefined}
                tabIndex={canManageMembers && member.user_id !== currentUser?.id ? 0 : undefined}
                onKeyDown={(e) => {
                  if (canManageMembers && member.user_id !== currentUser?.id && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleMemberClick(member);
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: getAvatarColor(member) }}
                    >
                      {member.user?.avatar_url ? (
                        <img 
                          src={member.user.avatar_url} 
                          alt="Avatar" 
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        getInitials(member)
                      )}
                    </div>
                    {/* Online indicator (mock) */}
                    {Math.random() > 0.3 && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-white">
                        {getDisplayName(member)}
                        {member.user_id === currentUser?.id && ' (You)'}
                      </span>
                      {Math.random() > 0.8 && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          <div className="flex space-x-1 items-center">
                            <span>Typing</span>
                            <div className="flex space-x-1">
                              <div className="w-1 h-1 bg-green-600 rounded-full animate-pulse" />
                              <div className="w-1 h-1 bg-green-600 rounded-full animate-pulse delay-100" />
                              <div className="w-1 h-1 bg-green-600 rounded-full animate-pulse delay-200" />
                            </div>
                          </div>
                        </Badge>
                      )}
                    </div>
                    
                    {member.user?.email && (
                      <div className="text-xs text-gray-500 truncate">
                        {member.user.email}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs border-gray-500 ${getAccessLevelColor(member.role)}`}
                  >
                    <span>{getAccessLevelText(member.role)}</span>
                  </Badge>
                  
                  {canManageMembers && member.role !== 'owner' && member.user_id !== currentUser?.id && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 text-xs text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMemberClick(member);
                      }}
                    >
                      Manage
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Invite Button */}
        {canManageMembers && onInviteClick && (
          <div className="mt-3">
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={onInviteClick}
              disabled={isLoadingMembers}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Collaborator
            </Button>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-1">
            <div className="flex items-center space-x-2">
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: msg.color }}
              >
                <User className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-300">{msg.user}</span>
              <span className="text-xs text-gray-500">{msg.timestamp}</span>
              {msg.isOwn && (
                <div className="flex space-x-1 ml-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEditing(msg.id, msg.message)}
                    className="h-5 w-5 p-0 text-gray-400 hover:text-white"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMessage(msg.id)}
                    className="h-5 w-5 p-0 text-gray-400 hover:text-red-400"
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="ml-7">
              {editingMessage === msg.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white text-sm min-h-[60px]"
                  />
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => saveEdit(msg.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-6 text-xs"
                    >
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={cancelEdit}
                      className="text-gray-300 hover:text-white h-6 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-200">{msg.message}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 min-h-[40px] max-h-[100px] bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button
            onClick={sendMessage}
            disabled={!message.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;