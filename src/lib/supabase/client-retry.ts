/**
 * ✅ PHASE 3: Client-side retry utility for API calls
 * 
 * Automatically retries failed requests with session refresh
 * when AuthSessionMissingError or 401 errors occur.
 */

import { createClient } from './client'
import { debugLogger } from '@/lib/utils/debugLogger'

type FetchOptions = RequestInit & {
  retryCount?: number
  maxRetries?: number
}

/**
 * Wraps fetch calls with automatic session refresh retry
 * If a 401/AuthSessionMissingError occurs, attempts refresh once and retries
 */
export async function fetchWithSessionRefresh(
  url: string | Request,
  options: FetchOptions = {}
): Promise<Response> {
  const { maxRetries = 1, retryCount = 0, ...fetchOptions } = options

  try {
    const response = await fetch(url, fetchOptions)

    // If successful, return immediately
    if (response.ok) {
      return response
    }

    // Handle 401 Unauthorized
    if (response.status === 401 && retryCount < maxRetries) {
      debugLogger.warning('SessionRefresh', 'Got 401, attempting session refresh', { url: String(url) })

      try {
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.refreshSession()

        if (error || !session) {
          debugLogger.error('SessionRefresh', 'Session refresh failed', { error: error?.message })
          // Return original 401 response
          return response
        }

        debugLogger.success('SessionRefresh', 'Session refreshed, retrying request', { url: String(url) })

        // Retry the original request
        return fetch(url, fetchOptions)
      } catch (err) {
        debugLogger.error('SessionRefresh', 'Exception during refresh', { error: err })
        // Return original 401 response
        return response
      }
    }

    // Return response as-is for other status codes
    return response
  } catch (error) {
    debugLogger.error('SessionRefresh', 'Fetch error', { error, url: String(url) })
    throw error
  }
}

/**
 * Higher-order function to wrap API route calls with session refresh
 */
export async function withSessionRefresh<T>(
  fn: () => Promise<T>
): Promise<T> {
  const supabase = createClient()

  try {
    return await fn()
  } catch (error: any) {
    // Check if it's an auth-related error
    const errorMessage = error?.message || error?.toString() || ''
    const isAuthError = 
      errorMessage.includes('AuthSessionMissingError') ||
      errorMessage.includes('Unauthorized') ||
      error?.status === 401

    if (isAuthError) {
      debugLogger.warning('SessionRefresh', 'Auth error detected, attempting session refresh')

      try {
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError || !session) {
          debugLogger.error('SessionRefresh', 'Session refresh failed during retry', { error: refreshError?.message })
          throw error // Re-throw original error
        }

        debugLogger.success('SessionRefresh', 'Session refreshed, retrying operation')
        
        // Retry the original function
        return await fn()
      } catch (refreshErr) {
        debugLogger.error('SessionRefresh', 'Retry failed', { error: refreshErr })
        throw error // Throw original error if retry also fails
      }
    }

    // Re-throw non-auth errors
    throw error
  }
}

/**
 * Utility to check if current session is valid and refresh if needed
 */
export async function ensureValidSession(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error?.message?.includes('AuthSessionMissingError')) {
      debugLogger.debug('SessionRefresh', 'No session found')
      return false
    }

    if (!session) {
      debugLogger.debug('SessionRefresh', 'Session is null')
      return false
    }

    // Check if session is close to expiry (less than 5 min)
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000).getTime()
      const now = Date.now()
      const timeUntilExpiry = expiresAt - now

      if (timeUntilExpiry < 5 * 60 * 1000) {
        debugLogger.debug('SessionRefresh', 'Session expiring soon, refreshing...')
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError || !refreshedSession) {
          debugLogger.error('SessionRefresh', 'Auto-refresh failed', { error: refreshError?.message })
          return false
        }

        debugLogger.success('SessionRefresh', 'Session auto-refreshed')
        return true
      }
    }

    debugLogger.debug('SessionRefresh', 'Session is valid')
    return true
  } catch (error) {
    debugLogger.error('SessionRefresh', 'Error checking session', { error })
    return false
  }
}
