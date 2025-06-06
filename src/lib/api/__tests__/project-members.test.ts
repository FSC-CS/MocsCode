import { describe, it, expect } from 'vitest';
import { ProjectMembersApi } from '../project-members';
import { createTestApiConfig } from './test-utils';
import { ProjectMember } from '../types';

describe('ProjectMembersApi', () => {
  const mockMember: ProjectMember = {
    id: 'test-member-id',
    projectId: 'test-project-id',
    userId: 'test-user-id',
    role: 'editor',
    permissions: {},
    invitedBy: 'owner-id',
    joinedAt: '2025-01-01T00:00:00Z',
  };

  describe('getMember', () => {
    it('should fetch a member by id', async () => {
      const api = new ProjectMembersApi(createTestApiConfig({
        select: { data: mockMember, error: null },
      }));

      const result = await api.getMember('test-member-id');
      expect(result.data).toEqual(mockMember);
      expect(result.error).toBeNull();
    });
  });

  describe('listProjectMembers', () => {
    it('should list members of a project', async () => {
      const mockMembers = [mockMember];
      const api = new ProjectMembersApi(createTestApiConfig({
        select: { data: mockMembers, error: null, count: 1 },
      }));

      const result = await api.listProjectMembers(
        'test-project-id',
        { page: 1, per_page: 10 }
      );

      expect(result.data?.items).toEqual(mockMembers);
      expect(result.data?.total).toBe(1);
      expect(result.error).toBeNull();
    });
  });

  describe('addMember', () => {
    it('should add a new member to a project', async () => {
      const newMember = {
        projectId: 'test-project-id',
        userId: 'new-user-id',
        role: 'viewer' as const,
        permissions: {},
        invitedBy: 'owner-id',
      };

      const api = new ProjectMembersApi(createTestApiConfig({
        insert: { data: { ...mockMember, ...newMember }, error: null },
      }));

      const result = await api.addMember(newMember);
      expect(result.data).toMatchObject(newMember);
      expect(result.error).toBeNull();
    });
  });

  describe('getUserRole', () => {
    it('should get user role in a project', async () => {
      const api = new ProjectMembersApi(createTestApiConfig({
        select: { data: mockMember, error: null },
      }));

      const result = await api.getUserRole('test-project-id', 'test-user-id');
      expect(result.data).toEqual(mockMember);
      expect(result.error).toBeNull();
    });
  });

  describe('updateMemberRole', () => {
    it('should update a member role', async () => {
      const updatedMember = { ...mockMember, role: 'viewer' as const };
      const api = new ProjectMembersApi(createTestApiConfig({
        update: { data: updatedMember, error: null },
      }));

      const result = await api.updateMemberRole(
        'test-project-id',
        'test-user-id',
        'viewer'
      );
      
      expect(result.data?.role).toBe('viewer');
      expect(result.error).toBeNull();
    });
  });

  describe('removeMember', () => {
    it('should remove a member from a project', async () => {
      const api = new ProjectMembersApi(createTestApiConfig({
        delete: { data: null, error: null },
      }));

      const result = await api.removeMember('test-member-id');
      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });
  });
});
