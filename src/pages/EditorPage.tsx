import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';
import { useApi } from '../contexts/ApiContext';
import { useToast } from '../components/ui/use-toast';

const EditorPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projectsApi } = useApi();
  const { toast } = useToast();
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

    fetchProject();
  }, [projectId, projectsApi, navigate, toast]);

  const handleBack = () => {
    navigate('/dashboard');
  };

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

