import { SupabaseClient } from '@supabase/supabase-js';

export type ApiConfig = {
  client: SupabaseClient;
};

// Core entity types
export type User = {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  last_active_at: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  owner_id: string;  // Match database column name
  is_public: boolean;  // Match database column name
  template_id?: string;
  created_at: string;
  updated_at: string;
};

export type ProjectFile = {
  id: string;
  project_id: string;
  name: string;
  path: string;
  content?: string;
  file_type: 'file' | 'directory';
  mime_type?: string;
  size_bytes: number;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
};

export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  permissions: Record<string, unknown>;
  invited_by?: string;
  joined_at: string;
};

// Query types
export type PaginationParams = {
  page?: number;
  per_page?: number;
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
  per_page: number;
}>;
