import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, User, Code, Clock, Users, ChevronDown, Loader2, LogOut, LogIn, Moon, Sun } from 'lucide-react';
import { ProjectsApi } from '@/lib/api/projects';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface DashboardProject {
  id: string;
  name: string;
  language: string;
  lastModified: string;
  collaborators: number;
  isOwner: boolean;
  description?: string;
  collaboratorAvatars: { initials: string; color: string }[];
}

interface DashboardProps {
  onOpenProject: (project: DashboardProject) => void;
}

const Dashboard = ({ onOpenProject }: DashboardProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'owned' | 'shared'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [projects, setProjects] = useState<DashboardProject[]>([
=======
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const supportedLanguages = [
    { name: 'Java', extension: 'java' },
    { name: 'Python', extension: 'py' },
    { name: 'JavaScript', extension: 'js' },
    { name: 'C', extension: 'c' },
    { name: 'C++', extension: 'cpp' },
    { name: 'C#', extension: 'cs' }
  ];

  // Mock projects data with collaborator avatars
  const [projects] = useState<Project[]>([
>>>>>>> origin/michael
    {
      id: '1',
      name: 'Data Structures Assignment',
      language: 'Java',
      lastModified: '2 hours ago',
      collaborators: 3,
      isOwner: true,
      description: 'Implementing sorting algorithms for CS210',
      collaboratorAvatars: [
        { initials: 'SK', color: '#ef4444' },
        { initials: 'MJ', color: '#3b82f6' }
      ]
    },
    {
      id: '2', 
      name: 'Web Development Project',
      language: 'JavaScript',
      lastModified: '1 day ago',
      collaborators: 3,
      isOwner: false,
      description: 'Building a student portal with React',
      collaboratorAvatars: [
        { initials: 'EV', color: '#10b981' },
        { initials: 'JU', color: '#f59e0b' },
        { initials: 'JS', color: '#8b5cf6' }
      ]
    },
    {
      id: '3',
      name: 'Algorithm Analysis',
      language: 'Python',
      lastModified: '3 days ago',
      collaborators: 1,
      isOwner: true,
      collaboratorAvatars: []
    },
    {
      id: '4',
      name: 'Operating Systems Lab',
      language: 'C',
      lastModified: '1 week ago',
      collaborators: 4,
      isOwner: false,
      collaboratorAvatars: [
        { initials: 'AB', color: '#06b6d4' },
        { initials: 'CD', color: '#ec4899' },
        { initials: 'EF', color: '#84cc16' }
      ]
    }
  ]);
  
  const supportedLanguages = [
    { name: 'Java', extension: 'java' },
    { name: 'Python', extension: 'py' },
    { name: 'JavaScript', extension: 'js' },
    { name: 'C', extension: 'c' },
    { name: 'C++', extension: 'cpp' },
    { name: 'C#', extension: 'cs' }
  ];

  const { user, dbUser, signInWithGoogle, signOut, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

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
      const projectsApi = new ProjectsApi({ client: supabase });
      const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm');
      const projectName = `${language} Project - ${timestamp}`;

      const { data: project, error } = await projectsApi.createProject({
        name: projectName,
        description: `A new ${language} project`,
        owner_id: user.id,
        is_public: false
      });

      if (error) {
        toast({
          title: 'Error creating project',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      if (!project) {
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
        lastModified: 'Just now',
        collaborators: 1,
        isOwner: true,
        description: project.description,
        collaboratorAvatars: []
      };

      setProjects(prev => [newProject, ...prev]);
      toast({
        title: 'Success',
        description: 'Project created successfully'
      });

      onOpenProject(newProject);
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

  useEffect(() => {
    const loadProjects = async (): Promise<void> => {
      setIsLoading(true);
      try {
        if (!user) {
          setProjects([]);
          setIsLoading(false);
          return;
        }

        const projectsApi = new ProjectsApi({ client: supabase });
        const { data, error } = await projectsApi.listUserProjects(user.id);

        if (error) {
          console.error('API Error:', error);
          // Keep the mock data if API fails
          setIsLoading(false);
          return;
        }
        
        if (!data) {
          console.warn('No data returned from API');
          setIsLoading(false);
          return;
        }

        const dashboardProjects: DashboardProject[] = data.items.map(p => ({
          id: p.id,
          name: p.name,
          language: detectLanguage(p.name),
          lastModified: formatLastModified(p.updatedAt),
          collaborators: 1, // TODO: Implement actual collaborator count
          isOwner: p.ownerId === user.id,
          description: p.description,
          collaboratorAvatars: [] // TODO: Implement actual collaborator avatars
        }));

        setProjects(dashboardProjects);
      } catch (err) {
        console.error('Failed to load projects:', err);
        // Don't show toast error immediately, keep mock data for demo
        // toast({
        //   title: 'Error',
        //   description: 'Failed to load projects. Please refresh the page.',
        //   variant: 'destructive'
        // });
      } finally {
        setIsLoading(false);
      }
    };

    // Only load projects if we have a user and are not in the initial auth loading state
    if (!isAuthLoading) {
      loadProjects();
    }
  }, [isAuthLoading, user]);

  const getFilteredProjects = () => {
    let filtered = projects;
    
    // Filter by tab
    switch (activeTab) {
      case 'owned':
        filtered = projects.filter(p => p.isOwner);
        break;
      case 'shared':
        filtered = projects.filter(p => !p.isOwner);
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
      navigate('/signin');
    } catch (error) {
      console.error('Error logging out:', error);
    }
    <div className="min-h-screen dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      <header className="bg-white dark:bg-slate-900/95 dark:backdrop-blur-sm shadow-lg dark:shadow-indigo-900/20 border-b dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Code className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CodeCollab</h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthLoading ? (
                <Button variant="ghost" disabled>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </Button>
              ) : user ? (
                <Button variant="ghost" onClick={signOut} className="text-gray-600 hover:text-gray-900">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              ) : (
                <Button variant="ghost" onClick={signInWithGoogle} className="text-gray-600 hover:text-gray-900">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In with Google
                </Button>
              )}
              <div className="relative">
<<<<<<< HEAD
                {user ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="Profile" 
                    className="h-8 w-8 rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-slate-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-200 dark:hover:bg-slate-700/70 transition-colors duration-200">
                    {(user.user_metadata.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400"
              >
                Logout
              </button>
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
                  onClick={() => createProject(lang.name)}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
=======
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Create Project</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {supportedLanguages.map((lang) => (
                <DropdownMenuItem
                  key={lang.name}
                  onClick={() => createProject(lang.name)}
                  disabled={isCreating}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{lang.name}</span>
                    <Badge variant="outline" className="text-xs">
                      .{lang.extension}
                    </Badge>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
>>>>>>> origin/michael

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

          <Button variant="outline" onClick={handleLogout}>
            <User className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white dark:bg-slate-800/40 dark:backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-shadow">
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
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{projects.filter(p => !p.isOwner).length}</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading && !isAuthLoading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredProjects.map((project) => (
            <Card 
              key={project.id}
              className="p-6 bg-white dark:bg-slate-800/40 dark:backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{project.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                    {project.language}
                  </Badge>
                  <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    {project.collaborators} collaborators
                  </Badge>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Last modified {project.lastModified}
                  </span>
                </div>
                <Button
                  onClick={() => onOpenProject(project)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Code className="h-4 w-4" />
                  Open
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Code className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-900 dark:text-white transition-colors duration-200">Try adjusting your search or create a new project.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;