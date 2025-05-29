
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, User, Edit, Trash } from 'lucide-react';

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

interface ChatPanelProps {
  collaborators: Collaborator[];
}

const ChatPanel = ({ collaborators }: ChatPanelProps) => {
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
      case 'edit': return 'Edit';
      case 'view': return 'View';
      default: return 'View';
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'owner': return 'bg-yellow-100 text-yellow-800';
      case 'edit': return 'bg-green-100 text-green-800';
      case 'view': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Collaborators List */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Collaborators ({collaborators.length + 1})</h3>
        
        {/* Current User */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm text-white">You</span>
            </div>
            <Badge className={getAccessLevelColor('owner')}>
              {getAccessLevelText('owner')}
            </Badge>
          </div>
        </div>

        {/* Other Collaborators */}
        <div className="space-y-2">
          {collaborators.map((collaborator) => (
            <div key={collaborator.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: collaborator.color }}
                >
                  <User className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm text-white">{collaborator.name}</span>
                {collaborator.isTyping && (
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" />
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse delay-100" />
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse delay-200" />
                  </div>
                )}
              </div>
              <Badge className={getAccessLevelColor(collaborator.accessLevel)}>
                {getAccessLevelText(collaborator.accessLevel)}
              </Badge>
            </div>
          ))}
        </div>
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
