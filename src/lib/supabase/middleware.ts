// src/lib/supabase/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from './types'

export const createMiddlewareClient = (request: NextRequest) => {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  return { supabase, response }
}

// ✅ FIXED: Wrap getUser() with proper error handling
export const authenticateUser = async (request: NextRequest) => {
  const { supabase, response } = createMiddlewareClient(request)
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      // Check if it's the expected AuthSessionMissingError
      if (error.message?.includes('AuthSessionMissingError')) {
        // Expected for unauthenticated users - don't log it
        return { user: null, response }
      }
      // Log unexpected errors only
      console.error('Middleware auth error:', error)
      return { user: null, response }
    }
    
    return { user, response }
  } catch (err) {
    // Handle any runtime exceptions
    if (err instanceof Error && err.message.includes('AuthSessionMissingError')) {
      // Expected for unauthenticated users
      return { user: null, response }
    }
    console.error('Middleware auth exception:', err)
    return { user: null, response }
  }
}

// Helper function to check user permissions
export const checkUserPermissions = async (
  request: NextRequest, 
  requiredRole?: string
) => {
  const { user, response } = await authenticateUser(request)
  
  if (!user) {
    return { user: null, hasPermission: false, response }
  }
  
  if (!requiredRole) {
    return { user, hasPermission: true, response }
  }
  
  // Check user role if required
  try {
    const { supabase } = createMiddlewareClient(request)
    const { data: userRole } = await (supabase
      .from('user_roles') as any)
      .select('role_type')
      .eq('user_id', user.id)
      .single()
    
    const hasPermission = userRole?.role_type === requiredRole || 
                         userRole?.role_type === 'super_admin'
    
    return { user, hasPermission, response }
  } catch (err) {
    console.error('Error checking user permissions:', err)
    return { user, hasPermission: false, response }
  }
}