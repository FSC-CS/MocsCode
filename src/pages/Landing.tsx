import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Code, Users, Shield, Zap, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Function to check if a color is light
const isLightColor = (color: string) => {
  // Handle different color formats
  let r, g, b;
  
  if (color.startsWith('#')) {
    // Hex format
    const hex = color.replace('#', '');
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else if (color.startsWith('rgb')) {
    // RGB/RGBA format
    const rgb = color.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      r = parseInt(rgb[0]);
      g = parseInt(rgb[1]);
      b = parseInt(rgb[2]);
    } else {
      return true; // Default to light if can't parse
    }
  } else {
    return true; // Default to light for unknown formats
  }
  
  // Calculate luminance (perceived brightness)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return true if color is light
  return luminance > 0.6; // Slightly higher threshold for better contrast
};

// Custom hook to detect actual background color
function useBackgroundColor() {
  const [isLightBg, setIsLightBg] = useState(true);

  useEffect(() => {
    const checkBackground = () => {
      try {
        // Check multiple elements to find the actual background
        const elements = [
          document.body,
          document.documentElement,
          document.querySelector('main'),
          document.querySelector('.min-h-screen')
        ];
        
        let actualBgColor = null;
        
        for (const element of elements) {
          if (element) {
            const styles = window.getComputedStyle(element);
            const bgColor = styles.backgroundColor;
            
            // Skip transparent/rgba(0,0,0,0) backgrounds
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
              actualBgColor = bgColor;
              break;
            }
          }
        }
        
        // If no background found, check for gradients or fall back to white
        if (!actualBgColor) {
          const bodyStyles = window.getComputedStyle(document.body);
          const htmlStyles = window.getComputedStyle(document.documentElement);
          
          // Check for gradient backgrounds
          const bodyBgImage = bodyStyles.backgroundImage;
          const htmlBgImage = htmlStyles.backgroundImage;
          
          if (bodyBgImage !== 'none' && bodyBgImage.includes('gradient')) {
            // For gradients, assume dark if it contains dark colors
            setIsLightBg(!bodyBgImage.includes('slate') && !bodyBgImage.includes('black'));
            return;
          }
          
          if (htmlBgImage !== 'none' && htmlBgImage.includes('gradient')) {
            setIsLightBg(!htmlBgImage.includes('slate') && !htmlBgImage.includes('black'));
            return;
          }
          
          // Default to light
          actualBgColor = 'rgb(255, 255, 255)';
        }
        
        setIsLightBg(isLightColor(actualBgColor));
      } catch (e) {
        console.error('Error detecting background color:', e);
        setIsLightBg(true); // Default to light on error
      }
    };

    // Check immediately
    checkBackground();
    
    // Set up observers for theme changes
    const observer = new MutationObserver(() => {
      setTimeout(checkBackground, 100); // Small delay to let styles apply
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    // Also check on window events
    window.addEventListener('resize', checkBackground);
    window.addEventListener('scroll', checkBackground);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkBackground);
      window.removeEventListener('scroll', checkBackground);
    };
  }, []);

  return isLightBg;
}
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();
  const isLightBg = useBackgroundColor();
  const { user, signOut } = useAuth();

  // Dynamic text colors based on actual background detection
  const textColor = isLightBg ? 'text-gray-900' : 'text-white';
  const subTextColor = isLightBg ? 'text-gray-600' : 'text-gray-200';
  const cardBgColor = isLightBg ? 'bg-white' : 'bg-gray-800';
  const cardTextColor = isLightBg ? 'text-gray-900' : 'text-white';
  const cardSubTextColor = isLightBg ? 'text-gray-600' : 'text-gray-300';

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
      <header className={`${isLightBg ? 'bg-white border-gray-200' : 'bg-slate-900/95 border-slate-700'} backdrop-blur-sm shadow-lg border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Code className="h-6 w-6 text-blue-500" />
              <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent whitespace-nowrap">
                MocsCode
              </h1>
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
                    className={`${isLightBg ? 'text-gray-600 border-gray-300 hover:bg-gray-50' : 'text-slate-300 border-slate-600 hover:bg-slate-700'}`}
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => navigate('/register')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
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
          <h1 className={`text-5xl font-bold ${textColor} mb-6`}>
            Code Together, Create Together
          </h1>
          <p className={`text-xl ${subTextColor} mb-8 max-w-3xl mx-auto`}>
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
          <h2 className={`text-3xl font-bold text-center ${textColor} mb-12`}>
            Why Choose MocsCode?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className={`p-8 text-center ${cardBgColor} rounded-xl shadow-sm hover:shadow-md transition-shadow`}>
              <Code className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className={`text-xl font-semibold ${cardTextColor} mb-3`}>Multi-Language Support</h3>
              <p className={cardSubTextColor}>
                Code in Java, Python, JavaScript, C, C++, and C# with full syntax highlighting and error detection.
              </p>
            </Card>
            
            <Card className={`p-8 text-center ${cardBgColor} rounded-xl shadow-sm hover:shadow-md transition-shadow`}>
              <Users className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className={`text-xl font-semibold ${cardTextColor} mb-3`}>Real-time Collaboration</h3>
              <p className={cardSubTextColor}>
                Work together with your team in real-time. See changes instantly and communicate seamlessly.
              </p>
            </Card>
            
            <Card className={`p-8 text-center ${cardBgColor} rounded-xl shadow-sm hover:shadow-md transition-shadow`}>
              <FolderOpen className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h3 className={`text-xl font-semibold ${cardTextColor} mb-3`}>Project Management</h3>
              <p className={cardSubTextColor}>
                Import and export projects seamlessly. Track usage and view detailed statistics for all your coding projects.
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
              Join thousands of developers already collaborating on MocsCode
            </p>
            <Button 
              size="lg"
              onClick={() => navigate('/register')}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg"
            >
              Create Free Account
            </Button>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center space-y-4">
            <p className="text-sm text-slate-400 text-center">
              &copy; {new Date().getFullYear()} MocsCode. Empowering collaborative development.
            </p>
            <div className="pt-2">
              <Link to="/about" className="text-sm text-slate-300 hover:text-white transition-colors">
                About Us
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
