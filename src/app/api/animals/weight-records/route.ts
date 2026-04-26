// app/api/animals/weight-records/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated' }, { status: 400 })
    }

    const body = await request.json()
    const {
      animal_id,
      weight_kg,
      measurement_date,
      measurement_type,
      notes
    } = body

    if (!animal_id || !weight_kg || !measurement_date) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    console.log('📝 [Weight Record] Creating record:', {
      animal_id,
      weight_kg,
      weight_date: measurement_date,
      measurement_purpose: measurement_type
    })

    // Insert weight record
    // Cast supabase to any to fix "Argument of type ... is not assignable to parameter of type 'never'"
    const { data: weightRecord, error: insertError } = await (supabase as any)
      .from('animal_weight_records')
      .insert({
        animal_id,
        farm_id: userRole.farm_id,
        weight_kg,
        weight_date: measurement_date,
        weight_unit: 'kg',
        measurement_purpose: measurement_type || 'routine',
        measured_by: user.email || 'system',
        notes
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ [Weight Record] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    console.log('✅ [Weight Record] Created:', weightRecord.id)

    return NextResponse.json({ success: true, data: weightRecord })
  } catch (error) {
    console.error('❌ [Weight Record] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}