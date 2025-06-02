import { createContext, useContext } from 'react';
import { AuthApi } from '@/lib/api/auth';
import { ProjectsApi } from '@/lib/api/projects';
import { supabase } from '@/lib/supabase';

interface ApiContextType {
  authApi: AuthApi;
  projectsApi: ProjectsApi;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

// Initialize APIs once
const authApi = new AuthApi({ client: supabase });
const projectsApi = new ProjectsApi({ client: supabase });

export function ApiProvider({ children }: { children: React.ReactNode }) {
  return (
    <ApiContext.Provider value={{ authApi, projectsApi }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}
