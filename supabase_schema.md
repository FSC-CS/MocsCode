# Collaborative Code Editor Database Schema

## Core Tables

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### projects
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  template_id UUID REFERENCES projects(id), -- for project templates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for projects table
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_public ON projects(is_public);
```

### project_files
```sql
CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL, -- full file path including directories
  content TEXT,
  file_type VARCHAR(50), -- 'file' or 'directory'
  mime_type VARCHAR(100),
  size_bytes BIGINT DEFAULT 0,
  parent_id UUID REFERENCES project_files(id), -- for directory structure
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  UNIQUE(project_id, path)
);

-- Indexes for project_files table
CREATE INDEX idx_project_files_project ON project_files(project_id);
CREATE INDEX idx_project_files_parent ON project_files(parent_id);
```

## Collaboration Tables

### project_members
```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer', -- 'owner', 'editor', 'viewer'
  permissions JSONB DEFAULT '{}', -- flexible permissions object
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(project_id, user_id)
);

-- Indexes for project_members table
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
```

### sharing_permissions
```sql
CREATE TABLE sharing_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  share_type VARCHAR(20) NOT NULL, -- 'link', 'email', 'public'
  share_token VARCHAR(255) UNIQUE, -- for shareable links
  permissions JSONB NOT NULL DEFAULT '{"read": true, "write": false, "admin": false}',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes for sharing_permissions table
CREATE INDEX idx_sharing_permissions_project ON sharing_permissions(project_id);
CREATE INDEX idx_sharing_permissions_token ON sharing_permissions(share_token);
```

## Communication Tables

### chat_rooms
```sql
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) DEFAULT 'General',
  room_type VARCHAR(20) DEFAULT 'project', -- 'project', 'direct', 'file'
  file_id UUID REFERENCES project_files(id), -- for file-specific chats
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for chat_rooms table
CREATE INDEX idx_chat_rooms_project ON chat_rooms(project_id);
```

### chat_messages
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'code', 'file', 'system'
  metadata JSONB DEFAULT '{}', -- for code snippets, file references, etc.
  reply_to_id UUID REFERENCES chat_messages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- Indexes for chat_messages table
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);
```

## Version Control Tables

### project_versions
```sql
CREATE TABLE project_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  commit_hash VARCHAR(40) UNIQUE NOT NULL,
  commit_message TEXT,
  author_id UUID NOT NULL REFERENCES users(id),
  parent_version_id UUID REFERENCES project_versions(id),
  is_main_branch BOOLEAN DEFAULT true,
  branch_name VARCHAR(100) DEFAULT 'main',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(project_id, version_number)
);

-- Indexes for project_versions table
CREATE INDEX idx_project_versions_project ON project_versions(project_id);
CREATE INDEX idx_project_versions_hash ON project_versions(commit_hash);
CREATE INDEX idx_project_versions_branch ON project_versions(project_id, branch_name);
```

### file_versions
```sql
CREATE TABLE file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_version_id UUID NOT NULL REFERENCES project_versions(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES project_files(id) ON DELETE CASCADE,
  content TEXT,
  content_hash VARCHAR(64), -- SHA-256 hash for deduplication
  change_type VARCHAR(20) NOT NULL, -- 'added', 'modified', 'deleted', 'renamed'
  old_path TEXT, -- for renames
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for file_versions table
CREATE INDEX idx_file_versions_project_version ON file_versions(project_version_id);
CREATE INDEX idx_file_versions_file ON file_versions(file_id);
CREATE INDEX idx_file_versions_hash ON file_versions(content_hash);
```

## Real-time Collaboration Tables

### active_sessions
```sql
CREATE TABLE active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_id UUID REFERENCES project_files(id) ON DELETE CASCADE,
  cursor_position JSONB, -- {line: number, column: number}
  selection_range JSONB, -- {start: {line, col}, end: {line, col}}
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_token VARCHAR(255) UNIQUE NOT NULL
);

-- Indexes for active_sessions table
CREATE INDEX idx_active_sessions_project ON active_sessions(project_id);
CREATE INDEX idx_active_sessions_file ON active_sessions(file_id);
CREATE INDEX idx_active_sessions_user ON active_sessions(user_id);
```

### file_operations
```sql
CREATE TABLE file_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES project_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation_type VARCHAR(20) NOT NULL, -- 'insert', 'delete', 'replace'
  position JSONB NOT NULL, -- {line: number, column: number}
  content TEXT,
  length INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  operation_id VARCHAR(50) NOT NULL -- for operational transform
);

-- Indexes for file_operations table
CREATE INDEX idx_file_operations_file ON file_operations(file_id);
CREATE INDEX idx_file_operations_timestamp ON file_operations(timestamp);
```

## Supporting Tables

### project_tags
```sql
CREATE TABLE project_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1', -- hex color
  
  UNIQUE(project_id, name)
);

-- Indexes for project_tags table
CREATE INDEX idx_project_tags_project ON project_tags(project_id);
```

### user_preferences
```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'dark', -- 'dark', 'light', 'auto'
  editor_settings JSONB DEFAULT '{}', -- font size, tab size, etc.
  notification_settings JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Row Level Security (RLS) Policies

Enable RLS on all tables and create policies for proper access control:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
-- ... (enable for all tables)

-- Example policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Project members can view project" ON projects
  FOR SELECT USING (
    is_public = true OR 
    owner_id = auth.uid() OR 
    id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  );
```

## Key Features of This Schema

1. **Flexible Permissions**: Uses JSONB for granular permission control
2. **Version Control**: Complete versioning system with branches and commits
3. **Real-time Collaboration**: Tracks active sessions and file operations
4. **Scalable Chat**: Supports project-wide and file-specific conversations
5. **Sharing**: Multiple sharing mechanisms (links, direct invites, public)
6. **File Management**: Hierarchical file structure with directory support
7. **Audit Trail**: Comprehensive tracking of who did what and when
8. **Performance**: Strategic indexing for common query patterns

## Next Steps

1. Set up Supabase functions for complex operations
2. Implement real-time subscriptions for collaborative features
3. Add database triggers for automatic timestamping
4. Create stored procedures for version control operations
5. Set up proper backup and migration strategies
