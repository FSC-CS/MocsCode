import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Code, Loader2, KeyRound, ShieldCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

// Form validation schema
const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Parse hash fragment to extract access_token
  useEffect(() => {
    const checkAuth = async () => {
      setCheckingAuth(true);
      try {
        // Check if user is already authenticated
        if (user) {
          setIsAuthenticated(true);
          setIsTokenValid(true);
          setCheckingAuth(false);
          return;
        }

        // First check for recovery token in URL query parameters
        const queryParams = new URLSearchParams(window.location.search);
        const recoveryToken = queryParams.get('token');
        const type = queryParams.get('type');
        
        // If we have a recovery token in query params
        if (recoveryToken && type === 'recovery') {
          try {
            // Exchange the recovery token for a session
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: recoveryToken,
              type: 'recovery',
            });
            
            if (error || !data.session) {
              toast({
                title: 'Invalid or expired token',
                description: 'Your password reset link is invalid or has expired. Please request a new link.',
                variant: 'destructive',
              });
              console.error('Error validating token:', error);
              setIsTokenValid(false);
            } else {
              // Set authenticated with token
              setIsTokenValid(true);
              
              toast({
                title: 'Token verified',
                description: 'You can now reset your password.',
              });
            }
          } catch (err) {
            console.error('Error verifying OTP:', err);
            setIsTokenValid(false);
            toast({
              title: 'Error validating token',
              description: 'An error occurred while validating your reset token. Please try again.',
              variant: 'destructive',
            });
          }
        } else {
          // Fall back to checking hash params (for compatibility)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');

          if (accessToken) {
            const { data, error } = await supabase.auth.getUser(accessToken);
            
            if (error || !data.user) {
              toast({
                title: 'Invalid or expired token',
                description: 'Your password reset link is invalid or has expired. Please request a new link.',
                variant: 'destructive',
              });
              setIsTokenValid(false);
            } else {
              // Set authenticated with token
              setIsTokenValid(true);
              
              // The session is now established with the token
              toast({
                title: 'Token verified',
                description: 'You can now reset your password.',
              });
            }
          } else {
            // No token found, check if user is logged in
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              setIsAuthenticated(true);
              setIsTokenValid(true);
            } else {
              setIsTokenValid(false);
            }
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsTokenValid(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [user, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    try {
      resetPasswordSchema.parse(formData);
      setErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach(error => {
          if (error.path) {
            newErrors[error.path[0]] = error.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    // Submit form
    try {
      setIsSubmitting(true);
      
      // Update password in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) {
        throw error;
      }
      
      toast({
        title: 'Password updated successfully',
        description: 'Your password has been reset.',
      });
      
      // Redirect after successful password reset
      setTimeout(() => {
        navigate(isAuthenticated ? '/dashboard' : '/signin');
      }, 1500);
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Password reset failed',
        description: error.message || 'An error occurred while resetting your password.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Verifying authentication...</span>
      </div>
    );
  }

  if (!isTokenValid && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg text-center">
          <ShieldCheck className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Invalid or Expired Link</h2>
          <p className="text-gray-600 mb-6">Your password reset link is invalid or has expired.</p>
          <Button 
            onClick={() => navigate('/signin')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Return to Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Code className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">MocsCode</h1>
          </div>
          <KeyRound className="h-10 w-10 mx-auto mb-2 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            {isAuthenticated ? 'Change Your Password' : 'Reset Your Password'}
          </h2>
          <p className="text-gray-600 mt-2">
            {isAuthenticated 
              ? 'Enter a new secure password for your account' 
              : 'Enter a new password to regain access to your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your new password"
              className={errors.password ? 'border-red-500' : ''}
              disabled={isSubmitting}
              required
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your new password"
              className={errors.confirmPassword ? 'border-red-500' : ''}
              disabled={isSubmitting}
              required
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating Password...
              </>
            ) : (
              'Update Password'
            )}
          </Button>

          <div className="mt-6 text-center">
            <Button
              type="button"
              variant="link"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/signin')}
            >
              {isAuthenticated ? 'Back to Dashboard' : 'Return to Sign In'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;