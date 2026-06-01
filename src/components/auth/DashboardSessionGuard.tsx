// src/components/auth/DashboardSessionGuard.tsx
'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { debugLogger } from '@/lib/utils/debugLogger'

/**
 * Lightweight client-side session guard for the dashboard layout.
 * Always renders children immediately (no loading flash), but watches
 * sessionStatus from AuthProvider. When the session expires mid-use
 * (e.g. while a modal is open), it immediately redirects to /auth.
 */
export function DashboardSessionGuard({ children }: { children: React.ReactNode }) {
  const { sessionStatus, loading } = useAuth()

  useEffect(() => {
    if (loading) {
      debugLogger.debug('DashboardSessionGuard', 'Still loading, skipping redirect check')
      return
    }

    if (sessionStatus === 'unauthenticated') {
      debugLogger.warning('DashboardSessionGuard', 'Session became unauthenticated, redirecting to auth')
      
      try {
        // Immediate redirect - don't wait
        window.location.replace('/auth')
      } catch (err) {
        debugLogger.error('DashboardSessionGuard', 'Replace redirect failed, trying href', { error: err })
        try {
          window.location.href = '/auth'
        } catch (fallbackErr) {
          debugLogger.error('DashboardSessionGuard', 'Href redirect also failed', { error: fallbackErr })
        }
      }
    }
  }, [sessionStatus, loading])

  return <>{children}</>
}
