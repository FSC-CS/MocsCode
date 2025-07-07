import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import CodeEditor from '../components/CodeEditor';
import { useApi } from '../contexts/ApiContext';
import { useToast } from '../components/ui/use-toast';
import { Navigate } from 'react-router-dom';

const EditorPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projectsApi } = useApi();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [project, setProject] = useState<any>({
    id: projectId || '',
    name: 'Loading...',
    language: 'javascript',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        navigate('/dashboard');
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await projectsApi.getProject(projectId);
        
        if (error || !data) {
          throw new Error(error?.message || 'Failed to load project');
        }
        
        setProject(data);
      } catch (err) {
        console.error('Error loading project:', err);
        toast({
          title: 'Error',
          description: 'Failed to load project. Redirecting to dashboard.',
          variant: 'destructive',
        });
        // Redirect after a short delay
        setTimeout(() => navigate('/dashboard'), 2000);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch project if user is authenticated
    if (user) {
      fetchProject();
    }
  }, [projectId, projectsApi, navigate, toast, user]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Wait for auth to be ready
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Redirect to landing if not authenticated
  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Loading project...</div>;
  }

  return (
    <div className="h-screen">
      <CodeEditor 
        project={project} 
        onBack={handleBack} 
      />
    </div>
  )};

export default EditorPage;
