// Fixed project-members.ts - Handles the "Unknown User" issue

import { ApiClient } from './client';
import { ApiConfig, ApiResponse, ProjectMember, PaginatedResponse, PaginationParams, SortParams } from './types';

export class ProjectMembersApi extends ApiClient {
  constructor(config: ApiConfig) {
    super(config, 'project_members');
  }

  async getMember(id: string): Promise<ApiResponse<ProjectMember>> {
    return this.get<ProjectMember>(id);
  }

  /**
   * FIXED: Better member listing with proper user data fetching
   */
  async listProjectMembers(
    projectId: string,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<ProjectMember & { user?: any }>> {
    const { page = 1, per_page = 50 } = pagination || {};
    const start = (page - 1) * per_page;

    try {
      let query = this.client
        .from(this.table)
        .select(`
          *,
          user:users!project_members_user_id_fkey(
            id,
            email,
            username,
            display_name,
            avatar_url
          )
        `, { count: 'exact' })
        .eq('project_id', projectId);

      // Apply sorting
      if (sort) {
        query = query.order(sort.field, { ascending: sort.direction === 'asc' });
      } else {
        // Default sort: owners first, then by join date
        query = query.order('role', { ascending: false }).order('joined_at', { ascending: true });
      }

      // Apply pagination
      query = query.range(start, start + per_page - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching project members:', error);
        return {
          data: { items: [], total: 0, page, per_page },
          error: new Error(error.message)
        };
      }

      // FIXED: Filter out members without valid user data and log issues
      const validMembers = (data || []).filter(member => {
        if (!member.user || !member.user.email) {
          console.warn(`Found member without valid user data:`, {
            memberId: member.id,
            userId: member.user_id,
            projectId: member.project_id,
            userData: member.user
          });
          
          // Try to clean up orphaned member records
          this.cleanupOrphanedMember(member.id, member.user_id);
          return false;
        }
        return true;
      });

      // Log if we filtered out any members
      if (validMembers.length !== (data || []).length) {
        console.log(`Filtered out ${(data || []).length - validMembers.length} invalid members from project ${projectId}`);
      }

      return {
        data: {
          items: validMembers as (ProjectMember & { user?: any })[],
          total: validMembers.length, // Use filtered count
          page,
          per_page,
        },
        error: null,
      };
    } catch (error) {
      console.error('Unexpected error in listProjectMembers:', error);
      return {
        data: { items: [], total: 0, page: 1, per_page: 50 },
        error: error instanceof Error ? error : new Error('An unexpected error occurred')
      };
    }
  }

  /**
   * FIXED: Better member addition with user validation
   */
  async addMember(data: Omit<ProjectMember, 'id' | 'joined_at'>): Promise<ApiResponse<ProjectMember>> {
    try {
      // First, verify the user exists in the users table
      const { data: user, error: userError } = await this.client
        .from('users')
        .select('id, email, username, display_name, avatar_url')
        .eq('id', data.user_id)
        .single();

      if (userError || !user) {
        console.error('User not found when adding member:', userError, data.user_id);
        return {
          data: null,
          error: new Error('User not found. Please ensure the user exists before adding them as a member.')
        };
      }

      // Check if member already exists
      const { data: existingMember, error: checkError } = await this.client
        .from(this.table)
        .select('id')
        .eq('project_id', data.project_id)
        .eq('user_id', data.user_id)
        .single();

      if (existingMember) {
        return {
          data: null,
          error: new Error('User is already a member of this project')
        };
      }

      // Add the member
      const memberData = {
        ...data,
        joined_at: new Date().toISOString()
      };

      const { data: newMember, error: insertError } = await this.client
        .from(this.table)
        .insert([memberData])
        .select(`
          *,
          user:users!project_members_user_id_fkey(
            id,
            email,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (insertError) {
        console.error('Error creating project member:', insertError);
        return {
          data: null,
          error: new Error(`Failed to add member: ${insertError.message}`)
        };
      }

      console.log('Successfully added member:', newMember?.user?.email);
      return {
        data: newMember as ProjectMember,
        error: null
      };

    } catch (error) {
      console.error('Unexpected error in addMember:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('An unexpected error occurred')
      };
    }
  }

  /**
   * FIXED: Improved invite by email with better error handling
   */
  async inviteByEmail(
    projectId: string, 
    email: string, 
    role: 'editor' | 'viewer', 
    invitedBy: string
  ): Promise<ApiResponse<ProjectMember & { user?: any; isNewUser?: boolean }>> {
    try {
      // First, check if the user exists in the system
      const { data: existingUser, error: userError } = await this.client
        .from('users')
        .select('id, email, username, display_name, avatar_url')
        .eq('email', email)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error checking for existing user:', userError);
        return {
          data: null,
          error: new Error(`Failed to check user existence: ${userError.message}`)
        };
      }

      if (!existingUser) {
        return {
          data: null,
          error: new Error('User not found. They need to create an account first before being added to projects.')
        };
      }

      // Check if user is already a member of this project
      const { data: existingMember, error: memberCheckError } = await this.client
        .from(this.table)
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', existingUser.id)
        .single();

      if (memberCheckError && memberCheckError.code !== 'PGRST116') {
        console.error('Error checking existing membership:', memberCheckError);
        return {
          data: null,
          error: new Error(`Failed to check membership: ${memberCheckError.message}`)
        };
      }

      if (existingMember) {
        return {
          data: null,
          error: new Error('User is already a member of this project')
        };
      }

      // Add the user as a project member using the addMember method
      const addResult = await this.addMember({
        project_id: projectId,
        user_id: existingUser.id,
        role: role,
        permissions: {},
        invited_by: invitedBy
      });

      if (addResult.error) {
        return addResult;
      }

      console.log(`User ${email} successfully added to project ${projectId} with role ${role}`);

      return {
        data: addResult.data as ProjectMember & { user?: any },
        error: null
      };

    } catch (error) {
      console.error('Unexpected error in inviteByEmail:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('An unexpected error occurred during invitation')
      };
    }
  }

  /**
   * Clean up orphaned member records (members without valid user data)
   */
  private async cleanupOrphanedMember(memberId: string, userId: string): Promise<void> {
    try {
      console.log(`Attempting to clean up orphaned member: ${memberId} for user: ${userId}`);
      
      // Double-check if the user exists
      const { data: user, error: userError } = await this.client
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        // User definitely doesn't exist, remove the member record
        console.log(`Removing orphaned member record ${memberId} - user ${userId} not found`);
        
        const { error: deleteError } = await this.client
          .from(this.table)
          .delete()
          .eq('id', memberId);

        if (deleteError) {
          console.error('Failed to delete orphaned member:', deleteError);
        } else {
          console.log(`Successfully cleaned up orphaned member ${memberId}`);
        }
      } else {
        console.log(`User ${userId} exists, member ${memberId} may have temporary sync issue`);
      }
    } catch (error) {
      console.error('Error during cleanup of orphaned member:', error);
    }
  }

  async updateMember(id: string, data: Partial<ProjectMember>): Promise<ApiResponse<ProjectMember>> {
    return this.update<ProjectMember>(id, data);
  }

  async removeMember(id: string): Promise<ApiResponse<null>> {
    return this.delete(id);
  }

  async getUserRole(projectId: string, userId: string): Promise<ApiResponse<ProjectMember>> {
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return {
      data: data as ProjectMember,
      error: error as Error | null,
    };
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    role: 'editor' | 'viewer'
  ): Promise<ApiResponse<ProjectMember>> {
    const { data, error } = await this.client
      .from(this.table)
      .update({ role })
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .select()
      .single();

    return {
      data: data as ProjectMember,
      error: error as Error | null,
    };
  }

  async updatePermissions(
    memberId: string, 
    newRole: 'editor' | 'viewer',
    updatedBy: string
  ): Promise<ApiResponse<ProjectMember>> {
    try {
      // First, get the member to check the project and current role
      const { data: member, error: memberError } = await this.client
        .from(this.table)
        .select(`
          *,
          project:projects(
            id,
            owner_id
          )
        `)
        .eq('id', memberId)
        .single();

      if (memberError) {
        console.error('Error fetching member for permission update:', memberError);
        return {
          data: null,
          error: new Error(`Member not found: ${memberError.message}`)
        };
      }

      // Check if the updater is the project owner
      const project = (member as any).project;
      if (project.owner_id !== updatedBy) {
        return {
          data: null,
          error: new Error('Only project owners can modify member permissions')
        };
      }

      // Prevent changing the owner's role
      if (member.role === 'owner') {
        return {
          data: null,
          error: new Error('Cannot modify project owner permissions')
        };
      }

      // Update the member's role
      const { data: updatedMember, error: updateError } = await this.client
        .from(this.table)
        .update({ 
          role: newRole,
          permissions: { ...member.permissions, updated_at: new Date().toISOString() }
        })
        .eq('id', memberId)
        .select(`
          *,
          user:users!project_members_user_id_fkey(
            id,
            email,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (updateError) {
        console.error('Error updating member permissions:', updateError);
        return {
          data: null,
          error: new Error(`Failed to update permissions: ${updateError.message}`)
        };
      }

      return {
        data: updatedMember as ProjectMember,
        error: null
      };

    } catch (error) {
      console.error('Unexpected error in updatePermissions:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('An unexpected error occurred during permission update')
      };
    }
  }

  async removeMemberFromProject(
    memberId: string,
    removedBy: string
  ): Promise<ApiResponse<null>> {
    try {
      // First, get the member to check the project and current role
      const { data: member, error: memberError } = await this.client
        .from(this.table)
        .select(`
          *,
          project:projects(
            id,
            owner_id
          )
        `)
        .eq('id', memberId)
        .single();

      if (memberError) {
        console.error('Error fetching member for removal:', memberError);
        return {
          data: null,
          error: new Error(`Member not found: ${memberError.message}`)
        };
      }

      // Check if the remover is the project owner
      const project = (member as any).project;
      if (project.owner_id !== removedBy) {
        return {
          data: null,
          error: new Error('Only project owners can remove members')
        };
      }

      // Prevent removing the owner
      if (member.role === 'owner') {
        return {
          data: null,
          error: new Error('Cannot remove project owner')
        };
      }

      // Remove the member
      const { error: deleteError } = await this.client
        .from(this.table)
        .delete()
        .eq('id', memberId);

      if (deleteError) {
        console.error('Error removing member:', deleteError);
        return {
          data: null,
          error: new Error(`Failed to remove member: ${deleteError.message}`)
        };
      }

      return {
        data: null,
        error: null
      };

    } catch (error) {
      console.error('Unexpected error in removeMemberFromProject:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('An unexpected error occurred during member removal')
      };
    }
  }

  async canManageMembers(projectId: string, userId: string): Promise<ApiResponse<boolean>> {
    try {
      // Check if user is the project owner
      const { data: project, error: projectError } = await this.client
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .single();

      if (projectError) {
        return {
          data: false,
          error: new Error(`Project not found: ${projectError.message}`)
        };
      }

      const canManage = project.owner_id === userId;

      return {
        data: canManage,
        error: null
      };

    } catch (error) {
      console.error('Unexpected error in canManageMembers:', error);
      return {
        data: false,
        error: error instanceof Error ? error : new Error('An unexpected error occurred')
      };
    }
  }

  async getMemberCount(projectId: string): Promise<ApiResponse<number>> {
    try {
      const { count, error } = await this.client
        .from(this.table)
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      if (error) {
        return {
          data: 0,
          error: new Error(`Failed to get member count: ${error.message}`)
        };
      }

      return {
        data: count || 0,
        error: null
      };

    } catch (error) {
      console.error('Unexpected error in getMemberCount:', error);
      return {
        data: 0,
        error: error instanceof Error ? error : new Error('An unexpected error occurred')
      };
    }
  }
}