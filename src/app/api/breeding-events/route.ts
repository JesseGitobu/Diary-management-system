// src/app/api/breeding-events/route.ts
// Updated to use unified service

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { recordCalvingUnified, handleInseminationEvent, handlePregnancyCheckEvent } from '@/lib/database/breeding-sync'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { addDays, parseISO } from 'date-fns'

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
    const { eventData, createCalf } = body

    console.log('📝 Processing breeding event:', eventData.event_type)

    // Validate farm ownership
    if (eventData.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // Fetch farm breeding settings to get default gestation period
    const { data: breedingSettings } = await supabase
      .from('farm_breeding_settings')
      .select('default_gestation')
      .eq('farm_id', eventData.farm_id)
      .single()

    const defaultGestationDays = (breedingSettings as any)?.default_gestation || 280 // Default 280 days if not set

    // Handle different event types
    if (eventData.event_type === 'calving') {
      // Find the latest service record for this animal
      const { data: serviceRecordResult } = await supabase
        .from('service_records')
        .select('id')
        .eq('animal_id', eventData.animal_id)
        .eq('farm_id', eventData.farm_id)
        .order('service_date', { ascending: false })
        .limit(1)
        .single()

      // Cast to any to fix "Property 'id' does not exist on type 'never'"
      const serviceRecord = serviceRecordResult as any

      if (!serviceRecord) {
        return NextResponse.json(
          { error: 'No service record found for this animal' },
          { status: 400 }
        )
      }

      // Record calving using unified service
      const result = await recordCalvingUnified(
        serviceRecord.id,
        eventData.animal_id,
        eventData.farm_id,
        {
          calving_date: eventData.event_date,
          calving_outcome: eventData.calving_outcome,
          calf_gender: eventData.calf_gender,
          calf_weight: eventData.calf_weight,
          calf_tag: eventData.calf_tag_number,
          calf_health: eventData.calf_health_status,
          notes: eventData.notes,
          create_calf: createCalf
        },
        user.id,
        true
      )

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        event: result,
        calf: result.calf,
        message: 'Calving recorded successfully'
      })
    }

    // Only the columns that actually exist in breeding_events
    const breedingEventBase = {
      farm_id: eventData.farm_id,
      animal_id: eventData.animal_id,
      event_type: eventData.event_type,
      event_date: eventData.event_date,
      notes: eventData.notes || null,
      created_by: user.id,
    }

    // ===== INSEMINATION: create service_record first, then breeding_event =====
    if (eventData.event_type === 'insemination') {
      const serviceType = eventData.insemination_method === 'artificial_insemination'
        ? 'artificial_insemination'
        : 'natural'
      const serviceDate = eventData.event_date.split('T')[0]

      // Calculate expected_calving_date
      let expectedCalvingDate: string | null = null
      try {
        expectedCalvingDate = addDays(parseISO(eventData.event_date), defaultGestationDays)
          .toISOString().split('T')[0]
      } catch (_) {}

      // Get next service_number for this animal
      const { data: existingServices } = await (supabase as any)
        .from('service_records')
        .select('service_number')
        .eq('animal_id', eventData.animal_id)
        .eq('farm_id', eventData.farm_id)
        .order('service_number', { ascending: false })
        .limit(1)
      const serviceNumber = ((existingServices as any[])?.[0]?.service_number || 0) + 1

      const { data: serviceRecord, error: serviceError } = await (supabase as any)
        .from('service_records')
        .insert({
          animal_id: eventData.animal_id,
          farm_id: eventData.farm_id,
          service_number: serviceNumber,
          service_type: serviceType,
          service_date: serviceDate,
          bull_tag_or_semen_code: eventData.semen_bull_code || null,
          technician_name: eventData.technician_name || null,
          expected_calving_date: expectedCalvingDate,
          notes: eventData.notes || null,
        })
        .select()
        .single()

      if (serviceError) {
        console.error('❌ [API] Failed to insert service_record:', serviceError.message)
        return NextResponse.json({ error: serviceError.message }, { status: 400 })
      }
      console.log('✅ [API] Service record created:', serviceRecord.id)

      // Now create breeding_event with service_record_id (satisfies CHECK constraint)
      const { data: event, error: eventError } = await (supabase as any)
        .from('breeding_events')
        .insert({ ...breedingEventBase, service_record_id: serviceRecord.id })
        .select()
        .single()

      if (eventError) {
        console.error('❌ [API] Failed to insert breeding_event for insemination:', eventError.message)
        return NextResponse.json({ error: eventError.message }, { status: 400 })
      }

      // Update animal production_status to 'served'
      const insemResult = await handleInseminationEvent(
        eventData.animal_id, eventData.farm_id, eventData.event_date, user.id, true
      )
      if (!insemResult.success) {
        console.error('⚠️ [API] Failed to update production status:', insemResult.error)
      }

      return NextResponse.json({ success: true, event, message: 'Breeding event recorded successfully' })
    }

    // ===== PREGNANCY CHECK: create pregnancy_record first, then breeding_event =====
    if (eventData.event_type === 'pregnancy_check') {
      const pregnancyStatusMap: Record<string, string> = {
        pregnant: 'confirmed', not_pregnant: 'false', uncertain: 'suspected'
      }
      const pregnancyStatus = pregnancyStatusMap[eventData.pregnancy_result] || 'suspected'

      const methodMap: Record<string, string> = {
        'Ultrasound': 'ultrasound', 'Blood test': 'blood_test',
        'Rectal palpation': 'rectal_palpation', 'Visual observation': 'visual', 'Milk test': 'visual'
      }
      const confirmationMethod = eventData.examination_method
        ? methodMap[eventData.examination_method] || 'visual'
        : 'visual'

      // Find the latest service_record for this animal to link to pregnancy_records
      const { data: latestService } = await (supabase as any)
        .from('service_records')
        .select('id')
        .eq('animal_id', eventData.animal_id)
        .eq('farm_id', eventData.farm_id)
        .order('service_date', { ascending: false })
        .limit(1)
        .single()

      if (!latestService) {
        return NextResponse.json(
          { error: 'Cannot record pregnancy check: no service record found for this animal' },
          { status: 400 }
        )
      }

      const { data: pregnancyRecord, error: pregError } = await (supabase as any)
        .from('pregnancy_records')
        .insert({
          animal_id: eventData.animal_id,
          farm_id: eventData.farm_id,
          service_record_id: latestService.id,
          pregnancy_status: pregnancyStatus,
          confirmed_date: eventData.event_date.split('T')[0],
          confirmation_method: confirmationMethod,
          expected_calving_date: eventData.estimated_due_date || null,
          pregnancy_notes: eventData.notes || null,
          veterinarian: eventData.veterinarian_name || null,
        })
        .select()
        .single()

      if (pregError) {
        console.error('❌ [API] Failed to insert pregnancy_record:', pregError.message)
        return NextResponse.json({ error: pregError.message }, { status: 400 })
      }
      console.log('✅ [API] Pregnancy record created:', pregnancyRecord.id)

      // Now create breeding_event with pregnancy_record_id (satisfies CHECK constraint)
      const { data: event, error: eventError } = await (supabase as any)
        .from('breeding_events')
        .insert({ ...breedingEventBase, pregnancy_record_id: pregnancyRecord.id })
        .select()
        .single()

      if (eventError) {
        console.error('❌ [API] Failed to insert breeding_event for pregnancy_check:', eventError.message)
        return NextResponse.json({ error: eventError.message }, { status: 400 })
      }

      // Update animal production_status based on result
      const mappedStatus = eventData.pregnancy_result === 'pregnant' ? 'confirmed'
        : eventData.pregnancy_result === 'not_pregnant' ? 'negative' : 'pending'
      const pregnancyResult = await handlePregnancyCheckEvent(
        eventData.animal_id, eventData.farm_id, eventData.event_date, mappedStatus, user.id, true
      )
      if (!pregnancyResult.success) {
        console.error('⚠️ [API] Failed to update production status:', pregnancyResult.error)
      }

      return NextResponse.json({ success: true, event, message: 'Breeding event recorded successfully' })
    }

    // ===== HEAT DETECTION: insert breeding_event first, then heat_detection_signs =====
    const { data: event, error } = await (supabase as any)
      .from('breeding_events')
      .insert({
        ...breedingEventBase,
        heat_action_taken: eventData.heat_action_taken || null,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Insert individual heat signs into heat_detection_signs child table
    const signs: string[] = eventData.heat_signs || []
    if (signs.length > 0) {
      const signRows = signs.map((sign: string) => ({ event_id: event.id, sign }))
      const { error: signsError } = await (supabase as any)
        .from('heat_detection_signs')
        .insert(signRows)

      if (signsError) {
        console.error('⚠️ [API] Failed to insert heat_detection_signs:', signsError.message)
        // Non-fatal: event was already created, log and continue
      } else {
        console.log(`✅ [API] Inserted ${signRows.length} heat sign(s) for event ${event.id}`)
      }
    }

    return NextResponse.json({
      success: true,
      event,
      message: 'Breeding event recorded successfully'
    })

  } catch (error: any) {
    console.error('Breeding events API error:', error)
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

    const { searchParams } = new URL(request.url)
    const animalId = searchParams.get('animal_id')

    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('breeding_events')
      .select(`
        *,
        animals (
          tag_number,
          name
        )
      `)
      .eq('farm_id', userRole.farm_id)
      .order('event_date', { ascending: false })

    if (animalId) {
      query = query.eq('animal_id', animalId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      events: data
    })

  } catch (error: any) {
    console.error('Error fetching breeding events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch breeding events' },
      { status: 500 }
    )
  }
}