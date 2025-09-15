import React from 'react';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Moon, Sun, Code, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '@/components/UserAvatar';

interface NavbarProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ theme, toggleTheme }) => {
  const { user, dbUser, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate('/signin');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getInitials = (user: { name?: string; email?: string } | null) => {
    if (!user) return 'U';
    const name = user.name || user.email || 'U';
    return name
      .split(' ')
      .map(part => part[0]?.toUpperCase() || '')
      .slice(0, 2)
      .join('');
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <header className="bg-white dark:bg-slate-900/95 dark:backdrop-blur-sm shadow-lg dark:shadow-indigo-900/20 border-b dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleBack}
              className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors duration-200 mr-3 shadow-sm"
              aria-label="Go back"
            >
              <ChevronLeft className="h-6 w-6 text-gray-700 dark:text-gray-200" />
            </button>
            <div className="flex items-center space-x-2">
              <Code className="h-6 w-6 text-blue-500" />
              <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent whitespace-nowrap">
                MocsCode
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {user ? (
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
                <div className="cursor-pointer">
                  <UserAvatar 
                    avatar_url={dbUser?.avatar_url}
                    size="sm"
                    className="ring-2 ring-transparent hover:ring-blue-300 transition-all duration-200"
                    fallbackInitials={getInitials(dbUser)}
                  />
                </div>
              </div>
            ) : (
              <Button
                asChild
                variant="outline"
                className="text-gray-700 dark:text-gray-200"
              >
                <Link to="/signin">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
