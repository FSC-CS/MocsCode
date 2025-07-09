import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';

const Index = () => {
  const { user, isLoading } = useAuth(); 

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

  // Always show dashboard (remove editor state logic)
  return <Dashboard />;
};

export default Index;
