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
  
  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname === '/auth' || request.nextUrl.pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}