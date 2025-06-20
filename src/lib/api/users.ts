import { ApiClient } from './client';
import { ApiConfig, ApiResponse, User, PaginatedResponse, PaginationParams, SortParams } from './types';

export class UsersApi extends ApiClient {
  constructor(config: ApiConfig) {
    super(config, 'users');
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    const result = await this.get<User>(id);
    return result;
  }

  async listUsers(
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<User>> {
    return this.list<User>(pagination, sort);
  }

  async updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
    console.log('[DEBUG] updateUser called with:', { id, data });
const result = await this.update<User>(id, data);
if (result.error) {
  console.error('[DEBUG] Supabase update error:', result.error, { id, data });
}
return result;
  }

  async getUserByName(name: string): Promise<ApiResponse<User>> {
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .eq('name', name)
      .single();

    return {
      data: data as User,
      error: error as Error | null,
    };
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const { data: session } = await this.client.auth.getSession();
    if (!session?.session?.user?.id) {
      return { data: null, error: new Error('No authenticated user') };
    }
    return this.getUser(session.session.user.id);
  }
}
