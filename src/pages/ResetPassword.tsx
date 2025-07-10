import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Code, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { z } from 'zod';

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
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingToken, setIsProcessingToken] = useState(true);
  const [hasValidToken, setHasValidToken] = useState(false);

  // Check if we have a valid token on component mount
  useEffect(() => {
    const checkResetToken = async () => {
      try {
        setIsProcessingToken(true);
        
        // Supabase can include auth data in multiple ways
        // First check URL hash fragment
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        let type = hashParams.get('type');
        let accessToken = hashParams.get('access_token');
        
        // If not in hash, check URL query parameters
        if (!type || !accessToken) {
          const queryParams = new URLSearchParams(window.location.search);
          type = queryParams.get('type');
          accessToken = queryParams.get('access_token');
        }
        
        // Validate token with Supabase
        if (type === 'recovery' && accessToken) {
          // Set session with the token
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: '',
          });
          
          if (error) {
            console.error('Error validating token:', error);
            setHasValidToken(false);
            toast({
              title: 'Invalid or expired token',
              description: 'The password reset link is invalid or has expired. Please request a new one.',
              variant: 'destructive',
            });
          } else {
            setHasValidToken(true);
          }
        } else {
          toast({
            title: 'Invalid or expired link',
            description: 'The password reset link is invalid or has expired. Please request a new one.',
            variant: 'destructive',
          });
          setHasValidToken(false);
        }
      } catch (error) {
        console.error('Error validating reset token:', error);
        setHasValidToken(false);
        toast({
          title: 'Error',
          description: 'An error occurred while processing your request. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsProcessingToken(false);
      }
    };

    checkResetToken();
  }, [toast]);

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
      
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Password updated successfully',
        description: 'Your password has been reset. You can now sign in with your new password.',
      });
      
      // Redirect to login page
      setTimeout(() => {
        navigate('/signin');
      }, 2000);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isProcessingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mt-4">Verifying your request</h2>
          <p className="text-gray-600 mt-2">Please wait while we verify your password reset request...</p>
        </Card>
      </div>
    );
  }

  if (!hasValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg text-center">
          <div className="text-red-600 mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Invalid or Expired Link</h2>
          <p className="text-gray-600 mt-2">The password reset link is invalid or has expired.</p>
          <Button 
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => navigate('/signin')}
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
          <h2 className="text-xl font-semibold text-gray-900">Reset Your Password</h2>
          <p className="text-gray-600 mt-2">Create a new secure password</p>
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
              Confirm New Password
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
              'Reset Password'
            )}
          </Button>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <Link 
                to="/signin" 
                className="font-medium text-blue-600 hover:text-blue-500 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
