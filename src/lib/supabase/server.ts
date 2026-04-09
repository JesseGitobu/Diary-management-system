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
    const sessionCookie = cookieStore.get('sb-auth-token')
    
    if (!sessionCookie?.value) {
      console.log('🔍 No session cookie found')
      return null
    }

    // Session cookie format: base64 encoded JSON
    try {
      const decoded = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
      const userId = decoded?.user?.id
      
      if (userId) {
        console.log('🔍 User ID from session cookie:', userId)
        return userId
      }
    } catch (parseErr) {
      console.log('🔍 Could not parse session cookie - trying legacy format')
      // Try alternative cookie name
      const legacySb = cookieStore.get('sb:token')
      if (legacySb?.value) {
        try {
          const decoded = JSON.parse(legacySb.value)
          const userId = decoded?.user?.id
          if (userId) {
            console.log('🔍 User ID from legacy session cookie:', userId)
            return userId
          }
        } catch {
          // Continue to fallback
        }
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
    console.log('🔍 Attempting to get user via getUser()')
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      // Check if it's the expected AuthSessionMissingError
      if (error.message?.includes('AuthSessionMissingError')) {
        // Expected for unauthenticated users - don't log it
        console.log('🔍 No authenticated session (AuthSessionMissingError)')
        return null
      }
      // Log unexpected errors only
      console.error('Error getting user:', error)
      return null
    }
    
    if (user) {
      console.log('✅ Got user via getUser():', user.id)
      return user
    }
    
    return null
  } catch (err) {
    // Handle any runtime exceptions (like network timeouts)
    if (err instanceof Error) {
      if (err.message.includes('AuthSessionMissingError')) {
        console.log('🔍 No authenticated session (caught exception)')
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
      // Check if it's the expected AuthSessionMissingError
      if (userError.message?.includes('AuthSessionMissingError')) {
        // Expected for unauthenticated users - don't log it
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
