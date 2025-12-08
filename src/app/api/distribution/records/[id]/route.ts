// app/api/distribution/records/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserRole, createServerSupabaseClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser() 
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()

    // Handle status updates with automatic timestamp setting
    const updates: any = { ...body }
    if (body.status === 'delivered' && !body.actual_delivery_time) {
      updates.actual_delivery_time = new Date().toISOString()
    }
    if (body.status === 'paid' && !body.payment_date) {
      updates.payment_date = new Date().toISOString().split('T')[0]
    }

    const supabase = await createServerSupabaseClient()
    
    // Cast supabase to any to fix "Argument of type 'any' is not assignable to parameter of type 'never'"
    const { data: record, error } = await (supabase as any)
      .from('distribution_records')
      .update(updates)
      .eq('id', params.id)
      .eq('farm_id', userRole.farm_id)
      .select(`
        *,
        distribution_channels (
          id,
          name,
          type,
          contact
        )
      `)
      .single()

    if (error) throw error

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    return NextResponse.json(record)
  } catch (error) {
    console.error('Error updating distribution record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}