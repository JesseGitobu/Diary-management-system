// src/app/api/admin/audit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin, createAdminClient } from '@/lib/supabase/server'
import { getAuditLogs } from '@/lib/database/admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentAdmin()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
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
    const limit = parseInt(searchParams.get('limit') || '100')
    
    const logs = await getAuditLogs(limit)
    
    return NextResponse.json({ logs })
    
  } catch (error) {
    console.error('Audit logs API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}