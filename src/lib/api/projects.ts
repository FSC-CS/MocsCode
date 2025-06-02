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
    console.log('Creating project with data:', data);
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

      console.log('Project created successfully:', project);
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

  async listUserProjects(
    userId: string,
    pagination: PaginationParams = { page: 1, perPage: 10 },
    sort?: SortParams
  ): Promise<PaginatedResponse<Project>> {
    console.log('listUserProjects called with userId:', userId);
    console.log('Supabase client:', this.client ? 'Client is initialized' : 'Client is missing');
    console.log('Table name being queried:', this.table);
    
    try {
      // First try a simple query to check table access
      console.log('Testing table access...');
      console.log('Executing access test query:', {
        table: this.table,
        query: 'SELECT count(*) FROM projects LIMIT 1'
      });

      const { data: accessTest, error: accessError } = await this.client
        .from(this.table)
        .select('count')
        .limit(1)
        .single();

      if (accessError) {
        console.error('Table access error:', {
          message: accessError.message,
          details: accessError.details,
          hint: accessError.hint,
          code: accessError.code,
          table: this.table,
          userId: userId,
          auth: await this.client.auth.getSession()
        });

        // Check specifically for RLS policy issues
        if (accessError.code === 'PGRST301' || accessError.message?.includes('permission denied')) {
          console.error('This appears to be an RLS policy issue. Please ensure the following policy is set in Supabase:');
          console.error(`
CREATE POLICY "Users can view their own projects"
ON projects
FOR SELECT
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = id
    AND user_id = auth.uid()
  )
);`);
        }

        throw new Error(`Cannot access table: ${accessError.message}`);
      }

      console.log('Table access successful');

      // Now try the actual query
      console.log('Building query for user projects...');
      let query = this.client
        .from(this.table)
        .select('*', { count: 'exact' })
        .eq('owner_id', userId);

      const { page = 1, perPage = 10 } = pagination;
      const start = (page - 1) * perPage;
      
      if (sort) {
        query = query.order(sort.field, { ascending: sort.direction === 'asc' });
      }

      console.log('Executing query with range:', { start, end: start + perPage - 1 });
      
      try {
        const { data, error, count } = await query.range(start, start + perPage - 1);
        
        if (error) {
          console.error('Query error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            query: {
              table: this.table,
              filter: { owner_id: userId },
              range: { start, end: start + perPage - 1 }
            }
          });

          // Check specifically for RLS policy issues
          if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
            console.error('This appears to be an RLS policy issue. Please ensure the following policy is set in Supabase:');
            console.error(`
CREATE POLICY "Users can view their own projects"
ON projects
FOR SELECT
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = id
    AND user_id = auth.uid()
  )
);`);
          }

          return {
            data: { items: [], total: 0, page, perPage },
            error: new Error(`Query failed: ${error.message}`)
          };
        }

        console.log('Query successful:', {
          dataReceived: !!data,
          count,
          itemsCount: data?.length || 0
        });

        return {
          data: {
            items: (data || []) as Project[],
            total: count || 0,
            page,
            perPage,
          },
          error: null,
        };
      } catch (queryError) {
        console.error('Query execution error:', queryError);
        throw queryError;
      }
    } catch (error) {
      console.error('Unexpected error in listUserProjects:', error);
      return {
        data: { items: [], total: 0, page: 1, perPage: 10 },
        error: error instanceof Error ? error : new Error('An unexpected error occurred')
      };
    }
  }
}
