// app/api/animals/[id]/weight-history/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'Invalid animal ID' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('animal_weight_records')
      .select('*')
      .eq('animal_id', id)
      .order('measurement_date', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ [Weight History] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ records: data || [] })
  } catch (error) {
    console.error('❌ [Weight History] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}