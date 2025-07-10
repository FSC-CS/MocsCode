import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Crown, Eye, Edit, Loader2, AlertCircle, UserPlus, Wifi } from 'lucide-react';
import { useApi } from '@/contexts/ApiContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { ProjectMember } from '@/lib/api/types';
import { presenceService } from '@/lib/presence';
import { UserAvatar } from '@/components/UserAvatar';

interface EnhancedCollaborator extends ProjectMember {
  user?: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
  };
  isOnline?: boolean;
  cursor?: { line: number; column: number } | null;
  isTyping?: boolean;
}

interface CollaboratorPanelProps {
  projectId: string;
  onMemberClick?: (member: EnhancedCollaborator) => void;
  onInviteClick?: () => void;
  refreshTrigger?: number; // Optional prop to trigger refresh from parent
  onlineUsers?: Set<string>; // Track online users from parent
}

const CollaboratorPanel: React.FC<CollaboratorPanelProps> = ({ 
  projectId, 
  onMemberClick, 
  onInviteClick,
  refreshTrigger,
  onlineUsers
}) => {
  const { projectMembersApi } = useApi();
  const { user, dbUser } = useAuth();
  const { toast } = useToast();

  // State management
  const [collaborators, setCollaborators] = React.useState<EnhancedCollaborator[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [canManageMembers, setCanManageMembers] = React.useState<boolean>(false);

  // Update collaborator online status when onlineUsers prop changes
  React.useEffect(() => {
    if (!onlineUsers) return;
    
    setCollaborators(prev => 
      prev.map(collab => ({
        ...collab,
        isOnline: collab.user_id ? onlineUsers.has(collab.user_id) : false
      }))
    );
  }, [onlineUsers]);

  // Load collaborators when component mounts or projectId changes
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!projectId || !user) return;
      
      await loadCollaborators();
      await checkManagementPermissions();
    };

    loadData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [projectId, user]);

  // Refresh when refreshTrigger prop changes (e.g., after adding new member)
  useEffect(() => {
    if (refreshTrigger && projectId && user) {
      loadCollaborators();
    }
  }, [refreshTrigger, projectId, user]);

  const loadCollaborators = async () => {
    if (!user || !projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await projectMembersApi.listProjectMembers(
        projectId,
        { page: 1, per_page: 50 }, // Get all members
        { field: 'role', direction: 'desc' } // Sort owners first
      );

      if (apiError) {
        console.error('Error loading collaborators:', apiError);
        setError('Failed to load collaborators');
        toast({
          title: 'Error',
          description: 'Failed to load project collaborators',
          variant: 'destructive' as const
        });
        return;
      }

      const members = data?.items || [];
      
      // Transform members to include real-time data
      const enhancedMembers: EnhancedCollaborator[] = members.map(member => {
        const isOnline = presenceService.isUserOnline(member.user_id);
        
        return {
          ...member,
          isOnline,
          cursor: null, // Will be updated via presence updates
          isTyping: false // Will be updated via presence updates
        };
      });

      setCollaborators(enhancedMembers);
      
      // The current user's online status is now managed by the parent component
      // via the onlineUsers prop
    } catch (error) {
      console.error('Unexpected error loading collaborators:', error);
      setError('An unexpected error occurred');
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while loading collaborators',
        variant: 'destructive' as const
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkManagementPermissions = async () => {
    if (!user || !projectId) return;

    try {
      const { data, error } = await projectMembersApi.canManageMembers(projectId, user.id);
      if (!error && data) {
        setCanManageMembers(data);
      }
    } catch (error) {
      console.error('Error checking management permissions:', error);
      // Default to false if we can't check permissions
      setCanManageMembers(false);
    }
  };

  const getCurrentUser = (): EnhancedCollaborator | null => {
    return collaborators.find(member => member.user_id === user?.id) || null;
  };

  const getOtherCollaborators = (): EnhancedCollaborator[] => {
    return collaborators.filter(member => member.user_id !== user?.id);
  };

  const getDisplayName = (member: EnhancedCollaborator): string => {
    if (!member.user) return 'Unknown User';
    return member.user.name || member.user.email.split('@')[0];
  };

  const getInitials = (member: EnhancedCollaborator): string => {
    const name = getDisplayName(member);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (member: EnhancedCollaborator): string => {
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3 text-yellow-400" />;
      case 'editor':
        return <Edit className="h-3 w-3" />;
      case 'viewer':
        return <Eye className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getRoleText = (role: string): string => {
    switch (role) {
      case 'owner':
        return 'Project Owner';
      case 'editor':
        return 'Edit Access';
      case 'viewer':
        return 'View Access';
      default:
        return 'Unknown Role';
    }
  };

  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'editor':
        return 'bg-green-100 text-green-800';
      case 'viewer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleMemberClick = (member: EnhancedCollaborator) => {
    // Only allow clicking if user can manage members and it's not themselves
    if (canManageMembers && member.user_id !== user?.id && onMemberClick) {
      onMemberClick(member);
    }
  };

  const handleRetry = () => {
    loadCollaborators();
  };

  const allCollaborators = React.useMemo(() => {
    const current = getCurrentUser();
    const others = getOtherCollaborators();
    return current ? [current, ...others] : others;
  }, [collaborators]);

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="text-sm font-medium text-gray-300">
              Collaborators
            </h3>
            {!isLoading && (
              <div className="flex items-center ml-2">
                <Wifi className="h-3 w-3 text-green-400 mr-1" />
                <span className="text-xs text-green-400">{onlineUsers.size} online</span>
              </div>
            )}
          </div>
          
          {onInviteClick && canManageMembers && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-gray-700"
              onClick={onInviteClick}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Invite
            </Button>
          )}
          
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-2" />}
        </div>
      </div>

      {/* Collaborators List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          // Loading skeletons
          <>
            {[...Array(3)].map((_, index) => (
              <Card key={index} className="p-3 bg-gray-700 border-gray-600 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-600 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-600 rounded w-24 mb-1" />
                    <div className="h-3 bg-gray-600 rounded w-16" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="h-6 bg-gray-600 rounded w-20" />
                  <div className="h-6 bg-gray-600 rounded w-16" />
                </div>
              </Card>
            ))}
          </>
        ) : error ? (
          // Error state
          <Card className="p-4 bg-red-900/20 border-red-700 text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRetry}
              className="border-red-700 text-red-400 hover:bg-red-900/30"
            >
              Try Again
            </Button>
          </Card>
        ) : (
          // Collaborators list
          allCollaborators.map((collaborator) => (
            <Card 
              key={collaborator.id} 
              className={`p-3 bg-gray-700 border-gray-600 transition-colors group ${
                canManageMembers ? 'cursor-pointer hover:bg-gray-600' : ''
              }`}
              onClick={() => handleMemberClick(collaborator)}
              role={canManageMembers ? "button" : undefined}
              tabIndex={canManageMembers ? 0 : undefined}
              onKeyDown={(e) => {
                if (canManageMembers && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleMemberClick(collaborator);
                }
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: getAvatarColor(collaborator) }}
                  >
                    {collaborator.user?.avatar_url ? (
                      <UserAvatar 
                        avatar_url={collaborator.user.avatar_url} 
                        size="sm"
                      />
                    ) : (
                      getInitials(collaborator)
                    )}
                  </div>
                  {/* Online indicator */}
                  {onlineUsers.has(collaborator.user_id) && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${collaborator.user_id === user?.id ? 'text-blue-400' : 'text-white'}`}>
                      {collaborator.user_id === user?.id ? 'You' : getDisplayName(collaborator)}
                    </span>
                    {collaborator.isTyping && (
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
                  
                  {collaborator.cursor && (
                    <span className="text-xs text-gray-400">
                      Line {collaborator.cursor.line}, Col {collaborator.cursor.column}
                    </span>
                  )}
                  
                  {collaborator.user?.email && (
                    <div className="text-xs text-gray-500 truncate">
                      {collaborator.user.email}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs border-gray-500 ${getRoleBadgeColor(collaborator.role)}`}
                >
                  {getRoleIcon(collaborator.role)}
                  <span className="ml-1">{getRoleText(collaborator.role)}</span>
                </Badge>
                
                {canManageMembers && collaborator.role !== 'owner' && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 text-xs text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMemberClick(collaborator);
                    }}
                  >
                    Manage
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CollaboratorPanel;