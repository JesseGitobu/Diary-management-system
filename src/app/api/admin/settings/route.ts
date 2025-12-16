// src/app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin, createAdminClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest) {
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
    
    const settings = await request.json()
    
    // REAL IMPLEMENTATION: Save to system_settings table
    // We cast to 'any' to avoid build errors if the system_settings table 
    // is missing from your generated TypeScript definitions.
    // We assume a singleton row (id: 1) or that the settings object contains the ID.
    const { error: updateError } = await (adminSupabase as any)
      .from('system_settings')
      .upsert({ 
        id: 1, // Default to ID 1 for global settings if not provided
        ...settings,
        updated_at: new Date().toISOString()
      })

    if (updateError) {
      console.error('Database error updating settings:', updateError)
      return NextResponse.json({ error: 'Failed to update settings database' }, { status: 500 })
    }
    
    console.log('Admin settings updated successfully')
    
    // Log the action
    try {
      // Cast to 'any' to fix the "not assignable to parameter of type 'never'" error
      await (adminSupabase as any).from('audit_logs').insert({
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