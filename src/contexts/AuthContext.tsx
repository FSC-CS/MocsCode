import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User as DbUser } from '@/lib/api/types'
import { useApi } from './ApiContext'

interface AuthContextType {
  user: SupabaseUser | null
  dbUser: DbUser | null
  isLoading: boolean
  isSigningOut: boolean
  isInitialized: boolean
  isSyncing: boolean
  isReady: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

import { useToast } from '@/components/ui/use-toast';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  // New coordinated auth states
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  // Derived readiness state
  const isReady = isInitialized && !isSyncing && !isLoading;

  const { authApi } = useApi()
  const { toast } = useToast();

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
        setIsInitialized(true); // Allow app to continue even if session fails
        setUser(null);
        return;
      }
      if (sessionData.session) {
        setUser(sessionData.session.user);
      } else {
        setUser(null);
      }
      setIsInitialized(true);
    };
    initializeAuth();
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      // Reset loading state for SIGNED_IN and SIGNED_OUT events
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setIsLoading(false);
      }
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
      setIsLoading(true)
      
      // Ensure we have the correct redirect URL
      const redirectUrl = new URL('/auth/callback', window.location.origin).toString()
      
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
      })

      if (error) {
        console.error('Error from Supabase:', error)
        setIsLoading(false)
        throw error
      }

      // If we have a URL, the OAuth flow is proceeding
      if (data?.url) {
        window.location.href = data.url
      } else {
        console.error('No redirect URL received from Supabase')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error signing in with Google:', error)
      setIsLoading(false)
      throw error
    }
  }

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
    isSigningOut,
    isInitialized,
    isSyncing,
    isReady,
    signInWithGoogle,
    signOut
  }), [user, dbUser, isLoading, isSigningOut, isInitialized, isSyncing, isReady, signInWithGoogle, signOut]);

  // Debugging: log auth state changes
  useEffect(() => {
    console.log('Auth State:', {
      isReady, isInitialized, isSyncing, isLoading, isSigningOut,
      hasUser: !!user, hasDbUser: !!dbUser
    });
  }, [isReady, isInitialized, isSyncing, isLoading, isSigningOut, user, dbUser]);

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