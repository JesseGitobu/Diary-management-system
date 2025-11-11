// src/app/api/admin/billing/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getAllTickets } from '@/lib/database/admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check admin access
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminSupabase = createAdminClient()
    
    const { data: adminUser } = await adminSupabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const priority = searchParams.get('priority') || undefined
    
    const tickets = await getAllTickets(status, priority)
    
    return NextResponse.json({ tickets })
    
  } catch (error) {
    console.error('Admin support API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// export async function POST(request: NextRequest) {
//   try {
//     const user = await getCurrentUser()
    
//     if (!user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }
    
//     // Check admin access
//     const { createAdminClient } = await import('@/lib/supabase/server')
//     const adminSupabase = createAdminClient()
    
//     const { data: adminUser } = await adminSupabase
//       .from('admin_users')
//       .select('id')
//       .eq('user_id', user.id)
//       .single()
    
//     if (!adminUser) {
//       return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
//     }
    
//     const body = await request.json()
//     const result = await createSupportTicket(body)
    
//     return NextResponse.json(result)
    
//   } catch (error) {
//     console.error('Create support ticket API error:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }