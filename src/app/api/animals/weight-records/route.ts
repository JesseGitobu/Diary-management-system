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
    // Cast supabase to any to fix "Argument of type ... is not assignable to parameter of type 'never'"
    const { data: weightRecord, error: insertError } = await (supabase as any)
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
    // Prepare update data with null conversion for date fields
    const updateData: any = {
      weight: weight_kg,
      updated_at: new Date().toISOString()
    }

    // Define date fields that might cause issues if empty
    const dateFields = ['birth_date', 'purchase_date', 'service_date', 'expected_calving_date']
    
    // Ensure no empty strings in date fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '' && dateFields.includes(key)) {
        updateData[key] = null
      }
    })

    // Cast supabase to any here as well
    const { error: updateError } = await (supabase as any)
      .from('animals')
      .update(updateData)
      .eq('id', animal_id)

    if (updateError) {
      console.error('⚠️ [Weight Record] Animal update warning:', updateError)
    }

    // Resolve any pending weight update requirements
    // Cast supabase to any here too
    const { error: resolveError } = await (supabase as any)
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