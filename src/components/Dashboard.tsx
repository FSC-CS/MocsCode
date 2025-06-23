import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import ProjectCard from './ProjectCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogIn, Plus, Search, User, Code, Clock, Users, ChevronDown, Loader2, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/contexts/ApiContext';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/UserAvatar';
import { PaginationParams, SortParams, Project, PaginatedResponse } from '@/lib/api/types';

interface DashboardProject {
  id: string;
  name: string;
  language: string;
  last_modified: string;
  collaborators: number;
  is_owner: boolean;
  description?: string;
  collaborator_avatars: { initials: string; color: string }[];
  initials: string;
  color: string;
}

interface DashboardProps {
  // onOpenProject is no longer needed, navigation is handled internally
}

const listProjects = async (
  projectsApi: any,
  pagination?: PaginationParams,
  sort?: SortParams,
  filters?: { owner_id?: string; is_public?: boolean }
): Promise<PaginatedResponse<Project>> => {
  return projectsApi.list(pagination, sort, filters);
};

const Dashboard = (/* { onOpenProject }: DashboardProps */) => {
  // New: project-specific loading state
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'owned' | 'shared'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [projectCollaborators, setProjectCollaborators] = useState<Record<string, {id: string, email: string, username: string, display_name: string, avatar_url: string | null}[]>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentDeletingId, setCurrentDeletingId] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [currentLeavingId, setCurrentLeavingId] = useState<string | null>(null);
  
  const { user, dbUser, signInWithGoogle, signOut, isLoading: isAuthLoading, isSigningOut, isReady } = useAuth();
  const { projectsApi, projectMembersApi } = useApi();
  const navigate = useNavigate();
  const { toast } = useToast();

  const supportedLanguages = [
    { name: 'Java', extension: 'java' },
    { name: 'Python', extension: 'py' },
    { name: 'JavaScript', extension: 'js' },
    { name: 'C', extension: 'c' },
    { name: 'C++', extension: 'cpp' },
    { name: 'C#', extension: 'cs' }
  ];

  // Generate consistent color from string
const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 80%)`;
};

// Generate user initials from user object
const generateUserInitials = (user: { display_name?: string; username?: string; email?: string }): string => {
  const name = user.display_name || user.username || user.email || 'U';
  return name
    .split(' ')
    .map(part => part[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('');
};

const detectLanguage = (projectName: string): string => {
  const nameLower = projectName.toLowerCase();
  for (const lang of supportedLanguages) {
    if (nameLower.includes(lang.name.toLowerCase())) {
      return lang.name;
    }
  }
  return 'JavaScript'; // Default language
};

  const formatLastModified = (date: string): string => {
    const now = new Date();
    const modified = new Date(date);
    const diffInHours = Math.floor((now.getTime() - modified.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return '1+ week ago';
  };

  const createProject = async (language: string): Promise<void> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a project',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm');
      const projectName = `${language} Project - ${timestamp}`;

      const { data: project, error } = await projectsApi.createProject({
        name: projectName,
        description: `A new ${language} project`,
        owner_id: user.id,
        is_public: false
      });

      if (error) {
        console.error('Project creation failed:', error);
        toast({
          title: 'Error creating project',
          description: error.message || 'Failed to create project. Please try again.',
          variant: 'destructive'
        });
        return;
      }

      if (!project) {
        console.error('No project data returned from API');
        toast({
          title: 'Error',
          description: 'No project data returned',
          variant: 'destructive'
        });
        return;
      }


      const newProject: DashboardProject = {
        id: project.id,
        name: project.name,
        language,
        last_modified: 'Just now',
        collaborators: 1,
        is_owner: true,
        description: project.description,
        collaborator_avatars: [],
        initials: '',
        color: ''
      };

      setProjects(prev => [newProject, ...prev]);
      toast({
        title: 'Success',
        description: 'Project created successfully'
      });

      // Navigate to the editor with the new project
      const projectNameSlug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      navigate(`/editor/${newProject.id}/${projectNameSlug}`);
    } catch (err) {
      console.error('Failed to create project:', err);
      toast({
        title: 'Error',
        description: 'Failed to create project. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setAuthError(null);
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthError('Failed to sign in. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthError(null);
      await signOut();
      navigate('/'); // Redirect to landing page after successful sign-out
    } catch (error) {
      console.error('Sign out error:', error);
      setAuthError('Failed to sign out. Please try again.');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!user) return;
    
    setIsDeleting(true);
    setCurrentDeletingId(projectId);
    
    try {
      const { error } = await projectsApi.deleteProject(projectId);
      
      if (error) {
        console.error('Failed to delete project:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete project',
          variant: 'destructive',
        });
        return;
      }
      
      // Update the projects list
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      });
      
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while deleting the project',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setCurrentDeletingId(null);
    }
  };

  const handleLeaveProject = async (projectId: string) => {
    if (!user?.id) return;
    
    setIsLeaving(true);
    setCurrentLeavingId(projectId);
    
    try {
      // First, get the project member ID for the current user
      const { data: memberData, error: memberError } = await projectMembersApi.getUserRole(projectId, user.id);
      
      if (memberError || !memberData) {
        console.error('Failed to find project member:', memberError);
        toast({
          title: 'Error',
          description: 'Failed to find your membership in this project',
          variant: 'destructive',
        });
        return;
      }
      
      // Remove the member from the project
      const { error: removeError } = await projectMembersApi.removeMemberFromProject(memberData.id, user.id);
      
      if (removeError) {
        console.error('Failed to leave project:', removeError);
        toast({
          title: 'Error',
          description: removeError.message || 'Failed to leave project',
          variant: 'destructive',
        });
        return;
      }
      
      // Update the projects list by removing the left project
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      toast({
        title: 'Success',
        description: 'You have left the project',
      });
      
    } catch (error) {
      console.error('Error leaving project:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while leaving the project',
        variant: 'destructive',
      });
    } finally {
      setIsLeaving(false);
      setCurrentLeavingId(null);
    }
  };

  // NEW: Handler for profile picture click
  const handleProfileClick = () => {
    navigate('/profile');
  };

  useEffect(() => {
  // Reset states when auth changes
  if (!isReady) {
    setIsLoading(true);
    setIsProjectsLoading(false);
    setHasAttemptedLoad(false);
    return;
  }

  if (!user || !dbUser?.id) {
    setIsLoading(false);
    setProjects([]);
    setIsProjectsLoading(false);
    setHasAttemptedLoad(false);
    return;
  }

  // Only start loading if we haven't attempted yet or need to refresh
  if (hasAttemptedLoad) return;

  const loadProjectCollaborators = async (projectId: string) => {
    try {
      // First get the project to find the owner
      const { data: projectData } = await projectsApi.getProject(projectId);
      if (!projectData) return;
      
      const ownerId = projectData.owner_id;
      
      // Then get all members and filter out the owner
      const { data } = await projectMembersApi.listProjectMembers(projectId);
      if (data?.items) {
        // Filter out the owner and map the remaining members
        const collaborators = data.items
          .filter((item: any) => item.user_id !== user.id)
          .map((item: any) => ({
            id: item.user_id,
            email: item.user?.email || '',
            username: item.user?.username || '',
            display_name: item.user?.display_name || '',
            avatar_url: item.user?.avatar_url || null
          }));
          
        setProjectCollaborators(prev => ({
          ...prev,
          [projectId]: collaborators
        }));
      }
    } catch (error) {
      console.error('Error loading project collaborators:', error);
    }
  };

  const loadProjects = async () => {
    setIsProjectsLoading(true);
    setHasAttemptedLoad(true);
    try {
      const { data, error } = await projectsApi.listUserProjects(user.id);
      // Check if user is still authenticated
      if (!user || !dbUser) return;
      if (error) {
        console.error('API Error:', error);
        toast({
          title: 'Error',
          description: 'Failed to load projects. Please try again.',
          variant: 'destructive'
        });
        setProjects([]);
        return;
      }
      if (!data || !data.items || data.items.length === 0) {
        setProjects([]);
        return;
      }
      
      const dashboardProjects: DashboardProject[] = [];
      
      // First create all projects with basic info
      for (const p of data.items) {
        const projectData: DashboardProject = {
          id: p.id,
          name: p.name,
          description: p.description,
          language: detectLanguage(p.name),
          last_modified: p.updated_at ? formatLastModified(p.updated_at) : 'Unknown',
          collaborators: 1, // Will be updated after loading members
          is_owner: p.owner_id === user.id,
          collaborator_avatars: [], // Will be populated after loading members
          initials: p.name.substring(0, 2).toUpperCase(),
          color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 80%)`
        };
        dashboardProjects.push(projectData);
        
        // Load collaborators for each project
        loadProjectCollaborators(p.id);
      }
      
      setProjects(dashboardProjects);
    } catch (err) {
      console.error('Failed to load projects:', err);
      if (user && dbUser) {
        toast({
          title: 'Error',
          description: 'Failed to load projects. Please try again.',
          variant: 'destructive'
        });
      }
      setProjects([]);
    } finally {
      setIsProjectsLoading(false);
      setIsLoading(false);
    }
  };
  loadProjects();
}, [isReady, user, dbUser, hasAttemptedLoad, projectsApi, toast]);

  const getFilteredProjects = () => {
    let filtered = projects;
    
    // Filter by tab
    switch (activeTab) {
      case 'owned':
        filtered = projects.filter(p => p.is_owner);
        break;
      case 'shared':
        filtered = projects.filter(p => !p.is_owner);
        break;
      default:
        filtered = projects;
    }
    
    // Filter by search term
    return filtered.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getLanguageColor = (language: string) => {
    const colors: { [key: string]: string } = {
      'Java': 'bg-orange-100 text-orange-800',
      'JavaScript': 'bg-yellow-100 text-yellow-800',
      'Python': 'bg-blue-100 text-blue-800',
      'C': 'bg-gray-100 text-gray-800',
      'C++': 'bg-purple-100 text-purple-800',
      'C#': 'bg-green-100 text-green-800'
    };
    return colors[language] || 'bg-gray-100 text-gray-800';
  };

  const filteredProjects = getFilteredProjects();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      <header className="bg-white dark:bg-slate-900/95 dark:backdrop-blur-sm shadow-lg dark:shadow-indigo-900/20 border-b dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Code className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MocsCode</h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthLoading ? (
                <Button variant="ghost" disabled>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </Button>
              ) : user ? (
                <Button 
                  variant="ghost" 
                  onClick={handleSignOut} 
                  disabled={isSigningOut}
                  className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  {isSigningOut ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  onClick={handleSignIn} 
                  disabled={isSigningIn}
                  className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In with Google
                    </>
                  )}
                </Button>
              )}
              <div className="relative">
                {user ? (
                  <div 
                    onClick={handleProfileClick}
                    className="cursor-pointer transition-transform hover:scale-105"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleProfileClick();
                      }
                    }}
                    aria-label="Go to profile"
                  >
                    <UserAvatar 
                      src={user.user_metadata?.avatar_url}
                      name={user.user_metadata?.full_name || user.email}
                      email={user.email}
                      size="sm"
                      className="ring-2 ring-transparent hover:ring-blue-300 transition-all duration-200"
                    />
                  </div>
                ) : (
                  <User className="h-8 w-8 text-gray-400 bg-gray-100 rounded-full p-1 hover:bg-gray-200 dark:bg-slate-800/50 dark:hover:bg-slate-700/70 transition-colors duration-200" />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {user?.user_metadata.name || user?.email?.split('@')[0]}!
          </h2>
          <p className="text-gray-600 dark:text-gray-300">Continue working on your collaborative projects or start something new.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Create Project</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {supportedLanguages.map((lang) => (
                <DropdownMenuItem 
                  key={lang.name} 
                  onClick={() => createProject(lang.name)}
                  disabled={isCreating}
                >
                  <div className="flex items-center gap-2">
                    {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <span className="text-sm font-medium">{lang.name}</span>
                    <Badge variant="outline" className="text-xs">
                      .{lang.extension}
                    </Badge>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white dark:bg-slate-800/40 dark:backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-white">Total Projects</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{projects.length}</p>
              </div>
              <Code className="h-12 w-12 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-800/40 dark:backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-white">Collaborations</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{projects.filter(p => !p.is_owner).length}</p>
              </div>
              <Users className="h-12 w-12 text-green-500" />
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-800/40 dark:backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-white">Active Today</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">2</p>
              </div>
              <Clock className="h-12 w-12 text-purple-500" />
            </div>
          </Card>
        </div>

        <div className="mb-6">
          <div className="flex space-x-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              All Projects
            </button>
            <button
              onClick={() => setActiveTab('owned')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'owned'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Owned by me
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'shared'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Shared with me
            </button>
          </div>
        </div>

        {(() => {
          const isActuallyLoading = !isReady || isProjectsLoading || (isReady && !hasAttemptedLoad);
          if (isActuallyLoading) {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ProjectsLoadingSkeleton />
              </div>
            );
          }
          if (filteredProjects.length === 0) {
            return (
              <div className="col-span-full">
                <EmptyProjectsState activeTab={activeTab} />
              </div>
            );
          }
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={{
                    ...project,
                    // Use actual collaborators if available, otherwise fallback to the current data
                    collaborators: projectCollaborators[project.id]?.length || project.collaborators,
                    collaborator_avatars: projectCollaborators[project.id]?.map(user => ({
                      id: user.id,
                      initials: generateUserInitials(user),
                      color: stringToColor(user.email || user.id),
                      name: user.display_name || user.username || user.email || 'U',
                      email: user.email
                    })) || []
                  }}
                  onOpen={(project: DashboardProject) => {
                    const projectName = project.name.toLowerCase().replace(/\s+/g, '-');
                    navigate(`/editor/${project.id}/${projectName}`);
                  }}
                  onDelete={project.is_owner ? handleDeleteProject : undefined}
                  onLeave={!project.is_owner ? handleLeaveProject : undefined}
                  isDeleting={isDeleting}
                  currentDeletingId={currentDeletingId}
                  isLeaving={isLeaving}
                  currentLeavingId={currentLeavingId}
                />
              ))}
            </div>
          );
        })()}

      </main>
      {authError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg">
          {authError}
        </div>
      )}
    </div>
  );
};

// Skeleton loader for project cards
const ProjectsLoadingSkeleton = () => (
  <>
    {[...Array(6)].map((_, index) => (
      <Card key={index} className="p-6 animate-pulse bg-white dark:bg-slate-800/40 dark:backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
          <div className="space-x-2">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 inline-block"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20 inline-block"></div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
      </Card>
    ))}
  </>
);

// Contextual empty state
const EmptyProjectsState = ({ activeTab }: { activeTab: string }) => {
  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'owned':
        return {
          title: "No projects created yet",
          description: "Start by creating your first project using the Create Project button above.",
          action: "Create your first project"
        };
      case 'shared':
        return {
          title: "No shared projects",
          description: "You haven't been invited to any projects yet. Ask colleagues to share their projects with you.",
          action: "Learn about collaboration"
        };
      default:
        return {
          title: "No projects found",
          description: "Try adjusting your search or create a new project to get started.",
          action: "Create a project"
        };
    }
  };
  const message = getEmptyMessage();
  return (
    <div className="text-center py-16">
      <Code className="h-20 w-20 text-gray-300 mx-auto mb-6" />
      <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">
        {message.title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {message.description}
      </p>
    </div>
  );
};

export default Dashboard;