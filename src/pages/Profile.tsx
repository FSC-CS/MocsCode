import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Camera, Edit2, Save, Users, Clock, Code, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext'    
import { useTheme } from 'next-themes';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';
import { useApi } from '@/contexts/ApiContext';

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
  // ...existing state
  const [avatarLoading, setAvatarLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const { usersApi } = useApi();
  const navigate = useNavigate();
  const { user: authUser, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const { theme, setTheme } = useTheme();
  const [profileData, setProfileData] = useState({
    username: 'student123',
    email: '',
    bio: 'Computer Science student passionate about algorithms and web development. Currently working on data structures and machine learning projects.',
    profilePicture: null as string | null
  });
  const [customUser, setCustomUser] = useState<any>(null);
const [profileLoading, setProfileLoading] = useState(true);

  const handleSave = async () => {
    setIsEditing(false);
    // Only update if username changed
    if (!customUser || profileData.username === customUser.name) return;
    try {
      // Optionally: Set a loading state here
      const { error, data } = await usersApi.updateUser(authUser.id, { name: profileData.username });
      if (error) {
        alert('Failed to update username: ' + error.message);
        return;
      }
      // Update local customUser state with new name
      setCustomUser((prev: any) => ({ ...prev, name: profileData.username }));
      // Optionally: Show success toast
      if (window && (window as any).toast) {
        (window as any).toast({
          title: 'Profile Updated',
          description: 'Your username was updated!',
          variant: 'success',
        });
      }
    } catch (err: any) {
      alert('An unexpected error occurred while updating username: ' + err.message);
    }
  };

  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setAvatarUploading(true);

    try {
      // Compress and resize the image before upload
      const options = {
        maxSizeMB: 0.15, // ~150KB
        maxWidthOrHeight: 256,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const fileExt = compressedFile.name.split('.').pop() || file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload the file
      const { data, error } = await supabase.storage
        .from('avatar-images')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: compressedFile.type,
        });

      if (error) throw error;

      console.log('File uploaded successfully:', error);

      // Create a signed URL for the uploaded file
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('avatar-images')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

      if (urlError) throw urlError;
      if (!signedUrlData?.signedUrl) throw new Error('Could not get signed URL');

      setProfileData(prev => ({
        ...prev,
        profilePicture: signedUrlData.signedUrl
      }));

      // Update user profile in DB with new avatar_url
      try {
        const { error: updateError } = await usersApi.updateUser(user.id, { avatar_url: fileName });
        if (updateError) {
          throw updateError;
        }
        // Optionally: refetch user profile here if needed
      } catch (updateErr) {
        console.error('Failed to update avatar_url in users table:', updateErr);
        alert('Avatar upload succeeded, but failed to update user profile.');
      }

    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload avatar: ' + (err as Error).message);
    } finally {
      setAvatarUploading(false);
    }
  };


  // Load avatar using avatar_url from users table
const loadExistingAvatar = async () => {
  if (!customUser) {
    setAvatarLoading(false); // Reset loading state if no user
    return;
  }

  try {
    const avatarUrl = customUser.avatar_url;
    if (!avatarUrl) {
      setAvatarLoading(false); // Reset loading state when no avatar URL
      return;
    }

    // Check if avatarUrl is a Google profile image
    if (avatarUrl.startsWith('https://lh3.googleusercontent.com/')) {
      setProfileData(prev => ({
        ...prev,
        profilePicture: avatarUrl
      }));
      return;
    }

    // Otherwise, treat as Supabase storage path
    const { data, error } = await supabase.storage
      .from('avatar-images')
      .createSignedUrl(avatarUrl, 60 * 60 * 24 * 365);

    if (!error && data?.signedUrl) {
      setProfileData(prev => ({
        ...prev,
        profilePicture: data.signedUrl
      }));
    } else {
      if (error) {
        console.error('Supabase signed URL error:', error);
      } else {
        console.warn('No signed URL returned from Supabase:', data);
      }
    }
  } catch (err) {
    console.error('Error loading existing avatar:', err);
  }
};

// Fetch custom user after auth
useEffect(() => {
  if (authUser) {
    setProfileLoading(true);
    usersApi.getUser(authUser.id).then((res: any) => {
      setCustomUser(res.data);
      setProfileLoading(false);
    });
  }
}, [authUser]);

useEffect(() => {
  if (authUser && customUser) {
    setProfileData(prev => ({
      ...prev,
      email: authUser.email || '',
      username: customUser.name || ''
    }));
    // Load existing avatar
    loadExistingAvatar();
    setAvatarError(false);
  }
}, [authUser, customUser]);

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

  const [localTheme, setLocalTheme] = useState('light');

  // Update the theme in localStorage
  const handleThemeToggle = (newTheme: string) => {
    setLocalTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Initialize theme from localStorage
  const storedTheme = localStorage.getItem('theme') || 'light';
  if (storedTheme !== localTheme) {
    handleThemeToggle(storedTheme);
  }

  return (
    <div className="min-h-screen dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900/95 dark:backdrop-blur-sm shadow-lg dark:shadow-indigo-900/20 border-b dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
            <div className="flex items-center space-x-4">
              {/* Animated Theme Toggle Slider */}
              <div 
                onClick={() => handleThemeToggle(localTheme === 'dark' ? 'light' : 'dark')}
                className="relative w-16 h-8 bg-gray-200 dark:bg-slate-700 rounded-full cursor-pointer transition-colors duration-300 ease-in-out shadow-inner hover:bg-gray-300 dark:hover:bg-slate-600"
              >
                {/* Sliding Toggle */}
                <div 
                  className={`absolute top-1 w-6 h-6 bg-white dark:bg-slate-100 rounded-full shadow-lg transition-transform duration-300 ease-in-out flex items-center justify-center ${
                    localTheme === 'dark' ? 'translate-x-9' : 'translate-x-1'
                  }`}
                >
                  {/* Icon inside the slider */}
                  <div className="transition-opacity duration-200">
                    {localTheme === 'dark' ? (
                      <Moon className="h-3 w-3 text-slate-700" />
                    ) : (
                      <Sun className="h-3 w-3 text-yellow-500" />
                    )}
                  </div>
                </div>
                
                {/* Background Icons */}
                <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                  <Sun className={`h-4 w-4 transition-opacity duration-300 ${
                    localTheme === 'light' ? 'text-yellow-400 opacity-70' : 'text-gray-400 dark:text-slate-500 opacity-40'
                  }`} />
                  <Moon className={`h-4 w-4 transition-opacity duration-300 ${
                    localTheme === 'dark' ? 'text-slate-400 opacity-70' : 'text-gray-400 dark:text-slate-500 opacity-40'
                  }`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header Card */}
        <Card className="p-8 mb-8 bg-white dark:bg-slate-800/50 dark:backdrop-blur-sm shadow-lg dark:shadow-indigo-900/20 dark:border-slate-700">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
            {/* Profile Picture */}
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-blue-100 dark:border-indigo-500/30 relative">
  {/* Skeleton Loader */}
  {avatarLoading && !avatarError && (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-slate-700 animate-pulse rounded-full z-10">
      <span className="w-10 h-10 border-4 border-blue-300 border-t-transparent rounded-full animate-spin"></span>
    </div>
  )}
  <AvatarImage
    src={profileData.profilePicture || undefined}
    style={{ display: avatarLoading || avatarError ? 'none' : 'block' }}
    onLoad={() => { setAvatarLoading(false); setAvatarError(false); }}
    onError={() => { setAvatarLoading(false); setAvatarError(true); }}
    alt="Profile picture"
  />
  {/* Only show fallback if error */}
  {(avatarError || (!profileData.profilePicture && !avatarLoading)) && (
    <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white">
      {getInitials(profileData.email)}
    </AvatarFallback>
  )}
</Avatar>

              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white p-2 rounded-full cursor-pointer shadow-lg transition-colors">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                    disabled={avatarUploading}
                  />
                  {avatarUploading && (
                    <span className="absolute bottom-0 left-0 text-xs text-blue-600 bg-white bg-opacity-80 px-2 py-1 rounded shadow">Uploading...</span>
                  )}
                </label>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Username</label>
                    <Input
                      value={profileData.username}
                      onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                      className="max-w-md dark:bg-slate-700/50 dark:border-slate-600 dark:text-white"
                      placeholder="Enter your username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Bio</label>
                    <Textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      className="max-w-md dark:bg-slate-700/50 dark:border-slate-600 dark:text-white"
                      placeholder="Tell us about yourself"
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {profileLoading ? (
                      <span className="animate-pulse text-gray-400 dark:text-slate-500">Loading...</span>
                    ) : (
                      `@${customUser?.name || profileData.username || ''}`
                    )}
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-slate-400">{profileData.email}</p>
                  <p className="text-gray-700 dark:text-slate-300 leading-relaxed max-w-2xl">{profileData.bio}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2">
              {isEditing ? (
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              ) : (
                <>
                  <Button onClick={() => setIsEditing(true)} variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-950/50">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button 
                    onClick={() => navigate("/reset-password")} 
                    variant="outline" 
                    className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                  >
                    <span className="mr-2">🔐</span>
                    Change Password
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>


      </main>
    </div>
  );
};

export default Profile;
