import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'

type FeedType = Database['public']['Tables']['feed_types']['Row']
type FeedTypeInsert = Database['public']['Tables']['feed_types']['Insert']
type FeedInventory = Database['public']['Tables']['feed_inventory']['Row']
type FeedInventoryInsert = Database['public']['Tables']['feed_inventory']['Insert']
type FeedConsumption = Database['public']['Tables']['feed_consumption']['Row']
type FeedConsumptionInsert = Database['public']['Tables']['feed_consumption']['Insert']

// Feed Types Management
export async function createFeedType(farmId: string, data: Omit<FeedTypeInsert, 'farm_id'>) {
  const supabase = await createServerSupabaseClient()
  
  const { data: feedType, error } = await supabase
    .from('feed_types')
    .insert({
      ...data,
      farm_id: farmId,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating feed type:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data: feedType }
}

export async function getFeedTypes(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('feed_types')
    .select('*')
    .eq('farm_id', farmId)
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching feed types:', error)
    return []
  }
  
  return data || []
}

// Feed Inventory Management
export async function addFeedInventory(farmId: string, data: Omit<FeedInventoryInsert, 'farm_id'>) {
  const supabase = await createServerSupabaseClient()
  
  const { data: inventory, error } = await supabase
    .from('feed_inventory')
    .insert({
      ...data,
      farm_id: farmId,
    })
    .select(`
      *,
      feed_types (
        name,
        description
      )
    `)
    .single()
  
  if (error) {
    console.error('Error adding feed inventory:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data: inventory }
}

export async function getFeedInventory(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('feed_inventory')
    .select(`
      *,
      feed_types (
        name,
        description,
        typical_cost_per_kg
      )
    `)
    .eq('farm_id', farmId)
    .order('purchase_date', { ascending: false })
  
  if (error) {
    console.error('Error fetching feed inventory:', error)
    return []
  }
  
  return data || []
}

export async function getCurrentFeedStock(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get total inventory by feed type
    const { data: inventory } = await supabase
      .from('feed_inventory')
      .select(`
        feed_type_id,
        quantity_kg,
        cost_per_kg,
        feed_types (
          name,
          description
        )
      `)
      .eq('farm_id', farmId)
    
    // Get total consumption by feed type
    const { data: consumption } = await supabase
      .from('feed_consumption')
      .select('feed_type_id, quantity_kg')
      .eq('farm_id', farmId)
    
    // Calculate current stock levels
    const stockLevels = new Map()
    
    // Add inventory
    inventory?.forEach(item => {
      const feedTypeId = item.feed_type_id
      if (!stockLevels.has(feedTypeId)) {
        stockLevels.set(feedTypeId, {
          feedType: item.feed_types,
          totalPurchased: 0,
          totalConsumed: 0,
          currentStock: 0,
          avgCostPerKg: 0,
          transactions: 0,
        })
      }
      
      const stock = stockLevels.get(feedTypeId)
      stock.totalPurchased += item.quantity_kg || 0
      stock.avgCostPerKg = ((stock.avgCostPerKg * stock.transactions) + (item.cost_per_kg || 0)) / (stock.transactions + 1)
      stock.transactions += 1
    })
    
    // Subtract consumption
    consumption?.forEach(item => {
      const feedTypeId = item.feed_type_id
      if (stockLevels.has(feedTypeId)) {
        const stock = stockLevels.get(feedTypeId)
        stock.totalConsumed += item.quantity_kg || 0
      }
    })
    
    // Calculate current stock
    const stockArray = Array.from(stockLevels.values()).map(stock => ({
      ...stock,
      currentStock: stock.totalPurchased - stock.totalConsumed,
    }))
    
    return stockArray
  } catch (error) {
    console.error('Error calculating feed stock:', error)
    return []
  }
}

// Feed Consumption Management
export async function recordFeedConsumption(farmId: string, data: Omit<FeedConsumptionInsert, 'farm_id'>) {
  const supabase = await createServerSupabaseClient()
  
  const { data: consumption, error } = await supabase
    .from('feed_consumption')
    .insert({
      ...data,
      farm_id: farmId,
    })
    .select(`
      *,
      feed_types (
        name
      ),
      animals (
        tag_number,
        name
      )
    `)
    .single()
  
  if (error) {
    console.error('Error recording feed consumption:', error)
    return { success: false, error: error.message }
  }
  
  // Update daily summary
  await updateDailyFeedSummary(farmId, data.consumption_date)
  
  return { success: true, data: consumption }
}

export async function getFeedConsumption(
  farmId: string, 
  startDate?: string, 
  endDate?: string,
  animalId?: string
) {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('feed_consumption')
    .select(`
      *,
      feed_types (
        name,
        description
      ),
      animals (
        tag_number,
        name
      )
    `)
    .eq('farm_id', farmId)
    .order('consumption_date', { ascending: false })
  
  if (startDate) {
    query = query.gte('consumption_date', startDate)
  }
  
  if (endDate) {
    query = query.lte('consumption_date', endDate)
  }
  
  if (animalId) {
    query = query.eq('animal_id', animalId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching feed consumption:', error)
    return []
  }
  
  return data || []
}

export async function updateDailyFeedSummary(farmId: string, date: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Calculate daily totals
    const { data: dailyConsumption } = await supabase
      .from('feed_consumption')
      .select('quantity_kg, cost_per_kg, animal_id, feed_type_id')
      .eq('farm_id', farmId)
      .eq('consumption_date', date)
    
    if (!dailyConsumption || dailyConsumption.length === 0) {
      // Delete summary if no consumption
      await supabase
        .from('daily_feed_summary')
        .delete()
        .eq('farm_id', farmId)
        .eq('summary_date', date)
      return
    }
    
    const totalQuantity = dailyConsumption.reduce((sum, record) => sum + (record.quantity_kg || 0), 0)
    const totalCost = dailyConsumption.reduce((sum, record) => 
      sum + ((record.quantity_kg || 0) * (record.cost_per_kg || 0)), 0)
    const uniqueAnimals = new Set(dailyConsumption.map(r => r.animal_id).filter(Boolean)).size
    const uniqueFeedTypes = new Set(dailyConsumption.map(r => r.feed_type_id)).size
    const costPerAnimal = uniqueAnimals > 0 ? totalCost / uniqueAnimals : 0
    
    const summaryData = {
      farm_id: farmId,
      summary_date: date,
      total_feed_cost: totalCost,
      total_quantity_kg: totalQuantity,
      animals_fed: uniqueAnimals,
      feed_types_used: uniqueFeedTypes,
      cost_per_animal: costPerAnimal,
    }
    
    // Upsert daily summary
    await supabase
      .from('daily_feed_summary')
      .upsert(summaryData, { onConflict: 'farm_id,summary_date' })
    
  } catch (error) {
    console.error('Error updating daily feed summary:', error)
  }
}

export async function getFeedStats(farmId: string, days: number = 30) {
  const supabase = await createServerSupabaseClient()
  
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  try {
    // Get daily summaries
    const { data: summaries } = await supabase
      .from('daily_feed_summary')
      .select('*')
      .eq('farm_id', farmId)
      .gte('summary_date', startDate)
      .lte('summary_date', endDate)
      .order('summary_date', { ascending: false })
    
    // Get current stock levels
    const stockLevels = await getCurrentFeedStock(farmId)
    
    // Calculate totals
    const totalCost = summaries?.reduce((sum, s) => sum + (s.total_feed_cost || 0), 0) || 0
    const totalQuantity = summaries?.reduce((sum, s) => sum + (s.total_quantity_kg || 0), 0) || 0
    const avgDailyCost = summaries?.length ? totalCost / summaries.length : 0
    const avgDailyQuantity = summaries?.length ? totalQuantity / summaries.length : 0
    
    return {
      totalCost,
      totalQuantity,
      avgDailyCost,
      avgDailyQuantity,
      stockLevels,
      dailySummaries: summaries || [],
      periodDays: days,
    }
  } catch (error) {
    console.error('Error getting feed stats:', error)
    return {
      totalCost: 0,
      totalQuantity: 0,
      avgDailyCost: 0,
      avgDailyQuantity: 0,
      stockLevels: [],
      dailySummaries: [],
      periodDays: days,
    }
  }
}