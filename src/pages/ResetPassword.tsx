import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

// Password reset form schema
const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password cannot exceed 64 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset password form
  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Extract token from URL on mount
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  // Validate that we have a recovery token
  useEffect(() => {
    if (!token || type !== 'recovery') {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token, type]);

  // Handle password reset submission
  async function onSubmit(data: ResetPasswordForm) {
    if (!token) {
      setError('No reset token found. Please request a new password reset link.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update password using the token
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        throw error;
      }

      // Show success state
      setSuccess(true);
      toast({
        title: 'Password reset successful',
        description: 'Your password has been changed. You can now sign in with your new password.',
      });

      // Redirect after a delay
      setTimeout(() => {
        navigate('/signin');
      }, 3000);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError(error.message || 'Failed to reset password. The link may have expired or is invalid.');
      toast({
        title: 'Password reset failed',
        description: error.message || 'Failed to reset password. Please try again or request a new link.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success ? (
            <div className="py-4">
              <Alert className="bg-green-50 border-green-500 text-green-700">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>
                  Your password has been reset successfully. You will be redirected to the sign in page shortly.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          disabled={loading} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          disabled={loading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !!error}
                >
                  {loading ? 'Resetting Password...' : 'Reset Password'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            variant="link"
            onClick={() => navigate('/signin')}
            className="px-0"
          >
            Back to Sign In
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}