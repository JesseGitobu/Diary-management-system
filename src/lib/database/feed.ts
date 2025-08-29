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
  if (data.feeding_time) {
    await updateDailyFeedSummary(farmId, data.feeding_time)
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
    // Calculate daily totals - get consumption with feed type cost information
    const { data: dailyConsumption, error: consumptionError } = await supabase
      .from('feed_consumption')
      .select(`
        id,
        quantity_kg,
        feed_type_id,
        animal_count,
        feeding_mode,
        feed_types!inner (
          typical_cost_per_kg
        )
      `)
      .eq('farm_id', farmId)
      .gte('feeding_time', `${date}T00:00:00`)
      .lt('feeding_time', `${date}T23:59:59`)
    
    if (consumptionError) {
      console.error('Error fetching daily consumption:', consumptionError)
      return
    }
    
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
    const totalQuantity = dailyConsumption.reduce((sum, record) => sum + (record.quantity_kg || 0), 0)
    
    // Calculate total cost using feed type's typical cost
    const totalCost = dailyConsumption.reduce((sum, record) => {
      const costPerKg = record.feed_types?.typical_cost_per_kg || 0
      return sum + ((record.quantity_kg || 0) * costPerKg)
    }, 0)
    
    // Count unique feed types used
    const uniqueFeedTypes = new Set(dailyConsumption.map(r => r.feed_type_id)).size
    
    // Calculate total animals fed
    let totalAnimalsFed = 0
    for (const record of dailyConsumption) {
      if (record.feeding_mode === 'batch') {
        // For batch feeding, use animal_count
        totalAnimalsFed += record.animal_count || 0
      } else if (record.feeding_mode === 'individual') {
        // For individual feeding, count from junction table
        const { data: animalAssociations } = await supabase
          .from('feed_consumption_animals')
          .select('animal_id')
          .eq('consumption_id', record.id)
        
        totalAnimalsFed += animalAssociations?.length || 1 // Default to 1 if no associations found
      }
    }
    
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
    const { error: upsertError } = await supabase
      .from('daily_feed_summary')
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
    const { data: summaries, error: summariesError } = await supabase
      .from('daily_feed_summary')
      .select('*')
      .eq('farm_id', farmId)
      .gte('summary_date', startDate)
      .lte('summary_date', endDate)
      .order('summary_date', { ascending: false })

    if (summariesError) {
      console.error('Error fetching daily summaries:', summariesError)
    }

    // Get enhanced stock levels with consumption data
    const { data: feedTypesData, error: feedTypesError } = await supabase
      .from('feed_types')
      .select('id, name, description, low_stock_threshold, typical_cost_per_kg')
      .eq('farm_id', farmId)

    if (feedTypesError) {
      console.error('Error fetching feed types:', feedTypesError)
    }

    // Calculate current stock levels per feed type
    const stockLevels = []
    
    for (const feedType of feedTypesData || []) {
      // Get total inventory for this feed type
      const { data: inventoryData } = await supabase
        .from('feed_inventory')
        .select('quantity_kg, cost_per_kg')
        .eq('farm_id', farmId)
        .eq('feed_type_id', feedType.id)

      // Get total consumption for this feed type
      const { data: consumptionData } = await supabase
        .from('feed_consumption')
        .select('id, quantity_kg, animal_count, feeding_mode, feeding_time')
        .eq('farm_id', farmId)
        .eq('feed_type_id', feedType.id)
        .gte('feeding_time', `${startDate}T00:00:00`)
        .lte('feeding_time', `${endDate}T23:59:59`)

      // Get total all-time consumption for this feed type
      const { data: allTimeConsumption } = await supabase
        .from('feed_consumption')
        .select('quantity_kg')
        .eq('farm_id', farmId)
        .eq('feed_type_id', feedType.id)

      const totalPurchased = inventoryData?.reduce((sum, item) => sum + (item.quantity_kg || 0), 0) || 0
      const totalAllTimeConsumed = allTimeConsumption?.reduce((sum, item) => sum + (item.quantity_kg || 0), 0) || 0
      const currentStock = totalPurchased - totalAllTimeConsumed

      // Calculate period consumption stats
      const periodConsumption = consumptionData?.reduce((sum, item) => sum + (item.quantity_kg || 0), 0) || 0
      const periodSessions = consumptionData?.length || 0
      
      // Calculate animals fed in period
      let periodAnimalsFed = 0
      for (const record of consumptionData || []) {
        if (record.feeding_mode === 'batch') {
          periodAnimalsFed += record.animal_count || 0
        } else {
          // For individual feeding, query the junction table
          const { data: animalAssociations } = await supabase
            .from('feed_consumption_animals')
            .select('animal_id')
            .in('consumption_id', consumptionData?.map(r => r.id) || [])
          
          periodAnimalsFed += animalAssociations?.length || consumptionData?.length || 0
        }
      }

      const avgCostPerKg = inventoryData?.length ? 
        inventoryData.reduce((sum, item) => sum + (item.cost_per_kg || 0), 0) / inventoryData.length : 
        feedType.typical_cost_per_kg || 0

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
          // Threshold info
          threshold: feedType.low_stock_threshold || 50,
          percentageOfThreshold: ((currentStock / (feedType.low_stock_threshold || 50)) * 100),
          status: currentStock <= (feedType.low_stock_threshold || 50) * 0.2 ? 'critical' :
                  currentStock < (feedType.low_stock_threshold || 50) ? 'low' : 'good'
        })
      }
    }
    
    // Calculate totals from daily summaries
    const totalCost = summaries?.reduce((sum, s) => sum + (s.total_feed_cost || 0), 0) || 0
    const totalQuantity = summaries?.reduce((sum, s) => sum + (s.total_quantity_kg || 0), 0) || 0
    const avgDailyCost = summaries?.length ? totalCost / summaries.length : 0
    const avgDailyQuantity = summaries?.length ? totalQuantity / summaries.length : 0
    const totalAnimalsFed = summaries?.reduce((sum, s) => sum + (s.animals_fed || 0), 0) || 0
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
      .from('feed_consumption')
      .select(`
        id,
        feed_type_id,
        quantity_kg,
        feeding_time,
        feeding_mode,
        animal_count,
        notes,
        recorded_by,
        created_at,
        feed_types (
          id,
          name,
          description
        )
      `)
      .eq('farm_id', farmId)
      .order('feeding_time', { ascending: false })
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
  
  const { data: feedType, error } = await supabase
    .from('feed_types')
    .update({
      ...data,
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
      .from('feed_consumption')
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
      .from('feed_consumption')
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
    if (data.quantityKg !== undefined) updateData.quantity_kg = data.quantityKg
    if (data.animalCount !== undefined) updateData.animal_count = data.animalCount
    if (data.feedingTime) updateData.feeding_time = data.feedingTime
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.feedingMode) updateData.feeding_mode = data.feedingMode
    if (data.batchId !== undefined) updateData.batch_id = data.batchId
    
    // Update the consumption record
    const { data: updatedRecord, error: updateError } = await supabase
      .from('feed_consumption')
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
    
    // Handle animal associations for individual feeding mode
    if (data.feedingMode === 'individual' && data.animalIds) {
      // Delete existing associations
      const { error: deleteAssociationsError } = await supabase
        .from('feed_consumption_animals')
        .delete()
        .eq('consumption_id', consumptionId)
      
      if (deleteAssociationsError) {
        console.error('Error deleting existing animal associations:', deleteAssociationsError)
      }
      
      // Insert new associations if there are animal IDs
      if (data.animalIds.length > 0) {
        const animalAssociations = data.animalIds.map(animalId => ({
          consumption_id: consumptionId,
          animal_id: animalId
        }))
        
        const { error: insertAssociationsError } = await supabase
          .from('feed_consumption_animals')
          .insert(animalAssociations)
        
        if (insertAssociationsError) {
          console.error('Error inserting new animal associations:', insertAssociationsError)
          // Continue despite this error as the main record was updated
        }
      }
    }
    
    // Update daily summary if feeding time was changed
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
    const { data: existingRecord, error: checkError } = await supabase
      .from('feed_consumption')
      .select('id, farm_id, feeding_time')
      .eq('id', consumptionId)
      .eq('farm_id', farmId)
      .single()
    
    if (checkError || !existingRecord) {
      return { success: false, error: 'Consumption record not found or access denied' }
    }
    
    const feedingDate = existingRecord.feeding_time ? 
      new Date(existingRecord.feeding_time).toISOString().split('T')[0] : null
    
    // Delete associated animal records first (if any)
    const { error: deleteAssociationsError } = await supabase
      .from('feed_consumption_animals')
      .delete()
      .eq('consumption_id', consumptionId)
    
    if (deleteAssociationsError) {
      console.error('Error deleting animal associations:', deleteAssociationsError)
      // Continue with deletion even if associations couldn't be deleted
    }
    
    // Delete the consumption record
    const { error: deleteError } = await supabase
      .from('feed_consumption')
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
      .from('feed_consumption')
      .select(`
        *,
        feed_types (
          id,
          name,
          description
        ),
        feed_consumption_animals (
          animal_id,
          animals (
            id,
            tag_number,
            name
          )
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