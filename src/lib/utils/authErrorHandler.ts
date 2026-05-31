/**
 * Auth Error Handler
 * 
 * Detects auth-related errors and enforces redirect to login page
 * Used across API calls and components to handle expired sessions
 */

import { debugLogger } from '@/lib/utils/debugLogger'

export type AuthErrorType = 'session_missing' | 'token_expired' | 'unauthorized' | 'unknown'

export interface AuthError extends Error {
  type: AuthErrorType
  status?: number
  code?: string
}

/**
 * Detects if an error is auth-related
 */
export function isAuthError(error: any): error is AuthError {
  const errorMessage = error?.message?.toLowerCase() || ''
  const errorCode = error?.code?.toLowerCase() || ''
  const status = error?.status

  return (
    errorMessage.includes('authsession') ||
    errorMessage.includes('session_missing') ||
    errorMessage.includes('unauthorized') ||
    errorCode.includes('session_not_found') ||
    errorCode.includes('401') ||
    status === 401 ||
    status === 400
  )
}

/**
 * Classifies the type of auth error
 */
export function getAuthErrorType(error: any): AuthErrorType {
  const errorMessage = error?.message?.toLowerCase() || ''
  const errorCode = error?.code?.toLowerCase() || ''

  if (
    errorMessage.includes('authsession') ||
    errorCode.includes('session_not_found')
  ) {
    return 'session_missing'
  }

  if (
    errorMessage.includes('expired') ||
    errorCode.includes('expired')
  ) {
    return 'token_expired'
  }

  if (
    errorMessage.includes('unauthorized') ||
    error?.status === 401
  ) {
    return 'unauthorized'
  }

  return 'unknown'
}

/**
 * Handles auth errors and optionally redirects to login
 * @param error - The error to handle
 * @param options - Configuration options
 * @returns true if error was handled as auth error
 */
export function handleAuthError(
  error: any,
  options: {
    redirect?: boolean
    logLevel?: 'debug' | 'warning' | 'error'
    context?: string
  } = {}
): boolean {
  const {
    redirect = true,
    logLevel = 'warning',
    context = 'AuthError'
  } = options

  if (!isAuthError(error)) {
    return false
  }

  const type = getAuthErrorType(error)
  const message = error?.message || 'Unknown auth error'

  debugLogger[logLevel](context, `Auth error: ${type}`, { message })

  if (redirect && typeof window !== 'undefined') {
    debugLogger.debug(context, 'Redirecting to auth page')
    // Use setTimeout to ensure any pending state updates complete
    setTimeout(() => {
      window.location.href = '/auth'
    }, 100)
  }

  return true
}

/**
 * Wraps a function and handles auth errors
 */
export async function withAuthErrorHandling<T>(
  fn: () => Promise<T>,
  context = 'withAuthErrorHandling'
): Promise<T> {
  try {
    return await fn()
  } catch (error: any) {
    if (handleAuthError(error, { context })) {
      // Auth error was handled and user will be redirected
      throw error
    }
    // Re-throw non-auth errors
    throw error
  }
}

/**
 * Hook for components to handle API errors
 * Usage: const [error, handleError] = useAuthErrorHandler('ComponentName')
 */
export function useAuthErrorHandler(context: string) {
  return (error: any) => {
    handleAuthError(error, { context, redirect: true })
  }
}
