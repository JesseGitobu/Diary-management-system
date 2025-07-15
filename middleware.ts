import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  
  const { supabase, response } = createMiddlewareClient(request)
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/onboarding']
  const adminRoutes = ['/admin']
  
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  const isAdminRoute = adminRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  // Redirect unauthenticated users to auth page
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }
  
  // Handle admin routes
  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/auth', request.url))
    }
    
    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!adminUser) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }
  
  // 🎯 NEW: Handle authenticated users with role-based routing
  if (user && isProtectedRoute) {
    const userRole = await getUserRole(user.id, supabase)
    
    if (userRole) {
      // 🎯 NEW: Handle users with pending_setup status
      if (userRole.status === 'pending_setup') {
        // Users with pending setup should only access onboarding
        if (!request.nextUrl.pathname.startsWith('/onboarding')) {
          console.log('🔄 Redirecting pending user to onboarding:', user.id)
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
      }
      
      // 🎯 NEW: Handle users with active status
      if (userRole.status === 'active' && userRole.farm_id) {
        // Active users trying to access onboarding should go to dashboard
        if (request.nextUrl.pathname.startsWith('/onboarding')) {
          console.log('🔄 Redirecting active user to dashboard:', user.id)
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
      
      // 🎯 NEW: Handle edge case - active farm owner without farm_id
      if (userRole.role_type === 'farm_owner' && !userRole.farm_id) {
        // Farm owner without farm should complete onboarding
        if (!request.nextUrl.pathname.startsWith('/onboarding')) {
          console.log('🔄 Redirecting farm owner without farm to onboarding:', user.id)
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
      }
    } else {
      // 🎯 NEW: User authenticated but no role found
      // This shouldn't happen with new flow, but handle gracefully
      console.log('⚠️ Authenticated user without role found:', user.id)
      
      // If trying to access dashboard, redirect to onboarding
      if (request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  }
  
  // 🎯 UPDATED: Enhanced auth page redirect logic
  if (user && (request.nextUrl.pathname === '/auth' || request.nextUrl.pathname === '/')) {
    // Get user role to determine where to redirect
    const userRole = await getUserRole(user.id, supabase)
    
    if (userRole) {
      if (userRole.status === 'pending_setup') {
        // Pending users go to onboarding
        return NextResponse.redirect(new URL('/onboarding', request.url))
      } else if (userRole.status === 'active' && userRole.farm_id) {
        // Active users go to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else if (userRole.role_type === 'farm_owner' && !userRole.farm_id) {
        // Farm owner without farm goes to onboarding
        return NextResponse.redirect(new URL('/onboarding', request.url))
      } else {
        // Default to dashboard for other cases
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } else {
      // No role found, redirect to onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }
  
  return response
}

// 🎯 NEW: Helper function to get user role in middleware
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
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}