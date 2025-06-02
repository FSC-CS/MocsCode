import { describe, it, expect } from 'vitest';
import { UsersApi } from '../users';
import { createTestApiConfig } from './test-utils';
import { User } from '../types';

describe('UsersApi', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    lastActiveAt: '2025-01-01T00:00:00Z',
  };

  describe('getUser', () => {
    it('should fetch a user by id', async () => {
      const api = new UsersApi(createTestApiConfig({
        select: { data: mockUser, error: null },
      }));

      const result = await api.getUser('test-user-id');
      expect(result.data).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should handle errors', async () => {
      const error = new Error('User not found');
      const api = new UsersApi(createTestApiConfig({
        select: { data: null, error },
      }));

      const result = await api.getUser('invalid-id');
      expect(result.data).toBeNull();
      expect(result.error).toEqual(error);
    });
  });

  describe('getUserByUsername', () => {
    it('should fetch a user by username', async () => {
      const api = new UsersApi(createTestApiConfig({
        select: { data: mockUser, error: null },
      }));

      const result = await api.getUserByUsername('testuser');
      expect(result.data).toEqual(mockUser);
      expect(result.error).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch the current authenticated user', async () => {
      const api = new UsersApi(createTestApiConfig({
        select: { data: mockUser, error: null },
      }));

      const result = await api.getCurrentUser();
      expect(result.data).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should handle unauthenticated state', async () => {
      const api = new UsersApi(createTestApiConfig());
      const mockClient = api['client'] as any;
      mockClient.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

      const result = await api.getCurrentUser();
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });
});
