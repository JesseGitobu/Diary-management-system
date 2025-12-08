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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
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

    // FIXED: Cast to any[] to fix 'never' type error
    const allEvents = (allEventsData || []) as any[]
    
    console.log('Total breeding events found:', allEvents.length)
    
    // Get recent events (last 30 days)
    const recentEvents = allEvents.filter(event => 
      new Date(event.event_date) >= thirtyDaysAgo
    )
    
    console.log('Recent events (last 30 days):', recentEvents.length)
    
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
    
    console.log('Event counts:', {
      heat: heatDetections.length,
      insemination: inseminations.length,
      pregnancy: pregnancyChecks.length,
      calving: calvings.length
    })
    
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
      heatDetected: recentHeatDetections, // Heat detections in last 30 days
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
    
    console.log('Final breeding stats:', stats)
    return stats
    
  } catch (error) {
    console.error('Error calculating breeding stats:', error)
    return getDefaultBreedingStats()
  }
}

// Get currently pregnant animals
async function getCurrentlyPregnantAnimals(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  // Get the latest pregnancy check for each animal
  const { data: latestChecksData } = await supabase
    .from('breeding_events')
    .select('animal_id, pregnancy_result, event_date')
    .eq('farm_id', farmId)
    .eq('event_type', 'pregnancy_check')
    .order('event_date', { ascending: false })
  
  if (!latestChecksData) return []

  // FIXED: Cast to any[]
  const latestChecks = latestChecksData as any[]
  
  // Group by animal and get the most recent result
  const animalLatestResults = new Map()
  
  latestChecks.forEach(check => {
    if (!animalLatestResults.has(check.animal_id)) {
      animalLatestResults.set(check.animal_id, check)
    }
  })
  
  // Filter for pregnant animals
  return Array.from(animalLatestResults.values())
    .filter(check => check.pregnancy_result === 'pregnant')
}

// Get expected calvings this month
async function getExpectedCalvingsThisMonth(farmId: string) {
  const supabase = await createServerSupabaseClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  const { data: dueDates } = await supabase
    .from('breeding_events')
    .select('animal_id, estimated_due_date')
    .eq('farm_id', farmId)
    .eq('event_type', 'pregnancy_check')
    .eq('pregnancy_result', 'pregnant')
    .gte('estimated_due_date', startOfMonth.toISOString().split('T')[0])
    .lte('estimated_due_date', endOfMonth.toISOString().split('T')[0])
    .not('estimated_due_date', 'is', null)
  
  return (dueDates || []) as any[]
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
    const { data: dueSoonData } = await supabase
      .from('breeding_events')
      .select(`
        animal_id,
        estimated_due_date,
        animals (tag_number, name)
      `)
      .eq('farm_id', farmId)
      .eq('event_type', 'pregnancy_check')
      .eq('pregnancy_result', 'pregnant')
      .not('estimated_due_date', 'is', null)
      .lte('estimated_due_date', addDays(new Date(), 14).toISOString().split('T')[0])
      .gte('estimated_due_date', new Date().toISOString().split('T')[0])
    
    // FIXED: Cast to any[]
    const dueSoon = (dueSoonData || []) as any[]

    dueSoon.forEach(animal => {
      if (animal.estimated_due_date) {
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
    
    // FIXED: Cast to any[]
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