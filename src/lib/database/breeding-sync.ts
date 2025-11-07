// src/lib/services/breeding-sync.ts
// This service ensures breeding_records and breeding_events stay in sync

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/client'

export interface UnifiedBreedingRecord {
  // Core breeding record fields
  id: string
  animal_id: string
  farm_id: string
  breeding_date: string
  breeding_method: 'natural_breeding' | 'artificial_insemination'
  sire_tag?: string
  sire_breed?: string
  veterinarian?: string
  breeding_cost?: number
  breeding_notes?: string
  
  // Pregnancy tracking
  pregnancy_status: 'pending' | 'confirmed' | 'negative' | 'aborted' | 'completed'
  pregnancy_check_date?: string
  expected_calving_date?: string
  actual_calving_date?: string
  
  // Metadata
  created_at: string
  updated_at: string
  auto_generated?: boolean
}

/**
 * Creates a breeding record and corresponding breeding events
 * This ensures both tables stay in sync
 */
export async function createUnifiedBreedingRecord(
  data: Omit<UnifiedBreedingRecord, 'id' | 'created_at' | 'updated_at'>,
  userId: string,
  isServerSide = false
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = isServerSide 
    ? await createServerSupabaseClient() 
    : createClient()
  
  try {
    // 1. Create the breeding record (source of truth)
    const { data: breedingRecord, error: recordError } = await supabase
      .from('breeding_records')
      .insert({
        animal_id: data.animal_id,
        farm_id: data.farm_id,
        breeding_type: data.breeding_method,
        breeding_date: data.breeding_date,
        sire_name: data.sire_tag,
        sire_breed: data.sire_breed,
        technician_name: data.veterinarian,
        cost: data.breeding_cost,
        notes: data.breeding_notes,
        auto_generated: data.auto_generated || false
      })
      .select()
      .single()
    
    if (recordError) throw recordError
    
    // 2. Create corresponding insemination event for timeline
    const { error: eventError } = await supabase
      .from('breeding_events')
      .insert({
        farm_id: data.farm_id,
        animal_id: data.animal_id,
        event_type: 'insemination',
        event_date: data.breeding_date,
        insemination_method: data.breeding_method,
        semen_bull_code: data.sire_tag,
        technician_name: data.veterinarian,
        notes: data.breeding_notes,
        created_by: userId
      })
    
    if (eventError) {
      console.error('Failed to create breeding event:', eventError)
      // Don't fail the whole operation, just log the error
    }
    
    // 3. Create pregnancy record if needed
    const gestationDays = 280
    const expectedDate = new Date(data.breeding_date)
    expectedDate.setDate(expectedDate.getDate() + gestationDays)
    
    const { error: pregnancyError } = await supabase
      .from('pregnancy_records')
      .insert({
        breeding_record_id: breedingRecord.id,
        animal_id: data.animal_id,
        farm_id: data.farm_id,
        pregnancy_status: 'suspected',
        expected_calving_date: expectedDate.toISOString().split('T')[0],
        gestation_length: gestationDays
      })
    
    if (pregnancyError) {
      console.error('Failed to create pregnancy record:', pregnancyError)
    }
    
    return { success: true, data: breedingRecord }
    
  } catch (error: any) {
    console.error('Error creating unified breeding record:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Updates pregnancy status and creates corresponding events
 */
export async function updatePregnancyStatusUnified(
  breedingRecordId: string,
  animalId: string,
  farmId: string,
  data: {
    pregnancy_status: 'confirmed' | 'false' | 'aborted'
    check_date: string
    check_method?: string
    checked_by?: string
    notes?: string
    estimated_due_date?: string
  },
  userId: string,
  isServerSide = false
): Promise<{ success: boolean; error?: string }> {
  const supabase = isServerSide 
    ? await createServerSupabaseClient() 
    : createClient()
  
  try {
    // 1. Update pregnancy record
    const { error: pregnancyError } = await supabase
      .from('pregnancy_records')
      .update({
        pregnancy_status: data.pregnancy_status,
        confirmed_date: data.check_date,
        confirmation_method: data.check_method,
        veterinarian: data.checked_by,
        pregnancy_notes: data.notes,
        expected_calving_date: data.estimated_due_date
      })
      .eq('breeding_record_id', breedingRecordId)
    
    if (pregnancyError) throw pregnancyError
    
    // 2. Create pregnancy check event
    const { error: eventError } = await supabase
      .from('breeding_events')
      .insert({
        farm_id: farmId,
        animal_id: animalId,
        event_type: 'pregnancy_check',
        event_date: data.check_date,
        pregnancy_result: data.pregnancy_status === 'confirmed' ? 'pregnant' : 'not_pregnant',
        examination_method: data.check_method,
        veterinarian_name: data.checked_by,
        estimated_due_date: data.estimated_due_date,
        notes: data.notes,
        created_by: userId
      })
    
    if (eventError) {
      console.error('Failed to create pregnancy check event:', eventError)
    }
    
    // 3. Update animal status
    const animalStatus = data.pregnancy_status === 'confirmed' ? 'pregnant' : 'open'
    const { error: animalError } = await supabase
      .from('animals')
      .update({
        production_status: animalStatus,
        expected_calving_date: data.estimated_due_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', animalId)
    
    if (animalError) {
      console.error('Failed to update animal status:', animalError)
    }
    
    return { success: true }
    
  } catch (error: any) {
    console.error('Error updating pregnancy status:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Records calving and creates calf
 */
export async function recordCalvingUnified(
  breedingRecordId: string,
  animalId: string,
  farmId: string,
  data: {
    calving_date: string
    calving_outcome: 'normal' | 'assisted' | 'difficult' | 'caesarean'
    calf_gender?: string
    calf_weight?: number
    calf_tag?: string
    calf_health?: string
    notes?: string
    create_calf: boolean
  },
  userId: string,
  isServerSide = false
): Promise<{ success: boolean; calf?: any; error?: string }> {
  const supabase = isServerSide 
    ? await createServerSupabaseClient() 
    : createClient()
  
  try {
    // 1. Update pregnancy record
    const { error: pregnancyError } = await supabase
      .from('pregnancy_records')
      .update({
        pregnancy_status: 'completed',
        actual_calving_date: data.calving_date
      })
      .eq('breeding_record_id', breedingRecordId)
    
    if (pregnancyError) throw pregnancyError
    
    // 2. Create calving event
    const { error: eventError } = await supabase
      .from('breeding_events')
      .insert({
        farm_id: farmId,
        animal_id: animalId,
        event_type: 'calving',
        event_date: data.calving_date,
        calving_outcome: data.calving_outcome,
        calf_gender: data.calf_gender,
        calf_weight: data.calf_weight,
        calf_tag_number: data.calf_tag,
        calf_health_status: data.calf_health,
        notes: data.notes,
        created_by: userId
      })
    
    if (eventError) throw eventError
    
    // 3. Create calf if requested
    let calfData = null
    if (data.create_calf && data.calf_tag) {
      const { data: calf, error: calfError } = await supabase
        .from('animals')
        .insert({
          farm_id: farmId,
          tag_number: data.calf_tag,
          name: `Calf ${data.calf_tag}`,
          gender: data.calf_gender || 'female',
          birth_date: data.calving_date,
          weight: data.calf_weight,
          status: 'active',
          animal_source: 'born',
          notes: `Born from ${animalId}. Health: ${data.calf_health || 'Good'}`
        })
        .select()
        .single()
      
      if (calfError) {
        console.error('Failed to create calf:', calfError)
      } else {
        calfData = calf
      }
    }
    
    // 4. Update mother animal status
    const { error: animalError } = await supabase
      .from('animals')
      .update({
        production_status: 'lactating',
        lactation_number: (await supabase.rpc('increment_lactation', { animal_id: animalId })).data,
        expected_calving_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', animalId)
    
    if (animalError) {
      console.error('Failed to update animal status:', animalError)
    }
    
    return { success: true, calf: calfData }
    
  } catch (error: any) {
    console.error('Error recording calving:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Gets unified breeding history combining both tables
 */
export async function getUnifiedBreedingHistory(
  animalId: string,
  isServerSide = false
): Promise<{
  breedingRecords: any[]
  events: any[]
  pregnancyRecords: any[]
}> {
  const supabase = isServerSide 
    ? await createServerSupabaseClient() 
    : createClient()
  
  const [recordsResult, eventsResult, pregnancyResult] = await Promise.all([
    supabase
      .from('breeding_records')
      .select('*')
      .eq('animal_id', animalId)
      .order('breeding_date', { ascending: false }),
    
    supabase
      .from('breeding_events')
      .select('*')
      .eq('animal_id', animalId)
      .order('event_date', { ascending: false }),
    
    supabase
      .from('pregnancy_records')
      .select('*')
      .eq('animal_id', animalId)
      .order('created_at', { ascending: false })
  ])
  
  return {
    breedingRecords: recordsResult.data || [],
    events: eventsResult.data || [],
    pregnancyRecords: pregnancyResult.data || []
  }
}

/**
 * Syncs existing breeding_events to breeding_records
 * Use this for migration/data cleanup
 */
export async function syncEventsToRecords(
  farmId: string,
  userId: string
): Promise<{ success: boolean; synced: number; errors: string[] }> {
  const supabase = await createServerSupabaseClient()
  const errors: string[] = []
  let synced = 0
  
  try {
    // Get all insemination events without corresponding breeding records
    const { data: events } = await supabase
      .from('breeding_events')
      .select('*')
      .eq('farm_id', farmId)
      .eq('event_type', 'insemination')
    
    if (!events || events.length === 0) {
      return { success: true, synced: 0, errors: [] }
    }
    
    for (const event of events) {
      // Check if breeding record exists
      const { data: existing } = await supabase
        .from('breeding_records')
        .select('id')
        .eq('animal_id', event.animal_id)
        .eq('breeding_date', event.event_date)
        .single()
      
      if (!existing) {
        // Create breeding record from event
        const result = await createUnifiedBreedingRecord({
          animal_id: event.animal_id,
          farm_id: event.farm_id,
          breeding_date: event.event_date,
          breeding_method: event.insemination_method || 'artificial_insemination',
          sire_tag: event.semen_bull_code ?? undefined,
          veterinarian: event.technician_name ?? undefined,
          breeding_notes: event.notes ?? undefined,
          pregnancy_status: 'pending',
          auto_generated: true
        }, userId, true)
        
        if (result.success) {
          synced++
        } else {
          errors.push(`Failed to sync event ${event.id}: ${result.error}`)
        }
      }
    }
    
    return { success: true, synced, errors }
    
  } catch (error: any) {
    return { success: false, synced, errors: [error.message] }
  }
}