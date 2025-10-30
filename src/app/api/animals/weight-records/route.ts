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

    const userRole = await getUserRole(user.id)
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated' }, { status: 400 })
    }

    const body = await request.json()
    const {
      animal_id,
      weight_kg,
      measurement_date,
      measurement_type,
      notes,
      is_required
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
      measurement_type
    })

    // Insert weight record
    const { data: weightRecord, error: insertError } = await supabase
      .from('animal_weight_records')
      .insert({
        animal_id,
        farm_id: userRole.farm_id,
        weight_kg,
        measurement_date,
        measurement_type: measurement_type || 'routine',
        notes,
        is_required,
        recorded_by: user.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ [Weight Record] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    console.log('✅ [Weight Record] Created:', weightRecord.id)

    // Update animal's current weight
    const { error: updateError } = await supabase
      .from('animals')
      .update({ 
        weight: weight_kg, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', animal_id)

    if (updateError) {
      console.error('⚠️ [Weight Record] Animal update warning:', updateError)
    }

    // Resolve any pending weight update requirements
    const { error: resolveError } = await supabase
      .from('animals_requiring_weight_update')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        weight_record_id: weightRecord.id
      })
      .eq('animal_id', animal_id)
      .eq('is_resolved', false)

    if (resolveError) {
      console.error('⚠️ [Weight Record] Resolve warning:', resolveError)
    } else {
      console.log('✅ [Weight Record] Requirements resolved')
    }

    return NextResponse.json({ success: true, data: weightRecord })
  } catch (error) {
    console.error('❌ [Weight Record] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}