// src/app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest) {
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
    
    const settings = await request.json()
    
    // In a real implementation, you would save these to a settings table
    // For now, we'll just log and return success
    console.log('Admin settings updated:', settings)
    
    // Log the action
    try {
      await adminSupabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'update_settings',
        resource_type: 'system_settings',
        new_values: settings
      })
    } catch (auditError) {
      console.warn('Could not log action:', auditError)
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Update settings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}