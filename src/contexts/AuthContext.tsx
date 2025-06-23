// Fixed AuthContext.tsx - Simplified to avoid RLS recursion issues

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { User as DbUser } from '@/lib/api/types'
import { useApi } from './ApiContext'
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  user: SupabaseUser | null
  dbUser: DbUser | null
  isLoading: boolean
  isSigningUp: boolean
  isSigningIn: boolean
  isSigningOut: boolean
  isInitialized: boolean
  isSyncing: boolean
  isReady: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{
    user: User | null;
    session: Session | null;
  }>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Derived readiness state
  const isReady = isInitialized && !isSyncing && !isLoading && !!user;

  const { authApi } = useApi()
  const { toast } = useToast();

  const clearError = () => setError(null);

  // Listen for email invitations in real time
  useEffect(() => {
    if (!user || !user.email) return;
  
    const channel = supabase.channel('email-invite-listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_invitations',
          filter: `invited_email=eq.${user.email}`,
        },
        async (payload) => {
          const shareLinkId = payload.new?.share_link_id;
          if (!shareLinkId) return;
  
          // Fetch the share_token from sharing_permissions
          const { data, error } = await supabase
            .from('sharing_permissions')
            .select('share_token')
            .eq('id', shareLinkId)
            .single();
  
          const shareToken = data?.share_token;
  
          toast({
            title: "You've been invited to a project!",
            description: (
              <span>
                Click <button
                  className="underline text-blue-600 hover:text-blue-800"
                  onClick={() => {
                    if (shareToken) {
                      window.location.href = `/join/${shareToken}`;
                    } else {
                      window.location.href = '/joinproject';
                    }
                  }}
                >here</button> to accept your invitation.
              </span>
            ),
            duration: Infinity,
          });
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  // SIMPLIFIED: User sync without recursive lookups
  useEffect(() => {
    if (!isInitialized || !user) {
      setDbUser(null);
      return;
    }
    
    const syncUser = async () => {
      setIsSyncing(true);
      
      try {
        // Create a simple dbUser object from the Supabase user
        // This avoids the problematic database lookup that was causing recursion
        const simpleDbUser: DbUser = {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name,
          avatar_url: user.user_metadata?.avatar_url,
          created_at: user.created_at,
          updated_at: new Date().toISOString(),
          last_active_at: new Date().toISOString()
        };

        setDbUser(simpleDbUser);
        console.log('User synced successfully (simplified):', simpleDbUser.id);
        
      } catch (error: any) {
        console.error('User sync error:', error);
        setError('Failed to sync user data. Please refresh the page.');
      } finally {
        setIsSyncing(false);
      }
    };
    
    syncUser();
  }, [isInitialized, user, authApi]);

  // Initialize auth state (restore session, set up listeners)
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        const { data: sessionData, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Error restoring session:', error);
          setError('Failed to restore session');
        } 
        
        if (sessionData?.session?.user) {
          console.log('Restored session for user:', sessionData.session.user.id);
          setUser(sessionData.session.user);
        } else {
          setUser(null);
        }
        
      } catch (error) {
        console.error('Unexpected error during auth initialization:', error);
        setError('Failed to initialize authentication');
      } finally {
        if (mounted) {
          setIsInitialized(true);
          setIsLoading(false);
        }
      }
    };
    
    initializeAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
            
      setIsLoading(false);
      
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setDbUser(null);
      }
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      clearError();
      setIsLoading(true);
      
      const redirectUrl = new URL('/auth/callback', window.location.origin).toString();
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'email profile',
        },
      });

      if (error) {
        const errorMessage = error.message || 'Failed to sign in with Google';
        setError(errorMessage);
        toast({
          title: 'Sign in failed',
          description: errorMessage,
          variant: 'destructive',
        });
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        const errorMessage = 'No redirect URL received from authentication provider';
        setError(errorMessage);
        toast({
          title: 'Sign in failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      clearError();
      setIsSigningIn(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const errorMessage = error.message || 'Failed to sign in';
        setError(errorMessage);
        toast({
          title: 'Sign in failed',
          description: errorMessage,
          variant: 'destructive',
        });
        throw error;
      }

      toast({
        title: 'Signed in successfully',
        description: 'Welcome back!',
      });
      
      return data;
    } catch (error) {
      console.error('Error signing in with email:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      clearError();
      setIsSigningUp(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        const errorMessage = error.message || 'Failed to create account';
        setError(errorMessage);
        toast({
          title: 'Sign up failed',
          description: errorMessage,
          variant: 'destructive',
        });
        throw error;
      }

      toast({
        title: 'Account created!',
        description: 'Please check your email to confirm your account.',
      });

      return data;
    } catch (error) {
      console.error('Error signing up with email:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    } finally {
      setIsSigningUp(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      clearError();
      setIsLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        const errorMessage = error.message || 'Failed to send password reset email';
        setError(errorMessage);
        toast({
          title: 'Password reset failed',
          description: errorMessage,
          variant: 'destructive',
        });
        throw error;
      }

      toast({
        title: 'Password reset email sent',
        description: 'Check your email for instructions to reset your password.',
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsSigningOut(true)
    
    try {
      // Clear UI state first for immediate feedback
      setUser(null)
      setDbUser(null)
      clearError()
      
      // Reset theme to light mode
      localStorage.setItem('theme', 'light')
      document.documentElement.classList.remove('dark')
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
    } catch (error) {
      console.error('Error signing out:', error)
      // Even if there's an error, we want to reset the auth state
      setUser(null)
      setDbUser(null)
      throw error
    } finally {
      setIsSigningOut(false)
    }
  }

  const value = useMemo(() => ({
    user,
    dbUser,
    isLoading,
    isSigningUp,
    isSigningIn,
    isSigningOut,
    isInitialized,
    isSyncing,
    isReady,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    clearError,
  }), [
    user,
    dbUser,
    isLoading,
    isSigningUp,
    isSigningIn,
    isSigningOut,
    isInitialized,
    isSyncing,
    isReady,
    error,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}