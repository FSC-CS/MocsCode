// Updated projects.ts - Use helper functions to avoid RLS recursion

import { ApiClient } from './client';
import { ApiConfig, ApiResponse, Project, PaginatedResponse, PaginationParams, SortParams } from './types';

export class ProjectsApi extends ApiClient {
  constructor(config: ApiConfig) {
    super(config, 'projects');
  }

  /**
   * FIXED: Get project using helper function to avoid RLS issues
   */
  async getProject(id: string): Promise<ApiResponse<Project & { user_role?: string; can_edit?: boolean }>> {
    try {
      const { data, error } = await this.client
        .rpc('get_project_safe', { p_project_id: id })
        .single();

      if (error) {
        console.error('Error getting project:', error);
        return { data: null, error: new Error(error.message) };
      }

      if (!data) {
        return { data: null, error: new Error('Project not found or access denied') };
      }

      return { data: data as Project & { user_role?: string; can_edit?: boolean }, error: null };
    } catch (error) {
      console.error('Unexpected error in getProject:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('An unexpected error occurred')
      };
    }
  }

  /**
   * FIXED: List projects using helper function to avoid RLS recursion
   */
  async listUserProjects(
    userId: string,
    pagination: PaginationParams = { page: 1, per_page: 50 },
    sort?: SortParams
  ): Promise<PaginatedResponse<Project & { user_role?: string }>> {
    try {
      const { page = 1, per_page = 50 } = pagination;
      
      console.log('Loading projects for user:', userId);

      // Use helper function that bypasses RLS
      const { data: projects, error } = await this.client
        .rpc('get_user_projects', { p_user_id: userId });

      if (error) {
        console.error('Error loading user projects:', error);
        return {
          data: { items: [], total: 0, page, per_page },
          error: new Error(error.message)
        };
      }

      const allProjects = projects || [];

      // Apply sorting if specified
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
        total: allProjects.length,
        paginated: paginatedProjects.length
      });

      return {
        data: {
          items: paginatedProjects as (Project & { user_role?: string })[],
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
   * FIXED: Check project access using helper function
   */
  async checkProjectAccess(
    projectId: string, 
    userId?: string
  ): Promise<ApiResponse<{ can_access: boolean; user_role: string | null; is_owner: boolean; is_member: boolean }>> {
    try {
      const { data, error } = await this.client
        .rpc('check_project_access', { 
          p_project_id: projectId,
          p_user_id: userId 
        })
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const result = {
        can_access: false,
        user_role: '',
        is_owner: false,
        is_member: false,
        ...(data || {})
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
   * Create project - this should still work with RLS
   */
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

  async listProjects(
    pagination?: PaginationParams,
    sort?: SortParams,
    filters?: { owner_id?: string; isPublic?: boolean }
  ): Promise<PaginatedResponse<Project>> {
    return this.list<Project>(pagination, sort, filters);
  }

  /**
   * Get projects with membership info using helper function
   */
  async getProjectWithMembership(
    projectId: string,
    userId: string
  ): Promise<ApiResponse<Project & { user_role?: string; can_edit?: boolean; is_member: boolean }>> {
    try {
      // Use the safe project getter
      const { data: project, error: projectError } = await this.getProject(projectId);
      if (projectError || !project) {
        return { data: null, error: projectError || new Error('Project not found') };
      }

      // Check access
      const { data: access, error: accessError } = await this.checkProjectAccess(projectId, userId);
      if (accessError) {
        // Return project without membership info if check fails
        return { 
          data: { ...project, is_member: false }, 
          error: null 
        };
      }

      return {
        data: {
          ...project,
          user_role: access?.user_role || undefined,
          can_edit: access?.user_role ? ['owner', 'editor'].includes(access.user_role) : false,
          is_member: access?.is_member || false
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