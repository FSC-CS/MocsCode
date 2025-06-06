// Updated collaboration.ts - Replace your existing file content with this

import { ApiClient } from './client';
import { ApiConfig, ApiResponse, PaginatedResponse, PaginationParams } from './types';

export interface ShareableLink {
  id: string;
  project_id: string;
  share_token: string;
  permissions: 'viewer' | 'editor';
  expires_at?: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
  share_type: 'link';
}

export class CollaborationApi extends ApiClient {
  constructor(config: ApiConfig) {
    super(config, 'sharing_permissions');
  }

  /**
   * FIXED: Join project using database function for atomic operation
   */
  async joinProjectByToken(
    shareToken: string,
    userId: string
  ): Promise<ApiResponse<{ member: any; project: any }>> {
    try {
      console.log('Starting project join process with token:', shareToken.substring(0, 8) + '...');
      
      // Use database function for atomic join operation
      const { data: result, error: joinError } = await this.client
        .rpc('join_project_via_token', { share_token_param: shareToken });

      if (joinError) {
        console.error('Error in join_project_via_token:', joinError);
        return {
          data: null,
          error: new Error(joinError.message || 'Failed to join project')
        };
      }

      if (result?.error) {
        console.error('Database function returned error:', result.error);
        return {
          data: null,
          error: new Error(result.error)
        };
      }

      if (!result?.success) {
        console.error('Unexpected result from join function:', result);
        return {
          data: null,
          error: new Error('Unexpected response from join operation')
        };
      }

      console.log('Successfully joined project:', {
        projectId: result.project_id,
        memberId: result.member_id,
        role: result.role
      });

      // Fetch complete project and member data
      const [projectResult, memberResult] = await Promise.all([
        this.client
          .from('projects')
          .select('*')
          .eq('id', result.project_id)
          .single(),
        this.client
          .from('project_members')
          .select(`
            *,
            user:users!project_members_user_id_fkey(
              id,
              email,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('id', result.member_id)
          .single()
      ]);

      if (projectResult.error) {
        console.error('Error fetching project data:', projectResult.error);
        return {
          data: null,
          error: new Error(`Failed to fetch project data: ${projectResult.error.message}`)
        };
      }

      if (memberResult.error) {
        console.error('Error fetching member data:', memberResult.error);
        return {
          data: null,
          error: new Error(`Failed to fetch member data: ${memberResult.error.message}`)
        };
      }

      console.log('Successfully fetched complete project and member data');

      return {
        data: {
          member: memberResult.data,
          project: projectResult.data
        },
        error: null
      };

    } catch (error) {
      console.error('Unexpected error in joinProjectByToken:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('An unexpected error occurred while joining project')
      };
    }
  }

  /**
   * IMPROVED: Better token validation with detailed logging
   */
  async validateShareToken(token: string): Promise<ApiResponse<ShareableLink & { project?: any }>> {
    try {
      console.log('Validating share token:', token.substring(0, 8) + '...');

      const { data, error } = await this.client
        .from(this.table)
        .select(`
          *,
          project:projects(
            id,
            name,
            description,
            owner_id,
            is_public
          )
        `)
        .eq('share_token', token)
        .eq('share_type', 'link')
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          console.log('Share token not found or inactive');
          return {
            data: null,
            error: new Error('Invalid or expired share link')
          };
        }
        console.error('Error validating share token:', error);
        return {
          data: null,
          error: new Error(`Failed to validate share link: ${error.message}`)
        };
      }

      if (!data) {
        console.log('No data returned for share token');
        return {
          data: null,
          error: new Error('Share link not found')
        };
      }

      const shareLink = data as ShareableLink & { project?: any };

      // Check if link has expired
      if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
        console.log('Share link has expired:', shareLink.expires_at);
        return {
          data: null,
          error: new Error('This share link has expired')
        };
      }

      console.log('Share token validated successfully:', {
        projectId: shareLink.project_id,
        permissions: shareLink.permissions,
        hasExpiry: !!shareLink.expires_at
      });

      return {
        data: shareLink,
        error: null
      };

    } catch (error) {
      console.error('Unexpected error in validateShareToken:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('An unexpected error occurred while validating share link')
      };
    }
  }

  /**
   * Generate a new shareable link for a project
   */
  async generateShareableLink(
    projectId: string,
    permissions: 'viewer' | 'editor',
    createdBy: string,
    expiresAt?: Date
  ): Promise<ApiResponse<ShareableLink>> {
    try {
      console.log('Generating shareable link for project:', projectId, 'with permissions:', permissions);

      // Generate a cryptographically secure token
      const shareToken = this.generateSecureToken();
      const now = new Date().toISOString();

      const linkData = {
        project_id: projectId,
        share_token: shareToken,
        permissions,
        expires_at: expiresAt?.toISOString(),
        created_by: createdBy,
        created_at: now,
        is_active: true,
        share_type: 'link' as const
      };

      const { data, error } = await this.client
        .from(this.table)
        .insert([linkData])
        .select()
        .single();

      if (error) {
        console.error('Error creating shareable link:', error);
        return {
          data: null,
          error: new Error(`Failed to create shareable link: ${error.message}`)
        };
      }

      console.log('Shareable link created successfully:', {
        projectId,
        permissions,
        tokenPrefix: shareToken.substring(0, 8) + '...'
      });

      return {
        data: data as ShareableLink,
        error: null
      };

    } catch (error) {
      console.error('Unexpected error in generateShareableLink:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('An unexpected error occurred while creating share link')
      };
    }
  }

  /**
   * List all active share links for a project
   */
  async listProjectShareLinks(
    projectId: string,
    userId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<ShareableLink>> {
    try {
      const { page = 1, per_page = 10 } = pagination || {};
      const start = (page - 1) * per_page;

      console.log('Listing share links for project:', projectId);

      const { data, error, count } = await this.client
        .from(this.table)
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .eq('share_type', 'link')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(start, start + per_page - 1);

      if (error) {
        console.error('Error listing share links:', error);
        return {
          data: { items: [], total: 0, page, per_page },
          error: new Error(`Failed to list share links: ${error.message}`)
        };
      }

      console.log(`Found ${data?.length || 0} active share links for project`);

      return {
        data: {
          items: (data || []) as ShareableLink[],
          total: count || 0,
          page,
          per_page,
        },
        error: null,
      };

    } catch (error) {
      console.error('Unexpected error in listProjectShareLinks:', error);
      return {
        data: { items: [], total: 0, page: 1, per_page: 10 },
        error: error instanceof Error ? error : new Error('An unexpected error occurred')
      };
    }
  }

  /**
   * Revoke (deactivate) a share link
   */
  async revokeShareLink(
    linkId: string,
    userId: string
  ): Promise<ApiResponse<ShareableLink>> {
    try {
      console.log('Revoking share link:', linkId);

      // Update the link to deactivate it
      const { data: updatedLink, error: updateError } = await this.client
        .from(this.table)
        .update({ is_active: false })
        .eq('id', linkId)
        .select()
        .single();

      if (updateError) {
        console.error('Error revoking share link:', updateError);
        return {
          data: null,
          error: new Error(`Failed to revoke share link: ${updateError.message}`)
        };
      }

      console.log('Share link revoked successfully');

      return {
        data: updatedLink as ShareableLink,
        error: null
      };

    } catch (error) {
      console.error('Unexpected error in revokeShareLink:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('An unexpected error occurred while revoking share link')
      };
    }
  }

  /**
   * Generate a cryptographically secure token for share links
   */
  private generateSecureToken(): string {
    // Generate a secure random token
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      // Browser environment
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback for older browsers
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < 64; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
  }
}