import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Crown, Eye, Edit, Loader2, AlertCircle, UserPlus } from 'lucide-react';
import { useApi } from '@/contexts/ApiContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { ProjectMember } from '@/lib/api/types';

interface EnhancedCollaborator extends ProjectMember {
  user?: {
    id: string;
    email: string;
    username: string;
    display_name?: string;
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
}

const CollaboratorPanel: React.FC<CollaboratorPanelProps> = ({ 
  projectId, 
  onMemberClick, 
  onInviteClick,
  refreshTrigger 
}) => {
  const { projectMembersApi } = useApi();
  const { user, dbUser } = useAuth();
  const { toast } = useToast();

  // State management
  const [collaborators, setCollaborators] = useState<EnhancedCollaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [canManageMembers, setCanManageMembers] = useState(false);

  // Load collaborators when component mounts or projectId changes
  useEffect(() => {
    if (projectId && user) {
      loadCollaborators();
      checkManagementPermissions();
    }
  }, [projectId, user]);

  // Refresh when refreshTrigger prop changes (e.g., after adding new member)
  useEffect(() => {
    if (refreshTrigger && projectId && user) {
      loadCollaborators();
    }
  }, [refreshTrigger]);

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
          variant: 'destructive'
        });
        return;
      }

      const members = data?.items || [];
      
      // Transform members to include mock real-time data for now
      // In a real implementation, this would come from a WebSocket or real-time service
      const enhancedMembers: EnhancedCollaborator[] = members.map(member => ({
        ...member,
        isOnline: Math.random() > 0.3, // Mock online status
        cursor: Math.random() > 0.7 ? { 
          line: Math.floor(Math.random() * 50) + 1, 
          column: Math.floor(Math.random() * 80) + 1 
        } : null,
        isTyping: Math.random() > 0.8 // Mock typing status
      }));

      setCollaborators(enhancedMembers);
      setMemberCount(data?.total || 0);

    } catch (error) {
      console.error('Unexpected error loading collaborators:', error);
      setError('An unexpected error occurred');
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while loading collaborators',
        variant: 'destructive'
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
    return member.user.display_name || member.user.username || member.user.email.split('@')[0];
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

  const currentUser = getCurrentUser();
  const otherCollaborators = getOtherCollaborators();

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">
            Collaborators
            {!isLoading && (
              <span className="ml-2 text-xs text-gray-500">({memberCount})</span>
            )}
          </h3>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>
        
        {/* Current User */}
        {isLoading ? (
          <Card className="p-3 bg-gray-700 border-gray-600 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-600 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-600 rounded w-16 mb-1" />
                <div className="h-3 bg-gray-600 rounded w-20" />
              </div>
            </div>
          </Card>
        ) : currentUser ? (
          <Card className="p-3 bg-gray-700 border-gray-600">
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: getAvatarColor(currentUser) }}
              >
                {currentUser.user?.avatar_url ? (
                  <img 
                    src={currentUser.user.avatar_url} 
                    alt="Avatar" 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  getInitials(currentUser)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-white">You</span>
                  {getRoleIcon(currentUser.role)}
                </div>
                <span className="text-xs text-gray-400">{getRoleText(currentUser.role)}</span>
              </div>
            </div>
          </Card>
        ) : error ? (
          <Card className="p-3 bg-red-900/20 border-red-700">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Failed to load your role</span>
            </div>
          </Card>
        ) : null}
      </div>

      {/* Other Collaborators */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
        ) : otherCollaborators.length === 0 ? (
          // Empty state
          <Card className="p-4 bg-gray-700 border-gray-600 text-center">
            <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-400 mb-2">No other collaborators yet</p>
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
          // Collaborators list
          otherCollaborators.map((collaborator) => (
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
                      <img 
                        src={collaborator.user.avatar_url} 
                        alt="Avatar" 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      getInitials(collaborator)
                    )}
                  </div>
                  {/* Online indicator */}
                  {collaborator.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white">
                      {getDisplayName(collaborator)}
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

      {/* Invite Button */}
      {canManageMembers && onInviteClick && (
        <div className="p-4 border-t border-gray-700">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={onInviteClick}
            disabled={isLoading}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Collaborator
          </Button>
        </div>
      )}
    </div>
  );
};

export default CollaboratorPanel;