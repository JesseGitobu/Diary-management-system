// src/lib/services/breeding-sync.ts
// This service ensures breeding_records and breeding_events stay in sync

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/client'
import { updateAnimal, getAnimalById } from '@/lib/database/animals'

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
 * ✅ Helper: Calculate days in milk from calving date
 */
export function calculateDaysInMilk(calvingDate: string): number {
  const calving = new Date(calvingDate)
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - calving.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * ✅ Helper: Determine if animal should be dried off based on days pregnant
 * Returns { shouldDryOff: boolean, daysUntilDryOff: number }
 */
export async function calculateDryOffStatus(
  animalId: string,
  farmId: string,
  isServerSide = false
): Promise<{ shouldDryOff: boolean; daysUntilDryOff: number; daysPregnantAtDryoff: number }> {
  const supabase = isServerSide 
    ? await createServerSupabaseClient() 
    : createClient()
  
  try {
    // Get breeding settings for this farm
    const { data: settings } = await supabase
      .from('farm_breeding_settings')
      .select('days_pregnant_at_dryoff')
      .eq('farm_id', farmId)
      .single()
    
    const daysPregnantAtDryoff = (settings as any)?.days_pregnant_at_dryoff || 220
    
    // Get animal and latest pregnancy record
    const animal = await getAnimalById(animalId)
    if (!animal || (animal as any).production_status !== 'served') {
      return { shouldDryOff: false, daysUntilDryOff: 0, daysPregnantAtDryoff }
    }
    
    // If service_date exists, calculate days pregnant
    if ((animal as any).service_date) {
      const serviceDate = new Date((animal as any).service_date)
      const today = new Date()
      const daysPregnant = Math.floor((today.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysUntilDryOff = Math.max(0, daysPregnantAtDryoff - daysPregnant)
      
      return {
        shouldDryOff: daysPregnant >= daysPregnantAtDryoff,
        daysUntilDryOff,
        daysPregnantAtDryoff
      }
    }
    
    return { shouldDryOff: false, daysUntilDryOff: 0, daysPregnantAtDryoff }
  } catch (error) {
    console.error('Error calculating dry-off status:', error)
    return { shouldDryOff: false, daysUntilDryOff: 0, daysPregnantAtDryoff: 220 }
  }
}

/**
 * ✅ Helper: Get lactation summary data
 */
export async function getLactationSummary(
  animalId: string,
  isServerSide = false
): Promise<{
  daysInMilk: number
  lactationNumber: number | null
  currentDailyProduction: number | null
  calvingDate: string | null
}> {
  const animal = await getAnimalById(animalId)
  if (!animal) {
    return { daysInMilk: 0, lactationNumber: null, currentDailyProduction: null, calvingDate: null }
  }
  
  // Calculate days in milk from days_in_milk field if available
  let daysInMilk = (animal as any).days_in_milk || 0
  
  // If production_status is lactating but days_in_milk is 0, try to calculate from calving
  if ((animal as any).production_status === 'lactating' && daysInMilk === 0 && (animal as any).birth_date) {
    // Try to find the most recent calving date from breeding events
    const supabase = isServerSide 
      ? await createServerSupabaseClient() 
      : createClient()
    
    const { data: events } = await (supabase as any)
      .from('breeding_events')
      .select('event_date')
      .eq('animal_id', animalId)
      .eq('event_type', 'calving')
      .order('event_date', { ascending: false })
      .limit(1)
      .single()
    
    if (events) {
      daysInMilk = calculateDaysInMilk((events as any).event_date)
    }
  }
  
  return {
    daysInMilk,
    lactationNumber: (animal as any).lactation_number,
    currentDailyProduction: (animal as any).current_daily_production,
    calvingDate: null // Would need to query from breeding_events if needed
  }
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
    const { data: breedingRecord, error: recordError } = await (supabase
      .from('breeding_records') as any)
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
    const { error: eventError } = await (supabase
      .from('breeding_events') as any)
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
    
    const { error: pregnancyError } = await (supabase
      .from('pregnancy_records') as any)
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
    const { error: pregnancyError } = await (supabase
      .from('pregnancy_records') as any)
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
    const { error: eventError } = await (supabase
      .from('breeding_events')  as any)
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
    const { error: animalError } = await (supabase
      .from('animals') as any)
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
    const { error: pregnancyError } = await (supabase
      .from('pregnancy_records') as any)
      .update({
        pregnancy_status: 'completed',
        actual_calving_date: data.calving_date
      })
      .eq('breeding_record_id', breedingRecordId)
    
    if (pregnancyError) throw pregnancyError
    
    // 2. Create calving event
    const { error: eventError } = await (supabase
      .from('breeding_events')  as any)
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
      const { data: calf, error: calfError } = await (supabase
        .from('animals') as any)
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
    // FIXED: Cast .from('animals') to any to bypass 'never' type error
    // FIXED: Cast rpc args to any to bypass 'undefined' argument error
    const { error: animalError } = await (supabase
      .from('animals') as any)
      .update({
        production_status: 'lactating',
        lactation_number: (await supabase.rpc('increment_lactation', { animal_id: animalId } as any)).data,
        expected_calving_date: null,
        days_in_milk: 0,  // ✅ NEW: Reset days_in_milk to 0 at calving
        service_date: null,  // ✅ NEW: Clear service_date after calving
        updated_at: new Date().toISOString()
      })
      .eq('id', animalId)
    
    if (animalError) {
      console.error('Failed to update animal status:', animalError)
    }
    
    console.log('✅ [Breeding-Sync] Calving recorded successfully for animal:', animalId)
    console.log('📊 [Breeding-Sync] Production status updated to: lactating')
    console.log('📅 [Breeding-Sync] Days in milk reset to: 0')
    
    return { success: true, calf: calfData }
    
  } catch (error: any) {
    console.error('Error recording calving:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Handle insemination event - updates animal status to 'served'
 */
export async function handleInseminationEvent(
  animalId: string,
  farmId: string,
  inseminationDate: string,
  userId: string,
  isServerSide = false
): Promise<{ success: boolean; error?: string }> {
  const supabase = isServerSide 
    ? await createServerSupabaseClient() 
    : createClient()
  
  try {
    // Get current animal data
    const animal = await getAnimalById(animalId)
    if (!animal) {
      return { success: false, error: 'Animal not found' }
    }
    
    // Only update if not already served
    if ((animal as any).production_status !== 'served') {
      console.log('🔄 [Breeding-Sync] Updating animal status to "served" for insemination:', animalId)
      
      // Calculate expected calving date (default 280 days)
      const { data: breedingSettings } = await supabase
        .from('farm_breeding_settings')
        .select('default_gestation')
        .eq('farm_id', farmId)
        .single()
      
      const gestationDays = (breedingSettings as any)?.default_gestation || 280
      const expectedCalvingDate = new Date(inseminationDate)
      expectedCalvingDate.setDate(expectedCalvingDate.getDate() + gestationDays)
      
      // Update animal status
      const result = await updateAnimal(animalId, farmId, {
        production_status: 'served',
        service_date: inseminationDate,
        expected_calving_date: expectedCalvingDate.toISOString().split('T')[0],
        days_in_milk: null,  // ✅ Clear days_in_milk when entering served status
        updated_at: new Date().toISOString()
      })
      
      if (!result.success) {
        console.error('Failed to update animal status:', result.error)
        return { success: false, error: result.error }
      }
      
      console.log('✅ [Breeding-Sync] Animal status updated to served:', animalId)
      console.log('📅 [Breeding-Sync] Expected calving date:', expectedCalvingDate.toISOString().split('T')[0])
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('Error handling insemination event:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Handle pregnancy check event - updates status based on result
 * If pregnancy_status is negative/failed, revert back to lactating or heat cycle
 */
export async function handlePregnancyCheckEvent(
  animalId: string,
  farmId: string,
  pregnancyCheckDate: string,
  pregnancyStatus: 'confirmed' | 'negative' | 'pending',
  userId: string,
  isServerSide = false
): Promise<{ success: boolean; error?: string; statusUpdated?: boolean }> {
  const supabase = isServerSide 
    ? await createServerSupabaseClient() 
    : createClient()
  
  try {
    const animal = await getAnimalById(animalId)
    if (!animal) {
      return { success: false, error: 'Animal not found' }
    }
    
    let statusUpdated = false
    
    // If pregnancy check is negative, revert back to lactating (heat cycle)
    if (pregnancyStatus === 'negative' && (animal as any).production_status === 'served') {
      console.log('🔄 [Breeding-Sync] Pregnancy check failed for animal:', animalId)
      console.log('📊 [Breeding-Sync] Reverting status from "served" back to "lactating"')
      
      const result = await updateAnimal(animalId, farmId, {
        production_status: 'lactating',
        service_date: null,
        expected_calving_date: null,
        updated_at: new Date().toISOString()
      })
      
      if (!result.success) {
        console.error('Failed to update animal status:', result.error)
        return { success: false, error: result.error }
      }
      
      console.log('✅ [Breeding-Sync] Animal ready for re-breeding')
      statusUpdated = true
    }
    
    // If pregnancy is confirmed, keep status as 'served' (no change needed)
    if (pregnancyStatus === 'confirmed') {
      console.log('✅ [Breeding-Sync] Pregnancy confirmed for animal:', animalId)
      console.log('📊 [Breeding-Sync] Maintaining status: served')
    }
    
    return { success: true, statusUpdated }
  } catch (error: any) {
    console.error('Error handling pregnancy check event:', error)
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
    const { data: eventsData } = await supabase
      .from('breeding_events')
      .select('*')
      .eq('farm_id', farmId)
      .eq('event_type', 'insemination')
    
    // FIXED: Cast to any[] to avoid 'never' type on iteration
    const events = (eventsData || []) as any[]

    if (events.length === 0) {
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