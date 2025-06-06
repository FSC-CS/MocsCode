import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Edit,
  Eye,
  Crown,
  Trash2,
  Save,
  X,
  Loader2,
  Calendar,
  Mail,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useApi } from '@/contexts/ApiContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectMember } from '@/lib/api/types';

interface EnhancedMember extends ProjectMember {
  user?: {
    id: string;
    email: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface MemberManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: EnhancedMember | null;
  projectId: string;
  onMemberUpdated?: (updatedMember: EnhancedMember) => void;
  onMemberRemoved?: (removedMemberId: string) => void;
}

const MemberManagementDialog: React.FC<MemberManagementDialogProps> = ({
  isOpen,
  onClose,
  member,
  projectId,
  onMemberUpdated,
  onMemberRemoved,
}) => {
  const { toast } = useToast();
  const { projectMembersApi } = useApi();
  const { user } = useAuth();

  // State management
  const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer'>('viewer');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when member changes
  useEffect(() => {
    if (member && isOpen) {
      setSelectedRole(member.role as 'editor' | 'viewer');
      setHasChanges(false);
      checkManagementPermissions();
    }
  }, [member, isOpen]);

  // Check if current user can manage this member
  const checkManagementPermissions = async () => {
    if (!user || !projectId || !member) return;

    try {
      const { data, error } = await projectMembersApi.canManageMembers(projectId, user.id);
      if (!error && data) {
        // Can manage if user is project owner and member is not the owner
        setCanManage(data && member.role !== 'owner');
      } else {
        setCanManage(false);
      }
    } catch (error) {
      console.error('Error checking management permissions:', error);
      setCanManage(false);
    }
  };

  // Handle role change
  const handleRoleChange = (newRole: 'editor' | 'viewer') => {
    setSelectedRole(newRole);
    setHasChanges(newRole !== member?.role);
  };

  // Save permission changes
  const handleSaveChanges = async () => {
    if (!member || !user || !hasChanges) return;

    setIsUpdating(true);
    try {
      const { data, error } = await projectMembersApi.updatePermissions(
        member.id,
        selectedRole,
        user.id
      );

      if (error) {
        toast({
          title: 'Update Failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      if (data) {
        toast({
          title: 'Permissions Updated',
          description: `${getDisplayName(member)} now has ${selectedRole} access.`,
        });

        // Update the member data with new role
        const updatedMember = { ...member, role: selectedRole };
        
        if (onMemberUpdated) {
          onMemberUpdated(updatedMember);
        }

        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error updating member permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to update member permissions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle member removal
  const handleRemoveMember = async () => {
    if (!member || !user) return;

    setIsRemoving(true);
    try {
      const { error } = await projectMembersApi.removeMemberFromProject(member.id, user.id);

      if (error) {
        toast({
          title: 'Removal Failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Member Removed',
        description: `${getDisplayName(member)} has been removed from the project.`,
      });

      if (onMemberRemoved) {
        onMemberRemoved(member.id);
      }

      // Close dialogs
      setShowRemoveConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRemoving(false);
    }
  };

  // Helper functions
  const getDisplayName = (member: EnhancedMember): string => {
    if (!member.user) return 'Unknown User';
    return member.user.display_name || member.user.username || member.user.email.split('@')[0];
  };

  const getInitials = (member: EnhancedMember): string => {
    const name = getDisplayName(member);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (member: EnhancedMember): string => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ];
    const index = member.user_id
      ? member.user_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
      : 0;
    return colors[index];
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'editor':
        return <Edit className="h-4 w-4 text-green-500" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleDescription = (role: string): string => {
    switch (role) {
      case 'editor':
        return 'Can view, edit, and share the project';
      case 'viewer':
        return 'Can view and comment on the project';
      default:
        return '';
    }
  };

  const formatJoinDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Reset state when dialog closes
  const handleClose = () => {
    setShowRemoveConfirm(false);
    setHasChanges(false);
    onClose();
  };

  if (!member) return null;

  const isOwner = member.role === 'owner';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Manage Member</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Member Info Card */}
            <Card className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium"
                  style={{ backgroundColor: getAvatarColor(member) }}
                >
                  {member.user?.avatar_url ? (
                    <img
                      src={member.user.avatar_url}
                      alt="Avatar"
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    getInitials(member)
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{getDisplayName(member)}</h3>
                  {member.user?.email && (
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Mail className="h-3 w-3" />
                      <span>{member.user.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    Joined {formatJoinDate(member.joined_at)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="flex items-center space-x-1">
                    {getRoleIcon(member.role)}
                    <span className="capitalize">{member.role}</span>
                  </Badge>
                  {isOwner && (
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Protected
                    </Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* Permission Management */}
            {!isOwner && canManage ? (
              <div className="space-y-4">
                <Separator />
                
                <div>
                  <Label htmlFor="role-select" className="text-base font-medium">
                    Permission Level
                  </Label>
                  <p className="text-sm text-gray-500 mb-3">
                    Choose what this member can do in the project
                  </p>

                  <Select value={selectedRole} onValueChange={handleRoleChange}>
                    <SelectTrigger id="role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">
                        <div className="flex items-center space-x-2 py-1">
                          <Eye className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="font-medium">Viewer</div>
                            <div className="text-xs text-gray-500">
                              {getRoleDescription('viewer')}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="editor">
                        <div className="flex items-center space-x-2 py-1">
                          <Edit className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="font-medium">Editor</div>
                            <div className="text-xs text-gray-500">
                              {getRoleDescription('editor')}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : isOwner ? (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-start space-x-2">
                  <Crown className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Project Owner</h4>
                    <p className="text-sm text-yellow-700">
                      This member is the project owner and their permissions cannot be modified.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-4 bg-gray-50 border-gray-200">
                <div className="flex items-start space-x-2">
                  <Shield className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-800">Limited Access</h4>
                    <p className="text-sm text-gray-600">
                      You don't have permission to modify this member's role.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Danger Zone */}
            {!isOwner && canManage && (
              <div className="space-y-4">
                <Separator />
                
                <Card className="p-4 border-red-200 bg-red-50">
                  <div className="flex items-start space-x-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800">Remove Member</h4>
                      <p className="text-sm text-red-700">
                        This will remove {getDisplayName(member)} from the project permanently.
                        They will lose access to all project files and data.
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRemoveConfirm(true)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove from Project
                  </Button>
                </Card>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            
            {!isOwner && canManage && hasChanges && (
              <Button onClick={handleSaveChanges} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Remove Member?</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium">{getDisplayName(member)}</span> from this project?
              <br />
              <br />
              This action cannot be undone. They will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Lose access to all project files</li>
                <li>Be removed from all project discussions</li>
                <li>Need to be re-invited to regain access</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Member
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MemberManagementDialog;