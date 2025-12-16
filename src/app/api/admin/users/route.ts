// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin, createAdminClient } from '@/lib/supabase/server'
import { getAllUsers } from '@/lib/database/admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentAdmin()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ✅ FIXED: Check admin access using service role client
    const adminSupabase = createAdminClient()
    
    const { data: adminUser, error: adminError } = await adminSupabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (!adminUser && !adminError) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // ✅ FIXED: Now using improved getAllUsers function
    const { users, count } = await getAllUsers(limit, offset)
    
    return NextResponse.json({ 
      users, 
      count, 
      limit, 
      offset,
      success: true 
    })
    
  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  }
}