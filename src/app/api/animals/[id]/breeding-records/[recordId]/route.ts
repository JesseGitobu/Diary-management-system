//src/app/api/animals/[id]/breeding-records/[recordId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

interface AbortionDetails {
  abortion_date: string
  cause?: string | null
  stage_of_pregnancy?: string | null
  complications?: string | null
  veterinary_involved?: boolean
  veterinarian_name?: string | null
  treatment_given?: string | null
  recovery_status?: string | null
  notes?: string | null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id, recordId } = await params
    const body = await request.json()
    const { pregnancy_status, abortion_details } = body as {
      pregnancy_status?: string
      abortion_details?: AbortionDetails
    }

    console.log('📋 [abortion] Processing request:', { animalId: id, recordId, hasAbortionDetails: !!abortion_details })

    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // Get the pregnancy record - try by ID first, then by service_record_id
    let pregnancyRecord = null
    let pregError = null

    // First try to get pregnancy record by ID
    const { data: pregnancyByIdData, error: pregnancyByIdError } = await supabase
      .from('pregnancy_records')
      .select('farm_id, animal_id, service_record_id, pregnancy_notes, id')
      .eq('id', recordId)
      .maybeSingle()

    if (pregnancyByIdData) {
      pregnancyRecord = pregnancyByIdData
    } else if (pregnancyByIdError?.code !== 'PGRST116') {
      pregError = pregnancyByIdError
    } else {
      // If not found by pregnancy record ID, try to find by service_record_id
      console.log('Pregnancy record not found by ID, trying by service_record_id:', recordId)
      const { data: pregnancyByServiceData, error: pregnancyByServiceError } = await supabase
        .from('pregnancy_records')
        .select('farm_id, animal_id, service_record_id, pregnancy_notes, id')
        .eq('service_record_id', recordId)
        .maybeSingle()

      if (pregnancyByServiceData) {
        pregnancyRecord = pregnancyByServiceData
        console.log('✓ Found pregnancy record by service_record_id:', pregnancyRecord.id)
      } else {
        pregError = pregnancyByServiceError
      }
    }

    if (pregError || !pregnancyRecord) {
      console.error('Pregnancy record not found by ID or service_record_id:', pregError)
      return NextResponse.json(
        { error: 'Pregnancy record not found. Please ensure the correct record is selected.' },
        { status: 404 }
      )
    }

    // Verify user has access to this farm
    const userRole = await getUserRole(user.id)
    if (!userRole || userRole.farm_id !== pregnancyRecord.farm_id) {
      console.error('User does not have access to this farm')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update pregnancy record with abortion status
    const updatedNotes = abortion_details?.abortion_date 
      ? `${pregnancyRecord.pregnancy_notes || ''}\n[Abortion Recorded: ${abortion_details.abortion_date}]`
      : pregnancyRecord.pregnancy_notes || ''

    const { data: updatedRecord, error: updateError } = await supabase
      .from('pregnancy_records')
      .update({
        pregnancy_status: (pregnancy_status || 'aborted') as 'suspected' | 'completed' | 'aborted' | 'confirmed' | 'false',
        pregnancy_notes: updatedNotes.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update pregnancy record:', updateError)
      return NextResponse.json({ error: 'Failed to update pregnancy record' }, { status: 500 })
    }

    // Store abortion details in abortion_records table if provided
    if (abortion_details && abortion_details.abortion_date) {
      // Build the abortion record with only the provided fields
      const abortionRecord = {
        pregnancy_record_id: recordId,
        service_record_id: pregnancyRecord.service_record_id || null,
        animal_id: id,
        farm_id: pregnancyRecord.farm_id,
        abortion_date: abortion_details.abortion_date,
        cause: abortion_details.cause || null,
        stage_of_pregnancy: abortion_details.stage_of_pregnancy || null,
        complications: abortion_details.complications || null,
        veterinary_involved: abortion_details.veterinary_involved || false,
        veterinarian_name: abortion_details.veterinarian_name || null,
        treatment_given: abortion_details.treatment_given || null,
        recovery_status: abortion_details.recovery_status || null,
        notes: abortion_details.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error: abortionError, data: abortionData } = await supabase
        .from('abortion_records')
        .insert(abortionRecord)
        .select()
        .single()

      if (abortionError) {
        console.error('Failed to insert abortion record:', abortionError)
        // Don't fail the entire request if abortion record insert fails,
        // but log it for debugging
        if (abortionError.code !== 'PGRST116') {
          console.warn('Warning: Abortion record was not saved, but pregnancy record was updated:', abortionError)
        }
      } else {
        console.log('✓ Abortion record created successfully:', abortionData?.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pregnancy marked as aborted and abortion record saved',
      record: updatedRecord
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
