import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, User, Code, Clock, Users, ChevronDown, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Project {
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
  onOpenProject: (project: Project) => void;
}

const Dashboard = ({ onOpenProject }: DashboardProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'owned' | 'shared'>('all');
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

  const createProject = (language: string) => {
    console.log(`Creating new ${language} project`);
    // This would typically create a new project and navigate to it
  };

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
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/'); // Navigate to root path even if signout fails
    }
  };

  return (
    <div className="min-h-screen dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900/95 dark:backdrop-blur-sm shadow-lg dark:shadow-indigo-900/20 border-b dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Code className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CodeCollab</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/profile')}
                className="relative cursor-pointer"
              >
                <User className="text-gray-400 bg-gray-100 rounded-full p-1 hover:bg-gray-200 dark:bg-slate-800/50 dark:hover:bg-slate-700/70 transition-colors duration-200" />
              </button>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome back, {user?.email?.split('@')[0]}!</h2>
          <p className="text-gray-600 dark:text-white">Continue working on your collaborative projects or start something new.</p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg dark:bg-indigo-600 dark:hover:bg-indigo-500 flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Create New Project</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              {supportedLanguages.map((lang) => (
                <DropdownMenuItem
                  key={lang.name}
                  onClick={() => createProject(lang.name)}
                  className="cursor-pointer"
                >
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Stats Cards */}
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

        {/* Project Tabs */}
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

       {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project, index) => (
            <Card 
              key={index} 
              className="bg-white dark:bg-slate-800/40 dark:backdrop-blur-sm rounded-xl shadow-sm hover:shadow-lg dark:shadow-indigo-900/10 dark:hover:shadow-indigo-900/30 transition-all duration-200 cursor-pointer border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-indigo-500/50"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">{project.name}</h4>
                  {project.isOwner && (
                    <Badge variant="secondary" className="text-xs">Owner</Badge>
                  )}
                </div>
                
                {project.description && (
                  <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-2 mb-4">{project.description}</p>
                )}
                
                <div className="space-y-3">
                  <Badge className={`${getLanguageColor(project.language)} text-xs font-medium`}>
                    {project.language}
                  </Badge>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <div className="flex -space-x-1">
                        {project.collaboratorAvatars?.slice(0, 3).map((avatar, index) => (
                          <div
                            key={index}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white dark:border-slate-800"
                            style={{ backgroundColor: avatar.color }}
                          >
                            {avatar.initials}
                          </div>
                        ))}
                        {project.collaboratorAvatars?.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-slate-300 border-2 border-white dark:border-slate-800">
                            +{project.collaboratorAvatars.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {project.collaborators}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                      <span className="text-sm text-gray-500 dark:text-slate-400">{project.lastModified}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
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
