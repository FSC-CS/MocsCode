// lib/api/collaboration.ts - Updated to use Edge Function

import { ApiClient } from './client';
import { ApiConfig, ApiResponse, PaginatedResponse, PaginationParams } from './types';

export interface ShareableLink {
  id: string;
  project_id: string;
  share_token: string;
  role: 'viewer' | 'editor';
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
   * Send invitation by email using Supabase Edge Function
   * This is the main method for sending email invitations
   */
  async sendEmailInvitation(
    projectId: string,
    email: string,
    permissions: 'viewer' | 'editor',
    projectName: string,
    message?: string,
    expiresAt?: Date
  ): Promise<ApiResponse<{ shareLink: ShareableLink; emailSent: boolean }>> {
    try {
      console.log(`Sending email invitation to ${email} for project ${projectName}`);

      // Get the current session to include in the request
      const { data: { session } } = await this.client.auth.getSession();
      
      if (!session) {
        return {
          data: null,
          error: new Error('Not authenticated')
        };
      }

      // Prepare the request payload
      const payload = {
        projectId,
        email,
        permissions,
        message,
        expiresAt: expiresAt?.toISOString()
      };

      console.log('Sending request to Edge Function with payload:', JSON.stringify(payload, null, 2));
      
      try {
        const response = await fetch(`${this.client.functions.url}/send-invitation-email`, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          }
        });

        const responseText = await response.text();
        let data;
        
        try {
          data = responseText ? JSON.parse(responseText) : null;
        } catch (e) {
          console.error('Failed to parse response as JSON:', responseText);
          throw new Error(`Invalid JSON response: ${responseText}`);
        }

        if (!response.ok) {
          const errorDetails = {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            headers: Object.fromEntries(response.headers.entries()),
            data: data,
            responseText: responseText
          };
          console.error('Edge Function returned error:', JSON.stringify(errorDetails, null, 2));
          
          // Try to extract a meaningful error message
          let errorMessage = `Request failed with status ${response.status}`;
          if (data?.error?.message) {
            errorMessage = data.error.message;
          } else if (typeof data === 'string') {
            errorMessage = data;
          } else if (data && typeof data === 'object') {
            errorMessage = JSON.stringify(data);
          }
          
          return {
            data: null,
            error: new Error(errorMessage)
          };
        }

        return { data, error: null };
      } catch (error) {
        console.error('Error calling Edge Function:', error);
        return {
          data: null,
          error: error instanceof Error ? error : new Error('Failed to send email invitation')
        };
      }

      if (!data.success) {
        return {
          data: null,
          error: new Error(data.error || 'Failed to send email invitation')
        };
      }

      console.log('Email invitation sent successfully');

      return {
        data: {
          shareLink: data.shareLink,
          emailSent: true
        },
        error: null
      };

    } catch (error) {
      console.error('Error sending email invitation:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to send email invitation')
      };
    }
  }

  /**
   * Join project using corrected function call
   */
  async joinProjectByToken(
    shareToken: string,
    userId: string
  ): Promise<ApiResponse<{ member: any; project: any }>> {
    try {
      console.log('Starting project join process with token:', shareToken.substring(0, 8) + '...');
      
      // Use the fixed function with explicit parameter name
      const { data: result, error: joinError } = await this.client
        .rpc('join_project_via_token', { share_token_param: shareToken });

      if (joinError) {
        console.error('Error in join_project_via_token:', joinError);
        return {
          data: null,
          error: new Error(joinError.message || 'Failed to join project')
        };
      }

      // Parse the JSON result
      let parsedResult;
      try {
        parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (parseError) {
        console.error('Error parsing join result:', parseError);
        return {
          data: null,
          error: new Error('Invalid response from join operation')
        };
      }

      if (!parsedResult.success) {
        console.error('Database function returned error:', parsedResult.error);
        return {
          data: null,
          error: new Error(parsedResult.error || 'Failed to join project')
        };
      }

      console.log('Successfully joined project:', {
        projectId: parsedResult.project_id,
        memberId: parsedResult.member_id,
        role: parsedResult.role
      });

      // Fetch complete project and member data
      const [projectResult, memberResult] = await Promise.all([
        this.client
          .from('projects')
          .select('*')
          .eq('id', parsedResult.project_id)
          .single(),
        this.client
          .from('project_members')
          .select(`
            *,
            user:users!project_members_user_id_fkey(
              id,
              email,
              name,
              avatar_url,
              created_at,
              updated_at,
              last_active_at
            )
          `)
          .eq('id', parsedResult.member_id)
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
   * Validate share token with better error handling
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
        .eq('is_active', true)
        .single();

      console.log('RESULT:', data);

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
   * Generate a new shareable link for a project (without email)
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
      const { data: tokenResult, error: tokenError } = await this.client
        .rpc('generate_secure_token');

      if (tokenError || !tokenResult) {
        return {
          data: null,
          error: new Error('Failed to generate secure token')
        };
      }

      const shareToken = tokenResult;

      const linkData = {
        project_id: projectId,
        share_token: shareToken,
        role: permissions, // Note: using 'role' to match your schema
        expires_at: expiresAt?.toISOString(),
        created_by: createdBy,
        created_at: new Date().toISOString(),
        is_active: true
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
}