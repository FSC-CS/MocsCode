import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
}

interface MemberManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  onRoleChange: (memberId: string, newRole: 'owner' | 'editor' | 'viewer') => void;
  onRemove: (memberId: string) => void;
  isCurrentUserOwner: boolean;
  isCurrentUser: boolean;
}

const MemberManagementDialog: React.FC<MemberManagementDialogProps> = ({
  open,
  onOpenChange,
  member,
  onRoleChange,
  onRemove,
  isCurrentUserOwner,
  isCurrentUser,
}) => {
  if (!member) return null;

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onRoleChange(member.id, e.target.value as 'owner' | 'editor' | 'viewer');
  };

  const handleRemove = () => {
    onRemove(member.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Member</DialogTitle>
          <DialogDescription>
            {member.name} - {member.email}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Role</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={member.role}
              onChange={handleRoleChange}
              disabled={!isCurrentUserOwner || isCurrentUser}
            >
              <option value="owner">Owner</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          
          {isCurrentUserOwner && !isCurrentUser && (
            <Button
              variant="destructive"
              onClick={handleRemove}
              className="w-full"
            >
              Remove from project
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberManagementDialog;