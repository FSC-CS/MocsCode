import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User as DbUser } from '@/lib/api/types'
import { useApi } from './ApiContext'

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
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

import { useToast } from '@/components/ui/use-toast';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  // New coordinated auth states
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Derived readiness state
  const isReady = isInitialized && !isSyncing && !isLoading;

  const { authApi } = useApi()
  const { toast } = useToast();

  const clearError = () => setError(null);

  // Phase 2: Sync OAuth user with DB user when initialized and user is present
  useEffect(() => {
    if (!isInitialized || !user) {
      setDbUser(null);
      return;
    }
    let isActive = true;
    const sync = async () => {
      setIsSyncing(true);
      const oAuthData = {
        id: user.id,
        email: user.email,
        display_name: user.user_metadata?.full_name || user.email,
        avatar_url: user.user_metadata?.avatar_url,
      };
      const { data, error } = await authApi.syncOAuthUser(oAuthData);
      if (!isActive) return;
      if (error) {
        console.error('Error syncing user:', error);
        setDbUser(null);
        setIsSyncing(false);
        return;
      }
      setDbUser(data);
      setIsSyncing(false);
    };
    sync();
    return () => { isActive = false; };
  }, [isInitialized, user]);

    // Phase 1: Initialize auth state (restore session, set up listeners)
  useEffect(() => {
    let mounted = true;
    const initializeAuth = async () => {
      const { data: sessionData, error } = await supabase.auth.getSession();
      if (!mounted) return;
      
      if (error) {
        console.error('Error restoring session:', error);
      } 
      
      if (sessionData?.session) {
        setUser(sessionData.session.user);
      } else {
        setUser(null);
      }
      
      // Always set initialized and loading states
      setIsInitialized(true);
      setIsLoading(false);
    };
    
    initializeAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // Always reset loading state for any auth state change
      setIsLoading(false);
      
      setUser(session?.user || null);
      if (!session?.user) {
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
      
      // Ensure we have the correct redirect URL
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


      // If we have a URL, the OAuth flow is proceeding
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

      // User is automatically set by the auth state change listener
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
            full_name: name,
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
    // Set signing out state immediately for UI feedback
    setIsSigningOut(true)
    
    try {
      // Clear UI state first for immediate feedback
      setUser(null)
      setDbUser(null)
      
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
      // Always reset the signing out state
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
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    clearError,
  ]);

  // Debugging: log auth state changes
  useEffect(() => {
    console.log('Auth State:', {
      isReady, 
      isInitialized, 
      isSyncing, 
      isLoading, 
      isSigningUp,
      isSigningIn,
      isSigningOut,
      hasUser: !!user, 
      hasDbUser: !!dbUser
    });
  }, [isReady, isInitialized, isSyncing, isLoading, isSigningUp, isSigningIn, isSigningOut, user, dbUser]);

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