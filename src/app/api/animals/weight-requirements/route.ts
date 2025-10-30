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
    const { data, error } = await supabase
      .from('animals_requiring_weight_update')
      .select(`
        *,
        animals (
          id,
          tag_number,
          name,
          gender,
          birth_date,
          production_status,
          weight
        )
      `)
      .eq('farm_id', farmId)
      .eq('is_resolved', false)
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })

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