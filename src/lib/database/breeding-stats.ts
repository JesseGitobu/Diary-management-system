import { createClient } from '@/lib/supabase/client'

export interface BreedingStats {
  totalBreedings: number
  currentPregnant: number
  expectedCalvingsThisMonth: number
  conceptionRate: number
}

export interface UpcomingEvent {
  id: string
  animal_id: string
  animal_tag: string
  animal_name?: string
  event_type: 'heat_detection' | 'pregnancy_check' | 'calving'
  scheduled_date: string
  status: 'scheduled' | 'overdue' | 'completed'
  priority: 'high' | 'medium' | 'low'
}

export interface BreedingAlert {
  id: string
  type: 'calving_due' | 'pregnancy_check_due' | 'low_conception_rate' | 'overdue_breeding'
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  animal_id?: string
  count?: number
}

// Get comprehensive breeding statistics for a farm
export async function getBreedingStats(farmId: string): Promise<BreedingStats> {
  const supabase = createClient()
  
  try {
    // Get total breedings (insemination events)
    const { count: totalBreedings } = await supabase
      .from('breeding_events')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('event_type', 'insemination')
    
    // Get currently pregnant animals
    const { data: pregnantAnimals } = await supabase
      .from('breeding_events')
      .select('animal_id')
      .eq('farm_id', farmId)
      .eq('event_type', 'pregnancy_check')
      .eq('pregnancy_result', 'pregnant')
    
    // Remove duplicates (animals with multiple pregnancy checks)
    const uniquePregnantAnimals = new Set(pregnantAnimals?.map(p => p.animal_id) || [])
    const currentPregnant = uniquePregnantAnimals.size
    
    // Get expected calvings this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const endOfMonth = new Date(startOfMonth)
    endOfMonth.setMonth(endOfMonth.getMonth() + 1)
    
    const { count: expectedCalvingsThisMonth } = await supabase
      .from('breeding_events')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('event_type', 'pregnancy_check')
      .eq('pregnancy_result', 'pregnant')
      .gte('estimated_due_date', startOfMonth.toISOString())
      .lt('estimated_due_date', endOfMonth.toISOString())
    
    // Calculate conception rate
    const conceptionRate = await calculateConceptionRate(farmId)
    
    return {
      totalBreedings: totalBreedings || 0,
      currentPregnant,
      expectedCalvingsThisMonth: expectedCalvingsThisMonth || 0,
      conceptionRate
    }
  } catch (error) {
    console.error('Error fetching breeding stats:', error)
    return {
      totalBreedings: 0,
      currentPregnant: 0,
      expectedCalvingsThisMonth: 0,
      conceptionRate: 0
    }
  }
}

// Calculate conception rate based on inseminations vs successful pregnancies
async function calculateConceptionRate(farmId: string): Promise<number> {
  const supabase = createClient()
  
  try {
    // Get all inseminations from the last 12 months
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    
    const { data: inseminations } = await supabase
      .from('breeding_events')
      .select('animal_id, event_date')
      .eq('farm_id', farmId)
      .eq('event_type', 'insemination')
      .gte('event_date', twelveMonthsAgo.toISOString().split('T')[0])
    
    if (!inseminations || inseminations.length === 0) {
      return 0
    }
    
    // Get pregnancy confirmations for the same period
    const { data: pregnancies } = await supabase
      .from('breeding_events')
      .select('animal_id, event_date')
      .eq('farm_id', farmId)
      .eq('event_type', 'pregnancy_check')
      .eq('pregnancy_result', 'pregnant')
      .gte('event_date', twelveMonthsAgo.toISOString().split('T')[0])
    
    if (!pregnancies || pregnancies.length === 0) {
      return 0
    }
    
    // Calculate conception rate
    const conceptionRate = (pregnancies.length / inseminations.length) * 100
    return Math.round(conceptionRate)
  } catch (error) {
    console.error('Error calculating conception rate:', error)
    return 0
  }
}

// Get upcoming breeding events for the next 30 days
export async function getUpcomingBreedingEvents(farmId: string): Promise<UpcomingEvent[]> {
  const supabase = createClient()
  const events: UpcomingEvent[] = []
  
  try {
    const today = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)
    
    // Get animals due for pregnancy checks (30-45 days after insemination)
    const { data: recentInseminations } = await supabase
      .from('breeding_events')
      .select(`
        animal_id,
        event_date,
        animals (id, tag_number, name)
      `)
      .eq('farm_id', farmId)
      .eq('event_type', 'insemination')
      .gte('event_date', new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .lte('event_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    
    // Add pregnancy check events
    recentInseminations?.forEach(insemination => {
      const pregnancyCheckDate = new Date(insemination.event_date)
      pregnancyCheckDate.setDate(pregnancyCheckDate.getDate() + 35) // 35 days after insemination
      
      if (pregnancyCheckDate <= thirtyDaysFromNow) {
        events.push({
          id: `pregnancy_check_${insemination.animal_id}`,
          animal_id: insemination.animal_id,
          animal_tag: insemination.animals.tag_number,
          animal_name: insemination.animals.name ?? undefined,
          event_type: 'pregnancy_check',
          scheduled_date: pregnancyCheckDate.toISOString().split('T')[0],
          status: pregnancyCheckDate < today ? 'overdue' : 'scheduled',
          priority: pregnancyCheckDate < today ? 'high' : 'medium'
        })
      }
    })
    
    // Get animals due for calving
    const { data: pregnantAnimals } = await supabase
      .from('breeding_events')
      .select(`
        animal_id,
        estimated_due_date,
        animals (id, tag_number, name)
      `)
      .eq('farm_id', farmId)
      .eq('event_type', 'pregnancy_check')
      .eq('pregnancy_result', 'pregnant')
      .not('estimated_due_date', 'is', null)
      .lte('estimated_due_date', thirtyDaysFromNow.toISOString().split('T')[0])
    
    // Add calving events
    pregnantAnimals?.forEach(pregnancy => {
      if (pregnancy.estimated_due_date) {
        const calvingDate = new Date(pregnancy.estimated_due_date)
        
        events.push({
          id: `calving_${pregnancy.animal_id}`,
          animal_id: pregnancy.animal_id,
          animal_tag: pregnancy.animals.tag_number,
          animal_name: pregnancy.animals.name ?? undefined,
          event_type: 'calving',
          scheduled_date: pregnancy.estimated_due_date,
          status: calvingDate < today ? 'overdue' : 'scheduled',
          priority: calvingDate < today ? 'high' : calvingDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'high' : 'medium'
        })
      }
    })
    
    // Sort by date and priority
    return events.sort((a, b) => {
      const dateA = new Date(a.scheduled_date)
      const dateB = new Date(b.scheduled_date)
      
      // Overdue events first
      if (a.status === 'overdue' && b.status !== 'overdue') return -1
      if (b.status === 'overdue' && a.status !== 'overdue') return 1
      
      // Then by date
      return dateA.getTime() - dateB.getTime()
    })
  } catch (error) {
    console.error('Error fetching upcoming events:', error)
    return []
  }
}

// Generate breeding alerts based on current farm status
export async function getBreedingAlerts(farmId: string): Promise<BreedingAlert[]> {
  const supabase = createClient()
  const alerts: BreedingAlert[] = []
  
  try {
    const stats = await getBreedingStats(farmId)
    const upcomingEvents = await getUpcomingBreedingEvents(farmId)
    
    // Alert for expected calvings this month
    if (stats.expectedCalvingsThisMonth > 0) {
      alerts.push({
        id: 'calvings_this_month',
        type: 'calving_due',
        title: 'Calvings Expected This Month',
        message: `${stats.expectedCalvingsThisMonth} animals are due to calve this month`,
        severity: 'info',
        count: stats.expectedCalvingsThisMonth
      })
    }
    
    // Alert for low conception rate
    if (stats.conceptionRate < 50 && stats.totalBreedings > 5) {
      alerts.push({
        id: 'low_conception_rate',
        type: 'low_conception_rate',
        title: 'Low Conception Rate',
        message: `Current conception rate is ${stats.conceptionRate}%. Consider reviewing breeding practices.`,
        severity: stats.conceptionRate < 30 ? 'critical' : 'warning'
      })
    }
    
    // Alert for overdue events
    const overdueEvents = upcomingEvents.filter(event => event.status === 'overdue')
    if (overdueEvents.length > 0) {
      alerts.push({
        id: 'overdue_events',
        type: 'overdue_breeding',
        title: 'Overdue Breeding Events',
        message: `${overdueEvents.length} breeding events are overdue`,
        severity: 'warning',
        count: overdueEvents.length
      })
    }
    
    // Alert for animals needing pregnancy checks
    const pregnancyChecks = upcomingEvents.filter(event => 
      event.event_type === 'pregnancy_check' && 
      new Date(event.scheduled_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    )
    if (pregnancyChecks.length > 0) {
      alerts.push({
        id: 'pregnancy_checks_due',
        type: 'pregnancy_check_due',
        title: 'Pregnancy Checks Due',
        message: `${pregnancyChecks.length} animals need pregnancy checks within 7 days`,
        severity: 'info',
        count: pregnancyChecks.length
      })
    }
    
    return alerts
  } catch (error) {
    console.error('Error generating breeding alerts:', error)
    return []
  }
}

// Get breeding performance trends
export async function getBreedingTrends(farmId: string, months: number = 12) {
  const supabase = createClient()
  
  try {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)
    
    const { data: events } = await supabase
      .from('breeding_events')
      .select('event_type, event_date, pregnancy_result')
      .eq('farm_id', farmId)
      .gte('event_date', startDate.toISOString().split('T')[0])
      .order('event_date')
    
    if (!events) return []
    
    // Group by month
    const monthlyData = events.reduce((acc, event) => {
      const month = event.event_date.substring(0, 7) // YYYY-MM
      if (!acc[month]) {
        acc[month] = {
          month,
          inseminations: 0,
          pregnancies: 0,
          calvings: 0
        }
      }
      
      if (event.event_type === 'insemination') {
        acc[month].inseminations++
      } else if (event.event_type === 'pregnancy_check' && event.pregnancy_result === 'pregnant') {
        acc[month].pregnancies++
      } else if (event.event_type === 'calving') {
        acc[month].calvings++
      }
      
      return acc
    }, {} as Record<string, any>)
    
    return Object.values(monthlyData)
  } catch (error) {
    console.error('Error fetching breeding trends:', error)
    return []
  }
}