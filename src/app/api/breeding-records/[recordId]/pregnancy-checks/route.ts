// app/api/breeding-records/[recordId]/pregnancy-checks/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { recordId } = await params // Add await here
    const body = await request.json()

    const {
      check_date,
      check_method,
      result,
      checked_by,
      notes
    } = body

    // Get the breeding record and associated pregnancy record
    const { data: breedingRecord, error: fetchError } = await supabase
      .from('breeding_records')
      .select('animal_id, farm_id')
      .eq('id', recordId)
      .single()

    if (fetchError) throw fetchError

    // Get or create pregnancy record
    let { data: pregnancyRecord, error: pregnancyFetchError } = await supabase
      .from('pregnancy_records')
      .select('*')
      .eq('breeding_record_id', recordId)
      .single()

    if (pregnancyFetchError && pregnancyFetchError.code !== 'PGRST116') {
      throw pregnancyFetchError
    }

    // If no pregnancy record exists, create one
    if (!pregnancyRecord) {
      const { data: newPregnancyRecord, error: createError } = await supabase
        .from('pregnancy_records')
        .insert({
          breeding_record_id: recordId,
          animal_id: breedingRecord.animal_id,
          farm_id: breedingRecord.farm_id,
          pregnancy_status: 'suspected'
        })
        .select()
        .single()

      if (createError) throw createError
      pregnancyRecord = newPregnancyRecord
    }

    // Update pregnancy record based on check result
    let updateData: any = {
      confirmed_date: check_date,
      confirmation_method: check_method,
      veterinarian: checked_by,
      pregnancy_notes: notes || pregnancyRecord.pregnancy_notes
    }

    if (result === 'positive') {
      updateData.pregnancy_status = 'confirmed'
    } else if (result === 'negative') {
      updateData.pregnancy_status = 'false'
    } else {
      // inconclusive - keep as suspected
      updateData.pregnancy_status = 'suspected'
    }

    const { data: updatedPregnancy, error: updateError } = await supabase
      .from('pregnancy_records')
      .update(updateData)
      .eq('id', pregnancyRecord.id)
      .select()
      .single()

    if (updateError) throw updateError

    // Update animal production status based on result
    if (result === 'positive') {
      await supabase
        .from('animals')
        .update({ production_status: 'pregnant' })
        .eq('id', breedingRecord.animal_id)
    } else if (result === 'negative') {
      // Revert to open status
      await supabase
        .from('animals')
        .update({ production_status: 'open' })
        .eq('id', breedingRecord.animal_id)
    }

    // Also create a breeding event for tracking
    const user = await supabase.auth.getUser()
    const { error: eventError } = await supabase
      .from('breeding_events')
      .insert({
        animal_id: breedingRecord.animal_id,
        farm_id: breedingRecord.farm_id,
        event_type: 'pregnancy_check',
        event_date: check_date,
        pregnancy_result: result,
        examination_method: check_method,
        veterinarian_name: checked_by || null,
        notes: notes || null,
        created_by: user.data.user?.id || ''
      })

    if (eventError) console.error('Error creating breeding event:', eventError)

    return NextResponse.json({
      success: true,
      pregnancyRecord: updatedPregnancy,
      checkResult: result
    })
  } catch (error: any) {
    console.error('Error creating pregnancy check:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}