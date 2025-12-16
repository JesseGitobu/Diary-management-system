// src/app/api/admin/farms/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/supabase/server'
import { getAllFarms } from '@/lib/database/admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentAdmin()
    
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const { farms, count } = await getAllFarms(limit, offset)
    
    return NextResponse.json({ farms, count, limit, offset })
    
  } catch (error) {
    console.error('Admin farms API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}