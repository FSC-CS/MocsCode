// Updated projects.ts - Compatible with simplified RLS policies

import { ApiClient } from './client';
import { ApiConfig, ApiResponse, Project, PaginatedResponse, PaginationParams, SortParams } from './types';

export class ProjectsApi extends ApiClient {
  constructor(config: ApiConfig) {
    super(config, 'projects');
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    return this.get<Project>(id);
  }

  async listProjects(
    pagination?: PaginationParams,
    sort?: SortParams,
    filters?: { owner_id?: string; isPublic?: boolean }
  ): Promise<PaginatedResponse<Project>> {
    return this.list<Project>(pagination, sort, filters);
  }

  async createProject(data: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Project>> {
    try {
      const { data: project, error } = await this.client
        .from(this.table)
        .insert([
          {
            name: data.name,
            description: data.description,
            owner_id: data.owner_id,
            is_public: data.is_public,
            template_id: data.template_id
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Project creation error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return { data: null, error: new Error(error.message) };
      }

      return { data: project as Project, error: null };
    } catch (error) {
      console.error('Unexpected error in createProject:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('An unexpected error occurred')
      };
    }
  }

  async updateProject(id: string, data: Partial<Project>): Promise<ApiResponse<Project>> {
    return this.update<Project>(id, data);
  }

  async deleteProject(id: string): Promise<ApiResponse<null>> {
    return this.delete(id);
  }

  /**
   * NEW APPROACH: Get user projects using simplified logic
   * This works with the new RLS policies that avoid recursion
   */
  async listUserProjects(
    userId: string,
    pagination: PaginationParams = { page: 1, per_page: 50 },
    sort?: SortParams
  ): Promise<PaginatedResponse<Project>> {
    try {
      const { page = 1, per_page = 50 } = pagination;
      
      console.log('Loading projects for user:', userId);

      // STEP 1: Get projects owned by the user (this will work with simplified RLS)
      const { data: ownedProjects, error: ownedError } = await this.client
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .order('updated_at', { ascending: false });

      if (ownedError) {
        console.error('Error loading owned projects:', ownedError);
        return {
          data: { items: [], total: 0, page, per_page },
          error: new Error(ownedError.message)
        };
      }

      // STEP 2: Get projects where user is a member (using the helper function)
      const { data: membershipData, error: memberError } = await this.client
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);

      let memberProjects: any[] = [];
      if (!memberError && membershipData && membershipData.length > 0) {
        const ownedProjectIds = (ownedProjects || []).map(p => p.id);
        const memberProjectIds = membershipData
          .map(m => m.project_id)
          .filter(id => !ownedProjectIds.includes(id)); // Exclude owned projects

        if (memberProjectIds.length > 0) {
          // Get project details for member projects
          // This uses a separate query to avoid RLS recursion
          const { data: memberProjectsData, error: memberProjectsError } = await this.client
            .from('projects')
            .select('*')
            .in('id', memberProjectIds)
            .order('updated_at', { ascending: false });

          if (!memberProjectsError) {
            memberProjects = memberProjectsData || [];
          } else {
            console.warn('Error loading member projects:', memberProjectsError);
            // Continue without member projects rather than failing
          }
        }
      }

      // STEP 3: Combine and sort all projects
      const allProjects = [
        ...(ownedProjects || []),
        ...memberProjects
      ];

      // Apply sorting
      if (sort) {
        allProjects.sort((a, b) => {
          const aValue = (a as any)[sort.field];
          const bValue = (b as any)[sort.field];
          const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
          return sort.direction === 'asc' ? comparison : -comparison;
        });
      }

      // Apply pagination
      const startIndex = (page - 1) * per_page;
      const paginatedProjects = allProjects.slice(startIndex, startIndex + per_page);

      console.log(`Successfully loaded projects for user ${userId}:`, {
        owned: ownedProjects?.length || 0,
        member: memberProjects.length,
        total: allProjects.length,
        paginated: paginatedProjects.length
      });

      return {
        data: {
          items: paginatedProjects as Project[],
          total: allProjects.length,
          page,
          per_page,
        },
        error: null,
      };

    } catch (error) {
      console.error('Unexpected error in listUserProjects:', error);
      return {
        data: { items: [], total: 0, page: 1, per_page: 50 },
        error: error instanceof Error ? error : new Error('An unexpected error occurred')
      };
    }
  }

  /**
   * Check if user has access to a specific project
   * Uses the database function to avoid RLS issues
   */
  async checkProjectAccess(
    projectId: string, 
    userId?: string
  ): Promise<ApiResponse<{ is_member: boolean; is_owner: boolean; role: string | null }>> {
    try {
      const { data, error } = await this.client
        .rpc('check_project_membership', { 
          p_project_id: projectId,
          p_user_id: userId 
        });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const result = data && data.length > 0 ? data[0] : {
        is_member: false,
        is_owner: false,
        role: null
      };

      return { data: result, error: null };
    } catch (error) {
      console.error('Error checking project access:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to check project access')
      };
    }
  }

  /**
   * Get projects with membership info
   * This safely gets project data along with the user's role
   */
  async getProjectWithMembership(
    projectId: string,
    userId: string
  ): Promise<ApiResponse<Project & { user_role?: string; is_member: boolean }>> {
    try {
      // Get project data
      const { data: project, error: projectError } = await this.getProject(projectId);
      if (projectError || !project) {
        return { data: null, error: projectError || new Error('Project not found') };
      }

      // Check membership
      const { data: membership, error: membershipError } = await this.checkProjectAccess(projectId, userId);
      if (membershipError) {
        // Return project without membership info if check fails
        return { 
          data: { ...project, is_member: false }, 
          error: null 
        };
      }

      return {
        data: {
          ...project,
          user_role: membership?.role || undefined,
          is_member: membership?.is_member || false
        },
        error: null
      };
    } catch (error) {
      console.error('Error getting project with membership:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to get project with membership')
      };
    }
  }
}