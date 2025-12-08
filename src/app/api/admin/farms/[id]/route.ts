// src/app/api/admin/farms/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Await params to get the id
    const { id } = await params
    
    const adminSupabase = createAdminClient()
    const { data: adminUser } = await adminSupabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const { data: farm, error } = await adminSupabase
      .from('farms')
      .select(`
        *,
        farm_profiles (*),
        user_roles (
          *,
          profiles (*)
        ),
        animals (*),
        billing_subscriptions (*)
      `)
      .eq('id', id)
      .single()
    
    if (error || !farm) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
    }
    
    return NextResponse.json({ farm })
    
  } catch (error) {
    console.error('Get farm API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Await params to get the id
    const { id } = await params
    
    const adminSupabase = createAdminClient()
    const { data: adminUser } = await adminSupabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    // Log the action before deletion
    try {
      // Cast payload to any to bypass strict type checking if types are out of sync
      await adminSupabase.from('audit_logs').insert({
        user_id: user.id,
        farm_id: id,
        action: 'delete_farm',
        resource_type: 'farm',
        resource_id: id
      } as any)
    } catch (auditError) {
      console.warn('Could not log action:', auditError)
    }
    
    // Delete the farm (cascading deletes should handle related records)
    const { error } = await adminSupabase
      .from('farms')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting farm:', error)
      return NextResponse.json({ error: 'Failed to delete farm' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Delete farm API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}