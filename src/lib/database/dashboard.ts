// src/lib/database/dashboard.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAnimalStats } from '@/lib/database/animals'
import { getTeamStats } from '@/lib/database/team'
import { withCache } from '@/lib/cache/query-cache'

export async function getDashboardStats(farmId: string) {
  return withCache(
    `dashboard-stats-${farmId}`,
    async () => {
      const supabase = await createServerSupabaseClient()
      
      try {
        // Get basic farm info with optimized query
        const { data: farm } = await supabase
          .from('farms')
          .select('name, location, farm_type, created_at')
          .eq('id', farmId)
          .single()
        
        // Get all statistics in parallel with caching
        const [
          animalStats,
          teamStats,
          productionStats,
          healthStats,
          breedingStats,
          feedStats,
          financialStats,
          inventoryStats,
          equipmentStats,
          alerts,
          recentActivities
        ] = await Promise.all([
          withCache(`animal-stats-${farmId}`, () => getAnimalStats(farmId), 2),
          withCache(`team-stats-${farmId}`, () => getTeamStats(farmId), 10),
          withCache(`production-stats-${farmId}`, () => getProductionStats(farmId), 1),
          withCache(`health-stats-${farmId}`, () => getHealthStats(farmId), 5),
          withCache(`breeding-stats-${farmId}`, () => getBreedingStats(farmId), 10),
          withCache(`feed-stats-${farmId}`, () => getFeedStats(farmId), 30),
          withCache(`financial-stats-${farmId}`, () => getFinancialStats(farmId), 5),
          withCache(`inventory-stats-${farmId}`, () => getInventoryStats(farmId), 15),
          withCache(`equipment-stats-${farmId}`, () => getEquipmentStats(farmId), 60),
          withCache(`alerts-${farmId}`, () => getCriticalAlerts(farmId), 2),
          withCache(`recent-activities-${farmId}`, () => getRecentActivities(farmId, 10), 1)
        ])
        
        const farmAge = farm && farm.created_at
          ? Math.floor((new Date().getTime() - new Date(farm.created_at as string).getTime()) / (1000 * 60 * 60 * 24))
          : 0
        
        return {
          farm,
          farmAge,
          animals: animalStats,
          team: teamStats,
          production: productionStats,
          health: healthStats,
          breeding: breedingStats,
          feed: feedStats,
          financial: financialStats,
          inventory: inventoryStats,
          equipment: equipmentStats,
          alerts,
          activities: recentActivities,
          summary: {
            totalAnimals: animalStats.total,
            totalTeamMembers: teamStats.total,
            pendingInvitations: teamStats.pending,
            farmType: farm?.farm_type || 'Unknown',
          }
        }
      } catch (error) {
        console.error('Error getting dashboard stats:', error)
        return null
      }
    },
    2 // Cache for 2 minutes - shorter for dashboard
  )
}

// Production statistics for milk and performance
export async function getProductionStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Get today's milk production
    const { data: todayProduction } = await supabase
      .from('production_records')
      .select('milk_volume')
      .gte('record_date', today)
      .eq('farm_id', farmId)
    
    // Get weekly production for averages
    const { data: weeklyProduction } = await supabase
      .from('production_records')
      .select('milk_volume, record_date')
      .gte('record_date', weekAgo)
      .eq('farm_id', farmId)
      .order('record_date', { ascending: false })
    
    // Get milking cow count
    const { count: milkingCows } = await supabase
      .from('animals')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('status', 'active')
      .eq('gender', 'female')
      .gte('birth_date', new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString()) // Assume 2+ years old are milking
    
    const todayMilk = todayProduction?.reduce((sum, record) => sum + (record.milk_volume || 0), 0) || 0
    const weeklyTotal = weeklyProduction?.reduce((sum, record) => sum + (record.milk_volume || 0), 0) || 0
    const weeklyAvg = weeklyTotal / 7
    const avgPerCow = milkingCows ? (todayMilk / milkingCows) : 0
    
    // Calculate weekly progress (assuming 30L per cow per day target)
    const weeklyTarget = (milkingCows || 0) * 30 * 7
    const weeklyProgress = weeklyTarget > 0 ? Math.min((weeklyTotal / weeklyTarget) * 100, 100) : 0
    
    return {
      todayMilk: Math.round(todayMilk),
      weeklyAvg: Math.round(weeklyAvg),
      avgPerCow: Math.round(avgPerCow * 10) / 10, // Round to 1 decimal
      weeklyProgress: Math.round(weeklyProgress),
      milkingCows: milkingCows || 0
    }
  } catch (error) {
    console.error('Error getting production stats:', error)
    return {
      todayMilk: 0,
      weeklyAvg: 0,
      avgPerCow: 0,
      weeklyProgress: 0,
      milkingCows: 0
    }
  }
}

// Health statistics and alerts
export async function getHealthStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get health record counts for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: healthRecords } = await supabase
      .from('animal_health_records')
      .select('record_type, animal_id')
      .gte('record_date', thirtyDaysAgo)
      .eq('farm_id', farmId)
    
    // Get total animal count for health percentages
    const { count: totalAnimals } = await supabase
      .from('animals')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('status', 'active')
    
    // Count animals currently under treatment
    const { count: treatmentCount } = await supabase
      .from('animal_health_records')
      .select('*', { count: 'exact', head: true })
      .eq('record_type', 'treatment')
      .gte('record_date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()) // Active treatments in last 14 days
      .eq('farm_id', farmId)
    
    // Count sick animals (recent illness records)
    const { count: sickCount } = await supabase
      .from('animal_health_records')
      .select('*', { count: 'exact', head: true })
      .eq('record_type', 'illness')
      .gte('record_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Sick in last 7 days
      .eq('farm_id', farmId)
    
    const healthyCount = Math.max(0, (totalAnimals || 0) - (treatmentCount || 0) - (sickCount || 0))
    
    return {
      healthyCount,
      treatmentCount: treatmentCount || 0,
      sickCount: sickCount || 0,
      totalAnimals: totalAnimals || 0,
      healthPercentage: totalAnimals ? Math.round((healthyCount / totalAnimals) * 100) : 100
    }
  } catch (error) {
    console.error('Error getting health stats:', error)
    return {
      healthyCount: 0,
      treatmentCount: 0,
      sickCount: 0,
      totalAnimals: 0,
      healthPercentage: 0
    }
  }
}

// Breeding and reproduction statistics
export async function getBreedingStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get pregnant animals count (confirmed pregnancies that haven't been completed)
    const { count: pregnantCount } = await supabase
      .from('pregnancy_records')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('pregnancy_status', 'confirmed')
    
    // Get animals due to calve in next 30 days
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    
    const { count: dueSoon } = await supabase
      .from('pregnancy_records')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('pregnancy_status', 'confirmed')
      .gte('expected_calving_date', today)
      .lte('expected_calving_date', thirtyDaysFromNow)
    
    // Get recent calvings (last 30 days) from calving_records table
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    
    const { data: recentCalvings } = await supabase
      .from('calving_records')
      .select(`
        calving_date,
        animals!calving_records_mother_id_fkey(name, tag_number)
      `)
      .eq('farm_id', farmId)
      .gte('calving_date', thirtyDaysAgo)
      .order('calving_date', { ascending: false })
      .limit(5)
    
    const formattedCalvings = Array.isArray(recentCalvings)
      ? recentCalvings.map(record => ({
          cowName: record.animals?.name || record.animals?.tag_number || 'Unknown',
          calvingDate: record.calving_date,
          daysAgo: Math.floor(
            (new Date().getTime() - new Date(record.calving_date).getTime()) / 
            (1000 * 60 * 60 * 24)
          )
        }))
      : []
    
    return {
      pregnantCount: pregnantCount || 0,
      dueSoon: dueSoon || 0,
      recentCalvings: formattedCalvings
    }
  } catch (error) {
    console.error('Error getting breeding stats:', error)
    return {
      pregnantCount: 0,
      dueSoon: 0,
      recentCalvings: []
    }
  }
}

// Feed management statistics
export async function getFeedStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get current month's feed costs
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0]
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]
    
    // Calculate monthly cost from feed purchases
    const { data: feedPurchases } = await supabase
      .from('feed_inventory')
      .select('quantity_kg, cost_per_kg')
      .eq('farm_id', farmId)
      .gte('purchase_date', firstDayOfMonth)
      .lte('purchase_date', lastDayOfMonth)
    
    const monthlyCost = feedPurchases?.reduce((sum, record) => {
      const cost = (record.quantity_kg || 0) * (record.cost_per_kg || 0)
      return sum + cost
    }, 0) || 0
    
    // Get current feed inventory grouped by feed type
    const { data: feedInventory } = await supabase
      .from('feed_inventory')
      .select('feed_type_id, quantity_kg')
      .eq('farm_id', farmId)
      .gt('quantity_kg', 0)
    
    if (!feedInventory || feedInventory.length === 0) {
      return {
        monthlyCost: Math.round(monthlyCost),
        daysRemaining: 0
      }
    }
    
    // Group inventory by feed type and sum quantities
    const inventoryByType = feedInventory.reduce((acc, item) => {
      const typeId = item.feed_type_id
      if (!acc[typeId]) {
        acc[typeId] = 0
      }
      acc[typeId] += item.quantity_kg || 0
      return acc
    }, {} as Record<string, number>)
    
    // Calculate daily consumption for the last 7 days for each feed type
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
    
    const { data: recentConsumption } = await supabase
      .from('feed_consumption')
      .select('feed_type_id, quantity_kg')
      .eq('farm_id', farmId)
      .gte('feeding_time', sevenDaysAgo)
    
    // Calculate average daily usage per feed type
    const dailyUsageByType: Record<string, number> = {}
    
    if (recentConsumption && recentConsumption.length > 0) {
      const consumptionByType = recentConsumption.reduce((acc, item) => {
        const typeId = item.feed_type_id
        if (!acc[typeId]) {
          acc[typeId] = 0
        }
        acc[typeId] += item.quantity_kg || 0
        return acc
      }, {} as Record<string, number>)
      
      // Convert total consumption to daily average (divide by 7 days)
      Object.keys(consumptionByType).forEach(typeId => {
        dailyUsageByType[typeId] = consumptionByType[typeId] / 7
      })
    }
    
    // Calculate days remaining for each feed type
    const daysRemainingByType: number[] = []
    
    Object.keys(inventoryByType).forEach(typeId => {
      const currentStock = inventoryByType[typeId]
      const dailyUsage = dailyUsageByType[typeId] || 0
      
      if (dailyUsage > 0) {
        const daysLeft = currentStock / dailyUsage
        daysRemainingByType.push(daysLeft)
      } else {
        // If no consumption data, assume 999 days (essentially unlimited)
        daysRemainingByType.push(999)
      }
    })
    
    // Use the MINIMUM days remaining (most critical feed type)
    // This tells you when you'll run out of the first feed type
    const minDaysRemaining = daysRemainingByType.length > 0
      ? Math.floor(Math.min(...daysRemainingByType))
      : 0
    
    return {
      monthlyCost: Math.round(monthlyCost),
      daysRemaining: Math.min(minDaysRemaining, 999) // Cap at 999 for display
    }
  } catch (error) {
    console.error('Error getting feed stats:', error)
    return {
      monthlyCost: 0,
      daysRemaining: 0
    }
  }
}

// Financial overview statistics
export async function getFinancialStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const currentMonth = new Date().toISOString().slice(0, 7)
    
    // Get monthly revenue (milk sales + animal sales)
    const { data: revenue } = await supabase
      .from('financial_transactions')
      .select('amount')
      .eq('farm_id', farmId)
      .eq('type', 'income')
      .like('date', `${currentMonth}%`)
    
    // Get monthly expenses
    const { data: expenses } = await supabase
      .from('financial_transactions')
      .select('amount')
      .eq('farm_id', farmId)
      .eq('type', 'expense')
      .like('date', `${currentMonth}%`)
    
    const monthlyRevenue = revenue?.reduce((sum, record) => sum + (record.amount || 0), 0) || 0
    const monthlyExpenses = expenses?.reduce((sum, record) => sum + (record.amount || 0), 0) || 0
    const monthlyProfit = monthlyRevenue - monthlyExpenses
    const profitMargin = monthlyRevenue > 0 ? Math.round((monthlyProfit / monthlyRevenue) * 100) : 0
    
    return {
      monthlyRevenue: Math.round(monthlyRevenue),
      monthlyExpenses: Math.round(monthlyExpenses),
      monthlyProfit: Math.round(monthlyProfit),
      profitMargin: Math.max(0, profitMargin)
    }
  } catch (error) {
    console.error('Error getting financial stats:', error)
    return {
      monthlyRevenue: 0,
      monthlyExpenses: 0,
      monthlyProfit: 0,
      profitMargin: 0
    }
  }
}

// Inventory management statistics
export async function getInventoryStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get total inventory items
    const { count: totalItems } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .gt('quantity', 0)
    
    // Get low stock items (quantity below reorder point)
    const { count: lowStockCount } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .filter('quantity', 'lte', 'reorder_point')
    
    return {
      totalItems: totalItems || 0,
      lowStockCount: lowStockCount || 0
    }
  } catch (error) {
    console.error('Error getting inventory stats:', error)
    return {
      totalItems: 0,
      lowStockCount: 0
    }
  }
}

// Equipment management statistics
export async function getEquipmentStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get total equipment count
    const { count: totalCount } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('status', 'operational')
    
    // Get equipment due for maintenance
    const today = new Date().toISOString().split('T')[0]
    const { count: maintenanceDue } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('status', 'operational')
      .lte('next_maintenance_date', today)
    
    return {
      totalCount: totalCount || 0,
      maintenanceDue: maintenanceDue || 0
    }
  } catch (error) {
    console.error('Error getting equipment stats:', error)
    return {
      totalCount: 0,
      maintenanceDue: 0
    }
  }
}

// Critical alerts for immediate attention
export async function getCriticalAlerts(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const alerts = []
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Health alerts - sick animals
    const { count: sickAnimals } = await supabase
      .from('animal_health_records')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('record_type', 'illness')
      .gte('record_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    
    if (sickAnimals && sickAnimals > 0) {
      alerts.push({
        priority: 'high',
        title: `${sickAnimals} animal${sickAnimals > 1 ? 's' : ''} need attention`,
        description: 'Recent illness records require follow-up',
        type: 'health'
      })
    }
    
    // Breeding alerts - calvings due soon
    const { count: dueSoon } = await supabase
      .from('breeding_records')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('status', 'pregnant')
      .lte('expected_calving_date', tomorrow)
    
    if (dueSoon && dueSoon > 0) {
      alerts.push({
        priority: 'medium',
        title: `${dueSoon} calving${dueSoon > 1 ? 's' : ''} due soon`,
        description: 'Prepare for upcoming births',
        type: 'breeding'
      })
    }
    
    // Equipment alerts - maintenance due
    const { count: maintenanceDue } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .lte('next_maintenance_date', today)
    
    if (maintenanceDue && maintenanceDue > 0) {
      alerts.push({
        priority: 'medium',
        title: `${maintenanceDue} equipment maintenance due`,
        description: 'Schedule maintenance to prevent breakdowns',
        type: 'equipment'
      })
    }
    
    // Inventory alerts - low stock
    const { count: lowStock } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .filter('quantity', 'lte', 'reorder_point')
    
    if (lowStock && lowStock > 0) {
      alerts.push({
        priority: 'low',
        title: `${lowStock} item${lowStock > 1 ? 's' : ''} low in stock`,
        description: 'Consider reordering supplies',
        type: 'inventory'
      })
    }
    
    return alerts.slice(0, 5) // Limit to 5 most critical alerts
  } catch (error) {
    console.error('Error getting critical alerts:', error)
    return []
  }
}

// Enhanced recent activities with better categorization
export async function getRecentActivities(farmId: string, limit: number = 10) {
  const supabase = await createServerSupabaseClient()
  
  try {
    interface BaseActivity {
      type: 'animal' | 'health' | 'production' | 'breeding';
      title: string;
      description: string;
      timeAgo: string;
      timestamp: string;
    }

    interface AnimalActivity extends BaseActivity {
      type: 'animal';
    }

    interface HealthActivity extends BaseActivity {
      type: 'health';
    }

    interface ProductionActivity extends BaseActivity {
      type: 'production';
    }

    interface BreedingActivity extends BaseActivity {
      type: 'breeding';
    }

    type FarmActivity = AnimalActivity | HealthActivity | ProductionActivity | BreedingActivity;

    const activities: FarmActivity[] = [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    
    // Recent animal additions
    const { data: newAnimals } = await supabase
      .from('animals')
      .select('name, tag_number, created_at')
      .eq('farm_id', farmId)
      .gte('created_at', threeDaysAgo)
      .order('created_at', { ascending: false })
      .limit(3)
    
    newAnimals?.forEach(animal => {
      const timeAgo = getTimeAgo(animal.created_at || new Date().toISOString())
      activities.push({
        type: 'animal',
        title: `New animal added: ${animal.name || animal.tag_number}`,
        description: `Animal ${animal.tag_number} joined the herd`,
        timeAgo,
        timestamp: animal.created_at || new Date().toISOString()
      })
    })
    
    // Recent health records
    const { data: healthRecords } = await supabase
      .from('animal_health_records')
      .select(`
        record_type,
        created_at,
        animals!inner(name, tag_number)
      `)
      .eq('farm_id', farmId)
      .gte('created_at', threeDaysAgo)
      .order('created_at', { ascending: false })
      .limit(3)
    
    healthRecords?.forEach(record => {
      const timeAgo = getTimeAgo(record.created_at || new Date().toISOString())
      activities.push({
        type: 'health',
        title: `Health record: ${record.record_type}`,
        description: `${record.animals.name || record.animals.tag_number} - ${record.record_type}`,
        timeAgo,
        timestamp: record.created_at || new Date().toISOString()
      })
    })
    
    // Recent production records
    const { data: productionRecords } = await supabase
      .from('production_records')
      .select(`
        milk_volume,
        created_at,
        animals!inner(name, tag_number)
      `)
      .eq('farm_id', farmId)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(2)
    
    productionRecords?.forEach(record => {
      const timeAgo = getTimeAgo(record.created_at || new Date().toISOString())
      activities.push({
        type: 'production',
        title: `Milk recorded: ${record.milk_volume}L`,
        description: `${record.animals.name || record.animals.tag_number} produced ${record.milk_volume}L`,
        timeAgo,
        timestamp: record.created_at || new Date().toISOString()
      })
    })
    
    // Recent breeding events
    const { data: breedingRecords } = await supabase
      .from('breeding_records')
      .select(`
        breeding_type,
        created_at,
        animals!breeding_records_animal_id_fkey(name, tag_number)
      `)
      .eq('farm_id', farmId)
      .gte('created_at', threeDaysAgo)
      .order('created_at', { ascending: false })
      .limit(2)
    
    breedingRecords?.forEach(record => {
      const timeAgo = getTimeAgo(record.created_at || new Date().toISOString())
      activities.push({
        type: 'breeding',
        title: `Breeding event: ${record.breeding_type}`,
        description: `${record.animals.name || record.animals.tag_number} - ${record.breeding_type}`,
        timeAgo,
        timestamp: record.created_at || new Date().toISOString()
      })
    })
    
    // Sort all activities by timestamp and limit
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
      
  } catch (error) {
    console.error('Error getting recent activities:', error)
    return []
  }
}

// Helper function to calculate time ago
function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const past = new Date(timestamp)
  const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  
  return past.toLocaleDateString()
}