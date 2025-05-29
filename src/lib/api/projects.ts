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
    filters?: { ownerId?: string; isPublic?: boolean }
  ): Promise<PaginatedResponse<Project>> {
    return this.list<Project>(pagination, sort, filters);
  }

  async createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Project>> {
    return this.create<Project>(data);
  }

  async updateProject(id: string, data: Partial<Project>): Promise<ApiResponse<Project>> {
    return this.update<Project>(id, data);
  }

  async deleteProject(id: string): Promise<ApiResponse<null>> {
    return this.delete(id);
  }

  async listUserProjects(
    userId: string,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<Project>> {
    const query = this.client
      .from(this.table)
      .select('*', { count: 'exact' })
      .or(`owner_id.eq.${userId},id.in.(select project_id from project_members where user_id = ${userId})`);

    const { page = 1, perPage = 10 } = pagination || {};
    const start = (page - 1) * perPage;
    
    if (sort) {
      query.order(sort.field, { ascending: sort.direction === 'asc' });
    }

    const { data, error, count } = await query.range(start, start + perPage - 1);

    return {
      data: {
        items: (data || []) as Project[],
        total: count || 0,
        page,
        perPage,
      },
      error: error as Error | null,
    };
  }
}
