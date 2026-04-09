// src/components/auth/DashboardSessionGuard.tsx
'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'

/**
 * Lightweight client-side session guard for the dashboard layout.
 * Always renders children immediately (no loading flash), but watches
 * sessionStatus from AuthProvider. When the session expires mid-use
 * (e.g. while a modal is open), it immediately redirects to /auth.
 */
export function DashboardSessionGuard({ children }: { children: React.ReactNode }) {
  const { sessionStatus, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (sessionStatus === 'unauthenticated') {
      window.location.replace('/auth')
    }
  }, [sessionStatus, loading])

  return <>{children}</>
}
