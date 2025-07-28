import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getBillingOverview } from '@/lib/database/admin'

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
    
    const billingOverview = await getBillingOverview()
    
    return NextResponse.json(billingOverview)
    
  } catch (error) {
    console.error('Admin billing API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}