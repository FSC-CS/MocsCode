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
    parentId?: string | null,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<ProjectFile>> {
    // Debug logging for parameter validation
    console.log('listProjectFiles called with:', {
      projectId,
      parentId,
      parentIdType: typeof parentId,
      parentIdValue: JSON.stringify(parentId)
    });

    const { page = 1, perPage = 50 } = pagination || {};
    const start = (page - 1) * perPage;
    let query = this.client
      .from(this.table)
      .select('*', { count: 'exact' })
      .eq('project_id', projectId);

    // Only filter by parent_id if it is explicitly provided (not undefined)
    if (parentId !== undefined) {
      if (parentId && parentId !== "null" && parentId !== "undefined") {
        query = query.eq('parent_id', parentId);
      } else {
        query = query.is('parent_id', null);
      }
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    }

    // Apply pagination
    query = query.range(start, start + perPage - 1);
    const { data, error, count } = await query;

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

  /**
   * Test utility to verify content storage and retrieval in the database.
   * Creates a test file, checks content, and deletes it.
   */
  async testContentStorage(projectId: string): Promise<void> {
    const testContent = "console.log('Hello, World!');";
    try {
      // Create test file
      const { data: createData, error: createError } = await this.client
        .from('project_files')
        .insert([
          {
            project_id: projectId,
            name: 'test-file.js',
            path: '/test-file.js',
            content: testContent,
            file_type: 'file',
            size_bytes: testContent.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();
      
      if (createError) {
        console.error('Test file creation failed:', createError);
        return;
      }
      
      // Retrieve test file
      const { data: retrieveData, error: retrieveError } = await this.client
        .from('project_files')
        .select('*')
        .eq('id', createData.id)
        .single();
      
      if (retrieveError) {
        console.error('Test file retrieval failed:', retrieveError);
        return;
      }
      
      console.log('Content storage test results:', {
        originalContent: testContent,
        storedContent: retrieveData.content,
        contentMatches: testContent === retrieveData.content
      });
      
      // Clean up
      await this.client
        .from('project_files')
        .delete()
        .eq('id', createData.id);
    } catch (error) {
      console.error('Content storage test encountered an error:', error);
    }
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
      parent_id: newParentId,
      path: newPath,
      updated_at: new Date().toISOString(),
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
