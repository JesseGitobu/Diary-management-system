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

// Helper function for middleware authentication
export const authenticateUser = async (request: NextRequest) => {
  const { supabase, response } = createMiddlewareClient(request)
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('Middleware auth error:', error)
    return { user: null, response }
  }
  
  return { user, response }
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
  const { supabase } = createMiddlewareClient(request)
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role_type')
    .eq('user_id', user.id)
    .single()
  
  const hasPermission = userRole?.role_type === requiredRole || 
                       userRole?.role_type === 'super_admin'
  
  return { user, hasPermission, response }
}