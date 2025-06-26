// Updated project-files.ts - Use helper functions to avoid RLS recursion

import { ApiClient } from './client';
import { ApiConfig, ApiResponse, ProjectFile, PaginatedResponse, PaginationParams, SortParams } from './types';
import JSZip from 'jszip';

export class ProjectFilesApi extends ApiClient {
  constructor(config: ApiConfig) {
    super(config, 'project_files');
  }

  async getFile(id: string): Promise<ApiResponse<ProjectFile>> {
    return this.get<ProjectFile>(id);
  }

  /**
   * FIXED: Use helper function to avoid RLS recursion
   */
  async listProjectFiles(
    projectId: string,
    parentId?: string | null,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResponse<ProjectFile>> {
    console.log('listProjectFiles called with:', {
      projectId,
      parentId,
      parentIdType: typeof parentId,
      parentIdValue: JSON.stringify(parentId)
    });

    const { page = 1, per_page = 50 } = pagination || {};

    try {
      let data: any[];
      let error: any;

      if (parentId === undefined) {
        // Get ALL files for the project (used by file explorer)
        const result = await this.client
          .rpc('get_all_project_files', { p_project_id: projectId });
        data = result.data;
        error = result.error;
      } else {
        // Get files for specific parent (or root if parentId is null)
        const result = await this.client
          .rpc('get_project_files', { 
            p_project_id: projectId,
            p_parent_id: parentId 
          });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error loading project files:', error);
        return {
          data: { items: [], total: 0, page, per_page },
          error: new Error(error.message)
        };
      }

      const files = (data || []).map((row: any) => ({
        id: row.id,
        project_id: row.project_id,
        name: row.name,
        path: row.path,
        content: row.content,
        file_type: row.file_type,
        mime_type: row.mime_type,
        size_bytes: row.size_bytes,
        parent_id: row.parent_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by
      }));

      // Apply sorting if specified
      if (sort) {
        files.sort((a, b) => {
          const aValue = (a as any)[sort.field];
          const bValue = (b as any)[sort.field];
          const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
          return sort.direction === 'asc' ? comparison : -comparison;
        });
      }

      // Apply pagination
      const startIndex = (page - 1) * per_page;
      const paginatedFiles = files.slice(startIndex, startIndex + per_page);

      console.log(`Successfully loaded ${files.length} files for project ${projectId}`);

      return {
        data: {
          items: paginatedFiles as ProjectFile[],
          total: files.length,
          page,
          per_page,
        },
        error: null,
      };
    } catch (error) {
      console.error('Unexpected error in listProjectFiles:', error);
      return {
        data: { items: [], total: 0, page: 1, per_page: 50 },
        error: error instanceof Error ? error : new Error('An unexpected error occurred')
      };
    }
  }

  /**
   * Create file using helper function
   */
  async createFile(data: Omit<ProjectFile, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<ProjectFile>> {
    try {
      console.log('Creating file:', { name: data.name, project_id: data.project_id });

      const { data: fileId, error } = await this.client
        .rpc('upsert_project_file', {
          p_file_id: null, // New file
          p_project_id: data.project_id,
          p_name: data.name,
          p_path: data.path,
          p_content: data.content || '',
          p_file_type: data.file_type,
          p_mime_type: data.mime_type,
          p_parent_id: data.parent_id
        });

      if (error) {
        console.error('File creation error:', error);
        return { data: null, error: new Error(error.message) };
      }

      // Fetch the created file
      const { data: createdFile, error: fetchError } = await this.getFile(fileId);
      if (fetchError) {
        console.error('Error fetching created file:', fetchError);
        return { data: null, error: fetchError };
      }

      console.log('File created successfully:', { fileId, name: data.name });
      return { data: createdFile, error: null };

    } catch (error) {
      console.error('Unexpected error in createFile:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('An unexpected error occurred')
      };
    }
  }

  /**
   * Update file using helper function
   */
  async updateFile(id: string, data: Partial<ProjectFile>): Promise<ApiResponse<ProjectFile>> {
    try {
      console.log('Updating file:', { id, updates: Object.keys(data) });

      // First get the current file to preserve fields not being updated
      const { data: currentFile, error: fetchError } = await this.getFile(id);
      if (fetchError || !currentFile) {
        return { data: null, error: fetchError || new Error('File not found') };
      }

      // Use helper function for update
      const { data: fileId, error } = await this.client
        .rpc('upsert_project_file', {
          p_file_id: id,
          p_project_id: currentFile.project_id,
          p_name: data.name || currentFile.name,
          p_path: data.path || currentFile.path,
          p_content: data.content !== undefined ? data.content : currentFile.content,
          p_file_type: data.file_type || currentFile.file_type,
          p_mime_type: data.mime_type || currentFile.mime_type,
          p_parent_id: data.parent_id !== undefined ? data.parent_id : currentFile.parent_id
        });

      if (error) {
        console.error('File update error:', error);
        return { data: null, error: new Error(error.message) };
      }

      // Fetch the updated file
      const { data: updatedFile, error: fetchUpdatedError } = await this.getFile(id);
      if (fetchUpdatedError) {
        console.error('Error fetching updated file:', fetchUpdatedError);
        return { data: null, error: fetchUpdatedError };
      }

      console.log('File updated successfully:', { id, name: updatedFile?.name });
      return { data: updatedFile, error: null };

    } catch (error) {
      console.error('Unexpected error in updateFile:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('An unexpected error occurred')
      };
    }
  }

  /**
   * Delete file - simple delete since we have basic policies
   */
  async deleteFile(id: string): Promise<ApiResponse<null>> {
    try {
      // Check if user can edit first
      const { data: file, error: fetchError } = await this.getFile(id);
      if (fetchError || !file) {
        return { data: null, error: fetchError || new Error('File not found') };
      }

      const { data: canEdit, error: permError } = await this.client
        .rpc('can_edit_project_files', { p_project_id: file.project_id });

      if (permError || !canEdit) {
        return { 
          data: null, 
          error: new Error('Insufficient permissions to delete this file') 
        };
      }

      // Delete the file
      const { error: deleteError } = await this.client
        .from(this.table)
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('File deletion error:', deleteError);
        return { data: null, error: new Error(deleteError.message) };
      }

      console.log('File deleted successfully:', { id });
      return { data: null, error: null };

    } catch (error) {
      console.error('Unexpected error in deleteFile:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('An unexpected error occurred')
      };
    }
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
    return this.updateFile(id, {
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
    try {
      // Use our helper function to get all files, then filter
      const { data, error } = await this.client
        .rpc('get_all_project_files', { p_project_id: projectId });

      if (error) {
        return {
          data: { items: [], total: 0, page: 1, per_page: 10 },
          error: new Error(error.message)
        };
      }

      // Filter files by search query
      const filteredFiles = (data || [])
        .filter((file: any) => 
          file.name.toLowerCase().includes(query.toLowerCase())
        )
        .map((row: any) => ({
          id: row.id,
          project_id: row.project_id,
          name: row.name,
          path: row.path,
          content: row.content,
          file_type: row.file_type,
          mime_type: row.mime_type,
          size_bytes: row.size_bytes,
          parent_id: row.parent_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          created_by: row.created_by
        }));

      const { page = 1, per_page = 10 } = pagination || {};
      const startIndex = (page - 1) * per_page;
      const paginatedFiles = filteredFiles.slice(startIndex, startIndex + per_page);

      return {
        data: {
          items: paginatedFiles as ProjectFile[],
          total: filteredFiles.length,
          page,
          per_page,
        },
        error: null,
      };

    } catch (error) {
      console.error('Unexpected error in searchFiles:', error);
      return {
        data: { items: [], total: 0, page: 1, per_page: 10 },
        error: error instanceof Error ? error : new Error('An unexpected error occurred')
      };
    }
  }

  async exportProjectAsBase64Zip(
    projectId: string,
    compileScript: string,
    runScript: string,
  ): Promise<string> {
    // Fetch all files for the project
    const { data, error } = await this.client
      .from(this.table)
      .select('name, path, content, file_type')
      .eq('project_id', projectId);
  
    if (error) throw new Error('Failed to fetch project files: ' + error.message);
  
    const files = (data || []).filter((f: any) => f.file_type === 'file');
  
    const zip = new JSZip();
    for (const file of files) {
      // Use file.path as the zip path
      const zipPath = file.path;
      zip.file(zipPath, file.content || '');
    }

    console.log('compileScript', compileScript);
    console.log('runScript', runScript);

    zip.file('/compile.sh', '#!/bin/bash\n\n' + compileScript);
    zip.file('/run.sh', '#!/bin/bash\n\n' + runScript);
  
    const zipBuffer = await zip.generateAsync({ type: 'base64' });

    // Convert to base64 string
    return zipBuffer;
  }
}