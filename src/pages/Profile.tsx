import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Camera, Edit2, Save, Users, Clock, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext'    

interface Project {
  id: string;
  name: string;
  language: string;
  lastModified: string;
  collaborators: number;
  description?: string;
  collaboratorAvatars: { initials: string; color: string }[];
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    username: 'student123',
    email: '',
    bio: 'Computer Science student passionate about algorithms and web development. Currently working on data structures and machine learning projects.',
    profilePicture: null as string | null
  });

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        email: user.email || '',
        username: user.email?.split('@')[0] || 'student123'
      }));
    }
  }, [user]);

  // Mock user's owned projects (latest 3)
  const userProjects: Project[] = [
    {
      id: '1',
      name: 'Data Structures Assignment',
      language: 'Java',
      lastModified: '2 hours ago',
      collaborators: 3,
      description: 'Implementing sorting algorithms for CS210',
      collaboratorAvatars: [
        { initials: 'SK', color: '#ef4444' },
        { initials: 'MJ', color: '#3b82f6' }
      ]
    },
    {
      id: '3',
      name: 'Algorithm Analysis',
      language: 'Python',
      lastModified: '3 days ago',
      collaborators: 1,
      collaboratorAvatars: []
    }
  ];

  const handleSave = () => {
    setIsEditing(false);
    // Here you would typically save to a backend
    console.log('Saving profile data:', profileData);
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileData(prev => ({
          ...prev,
          profilePicture: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header Card */}
        <Card className="p-8 mb-8 bg-white shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
            {/* Profile Picture */}
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-blue-100">
                <AvatarImage src={profileData.profilePicture || undefined} />
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {getInitials(profileData.email)}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-colors">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <Input
                      value={profileData.username}
                      onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                      className="max-w-md"
                      placeholder="Enter your username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <Textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      className="max-w-md"
                      placeholder="Tell us about yourself"
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-gray-900">@{profileData.username}</h2>
                  <p className="text-lg text-gray-600">{profileData.email}</p>
                  <p className="text-gray-700 leading-relaxed max-w-2xl">{profileData.bio}</p>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="flex flex-col space-y-2">
              {isEditing ? (
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Projects Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">My Latest Projects</h3>
            <Badge variant="secondary" className="text-sm">
              {userProjects.length} project{userProjects.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {userProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className="p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 hover:border-blue-300"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="text-lg font-semibold text-gray-900 line-clamp-2">{project.name}</h4>
                      <Badge variant="secondary" className="text-xs">Owner</Badge>
                    </div>
                    
                    {project.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                    )}
                    
                    <div className="space-y-3">
                      <Badge className={`${getLanguageColor(project.language)} text-xs font-medium`}>
                        {project.language}
                      </Badge>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="flex -space-x-1">
                            {project.collaboratorAvatars.slice(0, 3).map((avatar, index) => (
                              <div
                                key={index}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white"
                                style={{ backgroundColor: avatar.color }}
                              >
                                {avatar.initials}
                              </div>
                            ))}
                            {project.collaboratorAvatars.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600 border-2 border-white">
                                +{project.collaboratorAvatars.length - 3}
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-gray-500 flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {project.collaborators}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">{project.lastModified}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center bg-white">
              <Code className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-4">Start creating projects to see them here.</p>
              <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700 text-white">
                Create Your First Project
              </Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
