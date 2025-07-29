import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  
  const pathname = request.nextUrl.pathname
  console.log('🔍 Middleware checking path:', pathname, 'User:', user?.email)
  
  // Define route patterns more precisely
  const protectedRoutes = ['/dashboard', '/onboarding']
  const adminProtectedRoutes = ['/admin/dashboard', '/admin/farms', '/admin/users', '/admin/support', '/admin/billing', '/admin/analytics', '/admin/monitoring', '/admin/audit', '/admin/settings']
  const adminPublicRoutes = ['/admin/auth']
  
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAdminProtectedRoute = adminProtectedRoutes.some(route => pathname.startsWith(route))
  const isAdminPublicRoute = adminPublicRoutes.some(route => pathname === route)
  
  // Allow admin auth page to load without authentication
  if (isAdminPublicRoute) {
    console.log('✅ Allowing access to admin auth page')
    return response
  }
  
  // Handle admin protected routes
  if (isAdminProtectedRoute) {
    console.log('🔒 Admin protected route detected:', pathname)
    
    if (!user) {
      console.log('❌ No user found, redirecting to admin auth')
      return NextResponse.redirect(new URL('/admin/auth', request.url))
    }
    
    console.log('👤 User found:', user.email, 'Checking admin status...')
    
    try {
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id, created_at')
        .eq('user_id', user.id)
        .maybeSingle()
      
      console.log('🔍 Admin check result:', { adminUser, adminError })
      
      if (adminError) {
        console.error('❌ Admin check error:', adminError)
        return NextResponse.redirect(new URL('/admin/auth', request.url))
      }
      
      if (!adminUser) {
        console.log('❌ User is not admin, redirecting to regular dashboard')
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      
      console.log('✅ Admin user confirmed, allowing access to:', pathname)
      return response
      
    } catch (error) {
      console.error('💥 Exception checking admin status:', error)
      return NextResponse.redirect(new URL('/admin/auth', request.url))
    }
  }
  
  // Handle regular protected routes
  if (isProtectedRoute && !user) {
    console.log('🔒 Protected route requires auth, redirecting to /auth')
    return NextResponse.redirect(new URL('/auth', request.url))
  }
  
  // Role-based routing for authenticated users on protected routes
  if (user && isProtectedRoute) {
    // First check if user is admin
    try {
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      
      // If user is admin and trying to access regular routes, redirect to admin dashboard
      if (!adminError && adminUser) {
        console.log('🔄 Admin user accessing regular route, redirecting to admin dashboard')
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
    }
    
    // Continue with regular user role checking
    const userRole = await getUserRole(user.id, supabase)
    
    if (userRole) {
      if (userRole.status === 'pending_setup') {
        if (!pathname.startsWith('/onboarding')) {
          console.log('🔄 Redirecting pending user to onboarding:', user.id)
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
      }
      
      if (userRole.status === 'active' && userRole.farm_id) {
        if (pathname.startsWith('/onboarding')) {
          console.log('🔄 Redirecting active user to dashboard:', user.id)
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
      
      if (userRole.role_type === 'farm_owner' && !userRole.farm_id) {
        if (!pathname.startsWith('/onboarding')) {
          console.log('🔄 Redirecting farm owner without farm to onboarding:', user.id)
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
      }
    } else {
      console.log('⚠️ Authenticated user without role found:', user.id)
      
      if (pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  }
  
  // Smart landing page redirects
  if (user && (pathname === '/auth' || pathname === '/')) {
    console.log('🏠 User accessing auth/home, determining redirect...')
    
    // First check if user is admin
    try {
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (!adminError && adminUser) {
        console.log('🔄 Admin user accessing auth/home, redirecting to admin dashboard')
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    } catch (error) {
      console.error('Error checking admin status for redirect:', error)
    }
    
    // Get regular user role to determine redirect
    const userRole = await getUserRole(user.id, supabase)
    
    if (userRole) {
      if (userRole.status === 'pending_setup') {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      } else if (userRole.status === 'active' && userRole.farm_id) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else if (userRole.role_type === 'farm_owner' && !userRole.farm_id) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } else {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }
  
  console.log('✅ No redirect needed for:', pathname)
  return response
}

// Helper function to get user role in middleware
async function getUserRole(userId: string, supabase: any) {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role_type, farm_id, status')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (error) {
      console.error('Error getting user role in middleware:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Exception getting user role in middleware:', error)
    return null
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/|api/).*)',
  ],
}