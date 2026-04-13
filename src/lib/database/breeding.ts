// src/lib/database/breeding.ts
import { createClient } from '@/lib/supabase/client'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { addDays, subDays, differenceInMonths } from 'date-fns'
import { Database } from '@/lib/supabase/types'

export type BreedingEventType = 'heat_detection' | 'insemination' | 'pregnancy_check' | 'calving'
export type InseminationMethod = 'artificial_insemination' | 'natural_breeding'
export type PregnancyResult = 'pregnant' | 'not_pregnant' | 'uncertain'
export type CalvingOutcome = 'normal' | 'assisted' | 'difficult' | 'caesarean'

export interface BreedingEventBase {
  id?: string
  farm_id: string
  animal_id: string
  event_type: BreedingEventType
  event_date: string
  notes?: string
  created_by: string
}

export interface HeatDetectionEvent extends BreedingEventBase {
  event_type: 'heat_detection'
  heat_signs: string[]
  heat_action_taken?: string
}

export interface InseminationEvent extends BreedingEventBase {
  event_type: 'insemination'
  insemination_method: InseminationMethod
  semen_bull_code?: string
  technician_name?: string
}

export interface PregnancyCheckEvent extends BreedingEventBase {
  event_type: 'pregnancy_check'
  pregnancy_result: PregnancyResult
  examination_method?: string
  veterinarian_name?: string
  estimated_due_date?: string
}

export interface CalvingEvent extends BreedingEventBase {
  event_type: 'calving'
  calving_outcome: CalvingOutcome
  calf_name?: string
  calf_breed?: string
  calf_gender?: string
  calf_weight?: number
  calf_tag_number?: string
  calf_health_status?: string
  calf_father_info?: string
}

// ============================================
// CALF TAG GENERATION
// ============================================

export interface AnimalTaggingSettings {
  id: string
  farm_id: string
  numbering_system: 'sequential' | 'custom'
  custom_format: string
  tag_prefix: string
  include_year_in_tag: boolean
  padding_zeros: boolean
  custom_start_number: number
  next_number: number
}

/**
 * Generates a calf tag based on farm's tagging settings
 * Supports formats like: {PREFIX}-{YEAR}-{NUMBER:3}
 * Where:
 *   {PREFIX} = tag_prefix (e.g., "COW")
 *   {YEAR} = current year (e.g., "2026")
 *   {NUMBER:3} = number padded to 3 digits (e.g., "001")
 */
export async function generateCalfTag(
  farmId: string,
  calvingDate: string,
  parentAnimalTag?: string
): Promise<string> {
  const supabase = createClient()
  
  try {
    console.log('🐄 generateCalfTag: Fetching tagging settings for farmId:', farmId)
    
    // Fetch tagging settings
    const { data: settings, error } = await supabase
      .from('animal_tagging_settings')
      .select('*')
      .eq('farm_id', farmId)
      .single()
    
    if (error || !settings) {
      console.warn('⚠️ generateCalfTag: No tagging settings found, using fallback format')
      // Fallback to basic format
      const year = new Date(calvingDate).getFullYear().toString().slice(-2)
      const month = String(new Date(calvingDate).getMonth() + 1).padStart(2, '0')
      return `${parentAnimalTag || 'CALF'}-${year}${month}C`
    }

    const tagSettings = settings as any
    console.log('🐄 generateCalfTag: Settings loaded:', { numbering_system: tagSettings.numbering_system, custom_format: tagSettings.custom_format })

    const calvingYear = new Date(calvingDate).getFullYear()
    let nextNumber = tagSettings.next_number || 1

    // Generate tag based on numbering system
    let calfTag = ''
    
    if (tagSettings.numbering_system === 'custom' && tagSettings.custom_format) {
      // Use custom format: e.g., "{PREFIX}-{YEAR}-{NUMBER:3}"
      calfTag = tagSettings.custom_format
        .replace('{PREFIX}', tagSettings.tag_prefix || 'COW')
        .replace('{YEAR}', tagSettings.include_year_in_tag ? calvingYear.toString() : '')
        .replace(/\{NUMBER:(\d+)\}/, (match: string, digits: string) => {
          const padLength = parseInt(digits, 10)
          return tagSettings.padding_zeros
            ? nextNumber.toString().padStart(padLength, '0')
            : nextNumber.toString()
        })
        .replace(/--/g, '-') // Clean up double dashes if YEAR is omitted
        .replace(/-$/, '') // Remove trailing dash
        .trim()
    } else {
      // Default sequential format: PREFIX-YEAR(optional)-NUMBER(padded)
      const parts = [tagSettings.tag_prefix || 'COW']
      
      if (tagSettings.include_year_in_tag) {
        parts.push(calvingYear.toString())
      }
      
      const numberStr = tagSettings.padding_zeros
        ? nextNumber.toString().padStart(3, '0')
        : nextNumber.toString()
      
      parts.push(numberStr)
      calfTag = parts.join('-')
    }

    console.log('🐄 generateCalfTag: Generated tag:', calfTag, 'next_number will be:', nextNumber + 1)
    
    return calfTag
  } catch (error) {
    console.error('❌ generateCalfTag: Error generating tag:', error)
    // Fallback to simple format
    const year = new Date(calvingDate).getFullYear().toString().slice(-2)
    const month = String(new Date(calvingDate).getMonth() + 1).padStart(2, '0')
    return `${parentAnimalTag || 'CALF'}-${year}${month}C`
  }
}

/**
 * Increments the next_number in animal_tagging_settings after a calf tag is used
 */
export async function incrementCalfTagNumber(farmId: string): Promise<void> {
  const supabase = createClient()
  
  try {
    console.log('🐄 incrementCalfTagNumber: Incrementing counter for farm:', farmId)
    
    // First, get current next_number
    const { data: settings, error: fetchError } = await supabase
      .from('animal_tagging_settings')
      .select('next_number')
      .eq('farm_id', farmId)
      .single()
    
    if (fetchError || !settings) {
      console.warn('⚠️ incrementCalfTagNumber: Could not fetch tagging settings:', fetchError?.message)
      return
    }
    
    const currentNumber = (settings as any).next_number || 1
    const nextNumber = currentNumber + 1
    
    // Update with the incremented value
    const { error: updateError } = await (supabase
      .from('animal_tagging_settings') as any)
      .update({ next_number: nextNumber })
      .eq('farm_id', farmId)
    
    if (updateError) {
      console.warn('⚠️ incrementCalfTagNumber: Could not update counter:', updateError.message)
      return
    }
    
    console.log('🐄 incrementCalfTagNumber: Successfully incremented counter from', currentNumber, 'to', nextNumber)
  } catch (error) {
    console.error('❌ incrementCalfTagNumber: Error:', error)
    // Non-critical - calf tag generation will still work even if counter doesn't increment
  }
}
  

export type BreedingEvent = HeatDetectionEvent | InseminationEvent | PregnancyCheckEvent | CalvingEvent

// Get eligible animals for each event type
export async function getEligibleAnimals(farmId: string, eventType: BreedingEventType) {
  const supabase = createClient()
  
  // Base query: Active females in the farm
  let query = supabase
    .from('animals')
    .select(`
      id,
      tag_number,
      name,
      gender,
      birth_date,
      production_status,
      breed,
      breeding_events (
        event_type,
        event_date
      )
    `)
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .eq('gender', 'female') 
  
  const { data, error } = await query.order('tag_number')
  console.log('[getEligibleAnimals] query response', {
    farmId,
    eventType,
    error,
    count: (data || []).length,
    sample: (data || [])?.slice(0, 10),
  })
  
  if (error) {
    console.error('Error fetching eligible animals:', error)
    return []
  }

  // Client-side filtering is safer for complex status logic
  const allFemales = (data || []) as any[]

  return allFemales.filter(animal => {
    // 1. Basic Age Check (e.g., must be > 10 months to breed)
    const ageInMonths = animal.birth_date ? differenceInMonths(new Date(), new Date(animal.birth_date)) : 12 // Default to eligible if unknown
    if (eventType !== 'calving' && ageInMonths < 10) return false;

    // 2. Specific Logic per Event
    switch (eventType) {
      case 'heat_detection':
      case 'insemination':
        // Eligible if open, heifer, or lactating — exclude animals already served/steaming
        return !['served', 'steaming_dry_cows'].includes(animal.production_status)

      case 'pregnancy_check':
        // Any female that has been served is eligible for a pregnancy check
        return true

      case 'calving':
        // Animals confirmed pregnant are in 'steaming_dry_cows' or 'served' production_status
        return ['served', 'steaming_dry_cows'].includes(animal.production_status)

      default:
        return true
    }
  })
}

// Get animals specifically eligible for pregnancy check (recently inseminated)
// This is a stricter version used by the dedicated Preg Check form
export async function getAnimalsForPregnancyCheck(farmId: string) {
  const supabase = createClient()
  
  // Get animals that have an insemination event in the last 9 months
  // AND generally don't have a newer 'calving' event
  const { data, error } = await supabase
    .from('animals')
    .select(`
      id,
      tag_number,
      name,
      production_status,
      breed,
      birth_date,
      breeding_events!inner (
        event_type,
        event_date
      )
    `)
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .eq('gender', 'female')
    .eq('breeding_events.event_type', 'insemination')
    // Look back 285 days max (approx gestation)
    .gte('breeding_events.event_date', new Date(Date.now() - 285 * 24 * 60 * 60 * 1000).toISOString())
  
  if (error) {
    console.error('Error fetching animals for pregnancy check:', error)
    return []
  }
  
  // Filter out unique animals (Supabase might return duplicates due to join)
  const animalsData = (data || []) as any[]

  const groupedById = animalsData.reduce((acc: Record<string, any>, row: any) => {
    if (!acc[row.id]) {
      acc[row.id] = {
        ...row,
        breeding_events: [],
      }
    }

    if (row.breeding_events) {
      acc[row.id].breeding_events.push(row.breeding_events)
    }

    return acc
  }, {})

  const uniqueAnimals = Object.values(groupedById).map((animal: any) => {
    const lastInsemination = (animal.breeding_events || [])
      .filter((event: any) => event.event_type === 'insemination' && event.event_date)
      .map((event: any) => new Date(event.event_date))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0]

    return {
      ...animal,
      last_insemination: lastInsemination ? lastInsemination.toISOString() : null,
    }
  })

  return uniqueAnimals
}

// Get pregnant animals eligible for calving
export async function getAnimalsForCalving(farmId: string) {
  const supabase = createClient()

  // Abort the request after 8 seconds so the form never gets permanently stuck
  // (e.g. when Supabase fires SIGNED_IN during a token refresh mid-query)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const { data, error } = await (supabase as any)
      .from('pregnancy_records')
      .select(`
        animal_id,
        pregnancy_status,
        expected_calving_date,
        animals!pregnancy_records_animal_id_fkey (
          id,
          tag_number,
          name,
          breed,
          production_status
        )
      `)
      .eq('farm_id', farmId)
      .eq('pregnancy_status', 'confirmed')   // only confirmed — completed means already calved
      .order('expected_calving_date', { ascending: true })
      .abortSignal(controller.signal)

    if (error) {
      console.error('❌ getAnimalsForCalving: Query error:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Deduplicate by animal_id — keep the row with the nearest due date (sorted asc)
    const seen = new Set<string>()
    const animals: any[] = []

    for (const row of data as any[]) {
      const animal = row.animals
      if (!animal || seen.has(animal.id)) continue
      seen.add(animal.id)
      animals.push({
        id: animal.id,
        tag_number: animal.tag_number,
        name: animal.name,
        breed: animal.breed ?? null,
        production_status: animal.production_status,
        breeding_events: row.expected_calving_date
          ? [{ estimated_due_date: row.expected_calving_date }]
          : [],
      })
    }

    return animals

  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.error('❌ getAnimalsForCalving: Request timed out after 8s')
    } else {
      console.error('❌ getAnimalsForCalving: Unexpected error:', error)
    }
    return []
  } finally {
    clearTimeout(timeout)
  }
}

// CLIENT-SIDE: This should call the API, not database directly
export async function createBreedingEvent(eventData: BreedingEvent) {
  try {
    const response = await fetch('/api/breeding-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ eventData }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      // ✅ IMPROVEMENT: Log exact API error
      console.error('API Error creating breeding event:', result)
      return { success: false, error: result.error || 'Failed to create breeding event' }
    }
    
    return { success: true, data: result.event }
  } catch (error) {
    console.error('Network Error creating breeding event:', error)
    return { success: false, error: 'Network error occurred' }
  }
}

export function mapHealthStatus(status?: string): string {
  const s = status?.toLowerCase() || ''
  if (s.includes('good') || s.includes('excellent')) return 'healthy'
  if (s.includes('poor')) return 'weak'
  if (s.includes('sick')) return 'sick'
  if (s.includes('dead') || s.includes('deceased')) return 'deceased'
  return 'healthy'
}

export function mapCalvingHealthStatus(status?: string): string {
  // Maps calf health status from form to calving_records constraint values
  // Valid values: 'healthy', 'weak', 'sick', 'deceased'
  const s = status?.toLowerCase() || ''
  if (s.includes('excellent') || s.includes('good') || s.includes('healthy')) return 'healthy'
  if (s.includes('fair') || s.includes('weak') || s.includes('requires attention')) return 'weak'
  if (s.includes('poor') || s.includes('sick')) return 'sick'
  if (s.includes('dead') || s.includes('deceased')) return 'deceased'
  return 'healthy' // Default
}

export function mapDifficulty(outcome: string): string {
  const o = outcome.toLowerCase()
  if (o === 'caesarean') return 'cesarean' // Matches DB constraint
  if (o === 'normal') return 'normal'
  if (o === 'assisted') return 'assisted'
  if (o === 'difficult') return 'difficult'
  return 'normal' // Default
}

/**
 * Fetches the semen bull code from the latest insemination event
 * for a given animal, to auto-populate sire information in calving form
 */
export async function fetchLatestSemenBullCode(animalId: string): Promise<string | null> {
  const supabase = createClient()
  
  try {
    console.log('🐄 fetchLatestSemenBullCode: Fetching for animal:', animalId)
    
    // Query service_records table for latest artificial insemination service
    // bull_tag_or_semen_code contains the semen code
    const { data, error } = await (supabase
      .from('service_records') as any)
      .select('bull_tag_or_semen_code')
      .eq('animal_id', animalId)
      .eq('service_type', 'artificial_insemination')
      .order('service_date', { ascending: false })
      .limit(1)
    
    if (error) {
      console.warn('⚠️ fetchLatestSemenBullCode: Error fetching semen bull code:', error.message)
      return null
    }
    
    if (!data || (data as any[]).length === 0) {
      console.log('🐄 fetchLatestSemenBullCode: No semen bull code found')
      return null
    }

    const semenBullCode = (data as any[])[0]?.bull_tag_or_semen_code
    
    if (!semenBullCode) {
      console.log('🐄 fetchLatestSemenBullCode: No semen bull code value found')
      return null
    }
    
    console.log('🐄 fetchLatestSemenBullCode: Found semen bull code:', semenBullCode)
    return semenBullCode
  } catch (error) {
    console.error('❌ fetchLatestSemenBullCode: Unexpected error:', error)
    return null
  }
}

export async function processCalving(calvingEvent: CalvingEvent, farmId: string) {
  // ⚠️ DEPRECATED: Use processCalvingAction from src/app/actions/breeding-actions.ts instead
  // This function cannot use server-only imports since it's imported from client components
  const supabase = createClient()
  
  if (!calvingEvent.calf_tag_number) {
    return { success: false, error: 'Calf tag number is required' }
  }

  try {
    // 1. GET LATEST CONFIRMED PREGNANCY FROM PREGNANCY_RECORDS TABLE
    // ✅ FIX: Query pregnancy_records instead of breeding_events (has pregnancy_status field)
    // Look for confirmed or completed pregnancies
    const { data: pregnancyData, error: pregError } = await (supabase
      .from('pregnancy_records') as any)
      .select('id, pregnancy_status, expected_calving_date')
      .eq('animal_id', calvingEvent.animal_id)
      .in('pregnancy_status', ['confirmed', 'completed'])  // Animals that are confirmed pregnant
      .order('created_at', { ascending: false })
      .limit(1)

    if (pregError) {
      console.error('❌ Error fetching pregnancy record:', pregError)
      return { 
        success: false, 
        error: 'Cannot record calving: Error fetching pregnancy record.' 
      }
    }

    // Handle array response and get first record
    const pregnancyRecord = Array.isArray(pregnancyData) && pregnancyData.length > 0 
      ? pregnancyData[0] 
      : null

    if (!pregnancyRecord) {
      console.error('❌ No confirmed pregnancy found for mother:', calvingEvent.animal_id)
      return { 
        success: false, 
        error: 'Cannot record calving: No confirmed pregnancy found for this animal. Please create a pregnancy check and confirm it first.' 
      }
    }

    console.log('🐄 processCalving: Found confirmed pregnancy record:', pregnancyRecord)

    // 2. CHECK IF CALF TAG ALREADY EXISTS
    console.log('🐄 processCalving: Checking if tag number already exists:', calvingEvent.calf_tag_number)
    const { data: existingCalf, error: checkError } = await (supabase.from('animals') as any)
      .select('id, tag_number, name')
      .eq('tag_number', calvingEvent.calf_tag_number)
      .eq('farm_id', farmId)
      .limit(1)

    if (!checkError && existingCalf && (existingCalf as any[]).length > 0) {
      console.error('🐄 processCalving: Calf tag already exists:', calvingEvent.calf_tag_number)
      return {
        success: false,
        error: `Calf tag "${calvingEvent.calf_tag_number}" already exists in the system. Please use a different tag number or increment the tag counter in Animal Tagging Settings.`
      }
    }

    // 3. CREATE CALF IN 'ANIMALS' TABLE
    const newCalfData = {
      farm_id: farmId,
      tag_number: calvingEvent.calf_tag_number,
      name: calvingEvent.calf_name || `Calf ${calvingEvent.calf_tag_number}`,
      breed: calvingEvent.calf_breed,
      gender: calvingEvent.calf_gender || 'female',
      birth_date: calvingEvent.event_date,
      // ✅ FIX: Removed 'weight' field - animals table doesn't have a weight column
      // Birth weight is stored in calf_records.birth_weight instead (see line 641)
      status: 'active',
      animal_source: 'newborn_calf', 
      mother_id: calvingEvent.animal_id,
      production_status: 'calf',
      health_status: mapHealthStatus(calvingEvent.calf_health_status),
      notes: `Generated via Calving Process`
    }

    const { data: newCalf, error: calfError } = await (supabase.from('animals') as any)
      .insert(newCalfData)
      .select()
      .single()

    if (calfError) {
      console.error('Supabase Error creating calf:', JSON.stringify(calfError, null, 2))
      throw new Error(`Failed to create calf: ${calfError.message}`)
    }

    // 4. GET OR CREATE PREGNANCY RECORD ID
    // We need the pregnancy_record_id for the calving_records table (it's a required FK)
    let pregnancyRecordId = null
    try {
      console.log('🐄 processCalving: Looking for pregnancy_record for animal:', calvingEvent.animal_id)
      
      // First try to find existing confirmed pregnancy record
      const { data: pregnancyRecordData, error: pregRecError } = await (supabase
        .from('pregnancy_records') as any)
        .select('id')
        .eq('animal_id', calvingEvent.animal_id)
        .eq('pregnancy_status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!pregRecError && pregnancyRecordData && (pregnancyRecordData as any[]).length > 0) {
        pregnancyRecordId = (pregnancyRecordData as any[])[0].id
        console.log('🐄 processCalving: Found existing pregnancy_record_id:', pregnancyRecordId)
      } else {
        console.log('🐄 processCalving: No confirmed pregnancy record found')
        console.log('🐄 processCalving: For now, returning error - pregnancy record must exist or be created via pregnancy check first')
        throw new Error('Cannot create calving record: No confirmed pregnancy record found. Please record a positive pregnancy check first.')
      }
    } catch (error) {
      console.error('❌ processCalving: Error getting/creating pregnancy record ID:', error)
      throw error // This is now critical since we need this ID
    }

    if (!pregnancyRecordId) {
      throw new Error('Failed to obtain pregnancy_record_id for calving record')
    }

    // 4B. CREATE CALVING RECORD
    // Extract calving_time from event_date if it contains time info
    let calvingTime = null
    if (calvingEvent.event_date && calvingEvent.event_date.includes('T')) {
      const timePart = calvingEvent.event_date.split('T')[1]
      if (timePart) {
        calvingTime = timePart.split('.')[0] // Extract HH:MM:SS
      }
    }

    // Extract just the date part
    const calvingDate = calvingEvent.event_date.split('T')[0]

    // Try to get sire info from calf_father_info in the calving event first
    let sireInfo = null
    if (calvingEvent.calf_father_info) {
      sireInfo = calvingEvent.calf_father_info
      console.log('🐄 processCalving: Using sire info from calving event:', sireInfo)
    }

    // Create calving record (required table)
    let calvingRecord = null
    const calvingRecordData = {
      pregnancy_record_id: pregnancyRecordId, // Required FK
      mother_id: calvingEvent.animal_id, // Required FK
      farm_id: farmId, // Required FK
      calving_date: calvingDate, // Required - date only
      calving_time: calvingTime, // Optional - time without timezone
      calving_difficulty: mapDifficulty(calvingEvent.calving_outcome), // maps to 'easy', 'normal', 'difficult', 'assisted', 'cesarean'
      assistance_required: ['assisted', 'difficult', 'caesarean'].includes(calvingEvent.calving_outcome), // boolean
      calf_alive: calvingEvent.calf_health_status !== 'deceased', // boolean
      notes: calvingEvent.notes // text
      // ✅ FIX: Removed 'calf_gender' and 'calf_health_status' - calving_records table doesn't have these columns
      // These belong in calf_records table instead (see lines below)
    }

    try {
      const { data: calvingRecordResult, error: calvingError } = await (supabase.from('calving_records') as any)
        .insert(calvingRecordData)
        .select()
        .single()

      if (!calvingError && calvingRecordResult) {
        calvingRecord = calvingRecordResult
        console.log('🐄 processCalving: Created calving record with ID:', calvingRecord.id)
      } else if (calvingError) {
        console.error('❌ processCalving: Failed to create calving record:', calvingError.message)
        throw new Error(`Failed to create calving record: ${calvingError.message}`)
      }
    } catch (error) {
      console.error('❌ processCalving: Error creating calving record:', error)
      throw error // This is now a required step, so fail if it doesn't work
    }

    // 5. CREATE CALF RECORD (Detail table) - OPTIONAL
    // Only create if calving_records was successfully created
    if (calvingRecord) {
      const calfRecordData = {
        calving_record_id: calvingRecord.id,
        animal_id: newCalf.id,
        farm_id: farmId,
        dam_id: calvingEvent.animal_id,
        birth_date: calvingDate, // ✅ Use date-only format (YYYY-MM-DD), not datetime
        gender: calvingEvent.calf_gender, // calf_records.gender maps from calf_gender
        birth_weight: calvingEvent.calf_weight, // calf_records.birth_weight
        health_status: mapHealthStatus(calvingEvent.calf_health_status), // calf_records.health_status
        sire_info: sireInfo, // calf_records.sire_info
        notes: 'Auto-generated from calving event'
      }

      const { error: calfRecError } = await (supabase.from('calf_records') as any)
        .insert(calfRecordData)

      if (calfRecError) {
        console.warn('⚠️ processCalving: Could not create calf record detail (optional):', calfRecError.message)
        // Continue - calf_records is optional detail table
      } else {
        console.log('🐄 processCalving: Created calf record detail')
      }
    } else {
      console.log('🐄 processCalving: Skipping calf record detail (calving_records not available)')
    }

    // 6. UPDATE MOTHER & CLOSE PREGNANCY
    await (supabase.from('animals') as any)
      .update({
        production_status: 'lactating',
        expected_calving_date: null
      })
      .eq('id', calvingEvent.animal_id)

    // Update pregnancy record if it exists (legacy table)
    try {
      await (supabase.from('pregnancy_records') as any)
        .update({
          pregnancy_status: 'completed',
          actual_calving_date: calvingEvent.event_date,
          updated_at: new Date().toISOString()
        })
        .eq('animal_id', calvingEvent.animal_id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      console.log('🐄 processCalving: Updated pregnancy record (legacy table)')
    } catch (error) {
      console.warn('⚠️ processCalving: Could not update pregnancy record (optional):', error)
      // Continue - pregnancy_records is legacy table
    }

    // 7. ✅ NEW: CREATE BREEDING EVENT (For Timeline History)
    // This ensures the calving appears in the breeding_events table used by the timeline
    const breedingEventData = {
      farm_id: farmId,
      animal_id: calvingEvent.animal_id,
      event_type: 'calving',
      event_date: calvingEvent.event_date,
      calving_outcome: calvingEvent.calving_outcome,
      calf_name: calvingEvent.calf_name,
      calf_breed: calvingEvent.calf_breed,
      calf_gender: calvingEvent.calf_gender,
      calf_weight: calvingEvent.calf_weight,
      calf_tag_number: calvingEvent.calf_tag_number,
      calf_health_status: calvingEvent.calf_health_status,
      calf_father_info: calvingEvent.calf_father_info,
      notes: calvingEvent.notes || 'Recorded via Calving Process',
      created_by: calvingEvent.created_by
    }

    const { error: breedingEventError } = await (supabase.from('breeding_events') as any)
      .insert(breedingEventData)

    if (breedingEventError) {
      // Log error but don't fail the whole process since core records are created
      console.error('Warning: Failed to create breeding_event history entry:', breedingEventError)
    }

    return { success: true, data: newCalf }

  } catch (error: any) {
    console.error('❌ Error processing calving:', error)
    return { success: false, error: error.message || 'Unknown error during calving process' }
  }
}


// Create calf from calving event
export async function createCalfFromEvent(calvingEvent: CalvingEvent, farmId: string) {
  if (!calvingEvent.calf_tag_number) {
    return { success: false, error: 'Calf tag number is required' }
  }
  
  const supabase = createClient()
  
  try {
    const calfData = {
      farm_id: farmId,
      tag_number: calvingEvent.calf_tag_number,
      name: `Calf ${calvingEvent.calf_tag_number}`,
      gender: calvingEvent.calf_gender || 'female', // Matches constraint 'male'/'female'
      birth_date: calvingEvent.event_date,
      weight: calvingEvent.calf_weight, // Matches numeric column 'weight'
      status: 'active', // Matches constraint 'active'
      
      // ✅ FIX 1: Match strict constraint ('newborn_calf' or 'purchased_animal')
      animal_source: 'newborn_calf', 
      
      // ✅ FIX 2: Use the correct column name found in your schema (was 'dam_id')
      mother_id: calvingEvent.animal_id,
      
      production_status: 'calf', // Matches constraint 'calf'
      
      // We removed the redundant text about the mother from notes since we are linking the ID now
      notes: `Outcome: ${calvingEvent.calving_outcome}. Health: ${calvingEvent.calf_health_status || 'Good'}. ${calvingEvent.notes || ''}`
    }
    
    // Explicit casting to 'any' allows us to insert fields even if TypeScript types are outdated
    const { data, error } = await (supabase
      .from('animals') as any) 
      .insert(calfData)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase Error creating calf:', JSON.stringify(error, null, 2))
      return { success: false, error: error.message || 'Database error occurred' }
    }
    
    return { success: true, data }
  } catch (err: any) {
    console.error('Unexpected error in createCalfFromEvent:', err)
    return { success: false, error: err.message || 'Unexpected error occurred' }
  }
}

// Get breeding events for an animal
export async function getAnimalBreedingEvents(animalId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('breeding_events')
    .select('*')
    .eq('animal_id', animalId)
    .order('event_date', { ascending: false })
  
  if (error) {
    console.error('Error fetching breeding events:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data || []) as any[]
}

// Get recent breeding events for farm
export async function getRecentBreedingEvents(farmId: string, limit: number = 10) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('breeding_events')
    .select(`
      *,
      animals (tag_number, name)
    `)
    .eq('farm_id', farmId)
    .order('event_date', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching recent breeding events:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data || []) as any[]
}

// NEW FUNCTION: Get animals suitable for breeding (general breeding, not event-specific)
export async function getAnimalsForBreeding(farmId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('animals')
    .select('id, tag_number, name, gender, birth_date, status')
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .eq('gender', 'female') // Only female animals for breeding
    .order('tag_number')
  
  if (error) {
    console.error('Error fetching animals for breeding:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data || []) as any[]
}

// NEW FUNCTION: Get breeding statistics for dashboard
export async function getBreedingStats(farmId: string) {
  const supabase = createClient()
  
  try {
    // Get total breeding events in last 12 months
    const twelveMonthsAgo = subDays(new Date(), 365)
    
    // ✅ FIX: Only select columns that exist in breeding_events
    // pregnancy_result doesn't exist - we'll get that from pregnancy_records
    const { data: allEventsData } = await supabase
      .from('breeding_events')
      .select('event_type, event_date')
      .eq('farm_id', farmId)
      .gte('event_date', twelveMonthsAgo.toISOString())
    
    // FIXED: Cast to any[] to bypass 'never' type error
    const allEvents = (allEventsData || []) as any[]
    
    if (!allEvents.length) return getDefaultBreedingStats()
    
    // Calculate statistics
    const heatDetections = allEvents.filter(e => e.event_type === 'heat_detection').length
    const inseminations = allEvents.filter(e => e.event_type === 'insemination').length
    const pregnancyChecks = allEvents.filter(e => e.event_type === 'pregnancy_check').length
    const calvings = allEvents.filter(e => e.event_type === 'calving').length
    
    // ✅ FIX: Get pregnancy stats from pregnancy_records (has pregnancy_status field)
    const { data: pregnancyRecordsData } = await supabase
      .from('pregnancy_records')
      .select('pregnancy_status')
      .eq('farm_id', farmId)
      .gte('created_at', twelveMonthsAgo.toISOString())
    
    const pregnancyRecords = (pregnancyRecordsData || []) as any[]
    const confirmedPregnancies = pregnancyRecords.filter(p => p.pregnancy_status === 'confirmed' || p.pregnancy_status === 'completed').length
    const pregnancyRate = pregnancyChecks > 0 ? Math.round((confirmedPregnancies / pregnancyChecks) * 100) : 0
    
    // ✅ FIX: Get animals currently pregnant from pregnancy_records
    const { data: currentlyPregnantData } = await supabase
      .from('pregnancy_records')
      .select('animal_id')
      .eq('farm_id', farmId)
      .in('pregnancy_status', ['confirmed', 'completed'])
    
    const currentlyPregnant = currentlyPregnantData ? new Set(currentlyPregnantData.map((p: any) => p.animal_id)).size : 0
    
    // ✅ FIX: Get animals due for calving in next 30 days from pregnancy_records (has expected_calving_date)
    const thirtyDaysFromNow = addDays(new Date(), 30)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: dueAnimalsData } = await supabase
      .from('pregnancy_records')
      .select('animal_id')
      .eq('farm_id', farmId)
      .in('pregnancy_status', ['confirmed', 'completed'])
      .lte('expected_calving_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .gte('expected_calving_date', today.toISOString().split('T')[0])
    
    const dueForCalving = dueAnimalsData ? new Set(dueAnimalsData.map((p: any) => p.animal_id)).size : 0
    
    return {
      totalEvents: allEvents.length,
      heatDetections,
      inseminations,
      pregnancyChecks,
      calvings,
      pregnancyRate,
      currentlyPregnant,
      dueForCalving,
      // Recent trends (last 30 days vs previous 30 days)
      recentTrends: await calculateRecentTrends(farmId)
    }
  } catch (error) {
    console.error('Error getting breeding stats:', error)
    return getDefaultBreedingStats()
  }
}

// NEW FUNCTION: Get breeding calendar events
export async function getBreedingCalendar(farmId: string, startDate: string, endDate: string) {
  const supabase = createClient()
  
  try {
    // Get breeding events in date range
    const { data: eventsData, error } = await supabase
      .from('breeding_events')
      .select(`
        *,
        animals (tag_number, name)
      `)
      .eq('farm_id', farmId)
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_date', { ascending: true })
    
    if (error) {
      console.error('Error fetching calendar events:', error)
      return []
    }
    
    // ✅ FIX: Get upcoming due dates from pregnancy_records (has expected_calving_date)
    // Not from breeding_events (doesn't have estimated_due_date or pregnancy_result)
    const { data: dueDatesData } = await supabase
      .from('pregnancy_records')
      .select(`
        expected_calving_date,
        animal_id,
        animals (tag_number, name)
      `)
      .eq('farm_id', farmId)
      .in('pregnancy_status', ['confirmed', 'completed'])
      .gte('expected_calving_date', startDate)
      .lte('expected_calving_date', endDate)
      .not('expected_calving_date', 'is', null)
    
    // Format events for calendar
    interface CalendarAnimal {
      tag_number?: string
      name?: string | null
    }

    interface BreedingCalendarEvent {
      id: string
      type: 'breeding_event'
      eventType: BreedingEventType
      date: string
      title: string
      animal: CalendarAnimal
      details: any
    }

    interface DueDateCalendarEvent {
      id: string
      type: 'due_date'
      eventType: 'calving_due'
      date: string
      title: string
      animal: CalendarAnimal
      details: any
    }

    type CalendarEvent = BreedingCalendarEvent | DueDateCalendarEvent

    const calendarEvents: CalendarEvent[] = []
    
    // FIXED: Cast to any[] to bypass 'never' type error
    const events = (eventsData || []) as any[]
    const dueDates = (dueDatesData || []) as any[]

    // Add breeding events
    if (events) {
      events.forEach(event => {
        calendarEvents.push({
          id: event.id,
          type: 'breeding_event',
          eventType: event.event_type,
          date: event.event_date,
          title: getEventTitle(event),
          animal: event.animals,
          details: event
        })
      })
    }
    
    // Add due dates
    if (dueDates) {
      dueDates.forEach(due => {
        calendarEvents.push({
          id: `due-${due.animals?.tag_number}-${due.expected_calving_date}`,
          type: 'due_date',
          eventType: 'calving_due',
          date: due.expected_calving_date ?? '',
          title: `${due.animals?.tag_number || 'Animal'} Due for Calving`,
          animal: due.animals,
          details: due
        })
      })
    }
    
    // Sort by date
    return calendarEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
  } catch (error) {
    console.error('Error getting breeding calendar:', error)
    return []
  }
}

// Helper function to get default stats when there's an error
function getDefaultBreedingStats() {
  return {
    totalEvents: 0,
    heatDetections: 0,
    inseminations: 0,
    pregnancyChecks: 0,
    calvings: 0,
    pregnancyRate: 0,
    currentlyPregnant: 0,
    dueForCalving: 0,
    recentTrends: {
      heatDetectionTrend: 0,
      inseminationTrend: 0,
      calvingTrend: 0
    }
  }
}

// Helper function to calculate recent trends
async function calculateRecentTrends(farmId: string) {
  const supabase = createClient()
  
  try {
    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)
    const sixtyDaysAgo = subDays(now, 60)
    
    // Get recent 30 days
    const { data: recentData } = await supabase
      .from('breeding_events')
      .select('event_type')
      .eq('farm_id', farmId)
      .gte('event_date', thirtyDaysAgo.toISOString())
      .lte('event_date', now.toISOString())
    
    // FIXED: Cast to any[]
    const recent = (recentData || []) as any[]

    // Get previous 30 days
    const { data: previousData } = await supabase
      .from('breeding_events')
      .select('event_type')
      .eq('farm_id', farmId)
      .gte('event_date', sixtyDaysAgo.toISOString())
      .lt('event_date', thirtyDaysAgo.toISOString())
    
    // FIXED: Cast to any[]
    const previous = (previousData || []) as any[]
    
    const recentHeat = recent.filter(e => e.event_type === 'heat_detection').length
    const previousHeat = previous.filter(e => e.event_type === 'heat_detection').length
    
    const recentInsemination = recent.filter(e => e.event_type === 'insemination').length
    const previousInsemination = previous.filter(e => e.event_type === 'insemination').length
    
    const recentCalving = recent.filter(e => e.event_type === 'calving').length
    const previousCalving = previous.filter(e => e.event_type === 'calving').length
    
    return {
      heatDetectionTrend: calculateTrendPercentage(recentHeat, previousHeat),
      inseminationTrend: calculateTrendPercentage(recentInsemination, previousInsemination),
      calvingTrend: calculateTrendPercentage(recentCalving, previousCalving)
    }
  } catch (error) {
    console.error('Error calculating trends:', error)
    return {
      heatDetectionTrend: 0,
      inseminationTrend: 0,
      calvingTrend: 0
    }
  }
}

// Helper function to calculate trend percentage
function calculateTrendPercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

// Helper function to get event title for calendar
function getEventTitle(event: any): string {
  const animalName = event.animals?.tag_number || 'Animal'
  
  switch (event.event_type) {
    case 'heat_detection':
      return `${animalName} - Heat Detected`
    case 'insemination':
      return `${animalName} - Inseminated`
    case 'pregnancy_check':
      return `${animalName} - Pregnancy Check (${event.pregnancy_result || 'Unknown'})`
    case 'calving':
      return `${animalName} - Calving (${event.calving_outcome || 'Unknown'})`
    default:
      return `${animalName} - Breeding Event`
  }
}

interface PregnancyData {
  pregnancy_status: 'confirmed' | 'not_pregnant' | 'uncertain'
  confirmation_date: string
  estimated_due_date?: string
  notes?: string
  confirmed_by?: string
  confirmation_method?: 'visual' | 'palpation' | 'ultrasound' | 'blood_test'
  fetus_count?: number
  fetus_age_days?: number
  risk_level?: 'low' | 'medium' | 'high'
}

interface Result {
  success: boolean
  error?: string
  data?: any
}

export async function updatePregnancyStatus(
  breedingRecordId: string,
  animalId: string,
  farmId: string,
  data: PregnancyData
): Promise<Result> {
  const supabase = createClient()

  try {
    // Validate required fields
    if (!data.pregnancy_status || !data.confirmation_date) {
      return {
        success: false,
        error: 'Missing required fields'
      }
    }

    // Validate pregnancy status
    const validStatuses = ['confirmed', 'not_pregnant', 'uncertain']
    if (!validStatuses.includes(data.pregnancy_status)) {
      return {
        success: false,
        error: 'Invalid pregnancy status'
      }
    }

    // Verify service record exists and belongs to farm
    const { data: serviceData, error: serviceError } = await supabase
      .from('service_records')
      .select('id, animal_id')
      .eq('id', breedingRecordId)
      .eq('farm_id', farmId)
      .single()

    // FIXED: Cast to any to access properties
    const service = serviceData as any

    if (serviceError || !service) {
      return {
        success: false,
        error: 'Service record not found or does not belong to farm'
      }
    }

    // Verify animal matches service record
    if (service.animal_id !== animalId) {
      return {
        success: false,
        error: 'Animal ID does not match service record'
      }
    }

    // Map pregnancy_status to valid production_status values from the animals table constraint
    // Valid: 'calf', 'heifer', 'bull', 'served', 'lactating', 'steaming_dry_cows', 'open_culling_dry_cows'
    const productionStatus = data.pregnancy_status === 'confirmed' ? 'steaming_dry_cows'
      : data.pregnancy_status === 'not_pregnant' ? 'open_culling_dry_cows'
      : 'served' // uncertain/suspected → still treated as served

    const { error: animalError } = await (supabase
      .from('animals') as any)
      .update({ production_status: productionStatus })
      .eq('id', animalId)
      .eq('farm_id', farmId)

    if (animalError) {
      console.error('Failed to update animal production_status:', animalError)
    }

    return {
      success: true,
      data: { animal_id: animalId, pregnancy_status: data.pregnancy_status }
    }

  } catch (error) {
    console.error('Error updating pregnancy status:', error)
    return {
      success: false,
      error: 'Internal server error'
    }
  }
}