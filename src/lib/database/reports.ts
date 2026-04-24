import { createServerSupabaseClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, subMonths } from 'date-fns'

export interface ReportFilters {
  farmId: string
  dateRange: {
    start: string
    end: string
  }
  animalIds?: string[]
  reportType: 'production' | 'feed' | 'financial' | 'health' | 'comprehensive'
}

export async function generateProductionReport(filters: ReportFilters) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Production summary data
    const { data: productionSummaryData } = await (supabase as any)
      .from('daily_production_summary')
      .select('*')
      .eq('farm_id', filters.farmId)
      .gte('record_date', filters.dateRange.start)
      .lte('record_date', filters.dateRange.end)
      .order('record_date', { ascending: true })
    
    // FIXED: Cast to any[] to bypass 'never' type error
    const productionSummary = (productionSummaryData as any[]) || []

    // Individual animal production
    const { data: animalProductionData } = await supabase
      .from('production_records')
      .select(`
        *,
        animals (
          id,
          name,
          tag_number,
          breed
        )
      `)
      .eq('farm_id', filters.farmId)
      .gte('record_date', filters.dateRange.start)
      .lte('record_date', filters.dateRange.end)
      .order('record_date', { ascending: true })
    
    // FIXED: Cast to any[]
    const animalProduction = (animalProductionData as any[]) || []

    // Calculate totals and averages
    const totalMilk = productionSummary.reduce((sum, day) => sum + (day.total_milk_volume || 0), 0) || 0
    const averageDaily = totalMilk / (productionSummary.length || 1)
    const averageFatContent = productionSummary.reduce((sum, day) => sum + (day.average_fat_content || 0), 0) / ((productionSummary.length || 1)) || 0
    const averageProteinContent = productionSummary.reduce((sum, day) => sum + (day.average_protein_content || 0), 0) / ((productionSummary.length || 1)) || 0
    
    // Top performing animals
    const animalPerformance = animalProduction.reduce((acc: { [key: string]: any }, record) => {
      const animalId = record.animal_id
      if (!acc[animalId]) {
        acc[animalId] = {
          animal: record.animals,
          totalMilk: 0,
          recordCount: 0,
          averageQuality: { fat: 0, protein: 0 }
        }
      }
      acc[animalId].totalMilk += record.milk_volume || 0
      acc[animalId].recordCount += 1
      acc[animalId].averageQuality.fat += record.fat_content || 0
      acc[animalId].averageQuality.protein += record.protein_content || 0
      return acc
    }, {} as { [key: string]: any })
    
    // Convert to sorted array
    const topAnimals = Object.values(animalPerformance || {})
      .map((animal: any) => ({
        ...animal,
        averageDaily: animal.totalMilk / (productionSummary.length || 1),
        averageQuality: {
          fat: animal.averageQuality.fat / animal.recordCount,
          protein: animal.averageQuality.protein / animal.recordCount
        }
      }))
      .sort((a: any, b: any) => b.totalMilk - a.totalMilk)
      .slice(0, 10)
    
    return {
      summary: {
        totalMilkVolume: totalMilk,
        averageDailyProduction: averageDaily,
        averageFatContent,
        averageProteinContent,
        daysReported: productionSummary.length || 0,
        animalsReported: new Set(animalProduction.map(r => r.animal_id)).size
      },
      dailyData: productionSummary,
      topPerformers: topAnimals,
      qualityTrends: productionSummary.map(day => ({
        date: day.record_date,
        fat: day.average_fat_content,
        protein: day.average_protein_content,
        volume: day.total_milk_volume
      }))
    }
  } catch (error) {
    console.error('Error generating production report:', error)
    throw error
  }
}

export async function generateFeedReport(filters: ReportFilters) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Feed consumption records with full details
    const { data: feedConsumptionData, error } = await (supabase as any)
      .from('feed_consumption_records')
      .select(`
        *,
        feed_consumption_feeds (
          id,
          feed_type_id,
          quantity_kg,
          percentage_of_mix,
          cost_per_kg,
          feed_types ( 
            id,
            name,
            typical_cost_per_kg,
            category_id
          )
        ),
        feed_consumption_animals (
          animal_id,
          quantity_kg,
          animals ( id, tag_number, name )
        )
      `)
      .eq('farm_id', filters.farmId)
      .gte('consumption_date', filters.dateRange.start)
      .lte('consumption_date', filters.dateRange.end)
      .order('consumption_date', { ascending: true })
    
    if (error) {
      console.error('Error fetching feed consumption:', error)
      throw error
    }

    // FIXED: Cast to any[]
    const feedConsumption = (feedConsumptionData as any[]) || []

    // Aggregate data by day to create daily summaries
    const dailySummaryMap = new Map<string, any>()
    
    feedConsumption.forEach(record => {
      const date = record.consumption_date
      if (!dailySummaryMap.has(date)) {
        dailySummaryMap.set(date, {
          summary_date: date,
          farm_id: record.farm_id,
          total_quantity_kg: 0,
          total_feed_cost: 0,
          feeding_sessions: 0,
          feeding_modes: new Set<string>(),
          cost_per_animal: 0
        })
      }

      const daySummary = dailySummaryMap.get(date)
      
      // Calculate quantities and costs
      const feeds = record.feed_consumption_feeds || []
      feeds.forEach((feed: any) => {
        const qty = feed.quantity_kg || 0
        const costPerKg = feed.cost_per_kg || feed.feed_types?.typical_cost_per_kg || 0
        daySummary.total_quantity_kg += qty
        daySummary.total_feed_cost += qty * costPerKg
      })

      daySummary.feeding_sessions += 1
      if (record.feeding_mode) {
        daySummary.feeding_modes.add(record.feeding_mode)
      }

      // Calculate cost per animal if animal count is available
      if (record.animal_count && record.animal_count > 0) {
        daySummary.cost_per_animal = daySummary.total_feed_cost / record.animal_count
      }
    })

    // Convert map to array and convert Set to array
    const feedSummary = Array.from(dailySummaryMap.values()).map(day => ({
      ...day,
      feeding_modes: Array.from(day.feeding_modes)
    }))

    // Feed type breakdown
    const feedTypeBreakdown = feedConsumption.reduce((acc: { [key: string]: { name: string, totalQuantity: number, totalCost: number, recordCount: number, mode?: string } }, record) => {
      const feeds = record.feed_consumption_feeds || []
      feeds.forEach((feed: any) => {
        const feedType = feed.feed_types?.name || 'Unknown'
        if (!acc[feedType]) {
          acc[feedType] = {
            name: feedType,
            totalQuantity: 0,
            totalCost: 0,
            recordCount: 0,
            mode: record.feeding_mode
          }
        }
        const qty = feed.quantity_kg || 0
        const costPerKg = feed.cost_per_kg || feed.feed_types?.typical_cost_per_kg || 0
        acc[feedType].totalQuantity += qty
        acc[feedType].totalCost += qty * costPerKg
        acc[feedType].recordCount += 1
      })
      return acc
    }, {} as { [key: string]: { name: string, totalQuantity: number, totalCost: number, recordCount: number, mode?: string } })

    // Calculate totals
    const totalFeedCost = feedSummary.reduce((sum, day) => sum + (day.total_feed_cost || 0), 0) || 0
    const totalFeedQuantity = feedSummary.reduce((sum, day) => sum + (day.total_quantity_kg || 0), 0) || 0
    const averageCostPerDay = feedSummary.length > 0 ? totalFeedCost / feedSummary.length : 0
    const totalFeedingSessions = feedConsumption.length
    
    // Calculate average cost per animal across all records with animal count
    const recordsWithAnimals = feedConsumption.filter(r => r.animal_count && r.animal_count > 0)
    const averageCostPerAnimal = recordsWithAnimals.length > 0 
      ? recordsWithAnimals.reduce((sum, r) => {
          const feeds = r.feed_consumption_feeds || []
          const recordCost = feeds.reduce((s: number, f: any) => {
            const qty = f.quantity_kg || 0
            const costPerKg = f.cost_per_kg || f.feed_types?.typical_cost_per_kg || 0
            return s + (qty * costPerKg)
          }, 0)
          return sum + (recordCost / r.animal_count)
        }, 0) / recordsWithAnimals.length
      : 0
    
    return {
      summary: {
        totalFeedCost,
        totalFeedQuantity,
        averageDailyCost: averageCostPerDay,
        averageCostPerAnimal,
        daysReported: feedSummary.length || 0,
        feedTypesUsed: Object.keys(feedTypeBreakdown || {}).length,
        totalFeedingSessions,
        period: {
          start: filters.dateRange.start,
          end: filters.dateRange.end
        }
      },
      dailyData: feedSummary,
      feedTypeBreakdown: Object.values(feedTypeBreakdown || {}),
      costTrends: feedSummary.map(day => ({
        date: day.summary_date,
        totalCost: day.total_feed_cost,
        costPerAnimal: day.cost_per_animal,
        quantity: day.total_quantity_kg,
        sessions: day.feeding_sessions
      }))
    }
  } catch (error) {
    console.error('Error generating feed report:', error)
    throw error
  }
}

export async function generateFinancialReport(filters: ReportFilters) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get production and feed data for financial analysis
    const [productionReport, feedReport] = await Promise.all([
      generateProductionReport(filters),
      generateFeedReport(filters)
    ])
    
    // Calculate revenue (simplified - you'd get actual milk prices from market data)
    const averageMilkPrice = 0.35 // $0.35 per liter (example price)
    const totalRevenue = productionReport.summary.totalMilkVolume * averageMilkPrice
    
    // Calculate profit margins
    const totalCosts = feedReport.summary.totalFeedCost
    const grossProfit = totalRevenue - totalCosts
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    
    // Cost per liter
    const costPerLiter = productionReport.summary.totalMilkVolume > 0 ? 
      totalCosts / productionReport.summary.totalMilkVolume : 0
    
    // Daily financial trends
    // FIXED: Add any[] typing to map callback parameters if needed
    const dailyFinancials = productionReport.dailyData?.map((prodDay: any) => {
      const feedDay = feedReport.dailyData?.find((f: any) => f.summary_date === prodDay.record_date)
      const dailyRevenue = (prodDay.total_milk_volume || 0) * averageMilkPrice
      const dailyCosts = feedDay?.total_feed_cost || 0
      
      return {
        date: prodDay.record_date,
        revenue: dailyRevenue,
        costs: dailyCosts,
        profit: dailyRevenue - dailyCosts,
        milkVolume: prodDay.total_milk_volume
      }
    })
    
    return {
      summary: {
        totalRevenue,
        totalCosts,
        grossProfit,
        profitMargin,
        costPerLiter,
        revenuePerLiter: averageMilkPrice,
        daysAnalyzed: dailyFinancials?.length || 0
      },
      dailyFinancials,
      milkPrice: averageMilkPrice,
      period: {
        start: filters.dateRange.start,
        end: filters.dateRange.end
      }
    }
  } catch (error) {
    console.error('Error generating financial report:', error)
    throw error
  }
}

export async function generateComprehensiveReport(filters: ReportFilters) {
  try {
    const [production, feed, financial] = await Promise.all([
      generateProductionReport(filters),
      generateFeedReport(filters),
      generateFinancialReport(filters)
    ])
    
    return {
      production,
      feed,
      financial,
      generatedAt: new Date().toISOString(),
      period: filters.dateRange,
      farmId: filters.farmId
    }
  } catch (error) {
    console.error('Error generating comprehensive report:', error)
    throw error
  }
}

export async function getReportingKPIs(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Current month data
    const currentMonth = {
      start: startOfMonth(new Date()).toISOString().split('T')[0],
      end: endOfMonth(new Date()).toISOString().split('T')[0]
    }
    
    // Previous month for comparison
    const previousMonth = {
      start: startOfMonth(subMonths(new Date(), 1)).toISOString().split('T')[0],
      end: endOfMonth(subMonths(new Date(), 1)).toISOString().split('T')[0]
    }
    
    // Get current and previous month data
    const [currentData, previousData] = await Promise.all([
      generateComprehensiveReport({ farmId, dateRange: currentMonth, reportType: 'comprehensive' }),
      generateComprehensiveReport({ farmId, dateRange: previousMonth, reportType: 'comprehensive' })
    ])
    
    // Calculate period-over-period changes
    const productionChange = calculatePercentageChange(
      currentData.production.summary.totalMilkVolume,
      previousData.production.summary.totalMilkVolume
    )
    
    const costChange = calculatePercentageChange(
      currentData.feed.summary.totalFeedCost,
      previousData.feed.summary.totalFeedCost
    )
    
    const profitChange = calculatePercentageChange(
      currentData.financial.summary.grossProfit,
      previousData.financial.summary.grossProfit
    )
    
    return {
      currentMonth: currentData,
      previousMonth: previousData,
      changes: {
        production: productionChange,
        costs: costChange,
        profit: profitChange
      },
      kpis: {
        milkProductionTrend: productionChange,
        feedEfficiency: currentData.production.summary.totalMilkVolume / (currentData.feed.summary.totalFeedQuantity || 1), // Avoid division by zero
        profitability: currentData.financial.summary.profitMargin,
        costControl: costChange
      }
    }
  } catch (error) {
    console.error('Error getting reporting KPIs:', error)
    throw error
  }
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}