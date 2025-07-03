import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function Callback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the error and error_description from the URL if present
        const params = new URLSearchParams(window.location.search)
        const errorParam = params.get('error')
        const errorDescription = params.get('error_description')

        if (errorParam) {
          throw new Error(errorDescription || errorParam)
        }

        // Use getUser() as primary method - more reliable for OAuth callbacks
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          throw error
        }

        if (user) {
          // User is authenticated, redirect to dashboard
          navigate('/dashboard', { replace: true })
        } else {
          throw new Error('No user found after OAuth callback')
        }
      } catch (err) {
        console.error('Error in auth callback:', err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      }
    }

    handleCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="mt-4 w-full px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}