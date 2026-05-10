import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface CalfFeedingSession {
  sessionNumber: number
  timeRange: string
  milkPerCalf: number
}

export interface CalfFeedingRequirement {
  calfId: string
  tagNumber: string
  name: string
  ageInDays: number
  feedingSessions: CalfFeedingSession[]
  dailyMilkPerCalf: number
}

export interface CalfFeedingSummary {
  date: string
  totalCalves: number
  calves: CalfFeedingRequirement[]
  sessionBreakdown: {
    sessionNumber: number
    totalMilkRequired: number
    calfCount: number
  }[]
  totalDailyMilk: number
}

/**
 * Calculate calf feeding requirements for a given day
 * Links animals (production_status = 'calf') with calf_management_settings
 * to determine daily milk and feeding session requirements
 */
export async function getCalfFeedingRequirements(
  farmId: string,
  date?: string
): Promise<CalfFeedingSummary | null> {
  const supabase = await createServerSupabaseClient()
  
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  try {
    // Get all calves on the farm
    const { data: calves, error: calvesError } = await supabase
      .from('animals')
      .select('id, tag_number, name, birth_date, production_status')
      .eq('farm_id', farmId)
      .eq('production_status', 'calf')
      .eq('status', 'active')
      .order('tag_number', { ascending: true })
    
    if (calvesError) throw calvesError
    if (!calves || calves.length === 0) {
      return {
        date: targetDate,
        totalCalves: 0,
        calves: [],
        sessionBreakdown: [],
        totalDailyMilk: 0
      }
    }
    
    // Get calf management settings for the farm
    const { data: calfSettings, error: settingsError } = await supabase
      .from('calf_management_settings')
      .select('id, weaning_age')
      .eq('farm_id', farmId)
      .single()
    
    if (settingsError && settingsError.code !== 'PGRST116') throw settingsError
    
    if (!calfSettings) {
      return {
        date: targetDate,
        totalCalves: calves.length,
        calves: [],
        sessionBreakdown: [],
        totalDailyMilk: 0
      }
    }
    
    // Get milk adjustment schedule for this farm's settings
    const { data: milkSchedule, error: scheduleError } = await supabase
      .from('calf_milk_adjustment_schedule')
      .select('period_num, start_day, end_day, daily_milk, feedings_per_day')
      .eq('settings_id', calfSettings.id)
      .order('period_num', { ascending: true })
    
    if (scheduleError) throw scheduleError
    
    if (!milkSchedule || milkSchedule.length === 0) {
      return {
        date: targetDate,
        totalCalves: calves.length,
        calves: [],
        sessionBreakdown: [],
        totalDailyMilk: 0
      }
    }
    
    const targetDateObj = new Date(targetDate)
    const calfFeedingRequirements: CalfFeedingRequirement[] = []
    const sessionTotals: Record<number, { totalMilk: number; count: number }> = {}
    let totalDailyMilk = 0
    
    // Process each calf
    for (const calf of calves) {
      if (!calf.birth_date) continue
      
      // Calculate calf age in days
      const birthDate = new Date(calf.birth_date)
      const ageInDays = Math.floor(
        (targetDateObj.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      // Skip if calf is beyond weaning age
      if (ageInDays > (calfSettings.weaning_age || 56)) continue
      
      // Find current period based on age
      const currentPeriod = milkSchedule.find(
        (period: any) =>
          ageInDays >= period.start_day &&
          ageInDays <= period.end_day
      )
      
      if (!currentPeriod) continue
      
      const dailyMilk = currentPeriod.daily_milk || 0
      const feedingsPerDay = currentPeriod.feedings_per_day || 1
      const milkPerSession = dailyMilk / feedingsPerDay
      
      // Create feeding sessions for this calf
      const feedingSessions: CalfFeedingSession[] = []
      for (let i = 1; i <= feedingsPerDay; i++) {
        feedingSessions.push({
          sessionNumber: i,
          timeRange: `Session ${i}`,
          milkPerCalf: parseFloat(milkPerSession.toFixed(2))
        })
      }
      
      calfFeedingRequirements.push({
        calfId: calf.id,
        tagNumber: calf.tag_number,
        name: calf.name || calf.tag_number,
        ageInDays,
        feedingSessions,
        dailyMilkPerCalf: parseFloat(dailyMilk.toFixed(2))
      })
      
      // Aggregate session totals
      for (let i = 1; i <= feedingsPerDay; i++) {
        if (!sessionTotals[i]) {
          sessionTotals[i] = { totalMilk: 0, count: 0 }
        }
        sessionTotals[i].totalMilk += milkPerSession
        sessionTotals[i].count += 1
      }
      
      totalDailyMilk += dailyMilk
    }
    
    // Convert session totals to array
    const sessionBreakdown = Object.entries(sessionTotals)
      .map(([sessionNum, data]) => ({
        sessionNumber: parseInt(sessionNum),
        totalMilkRequired: parseFloat(data.totalMilk.toFixed(2)),
        calfCount: data.count
      }))
      .sort((a, b) => a.sessionNumber - b.sessionNumber)
    
    return {
      date: targetDate,
      totalCalves: calfFeedingRequirements.length,
      calves: calfFeedingRequirements,
      sessionBreakdown,
      totalDailyMilk: parseFloat(totalDailyMilk.toFixed(2))
    }
  } catch (error) {
    console.error('Error fetching calf feeding requirements:', error)
    throw error
  }
}

/**
 * Get calf feeding requirements for multiple days (forecast view)
 */
export async function getCalfFeedingForecast(
  farmId: string,
  days: number = 7
): Promise<CalfFeedingSummary[]> {
  const forecasts: CalfFeedingSummary[] = []
  
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    
    const summary = await getCalfFeedingRequirements(farmId, dateStr)
    if (summary) {
      forecasts.push(summary)
    }
  }
  
  return forecasts
}
