import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '@/contexts/ApiContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import CodeEditor from '@/components/CodeEditor';
import { Loader2 } from 'lucide-react';

const Editor = () => {
  const { projectId, projectName } = useParams<{ projectId: string; projectName?: string }>(); // projectName is optional, for URL only
  const navigate = useNavigate();
  const { projectsApi } = useApi();
  const { user, isReady } = useAuth();
  const { toast } = useToast();
  
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId || !isReady || !user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await projectsApi.getProject(projectId);
        if (error) throw error;
        
        if (!data) {
          setError('Project not found');
          return;
        }
        
        setProject(data);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Failed to load project');
        toast({
          title: 'Error',
          description: 'Failed to load project',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId, projectsApi, user, isReady, toast]);

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
            {error || 'Project not found'}
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
