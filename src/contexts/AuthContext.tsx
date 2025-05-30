import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { AuthApi } from '@/lib/api/auth'
import type { User as DbUser } from '@/lib/api/types'
import { ApiConfig } from '@/lib/api/types'

interface AuthContextType {
  user: SupabaseUser | null
  dbUser: DbUser | null
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Start with true for initial load

  const authApi = new AuthApi({ client: supabase })

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
              displayName: session.user.user_metadata.full_name,
              avatarUrl: session.user.user_metadata.avatar_url,
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
      console.log('Auth state changed:', event)
      
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
            displayName: session.user.user_metadata.full_name,
            avatarUrl: session.user.user_metadata.avatar_url,
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
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Manually clear the user state
      setUser(null)
      setDbUser(null)
      
      // Reset theme to light mode
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
      
      setIsLoading(false)
    } catch (error) {
      console.error('Error signing out:', error)
      setIsLoading(false)
      throw error
    }
  }

  const value = {
    user,
    dbUser,
    isLoading,
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