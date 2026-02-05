// src/lib/hooks/useAuth.tsx - UPDATED with proper error handling
'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/supabase/types'
import { debugLogger } from '@/lib/utils/debugLogger'

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

type AuthContextType = {
  user: User | null
  userRole: UserRole | null
  loading: boolean
  sessionStatus: SessionStatus
  lastActivity: number
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string, invitationToken?: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  hasPermission: (requiredRole: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Session configuration constants
// IDLE_TIMEOUT: Time in milliseconds before auto-logout
// ADJUST THIS VALUE TO TEST:
// - 1 minute (testing): 1 * 60 * 1000 = 60,000ms
// - 5 minutes (testing): 5 * 60 * 1000 = 300,000ms
// - 15 minutes (testing): 15 * 60 * 1000 = 900,000ms
// - 30 minutes (production default): 30 * 60 * 1000 = 1,800,000ms
const SESSION_CONFIG = {
  IDLE_TIMEOUT: 30 * 60 * 1000, // ← CHANGE THIS NUMBER TO TEST (currently 1 minute)
  REFRESH_BUFFER: 5 * 60 * 1000,
  ACTIVITY_THROTTLE: 1000,
  PERMISSION_CACHE_TTL: 5 * 60 * 1000,
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading')
  const [lastActivity, setLastActivity] = useState<number>(Date.now())

  const supabase = createClient()

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const activityThrottleRef = useRef<NodeJS.Timeout | null>(null)
  const permissionCacheRef = useRef<{ role: string; timestamp: number } | null>(null)

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    if (activityThrottleRef.current) clearTimeout(activityThrottleRef.current)
    idleTimerRef.current = null
    refreshTimerRef.current = null
    activityThrottleRef.current = null
  }, [])

  const setupRefreshTimer = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      // ✅ FIXED: Handle missing session gracefully
      if (error) {
        if (error.message.includes('AuthSessionMissingError')) {
          // Expected for logged-out users, don't log as error
          return
        }
        debugLogger.warning('AuthProvider', 'Error getting session for refresh timer', { error: error.message })
        return
      }

      if (!session?.expires_at) return

      const expiresAt = new Date(session.expires_at * 1000).getTime()
      const now = Date.now()
      const timeUntilExpiry = expiresAt - now

      if (timeUntilExpiry <= 0) {
        debugLogger.warning('AuthProvider', 'Session already expired, signing out')
        await signOut()
        return
      }

      const refreshTime = timeUntilExpiry - SESSION_CONFIG.REFRESH_BUFFER

      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)

      refreshTimerRef.current = setTimeout(async () => {
        debugLogger.debug('AuthProvider', 'Auto-refreshing session before expiry')
        await refreshSession()
      }, Math.max(refreshTime, 0))

    } catch (error) {
      debugLogger.error('AuthProvider', 'Error setting up refresh timer', { error })
    }
  }, [supabase])

  const resetIdleTimer = useCallback(() => {
    setLastActivity(Date.now())

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

    if (user) {
      idleTimerRef.current = setTimeout(() => {
        debugLogger.warning('AuthProvider', 'User inactive for 30 minutes, logging out')
        signOut()
      }, SESSION_CONFIG.IDLE_TIMEOUT)
    }
  }, [user])

  const handleActivity = useCallback(() => {
    if (activityThrottleRef.current) return

    activityThrottleRef.current = setTimeout(() => {
      resetIdleTimer()
      activityThrottleRef.current = null
    }, SESSION_CONFIG.ACTIVITY_THROTTLE)
  }, [resetIdleTimer])

  useEffect(() => {
    if (!user) return

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => document.addEventListener(event, handleActivity))

    resetIdleTimer()
    setupRefreshTimer()

    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity))
      clearAllTimers()
    }
  }, [user, handleActivity, resetIdleTimer, setupRefreshTimer])

  // Initialize auth session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setSessionStatus('loading')
        debugLogger.info('AuthProvider', 'Initializing authentication')

        // ✅ FIXED: Wrap getSession() with try-catch
        let session = null
        try {
          const { data: { session: fetchedSession }, error } = await supabase.auth.getSession()
          
          if (error) {
            // Check if it's the expected AuthSessionMissingError
            if (error.message.includes('AuthSessionMissingError')) {
              // This is expected for logged-out users - not an error
              debugLogger.debug('AuthProvider', 'No session found (expected for logged-out users)')
              setSessionStatus('unauthenticated')
              setLoading(false)
              return
            }
            
            // Unexpected error
            debugLogger.error('AuthProvider', 'Error getting session', { error: error.message })
            setSessionStatus('error')
            setLoading(false)
            return
          }
          
          session = fetchedSession
        } catch (err) {
          // Handle any runtime exceptions
          debugLogger.error('AuthProvider', 'Exception getting session', { error: err })
          setSessionStatus('unauthenticated')
          setLoading(false)
          return
        }

        if (session?.user) {
          debugLogger.success('AuthProvider', 'Session found', { userId: session.user.id })
          setUser(session.user)
          setSessionStatus('authenticated')
          await loadUserRole(session.user.id)
          await setupRefreshTimer()
        } else {
          debugLogger.debug('AuthProvider', 'No session found')
          setSessionStatus('unauthenticated')
        }
      } catch (error) {
        debugLogger.error('AuthProvider', 'Exception during auth initialization', { error })
        setSessionStatus('unauthenticated')
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        debugLogger.debug('AuthProvider', 'Auth state changed', { event, hasSession: !!session })

        if (session?.user) {
          setUser(session.user)
          setSessionStatus('authenticated')
          await loadUserRole(session.user.id)
          await setupRefreshTimer()
        } else {
          setUser(null)
          setUserRole(null)
          setSessionStatus('unauthenticated')
          clearAllTimers()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      clearAllTimers()
    }
  }, [supabase, setupRefreshTimer])

  // Load user role from database
  const loadUserRole = async (userId: string) => {
    try {
      debugLogger.debug('AuthProvider', 'Loading user role', { userId })

      // Check admin status first
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (adminUser) {
        debugLogger.success('AuthProvider', 'User is admin', { userId })
        setUserRole('super_admin' as any)
        return
      }

      // Get user role
      const { data, error } = await (supabase
        .from('user_roles') as any)
        .select('role_type, farm_id, status')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        debugLogger.error('AuthProvider', 'Error loading user role', { error: error.message })
        setUserRole(null)
        return
      }

      debugLogger.success('AuthProvider', 'User role loaded', { role: data?.role_type })
      setUserRole(data?.role_type || null)
    } catch (error) {
      debugLogger.error('AuthProvider', 'Exception loading user role', { error })
      setUserRole(null)
    }
  }

  // Authentication methods
  const signIn = async (email: string, password: string) => {
    debugLogger.info('AuthProvider', 'Sign in initiated', { email })

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        debugLogger.error('AuthProvider', 'Sign in failed', { email, error: error.message })
        return { error: error.message }
      }

      debugLogger.success('AuthProvider', 'Sign in successful', { email })
      return { error: null }
    } catch (err) {
      debugLogger.error('AuthProvider', 'Sign in exception', { error: err })
      return { error: 'Authentication failed' }
    }
  }

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    invitationToken?: string
  ) => {
    debugLogger.info('AuthProvider', 'Sign up initiated', {
      email,
      fullName,
      hasInvitation: !!invitationToken,
    })

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            invitation_token: invitationToken || null,
          },
        },
      })

      if (error) {
        debugLogger.error('AuthProvider', 'Sign up failed', { email, error: error.message })
        return { error: error.message }
      }

      debugLogger.success('AuthProvider', 'Sign up successful', {
        email,
        invitationTokenStored: !!invitationToken,
      })
      return { error: null }
    } catch (err) {
      debugLogger.error('AuthProvider', 'Sign up exception', { error: err })
      return { error: 'Sign up failed' }
    }
  }

  const resetPassword = async (email: string) => {
    debugLogger.info('AuthProvider', 'Password reset initiated', { email })

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
      })

      if (error) {
        debugLogger.error('AuthProvider', 'Password reset failed', { email, error: error.message })
        return { error: error.message }
      }

      debugLogger.success('AuthProvider', 'Password reset email sent', { email })
      return { error: null }
    } catch (err) {
      debugLogger.error('AuthProvider', 'Password reset exception', { error: err })
      return { error: 'Password reset request failed' }
    }
  }

  const refreshSession = async () => {
    debugLogger.debug('AuthProvider', 'Manual session refresh triggered')

    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()

      if (error || !session) {
        debugLogger.error('AuthProvider', 'Session refresh failed', { error: error?.message })
        await signOut()
        return
      }

      debugLogger.success('AuthProvider', 'Session refreshed successfully')
      await setupRefreshTimer()
    } catch (error) {
      debugLogger.error('AuthProvider', 'Session refresh exception', { error })
      await signOut()
    }
  }

  const signOut = async () => {
    debugLogger.info('AuthProvider', 'Sign out initiated')

    try {
      clearAllTimers()
      
      // Call Supabase sign out to clear session and refresh token
      const { error } = await supabase.auth.signOut()

      if (error) {
        debugLogger.error('AuthProvider', 'Sign out error', { error: error.message })
      } else {
        debugLogger.success('AuthProvider', 'Sign out successful')
      }

      // Clear local state
      setUser(null)
      setUserRole(null)
      setSessionStatus('unauthenticated')
      setLastActivity(0)

      // Redirect to auth page (if in browser)
      if (typeof window !== 'undefined') {
        // Use window.location for a hard redirect to ensure middleware re-evaluates
        setTimeout(() => {
          window.location.href = '/auth'
        }, 100)
      }
    } catch (error) {
      debugLogger.error('AuthProvider', 'Sign out exception', { error })
      // Still attempt redirect even if there's an error
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/auth'
        }, 100)
      }
    }
  }

  const hasPermission = useCallback((requiredRole: string): boolean => {
    if (!userRole) return false

    if (permissionCacheRef.current) {
      const { role, timestamp } = permissionCacheRef.current
      if (Date.now() - timestamp < SESSION_CONFIG.PERMISSION_CACHE_TTL) {
        return role === requiredRole || role === 'super_admin'
      }
    }

    const hasAccess = userRole === requiredRole || userRole === 'super_admin'
    permissionCacheRef.current = { role: userRole, timestamp: Date.now() }

    return hasAccess
  }, [userRole])

  const value: AuthContextType = {
    user,
    userRole,
    loading,
    sessionStatus,
    lastActivity,
    signIn,
    signUp,
    signOut,
    refreshSession,
    resetPassword,
    hasPermission,
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