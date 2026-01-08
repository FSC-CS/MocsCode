import React, { useState } from 'react';
import { Pencil, Check, X as XIcon, ArrowLeft, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApi } from '@/contexts/ApiContext';
import { useToast } from '@/components/ui/use-toast';
import type { Project, UserRole } from '../types';

interface EditorHeaderProps {
  project: Project;
  onBack: () => void;
  currentUserRole: UserRole;
  children?: React.ReactNode; // For toolbar actions
}

export function EditorHeader({ 
  project, 
  onBack, 
  currentUserRole,
  children 
}: EditorHeaderProps) {
  const { toast } = useToast();
  const { projectsApi } = useApi();
  
  const [isRenaming, setIsRenaming] = useState(false);
  const [newProjectName, setNewProjectName] = useState(project?.name || '');

  const canManageProject = (): boolean => {
    return currentUserRole === 'owner';
  };

  const handleRenameProject = async () => {
    if (!project?.id || !newProjectName.trim()) return;
    
    try {
      const { error } = await projectsApi.updateProject(project.id, {
        name: newProjectName.trim()
      });
      
      if (error) throw error;
      
      project.name = newProjectName.trim();
      setIsRenaming(false);
      
      toast({
        title: 'Success',
        description: 'Project name updated successfully',
      });
    } catch (error) {
      console.error('Failed to rename project:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project name',
        variant: 'destructive',
      });
      setNewProjectName(project.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameProject();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setNewProjectName(project.name);
    }
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-2 sm:px-4 py-2">
      <div className="flex items-center justify-between w-full">
        {/* Left section - Back button and project name */}
        <div className="flex-1 flex items-center space-x-2 sm:space-x-4 min-w-0">
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-gray-300 hover:text-white hover:bg-gray-700 px-2 sm:px-3"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
          </div>
          
          <div className="hidden md:flex items-center space-x-3 min-w-0">
            {isRenaming ? (
              <div className="flex items-center space-x-2">
                <Input
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-8 w-64 bg-gray-700 text-white border-gray-600 focus-visible:ring-1 focus-visible:ring-blue-500"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-500 hover:bg-green-900/20 hover:text-green-400"
                  onClick={handleRenameProject}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                  onClick={() => {
                    setIsRenaming(false);
                    setNewProjectName(project.name);
                  }}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center group min-w-0">
                <h1 className="text-lg font-semibold text-white truncate max-w-[200px] md:max-w-none" title={project?.name}>
                  {project?.name.length > 10 ? (
                    <>
                      <span className="hidden lg:inline">{project?.name}</span>
                      <span className="lg:hidden">
                        {project?.name.length > 10 ? `${project?.name.substring(0, 10)}...` : project?.name}
                      </span>
                    </>
                  ) : (
                    project?.name
                  )}
                </h1>
                {canManageProject() && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white hover:bg-gray-700"
                    onClick={() => {
                      setNewProjectName(project.name);
                      setIsRenaming(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MocsCode Branding - Center section */}
        <div className="flex-1 flex items-center justify-center px-2">
          <div className="flex items-center">
            <Code className="h-8 w-8 text-blue-500 mr-2 mt-1" />
            <span className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent whitespace-nowrap">
              MocsCode
            </span>
          </div>
        </div>

        {/* Right section - Action buttons (passed as children) */}
        <div className="flex-1 flex items-center justify-end space-x-1 sm:space-x-2 md:space-x-3 overflow-x-auto py-1">
          {children}
        </div>
      </div>
    </header>
  );
}
