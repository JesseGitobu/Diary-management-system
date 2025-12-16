// src/app/api/admin/users/suspend/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin, createAdminClient } from '@/lib/supabase/server'
import { suspendUser } from '@/lib/database/admin'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAdmin()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check admin access
    const adminSupabase = createAdminClient()
    
    const { data: adminUser } = await adminSupabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { userId, reason } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    const result = await suspendUser(userId, reason || 'Admin suspension')
    
    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Suspend user API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}