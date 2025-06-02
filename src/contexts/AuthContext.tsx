import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User as DbUser } from '@/lib/api/types'
import { useApi } from './ApiContext'

interface AuthContextType {
  user: SupabaseUser | null
  dbUser: DbUser | null
  isLoading: boolean
  isSigningOut: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const { authApi } = useApi()

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
          return
        }
        
        if (mounted) {
          setUser(session?.user || null)
          
          // If we have a user, sync with our database
          if (session?.user) {
            const { data: dbUserData, error: dbError } = await authApi.syncOAuthUser({
              id: session.user.id,
              email: session.user.email!,
              display_name: session.user.user_metadata.full_name,
              avatar_url: session.user.user_metadata.avatar_url,
            })

            if (dbError) {
              console.error('Error syncing user:', dbError)
            } else if (mounted) {
              setDbUser(dbUserData)
            }
          }
        }
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    getInitialSession()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only log non-token refresh events for cleaner console
      if (event !== 'TOKEN_REFRESHED') {
        console.log('Auth state changed:', event, session?.user?.email ? `(User: ${session.user.email})` : '')
      }
      
      if (mounted) {
        // Reset loading state for SIGNED_IN and SIGNED_OUT events
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setIsLoading(false)
        }

        setUser(session?.user || null)

        // If we have a user, sync with our database
        if (session?.user) {
          const { data: dbUserData, error: dbError } = await authApi.syncOAuthUser({
            id: session.user.id,
            email: session.user.email!,
            display_name: session.user.user_metadata.full_name,
            avatar_url: session.user.user_metadata.avatar_url,
          })

          if (dbError) {
            console.error('Error syncing user:', dbError)
          } else if (mounted) {
            setDbUser(dbUserData)
          }
        } else {
          setDbUser(null)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google sign-in process')
      setIsLoading(true)
      
      // Ensure we have the correct redirect URL
      const redirectUrl = new URL('/auth/callback', window.location.origin).toString()
      console.log('Using redirect URL:', redirectUrl)
      
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
        console.log('Redirecting to OAuth provider...')
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

  const value = {
    user,
    dbUser,
    isLoading,
    isSigningOut,
    signInWithGoogle,
    signOut
  }

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