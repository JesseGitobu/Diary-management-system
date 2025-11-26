// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

// Route configuration
const ROUTE_CONFIG = {
  public: ['/', '/auth', '/auth/reset-password', '/auth/confirm-email'],
  protected: ['/dashboard', '/onboarding', '/settings'],
  admin: ['/admin'],
  adminAuth: ['/admin/auth'],
} as const

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = createMiddlewareClient(request)
    const pathname = request.nextUrl.pathname

    // ✅ UPDATED APPROACH: Use getSession() for performance
    // This is SAFE because:
    // 1. We're using RLS policies on all database tables
    // 2. Supabase validates JWT on every database call anyway
    // 3. We're only using this for routing decisions, not data access
    // 4. The middleware refreshes tokens automatically via response cookies
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError)
      if (isProtectedRoute(pathname) || isAdminRoute(pathname)) {
        const redirectPath = isAdminRoute(pathname) ? '/admin/auth' : '/auth'
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }
      return response
    }

    const user = session?.user ?? null

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Middleware:', {
        pathname,
        authenticated: !!user,
        userEmail: user?.email,
      })
    }

    // Allow public routes
    if (isPublicRoute(pathname)) {
      if (user && pathname.startsWith('/auth') && pathname !== '/auth/confirm-email') {
        return await handleAuthenticatedUserRedirect(user, supabase, request)
      }
      return response
    }

    // Handle admin routes FIRST (before checking protected routes)
    if (isAdminRoute(pathname)) {
      if (ROUTE_CONFIG.adminAuth.some(route => pathname === route)) {
        return response // Allow admin auth page
      }

      if (!user) {
        return NextResponse.redirect(new URL('/admin/auth', request.url))
      }

      // Check admin status via database query
      // RLS policies will validate the JWT, so this is secure
      const isAdmin = await checkIfUserIsAdmin(user.id, supabase)
      
      if (!isAdmin) {
        console.log('❌ Non-admin user accessing admin route')
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      return response // Admin verified via RLS-protected query
    }

    // Require authentication for protected routes
    if (isProtectedRoute(pathname)) {
      if (!user) {
        console.log('❌ Unauthenticated user on protected route:', pathname)
        return NextResponse.redirect(new URL('/auth', request.url))
      }

      // Check if admin trying to access regular protected routes
      const isAdmin = await checkIfUserIsAdmin(user.id, supabase)
      if (isAdmin) {
        console.log('🔄 Admin user accessing regular route, redirecting to admin dashboard')
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }

      // Handle onboarding flow
      const userRole = await getUserRole(user.id, supabase)
      
      // If accessing onboarding page
      if (pathname.startsWith('/onboarding')) {
        // Allow if no role OR if role is pending setup
        if (!userRole || userRole.status === 'pending_setup') {
          return response
        }
        // If user has active role, redirect to dashboard
        if (userRole.status === 'active') {
          console.log('✅ User already setup, redirecting to dashboard')
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }

      // If accessing dashboard
      if (pathname.startsWith('/dashboard')) {
        if (!userRole) {
          // No role at all - must complete onboarding
          console.log('⚠️ User without role accessing dashboard, redirecting to onboarding')
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
        
        // Has role with pending_setup - allow dashboard access
        // Dashboard will show onboarding banner
        if (userRole.status === 'pending_setup') {
          console.log('ℹ️ User with pending setup accessing dashboard - showing banner')
          return response
        }
        
        // Active user - normal access
        return response
      }
    }

    // IMPORTANT: Return the response from createMiddlewareClient
    // This ensures cookie updates (token refresh) are included
    return response
  } catch (error) {
    console.error('💥 Middleware exception:', error)
    return NextResponse.next()
  }
}

// Helper: Check if route is public
function isPublicRoute(pathname: string): boolean {
  return ROUTE_CONFIG.public.some(route => pathname === route || pathname.startsWith(route))
}

// Helper: Check if route is protected
function isProtectedRoute(pathname: string): boolean {
  return ROUTE_CONFIG.protected.some(route => pathname.startsWith(route))
}

// Helper: Check if route is admin
function isAdminRoute(pathname: string): boolean {
  return ROUTE_CONFIG.admin.some(route => pathname.startsWith(route))
}

// Helper: Check if user is admin
// SECURITY: This is safe because:
// 1. RLS policies on admin_users table will validate the JWT
// 2. An attacker with a spoofed JWT will get null/empty result from RLS
// 3. We're using anon key (not service_role), so RLS is enforced
async function checkIfUserIsAdmin(userId: string, supabase: any): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error checking admin status:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Exception checking admin status:', error)
    return false
  }
}

// Helper: Get user role
// SECURITY: Protected by RLS on user_roles table
async function getUserRole(userId: string, supabase: any) {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('status, farm_id, role_type')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error getting user role:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Exception getting user role:', error)
    return null
  }
}

// Redirect authenticated users based on role
async function handleAuthenticatedUserRedirect(
  user: any,
  supabase: any,
  request: NextRequest
): Promise<NextResponse> {
  try {
    // Check if admin
    const isAdmin = await checkIfUserIsAdmin(user.id, supabase)
    
    if (isAdmin) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    // Check user role
    const userRole = await getUserRole(user.id, supabase)

    // No role or pending setup -> onboarding
    if (!userRole || userRole.status === 'pending_setup') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Has active role -> dashboard
    if (userRole.status === 'active' && userRole.farm_id) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } catch (error) {
    console.error('❌ Error in redirect logic:', error)
  }

  // Default fallback
  return NextResponse.redirect(new URL('/dashboard', request.url))
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/|api/).*)',
  ],
}