import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';

const EditorPage: React.FC = () => {
  const { projectId, projectName } = useParams<{ projectId: string; projectName?: string }>();
  const navigate = useNavigate();

  // Mock project data - replace with actual data fetching
  const project = {
    id: projectId || '',
    name: projectName || 'Untitled Project',
    language: 'javascript', // Default language
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="h-screen">
      <CodeEditor 
        project={project} 
        onBack={handleBack} 
      />
    </div>
  );
};

export default EditorPage;
