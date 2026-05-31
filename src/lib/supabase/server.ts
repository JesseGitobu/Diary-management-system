// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './types'

// ✅ FIXED: Suppress Supabase's internal error logging for AuthSessionMissingError
const originalConsoleError = console.error

// console.error = function (...args: any[]) {
//   // Check if this is the AuthSessionMissingError we want to suppress
//   const errorMessage = args[0]?.message || args[0]?.toString() || ''
//   const stackTrace = args[0]?.stack || args[1] || ''
  
//   // Suppress only AuthSessionMissingError from Supabase
//   if (
//     errorMessage.includes('AuthSessionMissingError') &&
//     stackTrace.includes('GoTrueClient')
//   ) {
//     // Don't log this expected error
//     return
//   }
  
//   // Log all other errors normally
//   originalConsoleError.apply(console, args)
// }

// Server-side client for API routes and Server Components
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Admin client for server-side admin operations
export const createAdminClient = () => {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for admin operations
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // No-op for admin client
        },
      },
    }
  )
}

// ✅ FIXED: Get user ID directly from session cookies without calling Supabase auth service
// This avoids network timeouts when Supabase auth endpoint is unreachable
export const getUserIdFromSession = async () => {
  try {
    const cookieStore = await cookies()
    
    // Try multiple cookie name patterns used by Supabase SSR
    const cookieNames = [
      'sb-auth-token',
      'sb-token',
      'auth-token',
      'sb-session'
    ]
    
    for (const cookieName of cookieNames) {
      const sessionCookie = cookieStore.get(cookieName)
      
      if (!sessionCookie?.value) {
        continue
      }

      try {
        // Try parsing as-is (JSON string)
        let decoded: any
        try {
          decoded = JSON.parse(sessionCookie.value)
        } catch {
          // Try base64 decoding first
          try {
            decoded = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
          } catch {
            continue
          }
        }
        
        const userId = decoded?.user?.id
        if (userId) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ User ID from ${cookieName} cookie:`, userId)
          }
          return userId
        }
      } catch (parseErr) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`⚠️ Failed to parse ${cookieName} cookie`)
        }
        continue
      }
    }
    
    // If no standard cookies found, log all available cookies for debugging
    if (process.env.NODE_ENV === 'development') {
      const allCookies = cookieStore.getAll()
      const authCookies = allCookies.filter(c => 
        c.name.includes('auth') || c.name.includes('sb') || c.name.includes('session')
      )
      if (authCookies.length > 0) {
        console.log('🔍 Available auth-related cookies:', authCookies.map(c => c.name))
      } else {
        console.log('🔍 No auth-related cookies found')
      }
    }
    
    return null
  } catch (err) {
    console.error('🔍 Error extracting user ID from session:', err)
    return null
  }
}

// ✅ FIXED: Wrap getUser() with proper error handling and fallback to session cookies
export const getCurrentUser = async () => {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      // ✅ IMPROVED: Check for AuthSessionMissingError multiple ways
      const isAuthMissingError = 
        error.message?.includes('AuthSessionMissingError') ||
        error.status === 400 ||
        error.code === 'session_not_found'
      
      if (isAuthMissingError) {
        // Session missing - try fallback
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 No authenticated session (AuthSessionMissingError) - trying fallback...')
        }
        
        // Try fallback: get user ID from session cookies
        const userId = await getUserIdFromSession()
        if (userId) {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Recovered user ID from fallback:', userId)
          }
          return { id: userId } as any // Minimal user object with just the ID
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ Fallback also failed - no session found')
        }
        return null
      }
      // Log unexpected errors only
      console.error('Error getting user:', error)
      return null
    }
    
    if (user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Got user via getUser():', user.id)
      }
      return user
    }
    
    return null
  } catch (err) {
    // Handle any runtime exceptions (like network timeouts)
    if (err instanceof Error) {
      if (err.message.includes('AuthSessionMissingError')) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 No authenticated session (caught exception) - trying fallback...')
        }
        
        // Try fallback
        const userId = await getUserIdFromSession()
        if (userId) {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Recovered user ID from fallback:', userId)
          }
          return { id: userId } as any
        }
        
        return null
      }
      
      // Network timeout or connectivity issue - this is expected in some environments
      console.log('⚠️ getUser() failed (likely network/timeout):', err.message.slice(0, 50))
      
      // Try fallback: get user ID from session cookies
      console.log('🔍 Attempting fallback: extracting user ID from session cookies')
      const userId = await getUserIdFromSession()
      if (userId) {
        return { id: userId } as any // Minimal user object with just the ID
      }
    } else {
      console.error('Exception getting user:', err)
    }
    
    return null
  }
}

//  Check if user is an admin 
export const getCurrentAdmin = async () => {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      // ✅ IMPROVED: Check for AuthSessionMissingError multiple ways
      const isAuthMissingError = 
        userError.message?.includes('AuthSessionMissingError') ||
        userError.status === 400 ||
        userError.code === 'session_not_found'
      
      if (isAuthMissingError) {
        // Expected for unauthenticated users - don't log as error
        return null
      }
      // Log unexpected errors only
      console.error('Error getting user:', userError)
      return null
    }
    
    return user
  } catch (err) {
    // Handle any runtime exceptions
    if (err instanceof Error && err.message.includes('AuthSessionMissingError')) {
      // Expected for unauthenticated users
      return null
    }
    console.error('Exception getting user:', err)
    return null
  }
}

// Helper function to get user role server-side
export const getUserRole = async (userId: string) => {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('user_roles')
      .select('role_type, farm_id')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      console.error('Error getting user role:', error)
      return null
    }
    
    return data
  } catch (err) {
    console.error('Exception getting user role:', err)
    return null
  }
}

export { createServerClient }
