// api/farms/[farmId]/notification-settings/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ farmId: string }> }
) {
  try {
    const params = await props.params;
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user belongs to this farm
    const { data: member, error: memberError } = await supabase
      .from('farm_members')
      .select('role')
      .eq('farm_id', params.farmId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const settings = await request.json()

    // Upsert notification settings
    const { error: upsertError } = await supabase
      .from('notification_settings')
      .upsert({
        farm_id: params.farmId,
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString()
      })

    if (upsertError) {
      console.error('Error updating notification settings:', upsertError)
      return NextResponse.json({ error: 'Failed to update notification settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}