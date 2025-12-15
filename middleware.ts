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

    // ✅ FIXED: Wrap getSession() with proper error handling
    let session = null
    let user = null

    try {
      const { data: { session: fetchedSession } } = await supabase.auth.getSession()
      session = fetchedSession
      user = fetchedSession?.user ?? null
    } catch (error) {
      // Silently handle missing session for unauthenticated users
      // This is expected behavior and not an error
      if (error instanceof Error && error.message.includes('AuthSessionMissingError')) {
        // Expected for logged-out users - don't log it
        user = null
      } else {
        // Log unexpected errors only
        console.error('Unexpected session error in middleware:', error)
      }
    }

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
      const isAdmin = await checkIfUserIsAdmin(user.id, supabase)
      
      if (!isAdmin) {
        console.log('❌ Non-admin user accessing admin route')
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      return response
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
        if (!userRole || userRole.status === 'pending_setup') {
          return response
        }
        if (userRole.status === 'active') {
          console.log('✅ User already setup, redirecting to dashboard')
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }

      // If accessing dashboard
      if (pathname.startsWith('/dashboard')) {
        if (!userRole) {
          console.log('⚠️ User without role accessing dashboard, redirecting to onboarding')
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
        
        if (userRole.status === 'pending_setup') {
          console.log('ℹ️ User with pending setup accessing dashboard - showing banner')
          return response
        }
        
        return response
      }
    }

    return response
  } catch (error) {
    console.error('💥 Middleware exception:', error)
    return NextResponse.next()
  }
}

// Helper functions remain the same
function isPublicRoute(pathname: string): boolean {
  return ROUTE_CONFIG.public.some(route => pathname === route || pathname.startsWith(route))
}

function isProtectedRoute(pathname: string): boolean {
  return ROUTE_CONFIG.protected.some(route => pathname.startsWith(route))
}

function isAdminRoute(pathname: string): boolean {
  return ROUTE_CONFIG.admin.some(route => pathname.startsWith(route))
}

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

async function handleAuthenticatedUserRedirect(
  user: any,
  supabase: any,
  request: NextRequest
): Promise<NextResponse> {
  try {
    const isAdmin = await checkIfUserIsAdmin(user.id, supabase)
    
    if (isAdmin) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    const userRole = await getUserRole(user.id, supabase)

    if (!userRole || userRole.status === 'pending_setup') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    if (userRole.status === 'active' && userRole.farm_id) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } catch (error) {
    console.error('❌ Error in redirect logic:', error)
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - api (API routes)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - any file with an extension (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|api/|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|ttf|woff|woff2)$).*)',
  ],
}