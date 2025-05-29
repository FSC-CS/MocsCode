
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import CodeEditor from '../components/CodeEditor';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const [currentProject, setCurrentProject] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/landing');
    } else {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const openProject = (project: any) => {
    setCurrentProject(project);
    setCurrentView('editor');
  };

  const backToDashboard = () => {
    setCurrentView('dashboard');
    setCurrentProject(null);
  };

  

  return (
    <div className="min-h-screen dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      <main>
        {currentView === 'dashboard' ? (
          <Dashboard onOpenProject={openProject} />
        ) : (
          <CodeEditor project={currentProject} onBack={backToDashboard} />
        )}
      </main>
    </div>
  );
};

export default Index;
