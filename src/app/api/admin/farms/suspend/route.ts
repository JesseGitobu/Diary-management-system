// src/app/api/admin/farms/suspend/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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
    
    const body = await request.json()
    const { farmId } = body
    
    if (!farmId) {
      return NextResponse.json({ error: 'Farm ID required' }, { status: 400 })
    }
    
    // Update farm status (assuming you have a status column)
    // You may need to add this column to your farms table
    const { error } = await adminSupabase
      .from('farms')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', farmId)

    if (error) {
      console.error('Error suspending farm:', error)
      return NextResponse.json({ error: 'Failed to suspend farm' }, { status: 500 })
    }

    // Suspend all user roles for this farm
    await adminSupabase
      .from('user_roles')
      .update({ status: 'suspended' })
      .eq('farm_id', farmId)

    // Log the action
    try {
      await adminSupabase.from('audit_logs').insert({
        user_id: user.id,
        farm_id: farmId,
        action: 'suspend_farm',
        resource_type: 'farm',
        resource_id: farmId,
        new_values: { status: 'suspended', updated_at: new Date().toISOString() }
      })
    } catch (auditError) {
      console.warn('Could not log action:', auditError)
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Suspend farm API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}