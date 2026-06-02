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
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const body = await request.json()

    // Validate required fields
    const { farm_id, animal_id, weight_date, weight_kg, method } = body

    if (!animal_id || !weight_date || !weight_kg) {
      return NextResponse.json(
        { error: 'Missing required fields: animal_id, weight_date, weight_kg' },
        { status: 400 }
      )
    }

    // Verify farm_id matches user's farm
    if (farm_id !== userRole.farm_id) {
      return NextResponse.json(
        { error: 'Farm ID mismatch - not authorized for this farm' },
        { status: 403 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // ✅ Create weight record in animal_weight_records table
    console.log('[DEBUG POST /api/weight-records] Creating weight record:', {
      animal_id,
      weight_date,
      weight_kg,
      method,
      farm_id: userRole.farm_id,
    })

    const { data, error } = await (supabase as any)
      .from('animal_weight_records')
      .insert({
        farm_id: userRole.farm_id,
        animal_id,
        weight_date,
        weight_kg: parseFloat(String(weight_kg)),
        weight_unit: body.weight_unit || 'kg',
        measurement_purpose: body.measurement_purpose || null,
        measured_by: body.measured_by || null,
        method: method || 'scale',
        body_condition_score: body.body_condition_score !== null ? parseFloat(String(body.body_condition_score)) : null,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[DEBUG POST /api/weight-records] Error creating weight record:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create weight record' },
        { status: 400 }
      )
    }

    console.log('[DEBUG POST /api/weight-records] Weight record created successfully:', {
      id: data.id,
      animal_id: data.animal_id,
      weight_kg: data.weight_kg,
      weight_date: data.weight_date,
    })

    return NextResponse.json({
      success: true,
      id: data.id,
      message: 'Weight record created successfully',
      data,
    })
  } catch (error: any) {
    console.error('[ERROR POST /api/weight-records]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
