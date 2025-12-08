'use client'

import * as React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type AdminAuthContextType = {
  user: User | null
  isAdmin: boolean
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const checkAdminStatus = async (currentUser?: User | null) => {
    try {
      setError(null)
      
      if (!currentUser) {
        setUser(null)
        setIsAdmin(false)
        return
      }

      setUser(currentUser)

      // Check if user is admin with more detailed error handling
      console.log('Checking admin status for user:', currentUser.id)
      
      const { data: adminUserData, error: adminError } = await supabase
        .from('admin_users')
        .select('id, created_at')
        .eq('user_id', currentUser.id)
        .maybeSingle() // Use maybeSingle instead of single to avoid errors when no record found

      // FIXED: Cast to any to bypass 'never' type error
      const adminUser = adminUserData as any

      console.log('Admin check result:', { adminUser, adminError })

      if (adminError) {
        console.error('Error checking admin status:', adminError)
        
        // Check if it's a table not found error
        if (adminError.message?.includes('relation "admin_users" does not exist')) {
          throw new Error('Admin system not set up. Please contact administrator.')
        }
        
        // Check if it's a permission error
        if (adminError.message?.includes('permission')) {
          throw new Error('Database permission error. Please contact administrator.')
        }
        
        throw new Error(`Admin verification failed: ${adminError.message}`)
      }

      const isUserAdmin = !!adminUser
      setIsAdmin(isUserAdmin)
      
      console.log('User admin status:', isUserAdmin)
      
      // Log admin access for audit trail
      if (adminUser) {
        console.log('Admin user authenticated:', {
          userId: currentUser.id,
          email: currentUser.email,
          adminSince: adminUser.created_at
        })
      }
      
    } catch (err: any) {
      console.error('Admin auth error:', err)
      setError(err.message || 'Authentication error occurred')
      setIsAdmin(false)
    }
  }

  const refreshAuth = async () => {
    setLoading(true)
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        throw userError
      }

      await checkAdminStatus(currentUser)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }

      setUser(null)
      setIsAdmin(false)
      setError(null)
    } catch (err: any) {
      console.error('Sign out error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...')
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        console.log('Initial session:', session?.user?.email || 'No user')
        await checkAdminStatus(session?.user || null)
      } catch (err: any) {
        console.error('Initial session error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Admin auth state change:', event, session?.user?.email)
        
        try {
          setLoading(true)
          
          if (event === 'SIGNED_OUT') {
            setUser(null)
            setIsAdmin(false)
            setError(null)
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await checkAdminStatus(session?.user || null)
          }
        } catch (err: any) {
          setError(err.message)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const value: AdminAuthContextType = {
    user,
    isAdmin,
    loading,
    error,
    signOut,
    refreshAuth,
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}

// Helper hook for checking admin status in components
export const useRequireAdmin = () => {
  const { user, isAdmin, loading, error } = useAdminAuth()
  
  return {
    user,
    isAdmin,
    loading,
    error,
    isAuthorized: !loading && user && isAdmin,
    shouldRedirect: !loading && (!user || !isAdmin)
  }
}