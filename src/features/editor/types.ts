// Editor feature types

export interface Project {
  id: string;
  name: string;
  owner_id: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  is_public?: boolean;
}

export interface ProjectMemberUser {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar_url?: string;
}

export interface BaseProjectMember {
  id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  user: ProjectMemberUser;
  project_id: string;
  permissions: Record<string, unknown>;
  joined_at: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export type ProjectMember = BaseProjectMember;
export type EnhancedMember = Required<BaseProjectMember>;

export interface Collaborator {
  id: number;
  name: string;
  color: string;
  cursor: { line: number; column: number } | null;
  isTyping: boolean;
  accessLevel: 'owner' | 'edit' | 'view';
}

export interface OpenFile {
  id?: string;
  name: string;
  content: string;
  language: string;
  ytext: any;
  provider: any;
  lastSaved?: string;
  isDirty?: boolean;
}

export interface CodeEditorProps {
  project: Project;
  onBack: () => void;
  collaborators?: Collaborator[];
}

export interface EditorSettings {
  tabSize: number;
  autocomplete: boolean;
  syntaxTheme: string;
}

export interface MemberOperationStatus {
  type: 'idle' | 'adding' | 'updating' | 'removing' | 'error';
  error?: Error;
  memberId?: string;
}

export type UserRole = 'owner' | 'editor' | 'viewer' | null;
