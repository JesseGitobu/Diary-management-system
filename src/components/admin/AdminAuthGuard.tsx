'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AdminAuthGuardProps {
  children: React.ReactNode
}

export  function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        console.log('🔍 AdminAuthGuard: Starting auth check...')
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('❌ AdminAuthGuard: Error getting user:', userError)
          router.replace('/admin/auth')
          return
        }

        if (!user) {
          console.log('❌ AdminAuthGuard: No user found, redirecting to admin auth')
          router.replace('/admin/auth')
          return
        }

        console.log('👤 AdminAuthGuard: User found:', user.email)

        // Check admin status
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('id, created_at')
          .eq('user_id', user.id)
          .maybeSingle()

        console.log('🔍 AdminAuthGuard: Admin check result:', { adminUser, adminError })

        if (adminError) {
          console.error('❌ AdminAuthGuard: Error checking admin status:', adminError)
          router.replace('/admin/auth')
          return
        }

        if (!adminUser) {
          console.log('❌ AdminAuthGuard: User is not admin, redirecting to regular dashboard')
          router.replace('/dashboard')
          return
        }

        console.log('✅ AdminAuthGuard: Admin access confirmed')
        setIsAuthorized(true)
        
      } catch (error) {
        console.error('💥 AdminAuthGuard: Exception during auth check:', error)
        router.replace('/admin/auth')
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminAuth()
  }, [router, supabase])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  // Show unauthorized state (shouldn't normally be seen due to redirects)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">You don't have admin privileges.</p>
          <button
            onClick={() => router.replace('/admin/auth')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Return to Admin Login
          </button>
        </div>
      </div>
    )
  }

  // Render protected content
  return <>{children}</>
}