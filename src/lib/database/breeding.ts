import { createClient } from '@/lib/supabase/client'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { addDays, subDays } from 'date-fns'


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
  calf_gender?: string
  calf_weight?: number
  calf_tag_number?: string
  calf_health_status?: string
}

export type BreedingEvent = HeatDetectionEvent | InseminationEvent | PregnancyCheckEvent | CalvingEvent

// Get eligible animals for each event type
export async function getEligibleAnimals(farmId: string, eventType: BreedingEventType) {
  const supabase = createClient()
  
  let query = supabase
    .from('animals')
    .select('id, tag_number, name, gender, birth_date')
    .eq('farm_id', farmId)
    .eq('status', 'active')
  
  // Filter based on event type
  switch (eventType) {
    case 'heat_detection':
    case 'insemination':
      // Only female animals of breeding age
      query = query.eq('gender', 'female')
      break
    case 'pregnancy_check':
      // Only female animals that have been inseminated
      query = query.eq('gender', 'female')
      break
    case 'calving':
      // Only pregnant females near due date
      query = query.eq('gender', 'female')
      break
  }
  
  const { data, error } = await query.order('tag_number')
  
  if (error) {
    console.error('Error fetching eligible animals:', error)
    return []
  }
  
  return data || []
}

// Get animals eligible for pregnancy check (recently inseminated)
export async function getAnimalsForPregnancyCheck(farmId: string) {
  const supabase = createClient()
  
  // Get animals inseminated in the last 90 days without recent pregnancy check
  const { data, error } = await supabase
    .from('animals')
    .select(`
      id, tag_number, name,
      breeding_events!inner (
        event_type,
        event_date
      )
    `)
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .eq('gender', 'female')
    .eq('breeding_events.event_type', 'insemination')
    .gte('breeding_events.event_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
  
  if (error) {
    console.error('Error fetching animals for pregnancy check:', error)
    return []
  }
  
  return data || []
}

// Get pregnant animals near calving date
export async function getAnimalsForCalving(farmId: string) {
  const supabase = createClient()
  
  // Get pregnant animals within 30 days of due date
  const { data, error } = await supabase
    .from('animals')
    .select(`
      id, tag_number, name,
      breeding_events!inner (
        event_type,
        pregnancy_result,
        estimated_due_date
      )
    `)
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .eq('gender', 'female')
    .eq('breeding_events.event_type', 'pregnancy_check')
    .eq('breeding_events.pregnancy_result', 'pregnant')
    .lte('breeding_events.estimated_due_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
  
  if (error) {
    console.error('Error fetching animals for calving:', error)
    return []
  }
  
  return data || []
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
      return { success: false, error: result.error || 'Failed to create breeding event' }
    }
    
    return { success: true, data: result.event }
  } catch (error) {
    console.error('Error creating breeding event:', error)
    return { success: false, error: 'Network error occurred' }
  }
}


// Create calf from calving event
export async function createCalfFromEvent(calvingEvent: CalvingEvent, farmId: string) {
  if (!calvingEvent.calf_tag_number) {
    return { success: false, error: 'Calf tag number is required' }
  }
  
  const supabase = createClient()
  
  const calfData = {
    farm_id: farmId,
    tag_number: calvingEvent.calf_tag_number,
    name: `Calf ${calvingEvent.calf_tag_number}`,
    gender: calvingEvent.calf_gender || 'female',
    birth_date: calvingEvent.event_date,
    weight: calvingEvent.calf_weight,
    status: 'active',
    notes: `Born from animal ID: ${calvingEvent.animal_id}. Health status: ${calvingEvent.calf_health_status || 'Good'}`,
    animal_source: 'calving' // or another appropriate value if required by your schema
  }
  
  const { data, error } = await supabase
    .from('animals')
    .insert(calfData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating calf:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
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
  
  return data || []
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
  
  return data || []
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
  
  return data || []
}

// NEW FUNCTION: Get breeding statistics for dashboard
export async function getBreedingStats(farmId: string) {
  const supabase = createClient()
  
  try {
    // Get total breeding events in last 12 months
    const twelveMonthsAgo = subDays(new Date(), 365)
    
    const { data: allEvents } = await supabase
      .from('breeding_events')
      .select('event_type, event_date, pregnancy_result')
      .eq('farm_id', farmId)
      .gte('event_date', twelveMonthsAgo.toISOString())
    
    if (!allEvents) return getDefaultBreedingStats()
    
    // Calculate statistics
    const heatDetections = allEvents.filter(e => e.event_type === 'heat_detection').length
    const inseminations = allEvents.filter(e => e.event_type === 'insemination').length
    const pregnancyChecks = allEvents.filter(e => e.event_type === 'pregnancy_check').length
    const calvings = allEvents.filter(e => e.event_type === 'calving').length
    
    // Calculate pregnancy rate
    const pregnantResults = allEvents.filter(e => 
      e.event_type === 'pregnancy_check' && e.pregnancy_result === 'pregnant'
    ).length
    const pregnancyRate = pregnancyChecks > 0 ? Math.round((pregnantResults / pregnancyChecks) * 100) : 0
    
    // Get animals currently pregnant
    const { data: pregnantAnimals } = await supabase
      .from('breeding_events')
      .select('animal_id')
      .eq('farm_id', farmId)
      .eq('event_type', 'pregnancy_check')
      .eq('pregnancy_result', 'pregnant')
      .order('event_date', { ascending: false })
    
    const currentlyPregnant = pregnantAnimals ? new Set(pregnantAnimals.map(a => a.animal_id)).size : 0
    
    // Get animals due for calving in next 30 days
    const thirtyDaysFromNow = addDays(new Date(), 30)
    const { data: dueAnimals } = await supabase
      .from('breeding_events')
      .select('animal_id')
      .eq('farm_id', farmId)
      .eq('event_type', 'pregnancy_check')
      .eq('pregnancy_result', 'pregnant')
      .lte('estimated_due_date', thirtyDaysFromNow.toISOString())
      .gte('estimated_due_date', new Date().toISOString())
    
    const dueForCalving = dueAnimals ? new Set(dueAnimals.map(a => a.animal_id)).size : 0
    
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
    const { data: events, error } = await supabase
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
    
    // Also get upcoming due dates
    const { data: dueDates } = await supabase
      .from('breeding_events')
      .select(`
        estimated_due_date,
        animals (tag_number, name)
      `)
      .eq('farm_id', farmId)
      .eq('event_type', 'pregnancy_check')
      .eq('pregnancy_result', 'pregnant')
      .gte('estimated_due_date', startDate)
      .lte('estimated_due_date', endDate)
      .not('estimated_due_date', 'is', null)
    
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
          id: `due-${due.animals?.tag_number}-${due.estimated_due_date}`,
          type: 'due_date',
          eventType: 'calving_due',
          date: due.estimated_due_date ?? '',
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
    const { data: recent } = await supabase
      .from('breeding_events')
      .select('event_type')
      .eq('farm_id', farmId)
      .gte('event_date', thirtyDaysAgo.toISOString())
      .lte('event_date', now.toISOString())
    
    // Get previous 30 days
    const { data: previous } = await supabase
      .from('breeding_events')
      .select('event_type')
      .eq('farm_id', farmId)
      .gte('event_date', sixtyDaysAgo.toISOString())
      .lt('event_date', thirtyDaysAgo.toISOString())
    
    const recentHeat = recent?.filter(e => e.event_type === 'heat_detection').length || 0
    const previousHeat = previous?.filter(e => e.event_type === 'heat_detection').length || 0
    
    const recentInsemination = recent?.filter(e => e.event_type === 'insemination').length || 0
    const previousInsemination = previous?.filter(e => e.event_type === 'insemination').length || 0
    
    const recentCalving = recent?.filter(e => e.event_type === 'calving').length || 0
    const previousCalving = previous?.filter(e => e.event_type === 'calving').length || 0
    
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

export interface Result {
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
  const supabase = await createServerSupabaseClient()

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

    // Verify breeding record exists and belongs to farm
    const { data: breeding, error: breedingError } = await supabase
      .from('breeding_records')
      .select('id, animal_id')
      .eq('id', breedingRecordId)
      .eq('farm_id', farmId)
      .single()

    if (breedingError || !breeding) {
      return {
        success: false,
        error: 'Breeding record not found or does not belong to farm'
      }
    }

    // Verify animal matches breeding record
    if (breeding.animal_id !== animalId) {
      return {
        success: false,
        error: 'Animal ID does not match breeding record'
      }
    }

    // Start a transaction to update both breeding record and animal
    const { data: pregnancy, error: updateError } = await supabase
      .from('breeding_records')
      .update({
        pregnancy_status: data.pregnancy_status,
        pregnancy_confirmation_date: data.confirmation_date,
        estimated_due_date: data.estimated_due_date,
        pregnancy_notes: data.notes,
        confirmed_by: data.confirmed_by,
        confirmation_method: data.confirmation_method,
        fetus_count: data.fetus_count,
        fetus_age_days: data.fetus_age_days,
        pregnancy_risk_level: data.risk_level,
        breeding_status: data.pregnancy_status === 'confirmed' ? 'successful' : 
                        data.pregnancy_status === 'not_pregnant' ? 'failed' : 
                        'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', breedingRecordId)
      .select()
      .single()

    if (updateError) {
      return {
        success: false,
        error: 'Failed to update pregnancy status'
      }
    }

    // Update animal status based on pregnancy status
    const animalStatus = data.pregnancy_status === 'confirmed' ? 'pregnant' :
                        data.pregnancy_status === 'not_pregnant' ? 'open' :
                        'bred'

    const { error: animalError } = await supabase
      .from('animals')
      .update({ 
        status: animalStatus,
        pregnancy_status: data.pregnancy_status,
        estimated_due_date: data.estimated_due_date,
        last_pregnancy_check: data.confirmation_date
      })
      .eq('id', animalId)
      .eq('farm_id', farmId)

    if (animalError) {
      console.error('Failed to update animal status:', animalError)
      // Don't return error as pregnancy status was updated successfully
    }

    return {
      success: true,
      data: pregnancy
    }

  } catch (error) {
    console.error('Error updating pregnancy status:', error)
    return {
      success: false,
      error: 'Internal server error'
    }
  }
}