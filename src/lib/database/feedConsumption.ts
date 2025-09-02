// lib/database/feedConsumption.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Types
export interface FeedConsumptionRecord {
  id: string
  farm_id: string
  feed_type_id: string
  quantity_kg: number
  feeding_time: string
  feeding_mode: 'individual' | 'batch'
  animal_count: number
  consumption_batch_id?: string
  notes?: string
  recorded_by?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface FeedConsumptionAnimal {
  id: string
  consumption_id: string
  animal_id: string
  created_at: string
}

export interface FeedConsumptionEntry {
  feedTypeId: string
  quantityKg: number
  animalIds: string[]
  animalCount?: number
  perCowQuantityKg?: number
  batchId?: string
  notes?: string
}

export interface ConsumptionData {
  farmId: string
  feedingTime: string
  mode: 'individual' | 'batch'
  batchId?: string
  entries: FeedConsumptionEntry[]
  recordedBy?: string
  globalNotes?: string
}

export interface FeedConsumptionStats {
  totalQuantity: number
  avgDailyQuantity: number
  recordCount: number
  dailySummaries: Array<{
    date: string
    quantity: number
  }>
  periodDays: number
}

// ============ CREATE FEED CONSUMPTION ============

export async function recordFeedConsumption(
  data: ConsumptionData,
  userId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    const consumptionRecords = []

    // Process each entry
    for (const entry of data.entries) {
      // Validate entry
      if (!entry.feedTypeId || !entry.quantityKg) {
        return { success: false, error: 'Each entry must have feedTypeId and quantityKg' }
      }

      // Mode-specific validation
      if (data.mode === 'individual') {
        if (!entry.animalIds || entry.animalIds.length === 0) {
          return { success: false, error: 'Individual mode requires at least one animal ID' }
        }
      } else if (data.mode === 'batch') {
        if (!entry.animalCount || entry.animalCount <= 0) {
          return { success: false, error: 'Batch mode requires animalCount greater than 0' }
        }
      }

      // Create proper timestamp
      let feedingTimestamp: string
      if (data.feedingTime) {
        if (data.feedingTime.match(/^\d{2}:\d{2}$/)) {
          const today = new Date()
          const [hours, minutes] = data.feedingTime.split(':')
          today.setHours(parseInt(hours), parseInt(minutes), 0, 0)
          feedingTimestamp = today.toISOString()
        } else {
          feedingTimestamp = new Date(data.feedingTime).toISOString()
        }
      } else {
        feedingTimestamp = new Date().toISOString()
      }

      // Create consumption record
      const insertData = {
        farm_id: data.farmId,
        feed_type_id: entry.feedTypeId,
        quantity_kg: parseFloat(entry.quantityKg.toString()),
        feeding_time: feedingTimestamp,
        feeding_mode: data.mode,
        animal_count: data.mode === 'batch' ? entry.animalCount : (entry.animalIds?.length || 1),
        // consumption_batch_id: entry.batchId || data.batchId || undefined,
        notes: entry.notes || data.globalNotes || undefined,
        recorded_by: data.recordedBy || 'Unknown',
        created_by: userId
      }

      const { data: consumptionRecord, error: consumptionError } = await supabase
        .from('feed_consumption')
        .insert(insertData)
        .select()
        .single()

      if (consumptionError) {
        console.error('Consumption insert error:', consumptionError)
        return { 
          success: false, 
          error: `Failed to create consumption record: ${consumptionError.message}` 
        }
      }

      // Create animal consumption records
      if (entry.animalIds && entry.animalIds.length > 0) {
        // Calculate quantity per animal
        let quantityPerAnimal: number
        if (entry.perCowQuantityKg) {
          quantityPerAnimal = entry.perCowQuantityKg
        } else {
          quantityPerAnimal = entry.quantityKg / entry.animalIds.length
        }

        const animalRecords = entry.animalIds.map(animalId => ({
          consumption_id: consumptionRecord.id,
          animal_id: animalId
        }))

        const { error: animalError } = await supabase
          .from('feed_consumption_animals')
          .insert(animalRecords)

        if (animalError) {
          console.error('Animal consumption insert error:', animalError)
          // Continue processing but log the warning
          console.warn('Failed to link animals to consumption record, but consumption was recorded')
        }
      }

      // Update inventory (deduct consumed feed)
      await updateFeedInventory(data.farmId, entry.feedTypeId, -entry.quantityKg)

      consumptionRecords.push(consumptionRecord)
    }

    return { success: true, data: consumptionRecords }
  } catch (error) {
    console.error('Error recording feed consumption:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to record consumption' 
    }
  }
}

// ============ UPDATE FEED CONSUMPTION ============

export async function updateFeedConsumption(
  recordId: string,
  data: ConsumptionData,
  userId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get the original record for inventory adjustment
    const { data: originalRecord, error: fetchError } = await supabase
      .from('feed_consumption')
      .select('*')
      .eq('id', recordId)
      .eq('farm_id', data.farmId)
      .single()

    if (fetchError || !originalRecord) {
      return { success: false, error: 'Original consumption record not found' }
    }

    // Only process the first entry for updates (assuming single entry updates)
    const entry = data.entries[0]
    if (!entry) {
      return { success: false, error: 'No entry data provided' }
    }

    // Create proper timestamp
    let feedingTimestamp: string
    if (data.feedingTime.match(/^\d{2}:\d{2}$/)) {
      const today = new Date()
      const [hours, minutes] = data.feedingTime.split(':')
      today.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      feedingTimestamp = today.toISOString()
    } else {
      feedingTimestamp = new Date(data.feedingTime).toISOString()
    }

    // Update consumption record
    const updateData: Partial<FeedConsumptionRecord> = {
      feed_type_id: entry.feedTypeId,
      quantity_kg: parseFloat(entry.quantityKg.toString()),
      feeding_time: feedingTimestamp,
      feeding_mode: data.mode,
      animal_count: data.mode === 'batch' ? entry.animalCount : (entry.animalIds?.length || 1),
      consumption_batch_id: entry.batchId || data.batchId || undefined,
      notes: entry.notes || data.globalNotes || undefined,
      updated_at: new Date().toISOString()
    }

    const { data: updatedRecord, error: updateError } = await supabase
      .from('feed_consumption')
      .update(updateData)
      .eq('id', recordId)
      .eq('farm_id', data.farmId)
      .select()
      .single()

    if (updateError) {
      console.error('Consumption update error:', updateError)
      return { 
        success: false, 
        error: `Failed to update consumption record: ${updateError.message}` 
      }
    }

    // Delete existing animal records
    await supabase
      .from('feed_consumption_animals')
      .delete()
      .eq('consumption_id', recordId)

    // Create new animal consumption records
    if (entry.animalIds && entry.animalIds.length > 0) {
      let quantityPerAnimal: number
      if (entry.perCowQuantityKg) {
        quantityPerAnimal = entry.perCowQuantityKg
      } else {
        quantityPerAnimal = entry.quantityKg / entry.animalIds.length
      }

      const animalRecords = entry.animalIds.map(animalId => ({
        consumption_id: recordId,
        animal_id: animalId
      }))

      const { error: animalError } = await supabase
        .from('feed_consumption_animals')
        .insert(animalRecords)

      if (animalError) {
        console.error('Animal consumption insert error:', animalError)
      }
    }

    // Adjust inventory (restore original quantity, then deduct new quantity)
    if (originalRecord.feed_type_id === entry.feedTypeId) {
      // Same feed type - adjust difference
      const quantityDifference = entry.quantityKg - originalRecord.quantity_kg
      if (quantityDifference !== 0) {
        await updateFeedInventory(data.farmId, entry.feedTypeId, -quantityDifference)
      }
    } else {
      // Different feed type - restore original and deduct new
      await updateFeedInventory(data.farmId, originalRecord.feed_type_id, originalRecord.quantity_kg)
      await updateFeedInventory(data.farmId, entry.feedTypeId, -entry.quantityKg)
    }

    return { success: true, data: updatedRecord }
  } catch (error) {
    console.error('Error updating feed consumption:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update consumption' 
    }
  }
}

// ============ DELETE FEED CONSUMPTION ============

export async function deleteFeedConsumption(
  recordId: string,
  farmId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get the record for inventory restoration
    const { data: record, error: fetchError } = await supabase
      .from('feed_consumption')
      .select('*')
      .eq('id', recordId)
      .eq('farm_id', farmId)
      .single()

    if (fetchError || !record) {
      return { success: false, error: 'Consumption record not found' }
    }

    // Delete animal consumption records first (due to foreign key constraint)
    await supabase
      .from('feed_consumption_animals')
      .delete()
      .eq('consumption_id', recordId)

    // Delete the main consumption record
    const { error: deleteError } = await supabase
      .from('feed_consumption')
      .delete()
      .eq('id', recordId)
      .eq('farm_id', farmId)

    if (deleteError) {
      console.error('Consumption delete error:', deleteError)
      return { success: false, error: `Failed to delete consumption record: ${deleteError.message}` }
    }

    // Restore inventory (add back the consumed quantity)
    await updateFeedInventory(farmId, record.feed_type_id, record.quantity_kg)

    return { success: true }
  } catch (error) {
    console.error('Error deleting feed consumption:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete consumption' 
    }
  }
}

// ============ GET FEED CONSUMPTION RECORDS ============

export async function getFeedConsumptionRecords(
  farmId: string,
  limit: number = 50,
  offset: number = 0
): Promise<FeedConsumptionRecord[]> {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .from('feed_consumption')
      .select(`
        *,
        feed_types (
          name,
          category
        ),
        consumption_batches (
          batch_name
        ),
        feed_consumption_animals (
          animal_id,
          animals (
            tag_number,
            name
          )
        )
      `)
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching consumption records:', error)
      return []
    }

    return (data?.map(record => ({
      ...record,
      feeding_mode: record.feeding_mode as 'individual' | 'batch'
    })) || []) as FeedConsumptionRecord[]
  } catch (error) {
    console.error('Error in getFeedConsumptionRecords:', error)
    return []
  }
}

// ============ GET CONSUMPTION STATISTICS ============

export async function getFeedConsumptionStats(
  farmId: string,
  days: number = 30
): Promise<FeedConsumptionStats> {
  const supabase = await createServerSupabaseClient()
  
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    const { data, error } = await supabase
      .from('feed_consumption')
      .select('quantity_kg, feeding_time, feed_type_id')
      .eq('farm_id', farmId)
      .gte('feeding_time', startDate.toISOString())
      .lte('feeding_time', endDate.toISOString())

    if (error) {
      console.error('Error fetching consumption stats:', error)
      return {
        totalQuantity: 0,
        avgDailyQuantity: 0,
        recordCount: 0,
        dailySummaries: [],
        periodDays: days
      }
    }

    // Calculate statistics
    const totalQuantity = data?.reduce((sum, record) => sum + record.quantity_kg, 0) || 0
    const avgDailyQuantity = totalQuantity / days
    
    // Group by date for daily summaries
    const dailyConsumption = data?.reduce((acc: any, record) => {
      const date = new Date(record.feeding_time).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = 0
      }
      acc[date] += record.quantity_kg
      return acc
    }, {}) || {}

    const dailySummaries = Object.entries(dailyConsumption).map(([date, quantity]) => ({
      date,
      quantity: quantity as number
    }))

    return {
      totalQuantity,
      avgDailyQuantity,
      recordCount: data?.length || 0,
      dailySummaries,
      periodDays: days
    }
  } catch (error) {
    console.error('Error in getFeedConsumptionStats:', error)
    return {
      totalQuantity: 0,
      avgDailyQuantity: 0,
      recordCount: 0,
      dailySummaries: [],
      periodDays: days
    }
  }
}

// ============ GET ANIMAL CONSUMPTION RECORDS ============

export async function getAnimalConsumptionRecords(
  farmId: string,
  animalId: string,
  limit: number = 50
): Promise<any[]> {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .from('feed_consumption_animals')
      .select(`
        *,
        feed_consumption (
          feeding_time,
          feeding_mode,
          notes,
          recorded_by,
          feed_types (
            name,
            category
          ),
          consumption_batches (
            batch_name
          )
        )
      `)
      .eq('animal_id', animalId)
      .eq('feed_consumption.farm_id', farmId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching animal consumption records:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getAnimalConsumptionRecords:', error)
    return []
  }
}

// ============ INVENTORY UPDATE HELPER ============

async function updateFeedInventory(
  farmId: string, 
  feedTypeId: string, 
  quantityChange: number
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  
  try {
    if (quantityChange === 0) return

    if (quantityChange < 0) {
      // Deducting from inventory (consumption)
      const { data: inventoryItems } = await supabase
        .from('feed_inventory')
        .select('id, quantity_kg')
        .eq('farm_id', farmId)
        .eq('feed_type_id', feedTypeId)
        .gt('quantity_kg', 0)
        .order('expiry_date', { ascending: true }) // Use oldest first (FIFO)

      if (!inventoryItems || inventoryItems.length === 0) {
        console.warn(`No inventory available for feed type ${feedTypeId}`)
        return
      }

      let remainingToDeduct = Math.abs(quantityChange)
      
      for (const item of inventoryItems) {
        if (remainingToDeduct <= 0) break
        
        const deductFromThisItem = Math.min(remainingToDeduct, item.quantity_kg)
        const newQuantity = item.quantity_kg - deductFromThisItem
        
        await supabase
          .from('feed_inventory')
          .update({ quantity_kg: newQuantity })
          .eq('id', item.id)
        
        remainingToDeduct -= deductFromThisItem
      }
      
      if (remainingToDeduct > 0) {
        console.warn(`Insufficient inventory to fulfill ${Math.abs(quantityChange)}kg consumption. ${remainingToDeduct}kg short.`)
      }
    } else {
      // Adding to inventory (restoration after deletion/update)
      // Find the most recent inventory item to add back to
      const { data: recentItem } = await supabase
        .from('feed_inventory')
        .select('id, quantity_kg')
        .eq('farm_id', farmId)
        .eq('feed_type_id', feedTypeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (recentItem) {
        await supabase
          .from('feed_inventory')
          .update({ quantity_kg: recentItem.quantity_kg + quantityChange })
          .eq('id', recentItem.id)
      } else {
        console.warn(`No inventory item found to restore ${quantityChange}kg for feed type ${feedTypeId}`)
      }
    }
  } catch (error) {
    console.error('Error updating feed inventory:', error)
    // Don't throw error as this shouldn't fail the main operation
  }
}

// ============ BATCH CONSUMPTION HELPERS ============

export async function getAnimalsByBatch(
  farmId: string,
  batchId: string
): Promise<string[]> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // This would use the getBatchTargetedAnimals function from feedManagementSettings
    // For now, return empty array if no batch targeting is implemented
    return []
  } catch (error) {
    console.error('Error getting animals by batch:', error)
    return []
  }
}

export async function validateConsumptionEntry(
  farmId: string,
  entry: FeedConsumptionEntry
): Promise<{ valid: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Validate feed type exists and has sufficient inventory
    const { data: feedType, error: feedError } = await supabase
      .from('feed_types')
      .select('id, name')
      .eq('id', entry.feedTypeId)
      .eq('farm_id', farmId)
      .single()

    if (feedError || !feedType) {
      return { valid: false, error: 'Feed type not found' }
    }

    // Check inventory availability
    const { data: inventory } = await supabase
      .from('feed_inventory')
      .select('quantity_kg')
      .eq('farm_id', farmId)
      .eq('feed_type_id', entry.feedTypeId)
      .gt('quantity_kg', 0)

    const totalAvailable = inventory?.reduce((sum, item) => sum + item.quantity_kg, 0) || 0
    
    if (totalAvailable < entry.quantityKg) {
      return { 
        valid: false, 
        error: `Insufficient inventory. Available: ${totalAvailable}kg, Required: ${entry.quantityKg}kg` 
      }
    }

    // Validate animals exist if provided
    if (entry.animalIds && entry.animalIds.length > 0) {
      const { count, error: animalError } = await supabase
        .from('animals')
        .select('id', { count: 'exact', head: true })
        .eq('farm_id', farmId)
        .in('id', entry.animalIds)
        .eq('status', 'active')

      if (animalError) {
        return { valid: false, error: 'Error validating animals' }
      }

      if (count !== entry.animalIds.length) {
        return { valid: false, error: 'Some animals not found or inactive' }
      }
    }

    return { valid: true }
  } catch (error) {
    console.error('Error validating consumption entry:', error)
    return { valid: false, error: 'Validation failed' }
  }
}