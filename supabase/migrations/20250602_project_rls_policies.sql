-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Allow users to create projects they own
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Allow users to view projects they own or that are public
CREATE POLICY "Users can view accessible projects" ON projects
  FOR SELECT USING (
    is_public = true OR 
    owner_id = auth.uid() OR 
    id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

-- Allow users to update their own projects
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (owner_id = auth.uid());

-- Allow users to delete their own projects
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (owner_id = auth.uid());
