// src/app/api/admin/monitoring/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import { getSystemMetrics } from '@/lib/database/admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
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
    const hours = parseInt(searchParams.get('hours') || '24')
    
    const metrics = await getSystemMetrics(undefined, hours)
    
    return NextResponse.json({ metrics })
    
  } catch (error) {
    console.error('Monitoring API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}