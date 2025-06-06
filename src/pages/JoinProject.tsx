// Updated JoinProject.tsx - Replace the existing component with this

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApi } from '@/contexts/ApiContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, XCircle, Users, Eye, Edit, AlertTriangle, RefreshCw } from 'lucide-react';

const JoinProject = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { collaborationApi } = useApi();
  const { user, isReady } = useAuth();
  const { toast } = useToast();

  const [isValidating, setIsValidating] = useState(true);
  const [shareLink, setShareLink] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinStep, setJoinStep] = useState<'validating' | 'ready' | 'joining' | 'success' | 'error'>('validating');

  useEffect(() => {
    if (token && isReady) {
      setJoinStep('validating');
      validateToken();
    }
  }, [token, isReady]);

  const validateToken = async () => {
    if (!token) {
      setError('Invalid share link - no token provided');
      setJoinStep('error');
      return;
    }

    try {
      console.log('Validating share token...');
      
      const { data, error } = await collaborationApi.validateShareToken(token);
      
      if (error || !data) {
        console.error('Token validation failed:', error);
        setError(error?.message || 'Invalid or expired share link');
        setJoinStep('error');
      } else {
        console.log('Token validated successfully:', data);
        setShareLink(data);
        setJoinStep('ready');
      }
    } catch (error) {
      console.error('Error validating share token:', error);
      setError('Failed to validate share link. Please try again.');
      setJoinStep('error');
    }
  };

  const joinProject = async () => {
    if (!user || !token) {
      setError('User not authenticated or invalid token');
      return;
    }

    try {
      setJoinStep('joining');
      
      const { data, error } = await collaborationApi.joinProjectByToken(token, user.id);
      
      if (error) {
        console.error('Failed to join project:', error);
        toast({
          title: 'Failed to Join Project',
          description: error.message,
          variant: 'destructive'
        });
        setError(error.message);
        setJoinStep('error');
        return;
      }

      console.log('Successfully joined project:', data);
      
      setJoinStep('success');
      
      toast({
        title: 'Successfully Joined Project!',
        description: `You now have ${shareLink.permissions} access to "${shareLink.project?.name}"`,
        duration: 5000
      });

      // Wait a moment to show success, then navigate
      setTimeout(() => {
        navigate(`/editor/${shareLink.project_id}`);
      }, 2000);

    } catch (error) {
      console.error('Error joining project:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while joining the project',
        variant: 'destructive'
      });
      setError('An unexpected error occurred while joining the project');
      setJoinStep('error');
    } finally {
      setIsJoining(false);
    }
  };

  const retryValidation = () => {
    setError(null);
    setJoinStep('validating');
    setIsValidating(true);
    validateToken();
  };

  const getPermissionIcon = (permission: string) => {
    return permission === 'editor' ? <Edit className="h-5 w-5" /> : <Eye className="h-5 w-5" />;
  };

  const getPermissionText = (permission: string) => {
    return permission === 'editor' ? 'Edit Access' : 'View Access';
  };

  const getPermissionDescription = (permission: string) => {
    return permission === 'editor' 
      ? 'You can view, edit, and collaborate on this project'
      : 'You can view and comment on this project';
  };

  // Loading/Validating state
  if (joinStep === 'validating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold mb-2">Validating Invitation</h2>
          <p className="text-gray-600">Please wait while we verify your invitation...</p>
        </Card>
      </div>
    );
  }

  // Error state
  if (joinStep === 'error' || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-red-800">Unable to Join Project</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Button onClick={retryValidation} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Success state
  if (joinStep === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-green-800">Successfully Joined!</h2>
          <p className="text-gray-600 mb-4">
            You are now a collaborator on "{shareLink.project?.name}"
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 text-green-800">
              {getPermissionIcon(shareLink.permissions)}
              <span className="font-medium">{getPermissionText(shareLink.permissions)}</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              {getPermissionDescription(shareLink.permissions)}
            </p>
          </div>
          <p className="text-sm text-gray-500">Redirecting to project...</p>
        </Card>
      </div>
    );
  }

  // Auth required state
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-8 text-center">
          <Users className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Join Project Collaboration</h2>
          <p className="text-gray-600 mb-6">
            You've been invited to collaborate on "{shareLink?.project?.name}". 
            Please sign in to continue.
          </p>
          <div className="space-y-3">
            <Button onClick={() => navigate('/signin')} className="w-full">
              Sign In
            </Button>
            <Button onClick={() => navigate('/register')} variant="outline" className="w-full">
              Create Account
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Ready to join state
  if (joinStep === 'ready' && shareLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Project Invitation</h2>
            <p className="text-gray-600">
              You've been invited to collaborate on this project
            </p>
          </div>

          {/* Project Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">{shareLink.project?.name}</h3>
            {shareLink.project?.description && (
              <p className="text-sm text-gray-600 mb-3">{shareLink.project.description}</p>
            )}
            
            <div className="flex items-center space-x-2 text-sm">
              {getPermissionIcon(shareLink.permissions)}
              <span className="font-medium">{getPermissionText(shareLink.permissions)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {getPermissionDescription(shareLink.permissions)}
            </p>

            {shareLink.expires_at && (
              <div className="mt-3 flex items-center space-x-1 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                <span>
                  Expires: {new Date(shareLink.expires_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              onClick={joinProject} 
              disabled={joinStep === 'joining'}
              className="w-full"
            >
              {joinStep === 'joining' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining Project...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Join Project
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => navigate('/dashboard')} 
              variant="outline" 
              className="w-full"
              disabled={joinStep === 'joining'}
            >
              Go to Dashboard
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-gray-500">
              By joining this project, you agree to collaborate respectfully 
              and follow the project guidelines.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Fallback loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <h2 className="text-xl font-semibold mb-2">Loading...</h2>
        <p className="text-gray-600">Please wait...</p>
      </Card>
    </div>
  );
};

export default JoinProject;