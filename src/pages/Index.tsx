
import React, { useState } from 'react';
import Dashboard from '../components/Dashboard';
import CodeEditor from '../components/CodeEditor';

const Index = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const [currentProject, setCurrentProject] = useState<any>(null);

  const openProject = (project: any) => {
    setCurrentProject(project);
    setCurrentView('editor');
  };

  const backToDashboard = () => {
    setCurrentView('dashboard');
    setCurrentProject(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'dashboard' ? (
        <Dashboard onOpenProject={openProject} />
      ) : (
        <CodeEditor project={currentProject} onBack={backToDashboard} />
      )}
    </div>
  );
};

export default Index;
