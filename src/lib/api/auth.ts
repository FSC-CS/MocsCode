import { ApiClient } from './client';
import { ApiConfig, ApiResponse, User } from './types';
import { UsersApi } from './users';
import { toast } from '@/components/ui/use-toast';

export interface OAuthUserData {
  id: string;
  email: string;
  avatar_url?: string;
}

export class AuthApi extends ApiClient {
  private usersApi: UsersApi;

  constructor(config: ApiConfig) {
    super(config, 'users');
    this.usersApi = new UsersApi(config);
  }


async createUser(userData: OAuthUserData): Promise<ApiResponse<User>> {
    const name = await this.generateUniqueName(userData.email.split('@')[0]);
    const now = new Date().toISOString();

    const user: Omit<User, 'id'> = {
      email: userData.email,
      name, // use generated unique name
      avatar_url: userData.avatar_url,
      created_at: now,
      updated_at: now,
      last_active_at: now,
    };

    const payload = { ...user, id: userData.id };
    console.log('[DEBUG] Attempting to insert user payload:', payload);
const { data, error } = await this.client
  .from(this.table)
  .insert([payload])
  .select()
  .single();
if (error) {
  console.error('[DEBUG] Supabase insert error:', error, { payload });
      console.error('Error inserting user:', error, { payload });
      toast({
        title: 'User Creation Error',
        description: error.message || 'Failed to create user. Check console for details.',
        variant: 'destructive',
        duration: 10000,
      });
    }

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
      last_active_at: new Date().toISOString(),
    });
  }

  async generateUniqueName(baseName: string): Promise<string> {
    let name = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let counter = 0;
    let isUnique = false;

    while (!isUnique) {
      const testName = counter === 0 ? name : `${name}${counter}`;
      const { data } = await this.usersApi.getUserByName(testName);
      
      if (!data) {
        name = testName;
        isUnique = true;
      } else {
        counter++;
      }
    }

    return name;
  }

  /**
   * Synchronizes OAuth user data with our database
   * @param oAuthData User data from OAuth provider
   * @returns ApiResponse with the synced user or error
   */
  async syncOAuthUser(oAuthData: OAuthUserData): Promise<ApiResponse<User>> {
  // Input validation
  if (!oAuthData?.id || !oAuthData?.email) {
    const error = new Error('Invalid OAuth data: Missing required fields');
    console.error('OAuth sync failed:', error);
    return { data: null, error };
  }

  // Only fetch the user row by UID, with retry logic for trigger delay
  const maxAttempts = 5;
  const delayMs = 200;
  let attempt = 0;
  let user: User | null = null;
  let lastError: any = null;

  try {
    while (attempt < maxAttempts) {
    const session = await this.client.auth.getSession();
    const { data, error } = await this.client.from('users').select('*').eq('id', oAuthData.id).single();
    if (data) {
      user = data;
      break;
    }
    lastError = error;
    if (error) {
      console.error('[syncOAuthUser] getUser error:', error);
    }
    await new Promise(res => setTimeout(res, delayMs));
    attempt++;
    }
  } catch (loopError) {
    console.error('[syncOAuthUser] Exception in fetch loop:', loopError);
  }

  if (!user) {
    const error = new Error('User row not found after signup. Trigger may have failed or RLS is blocking SELECT.');
    console.error('OAuth sync failed:', error, { lastError });
    return { data: null, error };
  }

  return { data: user, error: null };
}
}
