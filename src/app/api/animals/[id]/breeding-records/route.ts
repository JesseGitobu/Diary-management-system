// src/app/api/animals/[id]/breeding-records/route.ts
// Updated to support Breeding Window Logic

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  getUnifiedBreedingHistory,
  createUnifiedBreedingRecord 
} from '@/lib/database/breeding-sync'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: animalId } = await params

    console.log('📋 [breeding-records] Fetching unified breeding history for animal:', animalId)

    // Get unified data
    const history = await getUnifiedBreedingHistory(animalId, true)

    console.log('📦 [breeding-records] Raw data from DB:', {
      serviceRecordsCount: history.breedingRecords.length,
      breedingEventsCount: history.events.length,
      pregnancyRecordsCount: history.pregnancyRecords.length,
      eventTypes: history.events.reduce((acc: Record<string, number>, e: any) => {
        acc[e.event_type] = (acc[e.event_type] || 0) + 1
        return acc
      }, {}),
    })

    // 1. Transform Breeding Records — service_records fields mapped to component interface
    const transformedRecords = history.breedingRecords.map(record => {
      const pregnancy = history.pregnancyRecords.find(
        p => p.breeding_record_id === record.id
      )

      // Check for most recent pregnancy check event for this animal
      const relatedPregnancyChecks = history.events
        .filter((e: any) =>
          e.event_type === 'pregnancy_check' &&
          e.animal_id === record.animal_id
        )
        .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

      const mostRecentPregnancyCheck = relatedPregnancyChecks[0]

      // Determine pregnancy status: prefer breeding_event data if available
      let pregnancyStatus = mapPregnancyStatus(pregnancy?.pregnancy_status)

      if (mostRecentPregnancyCheck && mostRecentPregnancyCheck.event_date >= record.service_date) {
        pregnancyStatus = mostRecentPregnancyCheck.pregnancy_result === 'pregnant'
          ? 'confirmed'
          : mostRecentPregnancyCheck.pregnancy_result === 'not_pregnant'
          ? 'negative'
          : mostRecentPregnancyCheck.pregnancy_result === 'uncertain'
          ? 'uncertain'
          : 'pending'
      }

      const transformed = {
        id: record.id,
        animal_id: record.animal_id,
        service_date: record.service_date,
        service_type: record.service_type,
        service_number: record.service_number,
        bull_tag_or_semen_code: record.bull_tag_or_semen_code,
        bull_name_or_semen_source: record.bull_name_or_semen_source,
        sire_id: record.sire_id,
        technician_name: record.technician_name,
        service_cost: record.service_cost,
        notes: record.notes,
        outcome: record.outcome,
        expected_calving_date: pregnancy?.expected_calving_date || mostRecentPregnancyCheck?.estimated_due_date,
        pregnancy_status: pregnancyStatus,
        created_at: record.created_at,
        updated_at: record.updated_at,
        auto_generated: record.auto_generated
      }

      console.log(`🐄 [breeding-records] Service record #${transformed.service_number}:`, {
        id: transformed.id,
        service_date: transformed.service_date,
        service_type: transformed.service_type,
        bull_tag_or_semen_code: transformed.bull_tag_or_semen_code,
        bull_name_or_semen_source: transformed.bull_name_or_semen_source,
        technician_name: transformed.technician_name,
        service_cost: transformed.service_cost,
        pregnancy_status: transformed.pregnancy_status,
        expected_calving_date: transformed.expected_calving_date,
      })

      return transformed
    })

    console.log(`✅ [breeding-records] Transformed ${transformedRecords.length} service records`)

    // 2. Filter & Map Heat Events
    const heatEvents = history.events
      .filter((e: any) => e.event_type === 'heat_detection')
      .map((e: any) => ({
        id: e.id,
        animal_id: e.animal_id,
        event_date: e.event_date,
        // Handle heat_signs safely: check root or inside details/data JSON
        heat_signs: Array.isArray(e.heat_signs) ? e.heat_signs : (e.details?.heat_signs || []),
        heat_action_taken: e.heat_action_taken || e.details?.heat_action_taken,
        created_at: e.created_at
      }))

    console.log(`🌡️ [breeding-records] Heat events (${heatEvents.length}):`, heatEvents.map(e => ({
      id: e.id, event_date: e.event_date, heat_signs: e.heat_signs, heat_action_taken: e.heat_action_taken
    })))

    // 2B. Extract Insemination Events from breeding_events
    const inseminationEvents = history.events
      .filter((e: any) => e.event_type === 'insemination')
      .map((e: any) => ({
        id: e.id,
        animal_id: e.animal_id,
        event_date: e.event_date,
        insemination_method: e.insemination_method,
        semen_bull_code: e.semen_bull_code,
        technician_name: e.technician_name,
        estimated_due_date: e.estimated_due_date,
        created_at: e.created_at
      }))

    console.log(`💉 [breeding-records] Insemination events (${inseminationEvents.length}):`, inseminationEvents.map(e => ({
      id: e.id, event_date: e.event_date, insemination_method: e.insemination_method,
      semen_bull_code: e.semen_bull_code, technician_name: e.technician_name,
      estimated_due_date: e.estimated_due_date
    })))

    // 2C. Extract Calving Events from breeding_events
    const calvingEvents = history.events
      .filter((e: any) => e.event_type === 'calving')
      .map((e: any) => ({
        id: e.id,
        animal_id: e.animal_id,
        event_date: e.event_date,
        estimated_due_date: e.estimated_due_date,
        calving_outcome: e.calving_outcome,
        calf_tag_number: e.calf_tag_number,
        calf_weight: e.calf_weight,
        calf_gender: e.calf_gender,
        calf_health_status: e.calf_health_status,
        created_at: e.created_at
      }))

    console.log(`🐣 [breeding-records] Calving events (${calvingEvents.length}):`, calvingEvents.map(e => ({
      id: e.id, event_date: e.event_date, calving_outcome: e.calving_outcome,
      calf_tag_number: e.calf_tag_number, calf_weight: e.calf_weight,
      calf_gender: e.calf_gender, calf_health_status: e.calf_health_status
    })))

    // 3. Filter & Extract Pregnancy Checks from Both Sources
    // PRIMARY: From breeding_events table (standalone pregnancy checks)
    // These are linked to pregnancy_records via pregnancy_record_id
    const pregnancyCheckEventsFromEvents = history.events
      .filter((e: any) => e.event_type === 'pregnancy_check')
      .map((e: any) => {
        // Look up the pregnancy_record to get service_record_id AND actual pregnancy status
        const pregnancyRecord = history.pregnancyRecords.find(
          (p: any) => p.id === e.pregnancy_record_id
        )
        
        // Map pregnancy_result to result display value
        // Priority: use pregnancy_record status if available (completed/aborted takes precedence)
        let resultValue = 'inconclusive'
        
        // First check if pregnancy_record has a definitive status
        if (pregnancyRecord?.pregnancy_status === 'completed') {
          resultValue = 'completed'
        } else if (pregnancyRecord?.pregnancy_status === 'aborted') {
          resultValue = 'aborted'
        } else if (pregnancyRecord?.pregnancy_status === 'confirmed') {
          // ✅ Map 'confirmed' pregnancy status to 'positive' result
          resultValue = 'positive'
        } else if (e.pregnancy_result === 'pregnant') {
          resultValue = 'positive'
        } else if (e.pregnancy_result === 'not_pregnant') {
          resultValue = 'negative'
        } else if (pregnancyRecord?.pregnancy_status === 'false') {
          // ✅ Map 'false' pregnancy status to 'negative' result
          resultValue = 'negative'
        }
        
        return {
          id: e.id,
          breeding_record_id: null,
          service_record_id: pregnancyRecord?.service_record_id || null,
          pregnancy_record_id: e.pregnancy_record_id,
          check_date: e.event_date,
          check_method: e.examination_method || 'Unknown',
          examination_method: e.examination_method,
          veterinarian_name: e.veterinarian_name,
          estimated_due_date: e.estimated_due_date,
          result: resultValue,
          checked_by: e.veterinarian_name || 'System',
          notes: e.notes,
          created_at: e.created_at
        }
      })

    // SECONDARY: From pregnancy_records table (linked to breeding records)
    const pregnancyChecksFromRecords = history.pregnancyRecords.map((p: any) => {
      // Map pregnancy_status database value to result display value
      let resultValue = 'inconclusive'
      if (p.pregnancy_status === 'confirmed') resultValue = 'positive'
      else if (p.pregnancy_status === 'false') resultValue = 'negative'
      else if (p.pregnancy_status === 'completed') resultValue = 'completed'
      else if (p.pregnancy_status === 'aborted') resultValue = 'aborted'
      else if (p.pregnancy_status === 'suspected') resultValue = 'inconclusive'
      
      return {
        id: p.id,
        breeding_record_id: p.breeding_record_id,
        service_record_id: p.service_record_id,
        pregnancy_record_id: p.id,
        check_date: p.confirmed_date || p.created_at,
        check_method: p.confirmation_method || p.check_method || 'Unknown',
        examination_method: p.confirmation_method || p.check_method || null,
        veterinarian_name: p.veterinarian || p.checked_by || null,
        estimated_due_date: p.expected_calving_date || null,
        result: resultValue,
        checked_by: p.veterinarian || p.checked_by || 'System',
        notes: p.pregnancy_notes || p.notes || null,
        created_at: p.created_at
      }
    })

    // Combine both sources, avoiding duplicates
    // Filter out pregnancy_records that have corresponding pregnancy_check events for the same service cycle
    const formattedPregnancyChecks = [
      ...pregnancyCheckEventsFromEvents,
      ...pregnancyChecksFromRecords.filter(check => 
        // Keep pregnancy_record only if there's NO pregnancy_check event for the SAME SERVICE RECORD
        !pregnancyCheckEventsFromEvents.some(e => {
          // Duplicates: Same service_record_id means same breeding cycle
          // Even if dates differ by ~220 days (day 60 check vs day 280 calving), 
          // they represent the same pregnancy
          return e.service_record_id && 
                 e.service_record_id === check.service_record_id
        })
      )
    ]
    
    // Sort by date descending (most recent first)
    formattedPregnancyChecks.sort((a, b) =>
      new Date(b.check_date).getTime() - new Date(a.check_date).getTime()
    )

    console.log(`🔬 [breeding-records] Pregnancy checks (${formattedPregnancyChecks.length}):`, formattedPregnancyChecks.map(c => ({
      id: c.id, check_date: c.check_date, result: c.result,
      examination_method: c.examination_method, veterinarian_name: c.veterinarian_name,
      estimated_due_date: c.estimated_due_date, notes: c.notes
    })))

    console.log('📤 [breeding-records] Final response summary:', {
      serviceRecords: transformedRecords.length,
      pregnancyChecks: formattedPregnancyChecks.length,
      heatEvents: heatEvents.length,
      inseminationEvents: inseminationEvents.length,
      calvingEvents: calvingEvents.length,
      allEvents: history.events.length,
    })

    return NextResponse.json({
      success: true,
      serviceRecords: transformedRecords,
      pregnancyChecks: formattedPregnancyChecks,
      heatEvents: heatEvents,
      inseminationEvents: inseminationEvents,
      calvingEvents: calvingEvents,
      allEvents: history.events
    })

  } catch (error: any) {
    console.error('❌ Error fetching breeding history:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cast to 'any' to bypass "Property 'farm_id' does not exist on type 'never'" error
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json(
        { error: 'No farm associated with user' },
        { status: 400 }
      )
    }

    const { id: animalId } = await params
    const body = await request.json()

    console.log('📝 Creating unified breeding record')

    // Validate animal belongs to farm
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()
    
    const { data: animal } = await supabase
      .from('animals')
      .select('id, farm_id')
      .eq('id', animalId)
      .eq('farm_id', userRole.farm_id)
      .single()

    if (!animal) {
      return NextResponse.json(
        { error: 'Animal not found or access denied' },
        { status: 404 }
      )
    }

    // Create unified breeding record (creates in both tables)
    const result = await createUnifiedBreedingRecord(
      {
        animal_id: animalId,
        farm_id: userRole.farm_id,
        breeding_date: body.breeding_date,
        breeding_method: body.breeding_method,
        sire_tag: body.sire_tag,
        sire_breed: body.sire_breed,
        veterinarian: body.veterinarian,
        breeding_cost: body.breeding_cost,
        breeding_notes: body.breeding_notes,
        pregnancy_status: 'pending',
        auto_generated: body.auto_generated || false
      },
      user.id,
      true
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Update animal status to 'served'
    await (supabase as any)
      .from('animals')
      .update({
        production_status: 'served',
        updated_at: new Date().toISOString()
      })
      .eq('id', animalId)

    return NextResponse.json({
      success: true,
      breedingRecord: result.data,
      message: 'Breeding record created successfully'
    })

  } catch (error: any) {
    console.error('❌ Error creating breeding record:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

function mapPregnancyStatus(dbStatus: string | undefined): string {
  if (!dbStatus) return 'pending'
  switch (dbStatus) {
    case 'suspected': return 'pending'
    case 'confirmed': return 'confirmed'
    case 'false': return 'negative'
    case 'aborted': return 'aborted'
    case 'completed': return 'completed'
    default: return 'pending'
  }
}