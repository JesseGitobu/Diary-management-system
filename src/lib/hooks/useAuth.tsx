// src/lib/hooks/useAuth.tsx - UPDATED with proper error handling
'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { debugLogger } from '@/lib/utils/debugLogger'

type UserRole = Database["public"]["Enums"]["user_role"] | 'super_admin' | null

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
// DEV_MODE: Set to true to enable 1-minute timeout for testing logout flows
const DEV_MODE = process.env.NODE_ENV === 'development' // ← This will be true in dev server

const SESSION_CONFIG = {
  IDLE_TIMEOUT: DEV_MODE ? 30 * 60 * 1000 : 30 * 60 * 1000, // 5 min in dev, 30 min in prod
  REFRESH_BUFFER: 15 * 60 * 1000, // ✅ IMPROVED: Refresh 15 min before expiry (was 5 min)
  ACTIVITY_THROTTLE: 1000,
  PERMISSION_CACHE_TTL: 5 * 60 * 1000,
  VISIBILITY_REFRESH_BUFFER: 10 * 60 * 1000, // Refresh if tab was hidden for > 10 min
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
      let session = null
      let error = null
      
      try {
        const result = await supabase.auth.getSession()
        session = result.data.session
        error = result.error
      } catch (err) {
        // Network error or other exception - try blind refresh
        debugLogger.debug('AuthProvider', 'Exception getting session, attempting blind refresh')
        try {
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
          session = refreshedSession
        } catch (refreshErr) {
          debugLogger.warning('AuthProvider', 'Blind refresh also failed', { error: refreshErr })
          return
        }
      }
      
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

      // ✅ IMPROVED: More aggressive refresh timing (15 min before expiry instead of 5)
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

  // ✅ PHASE 1: Page visibility listener - Refresh session when tab becomes visible
  useEffect(() => {
    if (!user) return

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        debugLogger.debug('AuthProvider', 'Page became visible, checking session freshness')
        
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error?.message?.includes('AuthSessionMissingError') || !session) {
            debugLogger.warning('AuthProvider', 'Session missing after tab became visible, refreshing...')
            await refreshSession()
            return
          }
          
          // Check if session is close to expiry (within 10 min buffer)
          if (session?.expires_at) {
            const expiresAt = new Date(session.expires_at * 1000).getTime()
            const now = Date.now()
            const timeUntilExpiry = expiresAt - now
            
            if (timeUntilExpiry < SESSION_CONFIG.VISIBILITY_REFRESH_BUFFER) {
              debugLogger.debug('AuthProvider', 'Session expiring soon after visibility change, refreshing...')
              await refreshSession()
            }
          }
        } catch (err) {
          debugLogger.warning('AuthProvider', 'Error checking session on visibility change', { error: err })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, supabase])

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

  // ✅ IMPROVED: Better refresh handling with error detection
  const refreshSession = async () => {
    debugLogger.debug('AuthProvider', 'Manual session refresh triggered')

    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()

      if (error) {
        // If it's AuthSessionMissingError, user truly logged out - sign them out
        if (error.message?.includes('AuthSessionMissingError')) {
          debugLogger.warning('AuthProvider', 'Session refresh failed: no auth session')
          await signOut()
          return
        }
        debugLogger.error('AuthProvider', 'Session refresh failed', { error: error.message })
        // Don't auto sign out for other errors - might be temporary
        return
      }
      
      if (!session) {
        debugLogger.warning('AuthProvider', 'Session refresh returned no session')
        await signOut()
        return
      }

      debugLogger.success('AuthProvider', 'Session refreshed successfully')
      await setupRefreshTimer()
    } catch (error) {
      debugLogger.error('AuthProvider', 'Session refresh exception', { error })
      // Don't auto sign out for exceptions - might be temporary network issue
    }
  }

  // ✅ IMPROVED: Better sign out with aggressive cleanup
  const signOut = async () => {
    debugLogger.info('AuthProvider', 'Sign out initiated')

    try {
      clearAllTimers()
      
      // Call Supabase sign out to clear session and refresh token
      let signOutError = null
      try {
        const { error } = await supabase.auth.signOut({ scope: 'global' })
        signOutError = error
      } catch (err) {
        debugLogger.warning('AuthProvider', 'Supabase signOut threw exception', { error: err })
        // Continue with logout even if signOut throws
      }

      if (signOutError) {
        // Log but don't fail - some errors are expected (e.g., already logged out)
        if (!signOutError.message?.includes('AuthSessionMissingError')) {
          debugLogger.error('AuthProvider', 'Sign out error', { error: signOutError.message })
        }
      } else {
        debugLogger.success('AuthProvider', 'Sign out successful')
      }

      // Clear local state first (before redirect)
      setUser(null)
      setUserRole(null)
      setSessionStatus('unauthenticated')
      setLastActivity(0)

      // ✅ CRITICAL: Immediate redirect without delay to avoid race conditions
      if (typeof window !== 'undefined') {
        try {
          debugLogger.debug('AuthProvider', 'Redirecting to auth page')
          // Use replace() to prevent back button returning to protected page
          window.location.replace('/auth')
        } catch (redirectErr) {
          debugLogger.error('AuthProvider', 'Redirect failed', { error: redirectErr })
          // Fallback: try using href assignment
          try {
            window.location.href = '/auth'
          } catch (fallbackErr) {
            debugLogger.error('AuthProvider', 'Redirect fallback failed', { error: fallbackErr })
          }
        }
      }
    } catch (error) {
      debugLogger.error('AuthProvider', 'Sign out exception', { error })
      // Clear state and redirect anyway
      setUser(null)
      setUserRole(null)
      setSessionStatus('unauthenticated')
      
      if (typeof window !== 'undefined') {
        try {
          debugLogger.debug('AuthProvider', 'Exception - redirecting to auth page')
          window.location.replace('/auth')
        } catch (redirectErr) {
          debugLogger.error('AuthProvider', 'Exception redirect failed', { error: redirectErr })
          try {
            window.location.href = '/auth'
          } catch (fallbackErr) {
            debugLogger.error('AuthProvider', 'Exception redirect fallback failed', { error: fallbackErr })
          }
        }
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
  
  // ✅ IMPROVED: Return safe default instead of throwing
  // This handles edge cases where components might render before AuthProvider is ready
  // (e.g., during Next.js hydration or SSR edge cases)
  if (context === undefined) {
    // Log the warning so we can track if this is happening
    if (typeof window !== 'undefined') {
      console.warn('⚠️ useAuth called outside AuthProvider - returning safe defaults')
    }
    
    // Return safe defaults that won't crash the app
    return {
      user: null,
      userRole: null,
      loading: true,
      sessionStatus: 'loading' as const,
      lastActivity: Date.now(),
      signIn: async () => ({ error: 'Auth not initialized' }),
      signUp: async () => ({ error: 'Auth not initialized' }),
      signOut: async () => {},
      refreshSession: async () => {},
      resetPassword: async () => ({ error: 'Auth not initialized' }),
      hasPermission: () => false,
    } satisfies AuthContextType
  }
  
  return context
}