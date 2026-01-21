import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ farmId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const params = await props.params
    const { farmId } = params

    if (!farmId) {
      return NextResponse.json({ error: 'farmId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('farm_profiles')
      .select('*')
      .eq('farm_id', farmId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching farm_profile:', error)
      return NextResponse.json({ error: error.message || 'Failed to fetch farm profile' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('GET farm-profile error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ farmId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await props.params
    const { farmId } = params
    const payload = await request.json()

    // Map expected fields
    const upsertRow: any = {
      user_id: user.id,
      farm_id: farmId || null,
      farm_name: payload.farm_name ?? payload.name ?? null,
      location: payload.location ?? null,
      herd_size: payload.herd_size ?? payload.total_cows ?? null,
      onboarding_completed: payload.onboarding_completed ?? true,
      completion_percentage: payload.completion_percentage ?? 100,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('farm_profiles')
      .upsert(upsertRow, { onConflict: 'user_id' })

    if (error) {
      console.error('Error upserting farm_profiles:', error)
      return NextResponse.json({ error: error.message || 'Failed to upsert farm profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PUT farm-profile error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
