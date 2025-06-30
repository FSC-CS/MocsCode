// Updated project-members.ts - Use helper functions to avoid RLS recursion

import { ApiClient } from './client';
import { ApiConfig, ApiResponse, ProjectMember, PaginatedResponse, PaginationParams, SortParams } from './types';

// Type for the RPC response
type ProjectAccess = {
  user_role: 'owner' | 'editor' | 'viewer';
};

export class ProjectMembersApi extends ApiClient {
  constructor(config: ApiConfig) {
    super(config, 'project_members');
  }

  async getMember(id: string): Promise<ApiResponse<ProjectMember>> {
    return this.get<ProjectMember>(id);
  }

  /**
   * FIXED: Use helper function to avoid RLS recursion
   */
  async listProjectMembers(
    projectId: string,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<ProjectMember & { user?: any }>> {
    const { page = 1, per_page = 50 } = pagination || {};

    try {
      // Use helper function that bypasses RLS issues
      const { data, error } = await this.client
        .rpc('get_project_members', { p_project_id: projectId });

      if (error) {
        console.error('Error fetching project members:', error);
        return {
          data: { items: [], total: 0, page, per_page },
          error: new Error(error.message)
        };
      }

      const members = (data || []).map((row: any) => ({
        id: row.id,
        project_id: row.project_id,
        user_id: row.user_id,
        role: row.role,
        joined_at: row.joined_at,
        user: row.user ? {
          id: row.user.id,
          email: row.user.email,
          name: row.user.name,
          avatar_url: row.user.avatar_url,
          created_at: row.user.created_at,
          updated_at: row.user.updated_at,
          last_active_at: row.user.last_active_at
        } : null
      }));

      // Filter out members without valid user data
      const validMembers = members.filter(member => {
        if (!member.user || !member.user.email) {
          console.warn(`Found member without valid user data:`, {
            memberId: member.id,
            userId: member.user_id,
            projectId: member.project_id
          });
          return false;
        }
        return true;
      });

      // Apply pagination
      const startIndex = (page - 1) * per_page;
      const paginatedMembers = validMembers.slice(startIndex, startIndex + per_page);

      return {
        data: {
          items: paginatedMembers,
          total: validMembers.length,
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
   * Add member - use direct insert since we have basic policies
   */
  async addMember(data: Omit<ProjectMember, 'id' | 'joined_at'>): Promise<ApiResponse<ProjectMember>> {
    try {
      // First, verify the user exists
      const { data: user, error: userError } = await this.client
        .from('users')
        .select('id, email, name, avatar_url, created_at, updated_at, last_active_at')
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
        .select()
        .single();

      if (insertError) {
        console.error('Error creating project member:', insertError);
        return {
          data: null,
          error: new Error(`Failed to add member: ${insertError.message}`)
        };
      }

      return {
        data: { ...newMember, user } as ProjectMember,
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
   * Invite by email - improved with better error handling
   */
  async inviteByEmail(
    projectId: string, 
    email: string, 
    role: 'editor' | 'viewer', 
    invitedBy: string
  ): Promise<ApiResponse<ProjectMember & { user?: any; isNewUser?: boolean }>> {
    try {
      // First, check if the user exists
      const { data: existingUser, error: userError } = await this.client
        .from('users')
        .select('id, email, name, avatar_url')
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

      // Add the user as a project member
      const addResult = await this.addMember({
        project_id: projectId,
        user_id: existingUser.id,
        role: role,
        permissions: {},
        invited_by: invitedBy
      });

      return addResult;

    } catch (error) {
      console.error('Unexpected error in inviteByEmail:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('An unexpected error occurred during invitation')
      };
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
      // Simple update since we're using basic policies
      const { data: updatedMember, error: updateError } = await this.client
        .from(this.table)
        .update({ 
          role: newRole,
        })
        .eq('id', memberId)
        .select()
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
      // Use our helper function
      const { data: access, error } = await this.client
        .rpc('check_project_access', { 
          p_project_id: projectId,
          p_user_id: userId 
        })
        .single();

      if (error) {
        return {
          data: false,
          error: new Error(`Failed to check permissions: ${error.message}`)
        };
      }

      const canManage = (access as { user_role: 'owner' | 'editor' | 'viewer' } | null)?.user_role === 'owner';

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
      const { data, error } = await this.client
        .rpc('get_project_members', { p_project_id: projectId });

      if (error) {
        return {
          data: 0,
          error: new Error(`Failed to get member count: ${error.message}`)
        };
      }

      return {
        data: (data || []).length,
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