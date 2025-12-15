// src/lib/database/breeding-stats.ts
import { createClient } from '@/lib/supabase/client'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { subDays, addDays } from 'date-fns'

export interface BreedingStats {
  totalBreedings: number
  heatDetected: number
  currentPregnant: number
  expectedCalvingsThisMonth: number
  conceptionRate: number
  // Additional detailed stats
  totalInseminations: number
  totalPregnancyChecks: number
  totalCalvings: number
  recentHeatDetections: number
  trends: {
    heatDetectionTrend: number
    inseminationTrend: number
    pregnancyTrend: number
  }
}

export interface BreedingAlert {
  id: string
   type: 'calving_due' | 'pregnancy_check_due' | 'heat_detected' | 'breeding_due' | 'low_conception_rate' | 'overdue_breeding'
  animal_id: string
  animal_tag: string
  animal_name?: string
  count?: number
  message: string
  due_date: string
  priority: 'high' | 'medium' | 'low'
  severity: 'critical' | 'warning' | 'info' | 'default'
  days_remaining: number
}

// SERVER-SIDE: Get comprehensive breeding statistics
export async function getBreedingStats(farmId: string): Promise<BreedingStats> {
  const supabase = await createServerSupabaseClient()
  
  try {
    console.log('Calculating breeding stats for farm:', farmId)
    
    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)
    const sixtyDaysAgo = subDays(now, 60)
    
    // Get ALL breeding events for this farm
    const { data: allEventsData, error: eventsError } = await supabase
      .from('breeding_events')
      .select('*')
      .eq('farm_id', farmId)
      .order('event_date', { ascending: false })
    
    if (eventsError) {
      console.error('Error fetching breeding events:', eventsError)
      return getDefaultBreedingStats()
    }

    const allEvents = (allEventsData || []) as any[]
    
    // Get recent events (last 30 days)
    const recentEvents = allEvents.filter(event => 
      new Date(event.event_date) >= thirtyDaysAgo
    )
    
    // Get previous period events (30-60 days ago) for trends
    const previousEvents = allEvents.filter(event => {
      const eventDate = new Date(event.event_date)
      return eventDate >= sixtyDaysAgo && eventDate < thirtyDaysAgo
    })
    
    // Calculate basic counts
    const heatDetections = allEvents.filter(e => e.event_type === 'heat_detection')
    const inseminations = allEvents.filter(e => e.event_type === 'insemination')
    const pregnancyChecks = allEvents.filter(e => e.event_type === 'pregnancy_check')
    const calvings = allEvents.filter(e => e.event_type === 'calving')
    
    // Calculate recent heat detections (last 30 days)
    const recentHeatDetections = recentEvents.filter(e => e.event_type === 'heat_detection').length
    
    // Get currently pregnant animals (latest pregnancy check result per animal)
    const pregnantAnimals = await getCurrentlyPregnantAnimals(farmId)
    
    // Get animals due for calving this month
    const expectedCalvings = await getExpectedCalvingsThisMonth(farmId)
    
    // Calculate conception rate
    const positivePregnancyChecks = pregnancyChecks.filter(p => p.pregnancy_result === 'pregnant').length
    const conceptionRate = pregnancyChecks.length > 0 
      ? Math.round((positivePregnancyChecks / pregnancyChecks.length) * 100) 
      : 0
    
    // Calculate trends
    const currentHeat = recentEvents.filter(e => e.event_type === 'heat_detection').length
    const previousHeat = previousEvents.filter(e => e.event_type === 'heat_detection').length
    
    const currentInsemination = recentEvents.filter(e => e.event_type === 'insemination').length
    const previousInsemination = previousEvents.filter(e => e.event_type === 'insemination').length
    
    const currentPregnancy = recentEvents.filter(e => e.event_type === 'pregnancy_check' && e.pregnancy_result === 'pregnant').length
    const previousPregnancy = previousEvents.filter(e => e.event_type === 'pregnancy_check' && e.pregnancy_result === 'pregnant').length
    
    const stats: BreedingStats = {
      totalBreedings: inseminations.length,
      heatDetected: recentHeatDetections, 
      currentPregnant: pregnantAnimals.length,
      expectedCalvingsThisMonth: expectedCalvings.length,
      conceptionRate,
      totalInseminations: inseminations.length,
      totalPregnancyChecks: pregnancyChecks.length,
      totalCalvings: calvings.length,
      recentHeatDetections,
      trends: {
        heatDetectionTrend: calculateTrendPercentage(currentHeat, previousHeat),
        inseminationTrend: calculateTrendPercentage(currentInsemination, previousInsemination),
        pregnancyTrend: calculateTrendPercentage(currentPregnancy, previousPregnancy)
      }
    }
    
    return stats
    
  } catch (error) {
    console.error('Error calculating breeding stats:', error)
    return getDefaultBreedingStats()
  }
}

// ✅ UPDATED: Get currently pregnant animals (Excluding those who have calved since)
async function getCurrentlyPregnantAnimals(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  // 1. Get all relevant events for the farm (Pregnancy Checks AND Calvings)
  const { data: eventsData } = await supabase
    .from('breeding_events')
    .select('animal_id, event_type, pregnancy_result, event_date')
    .eq('farm_id', farmId)
    .in('event_type', ['pregnancy_check', 'calving']) // Fetch both types
    .order('event_date', { ascending: false }) // Newest first
  
  if (!eventsData) return []

  const events = eventsData as any[]
  
  // 2. Group by animal to find their LATEST status
  const animalStatus = new Map<string, any>()
  
  events.forEach(event => {
    // Since we ordered by date desc, the first time we see an animal ID, that's its latest event
    if (!animalStatus.has(event.animal_id)) {
      animalStatus.set(event.animal_id, event)
    }
  })
  
  // 3. Filter: Only count animals whose LATEST event is a 'pregnant' confirmation
  // If the latest event is 'calving', they are no longer pregnant.
  return Array.from(animalStatus.values())
    .filter(event => 
      event.event_type === 'pregnancy_check' && 
      event.pregnancy_result === 'pregnant'
    )
}

// ✅ UPDATED: Get expected calvings this month (Excluding those who already calved)
async function getExpectedCalvingsThisMonth(farmId: string) {
  const supabase = await createServerSupabaseClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  // 1. Get animals theoretically due this month
  const { data: dueData } = await supabase
    .from('breeding_events')
    .select('animal_id, estimated_due_date, event_date')
    .eq('farm_id', farmId)
    .eq('event_type', 'pregnancy_check')
    .eq('pregnancy_result', 'pregnant')
    .gte('estimated_due_date', startOfMonth.toISOString().split('T')[0])
    .lte('estimated_due_date', endOfMonth.toISOString().split('T')[0])
    .not('estimated_due_date', 'is', null)
  
  const potentiallyDue = (dueData || []) as any[]
  
  if (potentiallyDue.length === 0) return []

  // 2. Check if any of these animals have actually calved AFTER their pregnancy check date
  const animalIds = potentiallyDue.map(a => a.animal_id)
  
  const { data: calvingData } = await supabase
    .from('breeding_events')
    .select('animal_id, event_date')
    .eq('farm_id', farmId)
    .eq('event_type', 'calving')
    .in('animal_id', animalIds)
  
  const recentCalvings = (calvingData || []) as any[]

  // 3. Filter out animals that have a calving record AFTER the pregnancy check record
  return potentiallyDue.filter(dueAnimal => {
    const pregCheckDate = new Date(dueAnimal.event_date).getTime()
    
    // Find if this animal has a calving record
    const calvingRecord = recentCalvings.find(c => c.animal_id === dueAnimal.animal_id)
    
    if (calvingRecord) {
      const calvingDate = new Date(calvingRecord.event_date).getTime()
      // If they calved AFTER the pregnancy confirmation, remove them from "Expected" list
      if (calvingDate > pregCheckDate) {
        return false 
      }
    }
    return true
  })
}

// Get upcoming breeding events
export async function getUpcomingBreedingEvents(farmId: string) {
  const supabase = await createServerSupabaseClient()

  const today = new Date()
  const sevenDaysFromNow = addDays(today, 7)
  
  // Get recent breeding events that might need follow-up
  const { data: eventsData } = await supabase
    .from('breeding_events')
    .select(`
      *,
      animals (tag_number, name)
    `)
    .eq('farm_id', farmId)
    .gte('event_date', today.toISOString().split('T')[0])
    .lte('event_date', sevenDaysFromNow.toISOString().split('T')[0])
    .order('event_date', { ascending: true })
  
  // FIXED: Cast to any[]
  const events = (eventsData || []) as any[]
  
  return events.map(event => ({
    id: event.id,
    event_type: event.event_type,
    scheduled_date: event.event_date,
    status: 'scheduled',
    animal_tag: event.animals?.tag_number,
    animal_name: event.animals?.name
  }))
}

// Get breeding alerts
export async function getBreedingAlerts(farmId: string): Promise<BreedingAlert[]> {
  const supabase = await createServerSupabaseClient()
  const alerts: BreedingAlert[] = []
  
  try {
    // Alert 1: Animals due for calving soon
    // ✅ Updated to exclude already calved animals
    const pregnantAnimals = await getCurrentlyPregnantAnimals(farmId)
    const pregnantIds = pregnantAnimals.map(p => p.animal_id)

    if (pregnantIds.length > 0) {
      const { data: dueSoonData } = await supabase
        .from('breeding_events')
        .select(`
          animal_id,
          estimated_due_date,
          animals (tag_number, name)
        `)
        .eq('farm_id', farmId)
        .in('animal_id', pregnantIds) // Only check currently pregnant
        .eq('event_type', 'pregnancy_check') 
        .eq('pregnancy_result', 'pregnant')
        .not('estimated_due_date', 'is', null)
        .lte('estimated_due_date', addDays(new Date(), 14).toISOString().split('T')[0])
        .gte('estimated_due_date', new Date().toISOString().split('T')[0])
        // Sort by newest check to handle duplicates, logic below filters duplicates
        .order('event_date', { ascending: false }) 
      
      const dueSoon = (dueSoonData || []) as any[]
      const processedAnimals = new Set()

      dueSoon.forEach(animal => {
        if (!processedAnimals.has(animal.animal_id) && animal.estimated_due_date) {
          processedAnimals.add(animal.animal_id)
          
          const daysRemaining = Math.ceil(
            (new Date(animal.estimated_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
          
          alerts.push({
            id: `calving-${animal.animal_id}`,
            type: 'calving_due',
            animal_id: animal.animal_id,
            animal_tag: animal.animals.tag_number,
            animal_name: animal.animals.name ?? undefined,
            message: `Due for calving in ${daysRemaining} days`,
            due_date: animal.estimated_due_date,
            priority: daysRemaining <= 3 ? 'high' : daysRemaining <= 7 ? 'medium' : 'low',
            severity: daysRemaining <= 3 ? 'critical' : daysRemaining <= 7 ? 'warning' : 'info',
            days_remaining: daysRemaining
          })
        }
      })
    }
    
    // Alert 2: Animals needing pregnancy checks
    const { data: needingCheckData } = await supabase
      .from('breeding_events')
      .select(`
        animal_id,
        event_date,
        animals (tag_number, name)
      `)
      .eq('farm_id', farmId)
      .eq('event_type', 'insemination')
      .lte('event_date', subDays(new Date(), 30).toISOString().split('T')[0])
      .gte('event_date', subDays(new Date(), 60).toISOString().split('T')[0])
    
    const needingCheck = (needingCheckData || []) as any[]

    // Filter animals that haven't had pregnancy check
    for (const insemination of needingCheck) {
      const { data: hasCheckData } = await supabase
        .from('breeding_events')
        .select('id')
        .eq('animal_id', insemination.animal_id)
        .eq('event_type', 'pregnancy_check')
        .gte('event_date', insemination.event_date)
        .limit(1)
      
      const hasCheck = hasCheckData as any[]

      if (!hasCheck || hasCheck.length === 0) {
        const daysSinceInsemination = Math.ceil(
          (new Date().getTime() - new Date(insemination.event_date).getTime()) / (1000 * 60 * 60 * 24)
        )
        
        alerts.push({
          id: `pregnancy-check-${insemination.animal_id}`,
          type: 'pregnancy_check_due',
          animal_id: insemination.animal_id,
          animal_tag: insemination.animals.tag_number,
          animal_name: insemination.animals.name ?? undefined,
          message: `Pregnancy check needed (${daysSinceInsemination} days since insemination)`,
          due_date: addDays(new Date(insemination.event_date), 35).toISOString().split('T')[0],
          priority: daysSinceInsemination >= 45 ? 'high' : daysSinceInsemination >= 35 ? 'medium' : 'low',
          severity: daysSinceInsemination >= 45 ? 'critical' : daysSinceInsemination >= 35 ? 'warning' : 'info',
          days_remaining: Math.max(0, 45 - daysSinceInsemination)
        })
      }
    }
    
  } catch (error) {
    console.error('Error getting breeding alerts:', error)
  }
  
  return alerts.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })
}

// Helper functions
function getDefaultBreedingStats(): BreedingStats {
  return {
    totalBreedings: 0,
    heatDetected: 0,
    currentPregnant: 0,
    expectedCalvingsThisMonth: 0,
    conceptionRate: 0,
    totalInseminations: 0,
    totalPregnancyChecks: 0,
    totalCalvings: 0,
    recentHeatDetections: 0,
    trends: {
      heatDetectionTrend: 0,
      inseminationTrend: 0,
      pregnancyTrend: 0
    }
  }
}

function calculateTrendPercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}