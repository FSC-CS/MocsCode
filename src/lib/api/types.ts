import { SupabaseClient } from '@supabase/supabase-js';

export type ApiConfig = {
  client: SupabaseClient;
};

// Core entity types
export type User = {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  owner_id: string;  // Match database column name
  is_public: boolean;  // Match database column name
  templateId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectFile = {
  id: string;
  projectId: string;
  name: string;
  path: string;
  content?: string;
  fileType: 'file' | 'directory';
  mimeType?: string;
  sizeBytes: number;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
};

export type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  permissions: Record<string, unknown>;
  invitedBy?: string;
  joinedAt: string;
};

// Query types
export type PaginationParams = {
  page?: number;
  perPage?: number;
};

export type SortParams = {
  field: string;
  direction: 'asc' | 'desc';
};

export type FilterParams = Record<string, unknown>;

// Response types
export type ApiResponse<T> = {
  data: T | null;
  error: Error | null;
};

export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  perPage: number;
}>;
