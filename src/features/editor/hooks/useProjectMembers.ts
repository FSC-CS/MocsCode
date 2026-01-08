import { useState, useCallback, useEffect, useRef } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import type { EnhancedMember, MemberOperationStatus, UserRole } from '../types';

interface UseProjectMembersProps {
  projectId: string | undefined;
}

interface UseProjectMembersReturn {
  projectMembers: EnhancedMember[];
  currentUserRole: UserRole;
  isLoadingMembers: boolean;
  memberOperationStatus: MemberOperationStatus;
  autoRefreshEnabled: boolean;
  memberRefreshTrigger: number;
  loadProjectMembers: (silent?: boolean) => Promise<void>;
  forceRefreshMembers: () => void;
  setAutoRefreshEnabled: (enabled: boolean) => void;
  handleMemberUpdated: (updatedMember: EnhancedMember) => Promise<void>;
  handleMemberRemoved: (removedMemberId: string) => Promise<void>;
  handleMemberAdded: (newMember: any) => Promise<void>;
  setMemberRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
}

export function useProjectMembers({ projectId }: UseProjectMembersProps): UseProjectMembersReturn {
  const { user } = useAuth();
  const { projectMembersApi } = useApi();
  const { toast } = useToast();

  const [projectMembers, setProjectMembers] = useState<EnhancedMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [memberRefreshTrigger, setMemberRefreshTrigger] = useState(0);
  const [memberOperationStatus, setMemberOperationStatus] = useState<MemberOperationStatus>({ 
    type: 'idle' 
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadProjectMembers = useCallback(async (silent: boolean = false) => {
    if (!projectId || !user?.id) return;

    if (!silent) {
      setIsLoadingMembers(true);
    }
    
    try {
      const { data, error } = await projectMembersApi.listProjectMembers(
        projectId,
        { page: 1, per_page: 50 },
        { field: 'role', direction: 'desc' }
      );

      if (error) {
        console.error('Error loading project members:', error);
        if (!silent) {
          toast({
            title: 'Error',
            description: 'Failed to load project collaborators',
            variant: 'destructive'
          });
        }
        return;
      }

      const members: EnhancedMember[] = (data?.items || []).map((member: any) => ({
        ...member,
        user: member.user || {
          id: member.user_id,
          name: member.name || 'Unknown User',
          email: member.email || '',
          username: member.username || ''
        },
        isOnline: false,
        lastSeen: new Date().toISOString()
      }));
      
      setProjectMembers(prevMembers => {
        const prevMembersStr = JSON.stringify(prevMembers);
        const newMembersStr = JSON.stringify(members);
        return prevMembersStr === newMembersStr ? prevMembers : members;
      });

      const currentMember = members.find(m => m.user_id === user.id);
      if (currentMember) {
        setCurrentUserRole(currentMember.role);
      }

    } catch (error) {
      console.error('Unexpected error loading members:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'An unexpected error occurred while loading members',
          variant: 'destructive'
        });
      }
    } finally {
      if (!silent) {
        setIsLoadingMembers(false);
      }
    }
  }, [projectId, user?.id, projectMembersApi, toast]);

  // Load members on mount
  useEffect(() => {
    if (projectId && user?.id) {
      loadProjectMembers();
    }
  }, [projectId, user?.id, loadProjectMembers]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefreshEnabled || !projectId || !user?.id) {
      return;
    }

    const intervalId = setInterval(() => {
      if (memberOperationStatus.type === 'idle') {
        loadProjectMembers(true);
      }
    }, 30000);

    refreshIntervalRef.current = intervalId;
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefreshEnabled, projectId, user?.id, memberOperationStatus.type, loadProjectMembers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const forceRefreshMembers = useCallback(() => {
    setMemberRefreshTrigger(prev => prev + 1);
    toast({
      title: 'Refreshing',
      description: 'Updating collaborator list...'
    });
  }, [toast]);

  const handleMemberUpdated = useCallback(async (updatedMember: EnhancedMember) => {
    if (!projectId || !updatedMember?.id) return;
    
    setMemberOperationStatus({ type: 'updating', memberId: updatedMember.id });
    
    const originalMembers = [...projectMembers];
    setProjectMembers(prev => 
      prev.map(member => 
        member.id === updatedMember.id ? updatedMember : member
      )
    );

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadProjectMembers(true);
      
      toast({
        title: 'Success',
        description: `${updatedMember.user?.name || 'Member'} permissions updated successfully`,
        duration: 3000
      });
    } catch (error) {
      setProjectMembers(originalMembers);
      toast({
        title: 'Update Failed',
        description: 'Failed to update member permissions. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setMemberOperationStatus({ type: 'idle' });
    }
  }, [projectId, projectMembers, loadProjectMembers, toast]);

  const handleMemberRemoved = useCallback(async (removedMemberId: string) => {
    if (!projectId || !removedMemberId) return;
    
    setMemberOperationStatus({ type: 'removing', memberId: removedMemberId });
    
    const removedMember = projectMembers.find(m => m.id === removedMemberId);
    const originalMembers = [...projectMembers];
    setProjectMembers(prev => 
      prev.filter(member => member.id !== removedMemberId)
    );

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadProjectMembers(true);
      
      toast({
        title: 'Success',
        description: `${removedMember?.user?.name || 'Member'} removed from project`,
        duration: 3000
      });
    } catch (error) {
      setProjectMembers(originalMembers);
      toast({
        title: 'Removal Failed',
        description: 'Failed to remove member. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setMemberOperationStatus({ type: 'idle' });
    }
  }, [projectId, projectMembers, loadProjectMembers, toast]);

  const handleMemberAdded = useCallback(async (newMember: any) => {
    setMemberOperationStatus({ type: 'adding', memberId: newMember?.user_id });
    
    try {
      await loadProjectMembers();
      
      toast({
        title: 'Collaborator Added',
        description: `${newMember?.user?.email || 'New member'} has been added to the project`,
        duration: 4000
      });
      
      setAutoRefreshEnabled(true);
      setTimeout(() => {
        if (memberOperationStatus.type === 'idle') {
          setAutoRefreshEnabled(true);
        }
      }, 10000);
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh member list after addition',
        variant: 'destructive'
      });
    } finally {
      setMemberOperationStatus({ type: 'idle' });
    }
  }, [loadProjectMembers, memberOperationStatus.type, toast]);

  return {
    projectMembers,
    currentUserRole,
    isLoadingMembers,
    memberOperationStatus,
    autoRefreshEnabled,
    memberRefreshTrigger,
    loadProjectMembers,
    forceRefreshMembers,
    setAutoRefreshEnabled,
    handleMemberUpdated,
    handleMemberRemoved,
    handleMemberAdded,
    setMemberRefreshTrigger,
  };
}
