import { describe, it, expect } from 'vitest';
import { ProjectsApi } from '../projects';
import { createTestApiConfig } from './test-utils';
import { Project } from '../types';

describe('ProjectsApi', () => {
  const mockProject: Project = {
    id: 'test-project-id',
    name: 'Test Project',
    description: 'A test project',
    owner_id: 'test-user-id',
    isPublic: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  describe('getProject', () => {
    it('should fetch a project by id', async () => {
      const api = new ProjectsApi(createTestApiConfig({
        select: { data: mockProject, error: null },
      }));

      const result = await api.getProject('test-project-id');
      expect(result.data).toEqual(mockProject);
      expect(result.error).toBeNull();
    });
  });

  describe('listProjects', () => {
    it('should list projects with filters', async () => {
      const mockProjects = [mockProject];
      const mockResponse = { data: mockProjects, error: null, count: 1 };
      const api = new ProjectsApi(createTestApiConfig({
        select: mockResponse,
      }));

      const result = await api.listProjects(
        { page: 1, per_page: 10 },
        { field: 'name', direction: 'asc' },
        { owner_id: 'test-user-id' }
      );

      expect(result.data?.items).toEqual(mockProjects);
      expect(result.data?.total).toBe(1);
      expect(result.error).toBeNull();

      // Verify the query was constructed correctly
      const mockClient = api['client'] as any;
      expect(mockClient.from).toHaveBeenCalledWith('projects');
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const newProject = {
        name: 'New Project',
        description: 'A new project',
        owner_id: 'test-user-id',
        isPublic: false,
      };

      const api = new ProjectsApi(createTestApiConfig({
        insert: { data: { ...mockProject, ...newProject }, error: null },
      }));

      const result = await api.createProject(newProject);
      expect(result.data).toMatchObject(newProject);
      expect(result.error).toBeNull();
    });
  });

  describe('updateProject', () => {
    it('should update a project', async () => {
      const updates = { name: 'Updated Project' };
      const api = new ProjectsApi(createTestApiConfig({
        update: { data: { ...mockProject, ...updates }, error: null },
      }));

      const result = await api.updateProject('test-project-id', updates);
      expect(result.data).toMatchObject(updates);
      expect(result.error).toBeNull();
    });
  });

  describe('listUserProjects', () => {
    it('should list projects for a user', async () => {
      const mockProjects = [mockProject];
      const mockResponse = { data: mockProjects, error: null, count: 1 };
      const api = new ProjectsApi(createTestApiConfig({
        select: mockResponse,
      }));

      const result = await api.listUserProjects('test-user-id', { page: 1, per_page: 10 });
      expect(result.data?.items).toEqual(mockProjects);
      expect(result.data?.total).toBe(1);
      expect(result.error).toBeNull();

      // Verify the query was constructed correctly
      const mockClient = api['client'] as any;
      expect(mockClient.from).toHaveBeenCalledWith('projects');
    });
  });
});
