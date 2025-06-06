import { describe, it, expect } from 'vitest';
import { ProjectFilesApi } from '../project-files';
import { createTestApiConfig } from './test-utils';
import { ProjectFile } from '../types';

describe('ProjectFilesApi', () => {
  const mockFile: ProjectFile = {
    id: 'test-file-id',
    projectId: 'test-project-id',
    name: 'test.ts',
    path: '/src/test.ts',
    content: 'console.log("test");',
    fileType: 'file',
    mimeType: 'text/typescript',
    sizeBytes: 100,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    createdBy: 'test-user-id',
  };

  describe('getFile', () => {
    it('should fetch a file by id', async () => {
      const api = new ProjectFilesApi(createTestApiConfig({
        select: { data: mockFile, error: null },
      }));

      const result = await api.getFile('test-file-id');
      expect(result.data).toEqual(mockFile);
      expect(result.error).toBeNull();
    });
  });

  describe('listProjectFiles', () => {
    it('should list files in a project directory', async () => {
      const mockFiles = [mockFile];
      const api = new ProjectFilesApi(createTestApiConfig({
        select: { data: mockFiles, error: null, count: 1 },
      }));

      const result = await api.listProjectFiles(
        'test-project-id',
        'parent-dir-id',
        { page: 1, per_page: 10 }
      );

      expect(result.data?.items).toEqual(mockFiles);
      expect(result.data?.total).toBe(1);
      expect(result.error).toBeNull();
    });
  });

  describe('createFile', () => {
    it('should create a new file', async () => {
      const newFile = {
        projectId: 'test-project-id',
        name: 'new.ts',
        path: '/src/new.ts',
        fileType: 'file' as const,
        content: 'console.log("new");',
        sizeBytes: 50,
        createdBy: 'test-user-id',
      };

      const api = new ProjectFilesApi(createTestApiConfig({
        insert: { data: { ...mockFile, ...newFile }, error: null },
      }));

      const result = await api.createFile(newFile);
      expect(result.data).toMatchObject(newFile);
      expect(result.error).toBeNull();
    });
  });

  describe('getFileByPath', () => {
    it('should fetch a file by project id and path', async () => {
      const api = new ProjectFilesApi(createTestApiConfig({
        select: { data: mockFile, error: null },
      }));

      const result = await api.getFileByPath('test-project-id', '/src/test.ts');
      expect(result.data).toEqual(mockFile);
      expect(result.error).toBeNull();
    });
  });

  describe('moveFile', () => {
    it('should move a file to a new location', async () => {
      const newPath = '/src/moved/test.ts';
      const api = new ProjectFilesApi(createTestApiConfig({
        update: { 
          data: { ...mockFile, path: newPath, parentId: 'new-parent-id' }, 
          error: null 
        },
      }));

      const result = await api.moveFile('test-file-id', 'new-parent-id', newPath);
      expect(result.data?.path).toBe(newPath);
      expect(result.data?.parentId).toBe('new-parent-id');
      expect(result.error).toBeNull();
    });
  });

  describe('searchFiles', () => {
    it('should search for files by name', async () => {
      const mockFiles = [mockFile];
      const api = new ProjectFilesApi(createTestApiConfig({
        select: { data: mockFiles, error: null, count: 1 },
      }));

      const result = await api.searchFiles('test-project-id', 'test');
      expect(result.data?.items).toEqual(mockFiles);
      expect(result.data?.total).toBe(1);
      expect(result.error).toBeNull();

      // Verify that the correct query was made
      const mockClient = api['client'] as any;
      expect(mockClient.from).toHaveBeenCalledWith('project_files');
    });
  });
});
