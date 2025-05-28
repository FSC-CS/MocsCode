import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import GoogleLoginButton from '@/components/auth/GoogleLoginButton'
import { useAuth } from '@/contexts/AuthContext'

export default function TestSupabase() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking')
  const [message, setMessage] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          setStatus('error')
          setMessage(`Error: ${error.message}`)
          return
        }

        setStatus('success')
        setMessage('Successfully connected to Supabase!')
      } catch (error) {
        setStatus('error')
        setMessage(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      <div className={`p-4 rounded-lg ${
        status === 'success' ? 'bg-green-100 text-green-700' :
        status === 'error' ? 'bg-red-100 text-red-700' :
        'bg-gray-100 text-gray-700'
      }`}>
        {status === 'checking' ? 'Checking connection...' : message}
      </div>
      
      {user ? (
        <div className="mt-8 p-4 rounded-lg bg-blue-50 text-blue-700">
          <h2 className="text-lg font-semibold mb-2">User Information</h2>
          <p>Email: {user.email}</p>
          <p>ID: {user.id}</p>
        </div>
      ) : (
        <GoogleLoginButton />
      )}
    </div>
  )
}
