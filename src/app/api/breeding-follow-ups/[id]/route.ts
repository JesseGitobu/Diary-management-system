// src/app/api/breeding-follow-ups/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json(
        { error: 'No farm associated with user' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { data: followUp, error } = await (supabase as any)
      .from('breeding_follow_ups')
      .select('*')
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()

    if (error || !followUp) {
      return NextResponse.json(
        { error: 'Follow-up not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      followUp
    })

  } catch (error: any) {
    console.error('Error in GET /api/breeding-follow-ups/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json(
        { error: 'No farm associated with user' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { followUpData } = body

    const supabase = await createServerSupabaseClient()

    // Fetch existing follow-up and verify ownership
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('breeding_follow_ups')
      .select('id, event_id, farm_id')
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Follow-up not found' },
        { status: 404 }
      )
    }

    // Get the event to determine type
    const { data: eventData } = await (supabase as any)
      .from('breeding_events')
      .select('event_type')
      .eq('id', existing.event_id)
      .single()

    // Prepare update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
      notes: followUpData.notes !== undefined ? followUpData.notes : undefined,
    }

    // Remove undefined values to only update provided fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key])

    // Event-type specific fields
    if (eventData?.event_type === 'heat_detection') {
      if (followUpData.insemination_date !== undefined) {
        updateData.insemination_scheduled_at = followUpData.insemination_date
          ? new Date(`${followUpData.insemination_date}T${followUpData.insemination_time || '00:00'}`).toISOString()
          : null
      }
      if (followUpData.insemination_confirmed !== undefined) {
        updateData.insemination_confirmed = followUpData.insemination_confirmed
      }
      if (followUpData.breeding_start !== undefined) {
        updateData.natural_breeding_start = followUpData.breeding_start ? new Date(followUpData.breeding_start).toISOString() : null
      }
      if (followUpData.breeding_end !== undefined) {
        updateData.natural_breeding_end = followUpData.breeding_end ? new Date(followUpData.breeding_end).toISOString() : null
      }
      if (followUpData.monitoring_plan !== undefined) {
        updateData.monitoring_plan = followUpData.monitoring_plan
      }
      if (followUpData.ovulation_date !== undefined) {
        updateData.ovulation_date = followUpData.ovulation_date
      }
      if (followUpData.ovulation_start !== undefined) {
        updateData.ovulation_start_time = followUpData.ovulation_start
      }
      if (followUpData.ovulation_end !== undefined) {
        updateData.ovulation_end_time = followUpData.ovulation_end
      }
      if (followUpData.has_medical_issue !== undefined) {
        updateData.has_medical_issue = followUpData.has_medical_issue
      }
      if (followUpData.medical_issue !== undefined) {
        updateData.medical_issue_description = followUpData.medical_issue
      }
      if (followUpData.vet_name !== undefined) {
        updateData.vet_name = followUpData.vet_name
      }
      if (followUpData.vet_observation !== undefined) {
        updateData.vet_observation = followUpData.vet_observation
      }
    } else if (eventData?.event_type === 'insemination') {
      if (followUpData.ovulation_date !== undefined) {
        updateData.ovulation_date = followUpData.ovulation_date
      }
      if (followUpData.ovulation_start !== undefined) {
        updateData.ovulation_start_time = followUpData.ovulation_start
      }
      if (followUpData.ovulation_end !== undefined) {
        updateData.ovulation_end_time = followUpData.ovulation_end
      }
      if (followUpData.ovulation_amount !== undefined) {
        updateData.ovulation_amount_ml = followUpData.ovulation_amount ? parseFloat(followUpData.ovulation_amount) : null
      }
      if (followUpData.has_medical_issue !== undefined) {
        updateData.has_medical_issue = followUpData.has_medical_issue
      }
      if (followUpData.medical_issue !== undefined) {
        updateData.medical_issue_description = followUpData.medical_issue
      }
    } else if (eventData?.event_type === 'pregnancy_check') {
      if (followUpData.steaming_date !== undefined) {
        updateData.steaming_date = followUpData.steaming_date
      }
      if (followUpData.next_check_date !== undefined) {
        updateData.next_check_date = followUpData.next_check_date
      }
      if (followUpData.next_heat_date !== undefined) {
        updateData.expected_heat_date = followUpData.next_heat_date
      }
    } else if (eventData?.event_type === 'calving') {
      if (followUpData.placenta_expelled !== undefined) {
        updateData.placenta_expelled = followUpData.placenta_expelled
      }
      if (followUpData.placenta_date !== undefined) {
        updateData.placenta_expelled_at = followUpData.placenta_date && followUpData.placenta_time
          ? new Date(`${followUpData.placenta_date}T${followUpData.placenta_time}`).toISOString()
          : null
      }
      if (followUpData.has_medical_issue !== undefined) {
        updateData.has_medical_issue = followUpData.has_medical_issue
      }
      if (followUpData.medical_issue !== undefined) {
        updateData.medical_issue_description = followUpData.medical_issue
      }
    }

    // Update the follow-up record
    const { data: updated, error: updateError } = await (supabase as any)
      .from('breeding_follow_ups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating breeding follow-up:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update follow-up' },
        { status: 400 }
      )
    }

    console.log('✅ Breeding follow-up updated:', id)

    return NextResponse.json({
      success: true,
      followUp: updated,
      message: 'Follow-up updated successfully'
    })

  } catch (error: any) {
    console.error('Error in PATCH /api/breeding-follow-ups/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json(
        { error: 'No farm associated with user' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Verify ownership
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('breeding_follow_ups')
      .select('id, farm_id')
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Follow-up not found' },
        { status: 404 }
      )
    }

    // Delete the follow-up record
    const { error: deleteError } = await (supabase as any)
      .from('breeding_follow_ups')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting breeding follow-up:', deleteError)
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete follow-up' },
        { status: 400 }
      )
    }

    console.log('✅ Breeding follow-up deleted:', id)

    return NextResponse.json({
      success: true,
      message: 'Follow-up deleted successfully'
    })

  } catch (error: any) {
    console.error('Error in DELETE /api/breeding-follow-ups/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
