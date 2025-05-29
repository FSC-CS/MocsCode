import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Code, Users, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Landing = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900/95 dark:backdrop-blur-sm shadow-lg dark:shadow-indigo-900/20 border-b dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Code className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">CodeCollab</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="text-red-600 dark:text-red-500 border-red-300 dark:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                >
                  Logout
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/signin')}
                    className="text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => navigate('/register')}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white"
                  >
                    Register
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-20">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Code Together, Create Together
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The ultimate collaborative coding platform for students and developers. 
            Work on projects together in real-time with powerful tools and seamless collaboration.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg"
              onClick={() => navigate('/register')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
            >
              Start Collaborating
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/signin')}
              className="text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose CodeCollab?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <Code className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Multi-Language Support</h3>
              <p className="text-gray-600">
                Code in Java, Python, JavaScript, C, C++, and C# with full syntax highlighting and IntelliSense.
              </p>
            </Card>
            
            <Card className="p-8 text-center bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <Users className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Real-time Collaboration</h3>
              <p className="text-gray-600">
                Work together with your team in real-time. See changes instantly and communicate seamlessly.
              </p>
            </Card>
            
            <Card className="p-8 text-center bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <Shield className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Version Control</h3>
              <p className="text-gray-600">
                Built-in source control helps you track changes and collaborate without conflicts.
              </p>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20 text-center">
          <Card className="p-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl">
            <Zap className="h-16 w-16 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Ready to Start Coding?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of developers already collaborating on CodeCollab
            </p>
            <Button 
              size="lg"
              onClick={() => navigate('/register')}
              className="bg-white dark:bg-indigo-900/50 dark:backdrop-blur-sm text-blue-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-indigo-950/50"
            >
              Create Free Account
            </Button>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Code className="h-6 w-6" />
            <span className="text-lg font-semibold">CodeCollab</span>
          </div>
          <p className="text-slate-400">
            2024 CodeCollab. Empowering collaborative development.
            © 2024 CodeCollab. Empowering collaborative development.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
