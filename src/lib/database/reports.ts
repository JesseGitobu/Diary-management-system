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
    const { data: productionSummary } = await supabase
      .from('daily_production_summary')
      .select('*')
      .eq('farm_id', filters.farmId)
      .gte('record_date', filters.dateRange.start)
      .lte('record_date', filters.dateRange.end)
      .order('record_date', { ascending: true })
    
    // Individual animal production
    const { data: animalProduction } = await supabase
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
    
    // Calculate totals and averages
    const totalMilk = productionSummary?.reduce((sum, day) => sum + (day.total_milk_volume || 0), 0) || 0
    const averageDaily = totalMilk / (productionSummary?.length || 1)
    const averageFatContent = (productionSummary ?? []).reduce((sum, day) => sum + (day.average_fat_content || 0), 0) / ((productionSummary?.length || 1)) || 0
    const averageProteinContent = (productionSummary ?? []).reduce((sum, day) => sum + (day.average_protein_content || 0), 0) / ((productionSummary?.length || 1)) || 0
    
    // Top performing animals
    const animalPerformance = animalProduction?.reduce((acc: { [key: string]: any }, record) => {
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
        averageDaily: animal.totalMilk / (productionSummary?.length || 1),
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
        daysReported: productionSummary?.length || 0,
        animalsReported: new Set(animalProduction?.map(r => r.animal_id)).size
      },
      dailyData: productionSummary,
      topPerformers: topAnimals,
      qualityTrends: productionSummary?.map(day => ({
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
    // Feed summary data
    const { data: feedSummary } = await supabase
      .from('daily_feed_summary')
      .select('*')
      .eq('farm_id', filters.farmId)
      .gte('summary_date', filters.dateRange.start)
      .lte('summary_date', filters.dateRange.end)
      .order('summary_date', { ascending: true })
    
    // Feed consumption by type
    const { data: feedConsumption } = await supabase
      .from('feed_consumption')
      .select(`
        *,
        feed_types (
          name,
          typical_cost_per_kg
        )
      `)
      .eq('farm_id', filters.farmId)
      .gte('consumption_date', filters.dateRange.start)
      .lte('consumption_date', filters.dateRange.end)
    
    // Calculate feed metrics
    const totalFeedCost = feedSummary?.reduce((sum, day) => sum + (day.total_feed_cost || 0), 0) || 0
    const totalFeedQuantity = feedSummary?.reduce((sum, day) => sum + (day.total_quantity_kg || 0), 0) || 0
    const averageCostPerDay = totalFeedCost / (feedSummary?.length || 1)
    const averageCostPerAnimal = (feedSummary ?? []).reduce((sum, day) => sum + (day.cost_per_animal || 0), 0) / ((feedSummary?.length || 1)) || 0
    
    // Feed type breakdown
    const feedTypeBreakdown = feedConsumption?.reduce((acc: { [key: string]: { name: string, totalQuantity: number, totalCost: number, recordCount: number } }, record) => {
      const feedType = record.feed_types?.name || 'Unknown'
      if (!acc[feedType]) {
        acc[feedType] = {
          name: feedType,
          totalQuantity: 0,
          totalCost: 0,
          recordCount: 0
        }
      }
      acc[feedType].totalQuantity += record.quantity_kg || 0
      acc[feedType].totalCost += (record.quantity_kg || 0) * (record.cost_per_kg || 0)
      acc[feedType].recordCount += 1
      return acc
    }, {} as { [key: string]: { name: string, totalQuantity: number, totalCost: number, recordCount: number } })
    
    return {
      summary: {
        totalFeedCost,
        totalFeedQuantity,
        averageDailyCost: averageCostPerDay,
        averageCostPerAnimal,
        daysReported: feedSummary?.length || 0,
        feedTypesUsed: Object.keys(feedTypeBreakdown || {}).length
      },
      dailyData: feedSummary,
      feedTypeBreakdown: Object.values(feedTypeBreakdown || {}),
      costTrends: feedSummary?.map(day => ({
        date: day.summary_date,
        totalCost: day.total_feed_cost,
        costPerAnimal: day.cost_per_animal,
        quantity: day.total_quantity_kg
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
    const dailyFinancials = productionReport.dailyData?.map(prodDay => {
      const feedDay = feedReport.dailyData?.find(f => f.summary_date === prodDay.record_date)
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
        feedEfficiency: currentData.production.summary.totalMilkVolume / currentData.feed.summary.totalFeedQuantity,
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