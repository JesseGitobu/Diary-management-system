// src/app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin, createAdminClient } from '@/lib/supabase/server'
import { getAnalyticsData } from '@/lib/database/admin'

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
    const timeRange = searchParams.get('timeRange') || '30d'
    
    const analyticsData = await getAnalyticsData(timeRange)
    
    return NextResponse.json(analyticsData)
    
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}