'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/supabase/types'

type AuthContextType = {
  user: User | null
  userRole: UserRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string, invitationToken?: string) => Promise<{ error: string | null }>  // Add invitationToken parameter
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting session:', error)
      } else {
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadUserRole(session.user.id)
        }
      }
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadUserRole(session.user.id)
        } else {
          setUserRole(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

 // Update your useAuth.tsx - modify the loadUserRole function

const loadUserRole = async (userId: string) => {
  try {
    // First check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    // If user is admin, don't load regular user role
    if (!adminError && adminUser) {
      console.log('User is admin, skipping regular role check')
      setUserRole('super_admin' as any) // Set a special admin role
      return
    }

    // Only check regular user role if not admin
    const { data, error } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', userId)
      .maybeSingle() // Use maybeSingle instead of single

    if (error) {
      console.error('Error loading user role:', error)
      setUserRole(null)
    } else {
      setUserRole(data?.role_type || null)
    }
  } catch (error) {
    console.error('Exception loading user role:', error)
    setUserRole(null)
  }
}
  const signIn = async (email: string, password: string) => {
  console.log('🔍 Auth hook signIn called:', email) // Debug log
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('🔍 Supabase signIn result:', { error }) // Debug log

    if (error) {
      console.error('❌ Supabase auth error:', error) // Debug log
      return { error: error.message }
    }

    console.log('✅ Supabase auth successful') // Debug log
    return { error: null }
  } catch (err) {
    console.error('❌ Auth hook exception:', err) // Debug log
    return { error: 'Authentication failed' }
  }
}

  const signUp = async (email: string, password: string, fullName: string, invitationToken?: string) => {
  console.log('🔍 SignUp called with invitation token:', invitationToken)

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        invitation_token: invitationToken || null,  // Store in user metadata
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  console.log('✅ SignUp successful, invitation token stored in metadata')
  return { error: null }
}

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  const refreshSession = async () => {
    const { error } = await supabase.auth.refreshSession()
    if (error) {
      console.error('Error refreshing session:', error)
    }
  }

  const value: AuthContextType = {
    user,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}