import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '@/contexts/ApiContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import CodeEditor from '@/components/CodeEditor';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ProjectsApi } from '@/lib/api/projects';

const Editor = () => {
  const { projectId } = useParams<{ projectId: string; projectName?: string }>();
  const navigate = useNavigate();
  const { projectsApi } = useApi();
  const { user, isReady } = useAuth();
  const { toast } = useToast();

  // Use React Query to fetch and cache the project data
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId || !user) return null;
      
      // Get the project data
      const { data, error: fetchError } = await projectsApi.getProject(projectId);
      if (fetchError) throw fetchError;
      
      if (!data) {
        throw new Error('Project not found');
      }
      
      return data;
    },
    enabled: !!projectId && isReady && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1
  });

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Loading state
  if (!isReady || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading project...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold mb-2">
            {error?.message || 'Project not found'}
          </h2>
          <button
            onClick={handleBackToDashboard}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    navigate('/signin');
    return null;
  }

  return (
    <CodeEditor 
      project={project} 
      onBack={handleBackToDashboard} 
    />
  );
};

export default Editor;
