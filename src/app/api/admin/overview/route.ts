import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getSystemOverview } from '@/lib/database/admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is admin
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminSupabase = createAdminClient()
    
    const { data: adminUser, error } = await adminSupabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (error || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const systemOverview = await getSystemOverview()
    
    return NextResponse.json(systemOverview)
    
  } catch (error) {
    console.error('Admin overview API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}