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

      // Check if user is admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id, created_at')
        .eq('user_id', currentUser.id)
        .single()

      if (adminError && adminError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for non-admin users
        console.error('Error checking admin status:', adminError)
        throw new Error('Failed to verify admin access')
      }

      setIsAdmin(!!adminUser)
      
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
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

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

// Hook for admin-specific operations
export const useAdminOperations = () => {
  const { user, isAdmin } = useAdminAuth()
  const supabase = createClient()
  
  const performAdminAction = async (
    action: string,
    operation: () => Promise<any>
  ) => {
    if (!user || !isAdmin) {
      throw new Error('Admin access required')
    }
    
    try {
      const result = await operation()
      
      // Log the admin action for audit trail
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action,
        resource_type: 'admin_action',
        resource_id: user.id,
        new_values: { 
          action,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent 
        }
      })
      
      return result
    } catch (error) {
      console.error(`Admin action failed: ${action}`, error)
      throw error
    }
  }
  
  return {
    performAdminAction,
    canPerformAdminActions: user && isAdmin
  }
}
