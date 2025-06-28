import { SupabaseClient } from '@supabase/supabase-js';

export type ApiConfig = {
  client: SupabaseClient;
};

// Core entity types
export type User = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  last_active_at: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  language?: string;
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

export interface ShareInvitation {
  email: string;
  role: 'viewer' | 'editor';
  message?: string;
};

export interface ShareableLink {
  token: string;
  permissions: 'viewer' | 'editor';
  expires_at?: string;
};

// Query types
export type PaginationParams = {
  page?: number;
  per_page?: number;
  cursor?: string;
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
  nextCursor?: string;
}>;

// === Chat feature types for chat API integration ===
export type ChatRoom = {
  id: string;
  project_id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  message_type: string;
  metadata: Record<string, any> | null;
  reply_to_id?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
};
