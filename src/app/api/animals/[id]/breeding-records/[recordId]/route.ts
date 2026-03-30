//src/app/api/animals/[id]/breeding-records/[recordId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id, recordId } = await params
    const body = await request.json()
    const { pregnancy_status, abortion_details } = body

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => Promise.resolve(cookieStore) })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the pregnancy record to find farm_id and service_record_id
    const { data: pregnancyRecord, error: pregError } = await supabase
      .from('pregnancy_records')
      .select('farm_id, animal_id, service_record_id, pregnancy_notes')
      .eq('id', recordId)
      .single()

    if (pregError || !pregnancyRecord) {
      return NextResponse.json({ error: 'Pregnancy record not found' }, { status: 404 })
    }

    // Verify user has access to this farm
    const { data: farmAccess, error: accessError } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('farm_id', pregnancyRecord.farm_id)
      .eq('user_id', user.id)
      .single()

    if (accessError || !farmAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update pregnancy record with abortion status
    const { data: updatedRecord, error: updateError } = await supabase
      .from('pregnancy_records')
      .update({
        pregnancy_status: pregnancy_status || 'aborted',
        pregnancy_notes: (pregnancyRecord.pregnancy_notes || '') + 
          `\n[Abortion Recorded: ${abortion_details?.abortion_date || new Date().toISOString().split('T')[0]}]`,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update pregnancy record' }, { status: 500 })
    }

    // Store abortion details in abortion_records table
    if (abortion_details) {
      const { error: abortionError } = await supabase
        .from('abortion_records')
        .insert({
          pregnancy_record_id: recordId,
          service_record_id: pregnancyRecord.service_record_id,
          animal_id: id,
          farm_id: pregnancyRecord.farm_id,
          abortion_date: abortion_details.abortion_date,
          cause: abortion_details.cause,
          stage_of_pregnancy: abortion_details.stage_of_pregnancy,
          complications: abortion_details.complications,
          veterinary_involved: abortion_details.veterinary_involved,
          veterinarian_name: abortion_details.veterinarian_name,
          treatment_given: abortion_details.treatment_given,
          recovery_status: abortion_details.recovery_status,
          notes: abortion_details.notes,
          created_at: new Date().toISOString()
        })

      if (abortionError && abortionError.code !== 'PGRST116') {
        // PGRST116 = relation doesn't exist, which is okay during initial setup
        console.warn('Could not insert abortion record:', abortionError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pregnancy marked as aborted',
      record: updatedRecord
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
