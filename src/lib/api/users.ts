import { ApiClient } from './client';
import { ApiConfig, ApiResponse, User, PaginatedResponse, PaginationParams, SortParams } from './types';

export class UsersApi extends ApiClient {
  constructor(config: ApiConfig) {
    super(config, 'users');
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.get<User>(id);
  }

  async listUsers(
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<User>> {
    return this.list<User>(pagination, sort);
  }

  async updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
    return this.update<User>(id, data);
  }

  async getUserByUsername(username: string): Promise<ApiResponse<User>> {
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .eq('username', username)
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
