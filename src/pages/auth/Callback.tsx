import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Callback() {
  useEffect(() => {
    console.log('Callback page loaded, checking session...')
    // Handle the redirect from the OAuth provider
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error)
        return
      }
      
      if (session) {
        console.log('Session found, redirecting to home...')
        // Redirect to the home page if the user is signed in
        window.location.href = '/'
      } else {
        console.log('No session found')
      }
    })
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4">Redirecting...</p>
      </div>
    </div>
  )
}
