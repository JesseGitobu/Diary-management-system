// src/components/auth/SessionGuard.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface SessionGuardProps {
  children: React.ReactNode
  requiredRole?: string
  fallbackRoute?: string
  showLoader?: boolean
}

export function SessionGuard({
  children,
  requiredRole,
  fallbackRoute = '/auth',
  showLoader = true,
}: SessionGuardProps) {
  const router = useRouter()
  const { user, userRole, loading, sessionStatus, hasPermission } = useAuth()
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    if (loading) return

    // Handle unauthenticated users
    if (sessionStatus === 'unauthenticated' || !user) {
      router.push(fallbackRoute)
      return
    }

    // Handle session errors
    if (sessionStatus === 'error') {
      setShowError(true)
      return
    }

    // Check permissions if required role specified
    if (requiredRole && !hasPermission(requiredRole)) {
      router.push('/unauthorized')
      return
    }
  }, [user, userRole, loading, sessionStatus, requiredRole, router, fallbackRoute, hasPermission])

  if (loading) {
    return showLoader ? (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    ) : null
  }

  if (showError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Session Error</CardTitle>
            <CardDescription>
              There was an issue with your session. Please try signing in again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/auth')}
              className="w-full"
              primary
            >
              Return to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user || (requiredRole && !hasPermission(requiredRole))) {
    return null
  }

  return <>{children}</>
}