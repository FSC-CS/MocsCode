import { ApiClient } from './client';
import { ApiConfig, ApiResponse, User } from './types';
import { UsersApi } from './users';

export interface OAuthUserData {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export class AuthApi extends ApiClient {
  private usersApi: UsersApi;

  constructor(config: ApiConfig) {
    super(config, 'users');
    this.usersApi = new UsersApi(config);
  }

  async createUser(userData: OAuthUserData): Promise<ApiResponse<User>> {
    const username = await this.generateUniqueUsername(userData.email.split('@')[0]);
    const now = new Date().toISOString();

    const user: Omit<User, 'id'> = {
      email: userData.email,
      username,
      displayName: userData.displayName || username,
      avatarUrl: userData.avatarUrl,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    };

    const { data, error } = await this.client
      .from(this.table)
      .insert([{ ...user, id: userData.id }])
      .select()
      .single();

    return {
      data: data as User,
      error: error as Error | null,
    };
  }

  async findUserByEmail(email: string): Promise<ApiResponse<User>> {
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .eq('email', email)
      .single();

    return {
      data: data as User,
      error: error as Error | null,
    };
  }

  async updateLastActive(id: string): Promise<ApiResponse<User>> {
    return this.usersApi.updateUser(id, {
      lastActiveAt: new Date().toISOString(),
    });
  }

  async generateUniqueUsername(baseUsername: string): Promise<string> {
    let username = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
    let counter = 0;
    let isUnique = false;

    while (!isUnique) {
      const testUsername = counter === 0 ? username : `${username}${counter}`;
      const { data } = await this.usersApi.getUserByUsername(testUsername);
      
      if (!data) {
        username = testUsername;
        isUnique = true;
      } else {
        counter++;
      }
    }

    return username;
  }

  async syncOAuthUser(oAuthData: OAuthUserData): Promise<ApiResponse<User>> {
    try {
      // Try to find existing user
      const { data: existingUser } = await this.findUserByEmail(oAuthData.email);

      if (existingUser) {
        // Update existing user
        const updates: Partial<User> = {
          displayName: oAuthData.displayName || existingUser.displayName,
          avatarUrl: oAuthData.avatarUrl || existingUser.avatarUrl,
          lastActiveAt: new Date().toISOString(),
        };

        return this.usersApi.updateUser(existingUser.id, updates);
      } else {
        // Create new user
        return this.createUser(oAuthData);
      }
    } catch (error) {
      return {
        data: null,
        error: error as Error,
      };
    }
  }
}
