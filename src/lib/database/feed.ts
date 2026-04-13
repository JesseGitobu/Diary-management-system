import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'

type FeedType = Database['public']['Tables']['feed_types']['Row']
type FeedTypeInsert = Database['public']['Tables']['feed_types']['Insert']
type FeedInventory = Database['public']['Tables']['feed_inventory']['Row']
type FeedInventoryInsert = Database['public']['Tables']['feed_inventory']['Insert']
type FeedConsumption = Database['public']['Tables']['feed_consumption_records']['Row']
type FeedConsumptionInsert = Database['public']['Tables']['feed_consumption_records']['Insert']

// Feed Types Management
const FEED_TYPE_ALLOWED_COLUMNS = [
  'name',
  'description',
  'category_id',
  'unit_of_measure',
  'nutritional_value',
  'cost_per_unit',
  'supplier_id',
  'notes',
  'typical_cost_per_kg',
  'animal_categories',
  'low_stock_threshold',
  'low_stock_threshold_unit',
] as const

type FeedTypeAllowedColumn = typeof FEED_TYPE_ALLOWED_COLUMNS[number]

type FeedTypePayload = Partial<Record<FeedTypeAllowedColumn, any>>

function sanitizeFeedTypePayload(data: any): FeedTypePayload {
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (key === 'preferred_measurement_unit') {
      // Convert empty string to null to avoid issues when no unit is selected
      acc.unit_of_measure = value === '' ? null : value
    } else if (key === 'nutritional_info') {
      acc.nutritional_value = value
    } else if (key === 'supplier') {
      acc.notes = value ? `Supplier: ${value}` : null
    } else if (key === 'category_id') {
      // category_id is a UUID foreign key — empty string causes a DB error
      acc.category_id = value === '' ? null : value
    } else if (key === 'low_stock_threshold_unit') {
      // Convert empty string to null to avoid validation errors
      acc.low_stock_threshold_unit = value === '' ? null : value
    } else if (FEED_TYPE_ALLOWED_COLUMNS.includes(key as FeedTypeAllowedColumn)) {
      acc[key as FeedTypeAllowedColumn] = value
    }
    return acc
  }, {} as FeedTypePayload)
}

export async function createFeedType(farmId: string, data: Omit<FeedTypeInsert, 'farm_id'>) {
  const supabase = await createServerSupabaseClient()
  const payload = sanitizeFeedTypePayload(data)
  
  const { data: feedType, error } = await (supabase
    .from('feed_types') as any)
    .insert({
      ...payload,
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
export async function addFeedInventory(farmId: string, data: any) {
  const supabase = await createServerSupabaseClient()

  const {
    feed_type_id, quantity_kg, source = 'purchased',
    cost_per_kg, purchase_date, expiry_date, supplier, batch_number, notes,
    nutritional_data,
  } = data

  const isPurchased = source === 'purchased'

  // 1. Record the feed entry (purchase or harvest)
  const { data: purchase, error: purchaseError } = await (supabase
    .from('feed_purchases') as any)
    .insert({
      farm_id:       farmId,
      feed_type_id,
      quantity_kg,
      source,
      cost_per_kg:   isPurchased ? (cost_per_kg ?? null) : null,
      purchase_date: purchase_date ?? new Date().toISOString().split('T')[0],
      expiry_date:   expiry_date ?? null,
      supplier:      isPurchased ? (supplier ?? null) : null,
      batch_number:  isPurchased ? (batch_number ?? null) : null,
      notes:         notes ?? null,
    })
    .select()
    .single()

  if (purchaseError) {
    console.error('Error recording feed entry:', purchaseError)
    return { success: false, error: purchaseError.message }
  }

  // 2. Save nutritional data if provided
  if (nutritional_data) {
    const hasValues = Object.values(nutritional_data).some(v => v !== null && v !== undefined && v !== '')
    if (hasValues) {
      const { error: nutritionError } = await (supabase
        .from('feed_nutritional_records') as any)
        .insert({
          farm_id:          farmId,
          feed_purchase_id: purchase.id,
          feed_type_id,
          ...nutritional_data,
        })

      if (nutritionError) {
        console.error('Error saving nutritional record:', nutritionError)
        // Non-fatal — stock still gets updated
      }
    }
  }

  // 3. Atomically upsert stock — inserts first row or increments existing stock
  const { error: stockError } = await supabase.rpc('upsert_feed_stock', {
    p_farm_id:      farmId,
    p_feed_type_id: feed_type_id,
    p_quantity_kg:  quantity_kg,
  })

  if (stockError) {
    console.error('Error updating feed stock level:', stockError)
    return { success: false, error: stockError.message }
  }

  return { success: true, data: purchase }
}

export async function getFeedInventory(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  // Get inventory data with feed type information
  const { data: inventoryData, error: inventoryError } = await supabase
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
    .order('updated_at', { ascending: false })
  
  if (inventoryError) {
    console.error('Error fetching feed inventory:', inventoryError)
    return []
  }
  
  if (!inventoryData || inventoryData.length === 0) {
    return []
  }
  
  // Get the most recent purchase for each feed type
  const feedTypeIds = inventoryData.map(item => item.feed_type_id)
  const { data: purchasesData, error: purchasesError } = await supabase
    .from('feed_purchases')
    .select(`
      id,
      feed_type_id,
      quantity_kg,
      cost_per_kg,
      purchase_date,
      expiry_date,
      supplier,
      batch_number,
      notes,
      source
    `)
    .in('feed_type_id', feedTypeIds)
    .eq('farm_id', farmId)
    .order('purchase_date', { ascending: false })
  
  if (purchasesError) {
    console.error('Error fetching purchase data:', purchasesError)
  }
  
  // Get nutritional data for the most recent purchases
  let nutritionalData: any[] = []
  if (purchasesData && purchasesData.length > 0) {
    const purchaseIds = purchasesData.map(p => p.id)
    const { data: nutritionData, error: nutritionError } = await supabase
      .from('feed_nutritional_records')
      .select(`
        feed_purchase_id,
        protein_pct,
        fat_pct,
        fiber_pct,
        moisture_pct,
        ash_pct,
        energy_mj_kg,
        dry_matter_pct,
        ndf_pct,
        adf_pct,
        notes
      `)
      .in('feed_purchase_id', purchaseIds)
      .eq('farm_id', farmId)
    
    if (nutritionError) {
      console.error('Error fetching nutritional data:', nutritionError)
    } else {
      nutritionalData = nutritionData || []
    }
  }
  
  // Create maps for efficient lookup
  const latestPurchases = new Map()
  if (purchasesData) {
    purchasesData.forEach(purchase => {
      if (!latestPurchases.has(purchase.feed_type_id)) {
        latestPurchases.set(purchase.feed_type_id, purchase)
      }
    })
  }
  
  const nutritionalMap = new Map()
  nutritionalData.forEach(nutrition => {
    nutritionalMap.set(nutrition.feed_purchase_id, nutrition)
  })
  
  // Merge all data
  const processedData = inventoryData.map(item => {
    const latestPurchase = latestPurchases.get(item.feed_type_id)
    const nutrition = latestPurchase ? nutritionalMap.get(latestPurchase.id) : null
    
    return {
      ...item,
      latest_purchase: latestPurchase || null,
      nutritional_data: nutrition || null,
    }
  })
  
  return processedData
}

export async function getCurrentFeedStock(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get total inventory by feed type
    const { data: inventoryData } = await supabase
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
    
    // FIXED: Cast to any[]
    const inventory = (inventoryData as any[]) || []

    // Get total consumption by feed type
    const { data: consumptionData } = await supabase
      .from('feed_consumption_records')
      .select('feed_type_id, quantity_consumed')
      .eq('farm_id', farmId)
    
    // FIXED: Cast to any[]
    const consumption = (consumptionData as any[]) || []

    // Calculate current stock levels
    const stockLevels = new Map()
    
    // Add inventory
    inventory.forEach(item => {
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
    consumption.forEach(item => {
      const feedTypeId = item.feed_type_id
      if (stockLevels.has(feedTypeId)) {
        const stock = stockLevels.get(feedTypeId)
        stock.totalConsumed += item.quantity_consumed || 0
      }
    })
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
export async function recordFeedConsumption(farmId: string, data: any) {
  const supabase = await createServerSupabaseClient()
  
  const { data: consumption, error } = await (supabase
    .from('feed_consumption_records') as any)
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
  if (data.consumption_date) {
    await updateDailyFeedSummary(farmId, data.consumption_date)
  }
  
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
    .from('feed_consumption_records')
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
    // Calculate daily totals - get consumption with feed type cost information
    const { data: dailyConsumptionData, error: consumptionError } = await supabase
      .from('feed_consumption_records')
      .select(`
        id,
        quantity_consumed,
        feed_type_id,
        feed_types!inner (
          typical_cost_per_kg
        )
      `)
      .eq('farm_id', farmId)
      .gte('consumption_date', date)
      .lte('consumption_date', date)
    
    if (consumptionError) {
      console.error('Error fetching daily consumption:', consumptionError)
      return
    }

    // FIXED: Cast to any[]
    const dailyConsumption = (dailyConsumptionData as any[]) || []
    
    if (!dailyConsumption || dailyConsumption.length === 0) {
      // Delete summary if no consumption
      await supabase
        .from('daily_feed_summary')
        .delete()
        .eq('farm_id', farmId)
        .eq('summary_date', date)
      return
    }
    
    // Calculate totals
    const totalQuantity = dailyConsumption.reduce((sum, record) => sum + (record.quantity_consumed || 0), 0)
    
    // Calculate total cost using feed type's typical cost
    const totalCost = dailyConsumption.reduce((sum, record) => {
      const costPerKg = record.feed_types?.typical_cost_per_kg || 0
      return sum + ((record.quantity_consumed || 0) * costPerKg)
    }, 0)
    
    // Count unique feed types used
    const uniqueFeedTypes = new Set(dailyConsumption.map(r => r.feed_type_id)).size
    
    // Count unique animals fed (each record represents one animal)
    const uniqueAnimalsFed = new Set(dailyConsumption.map(r => r.animal_id)).size
    const totalAnimalsFed = uniqueAnimalsFed
    
    const costPerAnimal = totalAnimalsFed > 0 ? totalCost / totalAnimalsFed : 0
    
    const summaryData = {
      farm_id: farmId,
      summary_date: date,
      total_feed_cost: totalCost,
      total_quantity_kg: totalQuantity,
      animals_fed: totalAnimalsFed,
      feed_types_used: uniqueFeedTypes,
      cost_per_animal: costPerAnimal,
    }
    
    // Upsert daily summary
    const { error: upsertError } = await (supabase
      .from('daily_feed_summary') as any)
      .upsert(summaryData, { onConflict: 'farm_id,summary_date' })
    
    if (upsertError) {
      console.error('Error upserting daily summary:', upsertError)
    }
    
  } catch (error) {
    console.error('Error updating daily feed summary:', error)
  }
}

// Update your getFeedStats function in lib/database/feed.ts to actually use daily summaries

export async function getFeedStats(farmId: string, days: number = 30) {
  const supabase = await createServerSupabaseClient()
  
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  try {
    // Get daily summaries (this uses the data from updateDailyFeedSummary)
    const { data: summariesData, error: summariesError } = await supabase
      .from('daily_feed_summary')
      .select('*')
      .eq('farm_id', farmId)
      .gte('summary_date', startDate)
      .lte('summary_date', endDate)
      .order('summary_date', { ascending: false })

    if (summariesError) {
      console.error('Error fetching daily summaries:', summariesError)
    }

    // FIXED: Cast to any[]
    const summaries = (summariesData as any[]) || []

    // Get enhanced stock levels with consumption data
    const { data: feedTypesData, error: feedTypesError } = await supabase
      .from('feed_types')
      .select('id, name, description, typical_cost_per_kg')
      .eq('farm_id', farmId)

    if (feedTypesError) {
      console.error('Error fetching feed types:', feedTypesError)
    }

    // Calculate current stock levels per feed type
    const stockLevels = []
    
    for (const feedType of (feedTypesData as any[] || [])) {
      // Get total inventory for this feed type
      const { data: inventoryData } = await supabase
        .from('feed_inventory')
        .select('quantity_in_stock, minimum_threshold')
        .eq('farm_id', farmId)
        .eq('feed_type_id', feedType.id)

      // FIXED: Cast to any[]
      const inventory = (inventoryData as any[]) || []

      // Get total consumption for this feed type
      const { data: consumptionData } = await supabase
        .from('feed_consumption_records')
        .select('id, quantity_consumed, consumption_date')
        .eq('farm_id', farmId)
        .eq('feed_type_id', feedType.id)
        .gte('consumption_date', `${startDate}T00:00:00`)
        .lte('consumption_date', `${endDate}T23:59:59`)

      // FIXED: Cast to any[]
      const consumption = (consumptionData as any[]) || []

      // Get total all-time consumption for this feed type
      const { data: allTimeConsumptionData } = await supabase
        .from('feed_consumption_records')
        .select('quantity_consumed')
        .eq('farm_id', farmId)
        .eq('feed_type_id', feedType.id)

      // FIXED: Cast to any[]
      const allTimeConsumption = (allTimeConsumptionData as any[]) || []

      const totalPurchased = inventory.reduce((sum, item) => sum + (item.quantity_in_stock || 0), 0) || 0
      const totalAllTimeConsumed = allTimeConsumption.reduce((sum, item) => sum + (item.quantity_consumed || 0), 0) || 0
      const currentStock = totalPurchased // quantity_in_stock is already the current stock

      // Calculate period consumption stats
      const periodConsumption = consumption.reduce((sum, item) => sum + (item.quantity_consumed || 0), 0) || 0
      const periodSessions = consumption.length || 0
      
      // Count unique animals fed in period (each record is one animal)
      const periodAnimalsFed = new Set(consumption.map(r => r.animal_id)).size

      const avgCostPerKg = feedType.typical_cost_per_kg || 0

      // Only include feeds that have been consumed or have current stock
      if (periodConsumption > 0 || currentStock > 0) {
        stockLevels.push({
          feedType: {
            id: feedType.id,
            name: feedType.name,
            description: feedType.description
          },
          currentStock,
          avgCostPerKg,
          totalPurchased,
          totalAllTimeConsumed,
          // Period-specific data
          periodConsumption,
          periodSessions,
          periodAnimalsFed,
          avgPerSession: periodSessions > 0 ? periodConsumption / periodSessions : 0,
          avgAnimalsPerSession: periodSessions > 0 ? periodAnimalsFed / periodSessions : 0,
          // Threshold info - use minimum_threshold from inventory
          threshold: (inventory[0]?.minimum_threshold || 50),
          percentageOfThreshold: ((currentStock / (inventory[0]?.minimum_threshold || 50)) * 100),
          status: currentStock <= (inventory[0]?.minimum_threshold || 50) * 0.2 ? 'critical' :
                  currentStock < (inventory[0]?.minimum_threshold || 50) ? 'low' : 'good'
        })
      }
    }
    
    // Calculate totals from daily summaries
    const totalCost = summaries.reduce((sum, s) => sum + (s.total_feed_cost || 0), 0) || 0
    const totalQuantity = summaries.reduce((sum, s) => sum + (s.total_quantity_kg || 0), 0) || 0
    const avgDailyCost = summaries.length ? totalCost / summaries.length : 0
    const avgDailyQuantity = summaries.length ? totalQuantity / summaries.length : 0
    const totalAnimalsFed = summaries.reduce((sum, s) => sum + (s.animals_fed || 0), 0) || 0
    const totalSessions = stockLevels.reduce((sum, stock) => sum + stock.periodSessions, 0)

    return {
      totalCost,
      totalQuantity,
      avgDailyCost,
      avgDailyQuantity,
      totalAnimalsFed,
      totalSessions,
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
      totalAnimalsFed: 0,
      totalSessions: 0,
      stockLevels: [],
      dailySummaries: [],
      periodDays: days,
    }
  }
}

export async function getFeedConsumptionRecords(farmId: string, limit: number = 50) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: records, error } = await supabase
      .from('feed_consumption_records')
      .select(`
        id,
        animal_id,
        feed_type_id,
        quantity_consumed,
        consumption_date,
        batch_id,
        notes,
        created_at,
        feed_types (
          id,
          name,
          description
        )
      `)
      .eq('farm_id', farmId)
      .order('consumption_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching consumption records:', error)
      return []
    }

    return records || []
  } catch (error) {
    console.error('Error in getFeedConsumptionRecords:', error)
    return []
  }
}

// Add these functions to your existing lib/database/feed.ts file

// Update Feed Type
export async function updateFeedType(
  farmId: string, 
  feedTypeId: string, 
  data: Omit<FeedTypeInsert, 'farm_id' | 'id'>
) {
  const supabase = await createServerSupabaseClient()
  
  // First check if the feed type belongs to the farm
  const { data: existingFeedType, error: checkError } = await supabase
    .from('feed_types')
    .select('id')
    .eq('id', feedTypeId)
    .eq('farm_id', farmId)
    .single()
  
  if (checkError || !existingFeedType) {
    return { success: false, error: 'Feed type not found or access denied' }
  }
  
  const payload = sanitizeFeedTypePayload(data)
  
  const { data: feedType, error } = await (supabase
    .from('feed_types') as any)
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', feedTypeId)
    .eq('farm_id', farmId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating feed type:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data: feedType }
}

// Delete Feed Type
export async function deleteFeedType(farmId: string, feedTypeId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // First check if the feed type belongs to the farm
    const { data: existingFeedType, error: checkError } = await supabase
      .from('feed_types')
      .select('id, name')
      .eq('id', feedTypeId)
      .eq('farm_id', farmId)
      .single()
    
    if (checkError || !existingFeedType) {
      return { success: false, error: 'Feed type not found or access denied' }
    }
    
    // Check if there are any inventory records using this feed type
    const { data: inventoryRecords, error: inventoryError } = await supabase
      .from('feed_inventory')
      .select('id')
      .eq('feed_type_id', feedTypeId)
      .eq('farm_id', farmId)
      .limit(1)
    
    if (inventoryError) {
      console.error('Error checking inventory records:', inventoryError)
      return { success: false, error: 'Error checking related records' }
    }
    
    if (inventoryRecords && inventoryRecords.length > 0) {
      return { 
        success: false, 
        error: 'Cannot delete feed type with existing inventory records. Please remove or reassign inventory first.' 
      }
    }
    
    // Check if there are any consumption records using this feed type
    const { data: consumptionRecords, error: consumptionError } = await supabase
      .from('feed_consumption_records')
      .select('id')
      .eq('feed_type_id', feedTypeId)
      .eq('farm_id', farmId)
      .limit(1)
    
    if (consumptionError) {
      console.error('Error checking consumption records:', consumptionError)
      return { success: false, error: 'Error checking related records' }
    }
    
    if (consumptionRecords && consumptionRecords.length > 0) {
      return { 
        success: false, 
        error: 'Cannot delete feed type with existing consumption records. This feed type has been used in feeding sessions.' 
      }
    }
    
    // If no related records, proceed with deletion
    const { error: deleteError } = await supabase
      .from('feed_types')
      .delete()
      .eq('id', feedTypeId)
      .eq('farm_id', farmId)
    
    if (deleteError) {
      console.error('Error deleting feed type:', deleteError)
      return { success: false, error: deleteError.message }
    }
    
    return { success: true }
    
  } catch (error) {
    console.error('Error in deleteFeedType:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Get Feed Type by ID (helper function)
export async function getFeedTypeById(farmId: string, feedTypeId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('feed_types')
    .select('*')
    .eq('id', feedTypeId)
    .eq('farm_id', farmId)
    .single()
  
  if (error) {
    console.error('Error fetching feed type:', error)
    return null
  }
  
  return data
}
// Update Feed Consumption Record
export async function updateFeedConsumption(
  farmId: string, 
  consumptionId: string, 
  data: {
    feedTypeId?: string
    quantityKg?: number
    animalIds?: string[]
    animalCount?: number
    feedingTime?: string
    notes?: string
    feedingMode?: string
    batchId?: string
  }
) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // First check if the consumption record belongs to the farm
    const { data: existingRecord, error: checkError } = await supabase
      .from('feed_consumption_records')
      .select('id, farm_id')
      .eq('id', consumptionId)
      .eq('farm_id', farmId)
      .single()
    
    if (checkError || !existingRecord) {
      return { success: false, error: 'Consumption record not found or access denied' }
    }
    
    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (data.feedTypeId) updateData.feed_type_id = data.feedTypeId
    if (data.quantityKg !== undefined) updateData.quantity_consumed = data.quantityKg
    if (data.feedingTime) updateData.consumption_date = data.feedingTime
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.batchId !== undefined) updateData.batch_id = data.batchId
    
    // Update the consumption record
    const { data: updatedRecord, error: updateError } = await (supabase
      .from('feed_consumption_records') as any)
      .update(updateData)
      .eq('id', consumptionId)
      .eq('farm_id', farmId)
      .select(`
        *,
        feed_types (
          id,
          name,
          description
        )
      `)
      .single()
    
    if (updateError) {
      console.error('Error updating consumption record:', updateError)
      return { success: false, error: updateError.message }
    }
    
    // Update daily summary if consumption date was changed
    if (data.feedingTime) {
      const date = new Date(data.feedingTime).toISOString().split('T')[0]
      await updateDailyFeedSummary(farmId, date)
    }
    
    return { success: true, data: updatedRecord }
    
  } catch (error) {
    console.error('Error in updateFeedConsumption:', error)
    return { success: false, error: 'An unexpected error occurred while updating the record' }
  }
}

// Delete Feed Consumption Record
export async function deleteFeedConsumption(farmId: string, consumptionId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // First check if the consumption record belongs to the farm and get the feeding date
    const { data: existingRecord, error: checkError } = await (supabase
      .from('feed_consumption_records') as any)
      .select('id, farm_id, consumption_date')
      .eq('id', consumptionId)
      .eq('farm_id', farmId)
      .single()
    
    if (checkError || !existingRecord) {
      return { success: false, error: 'Consumption record not found or access denied' }
    }
    
    const feedingDate = existingRecord.consumption_date
    
    // Delete the consumption record
    const { error: deleteError } = await supabase
      .from('feed_consumption_records')
      .delete()
      .eq('id', consumptionId)
      .eq('farm_id', farmId)
    
    if (deleteError) {
      console.error('Error deleting consumption record:', deleteError)
      return { success: false, error: deleteError.message }
    }
    
    // Update daily summary if we have a feeding date
    if (feedingDate) {
      await updateDailyFeedSummary(farmId, feedingDate)
    }
    
    return { success: true, message: 'Consumption record deleted successfully' }
    
  } catch (error) {
    console.error('Error in deleteFeedConsumption:', error)
    return { success: false, error: 'An unexpected error occurred while deleting the record' }
  }
}

// Get Feed Consumption Record by ID (helper function)
export async function getFeedConsumptionById(farmId: string, consumptionId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .from('feed_consumption_records')
      .select(`
        *,
        feed_types (
          id,
          name,
          description
        ),
        animals (
          id,
          tag_number,
          name
        )
      `)
      .eq('id', consumptionId)
      .eq('farm_id', farmId)
      .single()
    
    if (error) {
      console.error('Error fetching consumption record:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error in getFeedConsumptionById:', error)
    return null
  }
}