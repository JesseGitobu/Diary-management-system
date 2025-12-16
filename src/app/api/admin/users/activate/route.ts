// src/app/api/admin/users/activate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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
    
    const body = await request.json()
    const { userId } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    // Update user status to active
    // We cast to 'any' to bypass the 'never' type on the Update definition
    const { error } = await (adminSupabase as any)
      .from('user_roles')
      .update({ status: 'active' })
      .eq('user_id', userId)

    if (error) {
      console.error('Error activating user:', error)
      return NextResponse.json({ error: 'Failed to activate user' }, { status: 500 })
    }

    // Log the action
    try {
      // Cast to 'any' for audit_logs as well
      await (adminSupabase as any).from('audit_logs').insert({
        user_id: user.id,
        action: 'activate_user',
        resource_type: 'user',
        resource_id: userId,
        new_values: { status: 'active', updated_at: new Date().toISOString() }
      })
    } catch (auditError) {
      console.warn('Could not log action:', auditError)
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Activate user API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}