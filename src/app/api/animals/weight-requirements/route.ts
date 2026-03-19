// app/api/animals/weight-requirements/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')

    if (!farmId) {
      return NextResponse.json({ error: 'Farm ID required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    // Query the new animal_weight_status view that consolidates weight tracking data
    const { data, error } = await supabase
      .from('animal_weight_status')
      .select(`
        id,
        farm_id,
        tag_number,
        weight,
        last_weight_date,
        days_since_weight,
        requires_weight_update,
        next_due_date
      `)
      .eq('farm_id', farmId)
      .eq('requires_weight_update', true)
      .order('next_due_date', { ascending: true })

    if (error) {
      console.error('❌ [Weight Requirements] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log(`✅ [Weight Requirements] Found ${data?.length || 0} requirements`)

    return NextResponse.json({ requirements: data || [] })
  } catch (error) {
    console.error('❌ [Weight Requirements] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}