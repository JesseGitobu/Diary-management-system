'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminAuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const router = useRouter()
  const supabase = createClient()

  // Check if user is already authenticated and admin
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          setDebugInfo('User already authenticated, checking admin status...')
          
          const { data: adminUser, error: adminError } = await supabase
            .from('admin_users')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()

          if (!adminError && adminUser) {
            setDebugInfo('Admin user detected, redirecting to dashboard...')
            // Use router.replace for a cleaner redirect
            router.replace('/admin/dashboard')
          } else {
            setDebugInfo('User authenticated but not admin')
          }
        }
      } catch (error) {
        console.error('Error checking existing auth:', error)
      }
    }

    checkExistingAuth()
  }, [router, supabase])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setDebugInfo('Starting authentication...')

    try {
      // Step 1: Sign in
      setDebugInfo('Attempting to sign in...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (data.user) {
        setDebugInfo(`Signed in as: ${data.user.email}`)
        
        // Step 2: Check admin status
        setDebugInfo('Checking admin status...')
        
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('id, created_at')
          .eq('user_id', data.user.id)
          .maybeSingle()

        setDebugInfo(`Admin check complete. Admin user: ${!!adminUser}`)

        if (adminError && adminError.code !== 'PGRST116') {
          console.error('Admin check error:', adminError)
          throw new Error(`Admin verification failed: ${adminError.message}`)
        }

        if (!adminUser) {
          throw new Error('You do not have admin privileges. Please contact the system administrator.')
        }

        setDebugInfo('Admin access confirmed. Redirecting to dashboard...')
        
        // Single redirect strategy using router.replace
        router.replace('/admin/dashboard')
      }
    } catch (err: any) {
      setError(err.message)
      setDebugInfo(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Access
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in with your administrator credentials
          </p>
        </div>
        
        {/* Debug Info */}
        {debugInfo && (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="text-sm text-blue-700">
              <strong>Debug:</strong> {debugInfo}
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Authentication Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in as Admin'}
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              For security purposes, admin access is restricted.
              <br />
              Use your regular FarmTrack Pro account credentials.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}