// src/app/api/breeding-follow-ups/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
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
    const { event_id, farm_id, followUpData } = body

    // Validate farm ownership
    if (farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // Verify event exists and belongs to the farm
    const { data: eventData, error: eventError } = await (supabase as any)
      .from('breeding_events')
      .select('id, event_type, animal_id')
      .eq('id', event_id)
      .eq('farm_id', farm_id)
      .single()

    if (eventError || !eventData) {
      return NextResponse.json(
        { error: 'Breeding event not found' },
        { status: 404 }
      )
    }

    // Check if follow-up already exists for this event
    const { data: existingFollowUp } = await (supabase as any)
      .from('breeding_follow_ups')
      .select('id')
      .eq('event_id', event_id)
      .single()

    if (existingFollowUp) {
      return NextResponse.json(
        { error: 'Follow-up already exists for this event. Use update instead.' },
        { status: 409 }
      )
    }

    // Prepare follow-up data based on event type
    console.log('📋 [Follow-Up API] Received follow-up data:', followUpData)
    console.log('📋 [Follow-Up API] Event type:', eventData.event_type)
    console.log('📋 [Follow-Up API] User ID:', user.id)
    
    const now = new Date().toISOString()
    const insertData: Record<string, any> = {
      event_id,
      farm_id,
      created_by: user.id,
      created_at: now,
      updated_at: now,
      notes: followUpData.notes || null,
    }

    console.log('📋 [Follow-Up API] Base insert data:', {
      event_id,
      farm_id,
      created_by: user.id,
      created_at: now,
      updated_at: now,
    })

    // Event-type specific fields
    if (eventData.event_type === 'heat_detection') {
      console.log('🔥 [Follow-Up API] Processing HEAT_DETECTION follow-up...')
      console.log('🔥 [Follow-Up API] Insemination date:', followUpData.insemination_date)
      console.log('🔥 [Follow-Up API] Insemination time:', followUpData.insemination_time)
      
      // Construct timestamp without timezone conversion - preserve the time as entered
      insertData.insemination_scheduled_at = followUpData.insemination_date && followUpData.insemination_time
        ? `${followUpData.insemination_date}T${followUpData.insemination_time}:00`
        : null
      insertData.insemination_confirmed = followUpData.insemination_confirmed || false
      insertData.natural_breeding_start = followUpData.breeding_start ? followUpData.breeding_start : null
      insertData.natural_breeding_end = followUpData.breeding_end ? followUpData.breeding_end : null
      insertData.monitoring_plan = followUpData.monitoring_plan || null
      insertData.ovulation_date = followUpData.ovulation_date || null
      insertData.ovulation_start_time = followUpData.ovulation_start || null
      insertData.ovulation_end_time = followUpData.ovulation_end || null
      insertData.has_medical_issue = followUpData.has_medical_issue || false
      insertData.medical_issue_description = followUpData.medical_issue || null
      insertData.vet_name = followUpData.vet_name || null
      insertData.vet_observation = followUpData.vet_observation || null
      
      console.log('🔥 [Follow-Up API] Heat detection insert data:', {
        insemination_scheduled_at: insertData.insemination_scheduled_at,
        insemination_confirmed: insertData.insemination_confirmed,
        natural_breeding_start: insertData.natural_breeding_start,
        natural_breeding_end: insertData.natural_breeding_end,
        monitoring_plan: insertData.monitoring_plan,
        ovulation_date: insertData.ovulation_date,
        ovulation_start_time: insertData.ovulation_start_time,
        ovulation_end_time: insertData.ovulation_end_time,
        has_medical_issue: insertData.has_medical_issue,
        medical_issue_description: insertData.medical_issue_description,
        vet_name: insertData.vet_name,
        vet_observation: insertData.vet_observation,
      })
    } else if (eventData.event_type === 'insemination') {
      console.log('💉 [Follow-Up API] Processing INSEMINATION follow-up...')
      insertData.ovulation_date = followUpData.ovulation_date || null
      insertData.ovulation_start_time = followUpData.ovulation_start || null
      insertData.ovulation_end_time = followUpData.ovulation_end || null
      insertData.ovulation_amount_ml = followUpData.ovulation_amount ? parseFloat(followUpData.ovulation_amount) : null
      insertData.has_medical_issue = followUpData.has_medical_issue || false
      insertData.medical_issue_description = followUpData.medical_issue || null
      
      console.log('💉 [Follow-Up API] Insemination insert data:', {
        ovulation_date: insertData.ovulation_date,
        ovulation_start_time: insertData.ovulation_start_time,
        ovulation_end_time: insertData.ovulation_end_time,
        ovulation_amount_ml: insertData.ovulation_amount_ml,
        has_medical_issue: insertData.has_medical_issue,
        medical_issue_description: insertData.medical_issue_description,
      })
    } else if (eventData.event_type === 'pregnancy_check') {
      console.log('🤰 [Follow-Up API] Processing PREGNANCY_CHECK follow-up...')
      insertData.steaming_date = followUpData.steaming_date || null
      insertData.next_check_date = followUpData.next_check_date || null
      insertData.expected_heat_date = followUpData.next_heat_date || null
      
      console.log('🤰 [Follow-Up API] Pregnancy check insert data:', {
        steaming_date: insertData.steaming_date,
        next_check_date: insertData.next_check_date,
        expected_heat_date: insertData.expected_heat_date,
      })
    } else if (eventData.event_type === 'calving') {
      console.log('👶 [Follow-Up API] Processing CALVING follow-up...')
      insertData.placenta_expelled = followUpData.placenta_expelled ?? null
      insertData.placenta_expelled_at = followUpData.placenta_date && followUpData.placenta_time
        ? `${followUpData.placenta_date}T${followUpData.placenta_time}:00`
        : null
      insertData.has_medical_issue = followUpData.has_medical_issue || false
      insertData.medical_issue_description = followUpData.medical_issue || null
      
      console.log('👶 [Follow-Up API] Calving insert data:', {
        placenta_expelled: insertData.placenta_expelled,
        placenta_expelled_at: insertData.placenta_expelled_at,
        has_medical_issue: insertData.has_medical_issue,
        medical_issue_description: insertData.medical_issue_description,
      })
    }
    
    console.log('📋 [Follow-Up API] Complete insert data:', insertData)

    // Insert the follow-up record
    console.log('💾 [Follow-Up API] Inserting follow-up into database...')
    const { data: newFollowUp, error: insertError } = await (supabase as any)
      .from('breeding_follow_ups')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('❌ [Follow-Up API] Error creating breeding follow-up:', insertError)
      return NextResponse.json(
        { error: insertError.message || 'Failed to create follow-up' },
        { status: 400 }
      )
    }

    console.log('✅ [Follow-Up API] Breeding follow-up created successfully:', newFollowUp.id)
    console.log('✅ [Follow-Up API] Stored record:', {
      id: newFollowUp.id,
      event_id: newFollowUp.event_id,
      farm_id: newFollowUp.farm_id,
      created_by: newFollowUp.created_by,
      created_at: newFollowUp.created_at,
      updated_at: newFollowUp.updated_at,
      insemination_scheduled_at: newFollowUp.insemination_scheduled_at,
      insemination_confirmed: newFollowUp.insemination_confirmed,
      ovulation_date: newFollowUp.ovulation_date,
      ovulation_start_time: newFollowUp.ovulation_start_time,
      ovulation_end_time: newFollowUp.ovulation_end_time,
    })

    return NextResponse.json({
      success: true,
      followUp: newFollowUp,
      message: 'Follow-up recorded successfully'
    })

  } catch (error: any) {
    console.error('Error in POST /api/breeding-follow-ups:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    let query = supabase
      .from('breeding_follow_ups')
      .select('*')
      .eq('farm_id', userRole.farm_id)

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data: followUps, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      followUps: followUps || []
    })

  } catch (error: any) {
    console.error('Error in GET /api/breeding-follow-ups:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
