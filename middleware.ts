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
    const host = request.headers.get('host') ?? ''
    const isAdminSubdomain = host.startsWith('adminv2.')

    /**
     * ---------------------------------------------
     * 1️⃣ Rewrite admin subdomain → /admin/*
     * ---------------------------------------------
     */
    if (isAdminSubdomain && !pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone()
      url.pathname = `/admin${pathname}`
      return NextResponse.rewrite(url)
    }

    /**
     * ---------------------------------------------
     * 2️⃣ Block /admin access from non-admin domains
     * ---------------------------------------------
     */
    if (pathname.startsWith('/admin') && !isAdminSubdomain) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // ---------------------------------------------
    // Supabase session handling
    // ---------------------------------------------
    let session = null
    let user = null

    try {
      const {
        data: { session: fetchedSession },
      } = await supabase.auth.getSession()

      session = fetchedSession
      user = fetchedSession?.user ?? null
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('AuthSessionMissingError')
      ) {
        user = null
      } else {
        console.error('Unexpected session error in middleware:', error)
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Middleware:', {
        host,
        pathname,
        authenticated: !!user,
        userEmail: user?.email,
        isAdminSubdomain,
      })
    }

    /**
     * ---------------------------------------------
     * Public routes
     * ---------------------------------------------
     */
    if (isPublicRoute(pathname)) {
      if (
        user &&
        pathname.startsWith('/auth') &&
        pathname !== '/auth/confirm-email'
      ) {
        return await handleAuthenticatedUserRedirect(
          user,
          supabase,
          request
        )
      }
      return response
    }

    /**
     * ---------------------------------------------
     * Admin routes (via adminv2 subdomain)
     * ---------------------------------------------
     */
    if (isAdminRoute(pathname)) {
      if (ROUTE_CONFIG.adminAuth.some(route => pathname === route)) {
        return response
      }

      if (!user) {
        return NextResponse.redirect(new URL('/admin/auth', request.url))
      }

      const isAdmin = await checkIfUserIsAdmin(user.id, supabase)

      if (!isAdmin) {
        console.log('❌ Non-admin user accessing admin route')
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      return response
    }

    /**
     * ---------------------------------------------
     * Protected user routes
     * ---------------------------------------------
     */
    if (isProtectedRoute(pathname)) {
      if (!user) {
        console.log('❌ Unauthenticated user on protected route:', pathname)
        return NextResponse.redirect(new URL('/auth', request.url))
      }

      const isAdmin = await checkIfUserIsAdmin(user.id, supabase)

      if (isAdmin) {
        console.log(
          '🔄 Admin user accessing regular route, redirecting to admin dashboard'
        )
        return NextResponse.redirect(
          new URL('/admin/dashboard', request.url)
        )
      }

      const userRole = await getUserRole(user.id, supabase)

      if (pathname.startsWith('/onboarding')) {
        if (!userRole || userRole.status === 'pending_setup') {
          return response
        }

        if (userRole.status === 'active') {
          return NextResponse.redirect(
            new URL('/dashboard', request.url)
          )
        }
      }

      if (pathname.startsWith('/dashboard')) {
        if (!userRole) {
          return NextResponse.redirect(
            new URL('/onboarding', request.url)
          )
        }

        if (userRole.status === 'pending_setup') {
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

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function isPublicRoute(pathname: string): boolean {
  return ROUTE_CONFIG.public.some(
    route => pathname === route || pathname.startsWith(route)
  )
}

function isProtectedRoute(pathname: string): boolean {
  return ROUTE_CONFIG.protected.some(route =>
    pathname.startsWith(route)
  )
}

function isAdminRoute(pathname: string): boolean {
  return ROUTE_CONFIG.admin.some(route =>
    pathname.startsWith(route)
  )
}

async function checkIfUserIsAdmin(
  userId: string,
  supabase: any
): Promise<boolean> {
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
}

async function getUserRole(userId: string, supabase: any) {
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
}

async function handleAuthenticatedUserRedirect(
  user: any,
  supabase: any,
  request: NextRequest
): Promise<NextResponse> {
  const isAdmin = await checkIfUserIsAdmin(user.id, supabase)

  if (isAdmin) {
    return NextResponse.redirect(
      new URL('/admin/dashboard', request.url)
    )
  }

  const userRole = await getUserRole(user.id, supabase)

  if (!userRole || userRole.status === 'pending_setup') {
    return NextResponse.redirect(
      new URL('/onboarding', request.url)
    )
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|ttf|woff|woff2)$).*)',
  ],
}
