// src/lib/hooks/useSessionMonitoring.ts
'use client'

import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { debugLogger } from '@/lib/utils/debugLogger'

interface SessionMetrics {
  sessionDuration: number
  idleTime: number
  lastRefresh: number
  activityCount: number
}

export function useSessionMonitoring() {
  const { user, sessionStatus, lastActivity } = useAuth()

  useEffect(() => {
    if (!user) return

    const metrics: SessionMetrics = {
      sessionDuration: Date.now() - (user.created_at ? new Date(user.created_at).getTime() : 0),
      idleTime: Date.now() - lastActivity,
      lastRefresh: Date.now(),
      activityCount: 0,
    }

    // Log metrics every 5 minutes
    const interval = setInterval(() => {
      debugLogger.debug('SessionMonitoring', 'Session metrics', {
        sessionStatus,
        sessionDurationMinutes: Math.floor(metrics.sessionDuration / 60000),
        idleMinutes: Math.floor(metrics.idleTime / 60000),
        userId: user.id,
      })
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [user, sessionStatus, lastActivity])
}