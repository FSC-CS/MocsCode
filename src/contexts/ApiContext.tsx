// ApiContext.tsx - API Context for the application

import React, { createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { UsersApi } from '@/lib/api/users';
import { ProjectsApi } from '@/lib/api/projects';
import { ProjectMembersApi } from '@/lib/api/project-members';
import { ProjectFilesApi } from '@/lib/api/project-files';
import { CollaborationApi } from '@/lib/api/collaboration';
import { AuthApi } from '@/lib/api/auth';

// Create API instances
const apiConfig = { client: supabase };

const apis = {
  usersApi: new UsersApi(apiConfig),
  projectsApi: new ProjectsApi(apiConfig),
  projectMembersApi: new ProjectMembersApi(apiConfig),
  projectFilesApi: new ProjectFilesApi(apiConfig),
  collaborationApi: new CollaborationApi(apiConfig),
  authApi: new AuthApi(apiConfig),
  supabase // Also export the raw client
};

// Create context
const ApiContext = createContext<typeof apis | null>(null);

// Provider component
export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ApiContext.Provider value={apis}>
      {children}
    </ApiContext.Provider>
  );
};

// Hook to use the API context - THIS MUST BE EXPORTED
export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

// Also export individual APIs if needed
export const { 
  usersApi, 
  projectsApi, 
  projectMembersApi, 
  projectFilesApi, 
  collaborationApi, 
  authApi 
} = apis;

// Export the supabase client directly
export { supabase };

export default ApiContext;