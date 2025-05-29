import { ApiClient } from './client';
import { ApiConfig, ApiResponse, ProjectFile, PaginatedResponse, PaginationParams, SortParams } from './types';

export class ProjectFilesApi extends ApiClient {
  constructor(config: ApiConfig) {
    super(config, 'project_files');
  }

  async getFile(id: string): Promise<ApiResponse<ProjectFile>> {
    return this.get<ProjectFile>(id);
  }

  async listProjectFiles(
    projectId: string,
    parentId?: string,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<ProjectFile>> {
    const filters = {
      project_id: projectId,
      ...(parentId ? { parent_id: parentId } : { parent_id: null }),
    };
    return this.list<ProjectFile>(pagination, sort, filters);
  }

  async createFile(data: Omit<ProjectFile, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<ProjectFile>> {
    return this.create<ProjectFile>(data);
  }

  async updateFile(id: string, data: Partial<ProjectFile>): Promise<ApiResponse<ProjectFile>> {
    return this.update<ProjectFile>(id, data);
  }

  async deleteFile(id: string): Promise<ApiResponse<null>> {
    return this.delete(id);
  }

  async getFileByPath(projectId: string, path: string): Promise<ApiResponse<ProjectFile>> {
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .eq('project_id', projectId)
      .eq('path', path)
      .single();

    return {
      data: data as ProjectFile,
      error: error as Error | null,
    };
  }

  async moveFile(id: string, newParentId: string | null, newPath: string): Promise<ApiResponse<ProjectFile>> {
    return this.update<ProjectFile>(id, {
      parentId: newParentId,
      path: newPath,
    });
  }

  async searchFiles(
    projectId: string,
    query: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<ProjectFile>> {
    const { page = 1, perPage = 10 } = pagination || {};
    const start = (page - 1) * perPage;

    const { data, error, count } = await this.client
      .from(this.table)
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .ilike('name', `%${query}%`)
      .range(start, start + perPage - 1);

    return {
      data: {
        items: (data || []) as ProjectFile[],
        total: count || 0,
        page,
        perPage,
      },
      error: error as Error | null,
    };
  }
}
