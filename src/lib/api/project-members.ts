import { ApiClient } from './client';
import { ApiConfig, ApiResponse, ProjectMember, PaginatedResponse, PaginationParams, SortParams } from './types';

export class ProjectMembersApi extends ApiClient {
  constructor(config: ApiConfig) {
    super(config, 'project_members');
  }

  async getMember(id: string): Promise<ApiResponse<ProjectMember>> {
    return this.get<ProjectMember>(id);
  }

  async listProjectMembers(
    projectId: string,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<ProjectMember>> {
    return this.list<ProjectMember>(pagination, sort, { project_id: projectId });
  }

  async addMember(data: Omit<ProjectMember, 'id' | 'joinedAt'>): Promise<ApiResponse<ProjectMember>> {
    return this.create<ProjectMember>(data);
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
}
