// lib/database/feedConsumption.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  recordFeedTransactionRPC,
} from './feedInventoryTransactions'

// Types
export interface FeedConsumptionRecord {
  id: string
  farm_id: string
  animal_id: string | null
  feed_type_id: string
  quantity_consumed: number
  consumption_date: string
  feeding_time: string | null
  feeding_mode: 'individual' | 'ration' | 'feed-mix-recipe' | null
  animal_count: number | null
  ration_id: string | null
  recipe_id: string | null
  // TMR session columns (migration 069)
  session_group_id: string | null
  session_percentage: number | null
  feed_time_slot_id: string | null
  slot_name: string | null
  notes?: string
  appetite_score?: number | null
  approximate_waste_kg?: number | null
  observations?: any
  recorded_by?: string
  created_at: string
  updated_at: string | null
}

export interface FeedConsumptionAnimal {
  id: string
  consumption_id: string
  animal_id: string
  quantity_kg?: number
  created_at: string
}

export interface FeedConsumptionEntry {
  feedTypeId: string
  quantityKg: number
  animalIds: string[]
  animalCount?: number
  perCowQuantityKg?: number
  notes?: string
}

export interface ConsumptionData {
  farmId: string
  feedingTime: string
  mode: 'individual' | 'ration' | 'feed-mix-recipe'
  feedMixRecipeId?: string | null
  rationId?: string | null
  entries: FeedConsumptionEntry[]
  recordedBy?: string
  globalNotes?: string
  appetiteScore?: number | null
  approximateWasteKg?: number | null
  observationalNotes?: string
  observations?: any
  animalCount?: number
  // TMR session fields (migration 069)
  feedTimeSlotId?: string | null
  slotName?: string | null
  sessionPercentage?: number | null
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
// Schema (migration 070):
//   feed_consumption_records  – 1 row per SESSION (header)
//   feed_consumption_feeds    – 1 row per FEED TYPE per session
//   feed_consumption_animals  – 1 row per ANIMAL per session

export async function recordFeedConsumption(
  data: ConsumptionData,
  userId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    console.log('📝 recordFeedConsumption called — mode:', data.mode, 'entries:', data.entries?.length)

    // ── Resolve feeding timestamp ──────────────────────────────
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
    const consumptionDate = feedingTimestamp.split('T')[0]

    // ── Derive animal count and IDs ────────────────────────────
    // For individual mode all entries share the same animal list.
    const allAnimalIds: string[] = data.entries[0]?.animalIds ?? []
    const animalCount =
      data.animalCount ??
      (allAnimalIds.length > 0 ? allAnimalIds.length : null)

    // ── 1. Insert the session HEADER ───────────────────────────
    const headerData: any = {
      farm_id:              data.farmId,
      consumption_date:     consumptionDate,
      feeding_time:         feedingTimestamp,
      feeding_mode:         data.mode,
      animal_count:         animalCount ?? undefined,
      ration_id:            data.mode === 'ration'           ? (data.rationId        ?? null) : null,
      recipe_id:            data.mode === 'feed-mix-recipe'  ? (data.feedMixRecipeId ?? null) : null,
      notes:                data.globalNotes                 || undefined,
      appetite_score:       data.appetiteScore               ?? undefined,
      approximate_waste_kg: data.approximateWasteKg          ?? undefined,
      observations:         data.observations                || undefined,
      recorded_by:          data.recordedBy                  || 'Unknown',
      // TMR session columns
      session_percentage:   data.mode === 'feed-mix-recipe'  ? (data.sessionPercentage ?? null) : null,
      feed_time_slot_id:    data.feedTimeSlotId              ?? null,
      slot_name:            data.slotName                    ?? null,
      // Legacy scalar columns kept for backward compat (deprecated by migration 070)
      // Set to the first entry's values so old queries still work
      feed_type_id:     data.entries[0]?.feedTypeId          ?? null,
      quantity_consumed: data.entries.reduce((s, e) => s + (parseFloat(e.quantityKg?.toString() ?? '0') || 0), 0),
    }
    Object.keys(headerData).forEach(k => headerData[k] === undefined && delete headerData[k])

    const { data: sessionRecord, error: sessionError } = await (supabase
      .from('feed_consumption_records') as any)
      .insert(headerData)
      .select()
      .single()

    if (sessionError) {
      console.error('❌ Session header insert error:', sessionError)
      return { success: false, error: `Failed to create consumption session: ${sessionError.message}` }
    }

    console.log('✅ Session header created:', sessionRecord.id)

    // ── 2. Insert feed line items into feed_consumption_feeds ──
    const feedRows = data.entries
      .filter(e => e.feedTypeId && e.quantityKg !== undefined)
      .map(e => ({
        consumption_id:    sessionRecord.id,
        feed_type_id:      e.feedTypeId,
        quantity_kg:       Math.max(0, parseFloat(e.quantityKg.toString())),
        percentage_of_mix: (e as any).percentage ?? null,
        cost_per_kg:       (e as any).costPerKg  ?? null,
        notes:             e.notes               ?? null,
      }))

    if (feedRows.length > 0) {
      const { error: feedError } = await (supabase as any)
        .from('feed_consumption_feeds')
        .insert(feedRows)

      if (feedError) {
        console.error('❌ Feed line items insert error:', feedError)
        return { success: false, error: `Failed to save feed details: ${feedError.message}` }
      }
      console.log('✅ Feed line items inserted:', feedRows.length)
    }

    // ── 3. Insert animal links into feed_consumption_animals ───
    // All entries share the same animal list (the session targets
    // a group of animals regardless of how many feed types).
    // quantity_kg per animal = total session qty / animal count.
    const totalQty = feedRows.reduce((s, r) => s + r.quantity_kg, 0)
    const perAnimalQty = allAnimalIds.length > 0
      ? parseFloat((totalQty / allAnimalIds.length).toFixed(4))
      : null

    if (allAnimalIds.length > 0) {
      const animalRows = allAnimalIds.map(animalId => ({
        consumption_id: sessionRecord.id,
        animal_id:      animalId,
        quantity_kg:    perAnimalQty,
      }))

      const { error: animalError } = await (supabase as any)
        .from('feed_consumption_animals')
        .insert(animalRows)

      if (animalError) {
        console.warn('⚠ Animal links insert failed (non-fatal):', animalError.message)
      } else {
        console.log('✅ Animal links inserted:', animalRows.length)
      }
    }

    // ── 4. Write inventory ledger transactions ─────────────────
    // Record each feed consumption via RPC (maintains ledger + inventory atomically)
    for (const feedRow of feedRows.filter(r => r.quantity_kg > 0)) {
      const result = await recordFeedTransactionRPC({
        farmId: data.farmId,
        feedTypeId: feedRow.feed_type_id,
        transactionType: 'feeding',
        quantityKg: -feedRow.quantity_kg,  // negative = out of inventory
        animalGroupId: allAnimalIds.length > 0 ? allAnimalIds[0] : undefined, // reference to animal group
        notes: data.globalNotes ?? `Feeding session ${sessionRecord.id}`,
        transactionDate: consumptionDate,
        createdBy: userId,
      })

      if (!result.success) {
        console.error(`⚠️ Failed to record transaction for feed ${feedRow.feed_type_id}:`, result.error)
        // Non-fatal — session is already recorded; transaction may be missed
      }
    }

    console.log('✅ Inventory transactions recorded')

    console.log('✅ recordFeedConsumption completed')
    return { success: true, data: [sessionRecord] }
  } catch (error) {
    console.error('❌ Error recording feed consumption:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record consumption',
    }
  }
}

// ============ UPDATE FEED CONSUMPTION ============
// Updates the session header + replaces all feed line items +
// replaces animal links.  Handles all three feeding modes.

export async function updateFeedConsumption(
  recordId: string,
  data: ConsumptionData,
  userId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    // Fetch original session for inventory delta calculation
    const { data: original, error: fetchError } = await (supabase
      .from('feed_consumption_records') as any)
      .select(`*, feed_consumption_feeds ( feed_type_id, quantity_kg )`)
      .eq('id', recordId)
      .eq('farm_id', data.farmId)
      .single()

    if (fetchError || !original) {
      return { success: false, error: 'Consumption record not found' }
    }

    // Resolve timestamp
    let feedingTimestamp: string
    if (data.feedingTime.match(/^\d{2}:\d{2}$/)) {
      const today = new Date()
      const [h, m] = data.feedingTime.split(':')
      today.setHours(parseInt(h), parseInt(m), 0, 0)
      feedingTimestamp = today.toISOString()
    } else {
      feedingTimestamp = new Date(data.feedingTime).toISOString()
    }
    const consumptionDate = feedingTimestamp.split('T')[0]

    const allAnimalIds: string[] = data.entries[0]?.animalIds ?? []
    const animalCount = data.animalCount ?? (allAnimalIds.length > 0 ? allAnimalIds.length : null)
    const newTotalQty = data.entries.reduce((s, e) => s + (parseFloat(e.quantityKg?.toString() ?? '0') || 0), 0)
    const consumptionDateForUpdate = feedingTimestamp.split('T')[0]

    // ── 1. Update session header ───────────────────────────────
    const headerUpdate: any = {
      consumption_date:     consumptionDateForUpdate,
      feeding_time:         feedingTimestamp,
      feeding_mode:         data.mode,
      animal_count:         animalCount,
      ration_id:            data.mode === 'ration'          ? (data.rationId        ?? null) : null,
      recipe_id:            data.mode === 'feed-mix-recipe' ? (data.feedMixRecipeId ?? null) : null,
      notes:                data.globalNotes                ?? null,
      appetite_score:       data.appetiteScore              ?? null,
      approximate_waste_kg: data.approximateWasteKg         ?? null,
      observations:         data.observations               ?? null,
      session_percentage:   data.mode === 'feed-mix-recipe' ? (data.sessionPercentage ?? null) : null,
      feed_time_slot_id:    data.feedTimeSlotId             ?? null,
      slot_name:            data.slotName                   ?? null,
      // Deprecated scalar columns kept for backward compat
      feed_type_id:         data.entries[0]?.feedTypeId     ?? null,
      quantity_consumed:    newTotalQty,
      updated_at:           new Date().toISOString(),
    }

    const { data: updatedRecord, error: updateError } = await (supabase
      .from('feed_consumption_records') as any)
      .update(headerUpdate)
      .eq('id', recordId)
      .eq('farm_id', data.farmId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: `Failed to update session: ${updateError.message}` }
    }

    // ── 2. Replace feed line items ─────────────────────────────
    await (supabase as any)
      .from('feed_consumption_feeds')
      .delete()
      .eq('consumption_id', recordId)

    const newFeedRows = data.entries
      .filter(e => e.feedTypeId && e.quantityKg !== undefined)
      .map(e => ({
        consumption_id:    recordId,
        feed_type_id:      e.feedTypeId,
        quantity_kg:       Math.max(0, parseFloat(e.quantityKg.toString())),
        percentage_of_mix: (e as any).percentage ?? null,
        cost_per_kg:       (e as any).costPerKg  ?? null,
        notes:             e.notes               ?? null,
      }))

    if (newFeedRows.length > 0) {
      const { error: feedError } = await (supabase as any)
        .from('feed_consumption_feeds')
        .insert(newFeedRows)
      if (feedError) {
        return { success: false, error: `Failed to update feed details: ${feedError.message}` }
      }
    }

    // ── 3. Replace animal links ────────────────────────────────
    await (supabase as any)
      .from('feed_consumption_animals')
      .delete()
      .eq('consumption_id', recordId)

    if (allAnimalIds.length > 0) {
      const perAnimalQty = parseFloat((newTotalQty / allAnimalIds.length).toFixed(4))
      await (supabase as any)
        .from('feed_consumption_animals')
        .insert(allAnimalIds.map(aid => ({
          consumption_id: recordId,
          animal_id:      aid,
          quantity_kg:    perAnimalQty,
        })))
    }

    // ── 4. Adjust inventory ledger ─────────────────────────────
    // Reverse every old feed line item, then write new ones
    const oldFeeds: Array<{ feed_type_id: string; quantity_kg: number }> =
      original.feed_consumption_feeds ?? []

    // Reverse old transactions (add stock back)
    for (const oldFeed of oldFeeds.filter(f => f.quantity_kg > 0)) {
      await recordFeedTransactionRPC({
        farmId: data.farmId,
        feedTypeId: oldFeed.feed_type_id,
        transactionType: 'adjustment',
        quantityKg: oldFeed.quantity_kg,  // positive = add back to inventory
        notes: `Reversal on edit: session ${recordId}`,
        transactionDate: consumptionDate,
        createdBy: userId,
      })
    }

    // Record new consumption transactions
    for (const newFeed of newFeedRows.filter(r => r.quantity_kg > 0)) {
      await recordFeedTransactionRPC({
        farmId: data.farmId,
        feedTypeId: newFeed.feed_type_id,
        transactionType: 'feeding',
        quantityKg: -newFeed.quantity_kg,  // negative = consumption
        animalGroupId: allAnimalIds.length > 0 ? allAnimalIds[0] : undefined,
        notes: data.globalNotes ?? `Updated feeding session ${recordId}`,
        transactionDate: consumptionDate,
        createdBy: userId,
      })
    }

    return { success: true, data: updatedRecord }
  } catch (error) {
    console.error('Error updating feed consumption:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update consumption',
    }
  }
}

// ============ DELETE FEED CONSUMPTION ============
// Deletes the session header; CASCADE removes feed_consumption_feeds
// and feed_consumption_animals automatically.

export async function deleteFeedConsumption(
  recordId: string,
  farmId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    // Fetch feed line items before deleting (needed for inventory reversal)
    const { data: feedLines } = await (supabase as any)
      .from('feed_consumption_feeds')
      .select('feed_type_id, quantity_kg')
      .eq('consumption_id', recordId)

    // Delete the session header (CASCADE removes children)
    const { error: deleteError } = await (supabase
      .from('feed_consumption_records') as any)
      .delete()
      .eq('id', recordId)
      .eq('farm_id', farmId)

    if (deleteError) {
      return { success: false, error: `Failed to delete: ${deleteError.message}` }
    }

    // Restore inventory for every feed line item deleted
    const lines: Array<{ feed_type_id: string; quantity_kg: number }> = feedLines ?? []
    const consumptionDate = new Date().toISOString().split('T')[0]

    for (const line of lines.filter(f => f.quantity_kg > 0)) {
      await recordFeedTransactionRPC({
        farmId,
        feedTypeId: line.feed_type_id,
        transactionType: 'adjustment',
        quantityKg: line.quantity_kg,  // positive = stock back
        notes: `Reversal: session ${recordId} deleted`,
        transactionDate: consumptionDate,
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting feed consumption:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete consumption',
    }
  }
}

// ============ GET FEED CONSUMPTION RECORDS ============
// Returns session headers with their feed line items and animal links.

export async function getFeedConsumptionRecords(
  farmId: string,
  limit: number = 50,
  offset: number = 0
): Promise<FeedConsumptionRecord[]> {
  const supabase = await createServerSupabaseClient()

  try {
    const { data, error } = await (supabase
      .from('feed_consumption_records') as any)
      .select(`
        *,
        feed_consumption_feeds (
          id,
          feed_type_id,
          quantity_kg,
          percentage_of_mix,
          cost_per_kg,
          notes,
          feed_types ( name, category_id )
        ),
        feed_consumption_animals (
          animal_id,
          quantity_kg,
          animals ( tag_number, name )
        )
      `)
      .eq('farm_id', farmId)
      .order('consumption_date', { ascending: false })
      .order('feeding_time',     { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching consumption records:', error)
      return []
    }

    return (data as any) as FeedConsumptionRecord[] || []
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

    const { data: consumptionData, error } = await supabase
      .from('feed_consumption_records')
      .select('quantity_consumed, consumption_date, feed_type_id')
      .eq('farm_id', farmId)
      .gte('consumption_date', startDate.toISOString())
      .lte('consumption_date', endDate.toISOString())

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

    // FIXED: Cast to any[]
    const data = (consumptionData as any[]) || []

    // Calculate statistics
    const totalQuantity = data.reduce((sum, record) => sum + record.quantity_consumed, 0) || 0
    const avgDailyQuantity = totalQuantity / days

    // Group by date for daily summaries
    const dailyConsumption = data.reduce((acc: any, record) => {
      const date = new Date(record.consumption_date).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = 0
      }
      acc[date] += record.quantity_consumed
      return acc
    }, {}) || {}

    const dailySummaries = Object.entries(dailyConsumption).map(([date, quantity]) => ({
      date,
      quantity: quantity as number
    }))

    return {
      totalQuantity,
      avgDailyQuantity,
      recordCount: data.length || 0,
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
    // Add validation
    if (!farmId || !animalId) {
      console.error('Missing required parameters:', { farmId, animalId })
      return []
    }

    console.log('Querying consumption records:', { farmId, animalId, limit })
    // First, get the consumption records for this animal
    const { data: consumptionData, error: consumptionError } = await supabase
      .from('feed_consumption_records')
      .select(`
        id,
        consumption_date,
        feeding_time,
        feeding_mode,
        notes,
        recorded_by,
        quantity_consumed,
        animal_count,
        ration_id,
        recipe_id,
        feed_type_id,
        appetite_score,
        approximate_waste_kg,
        observations,
        feed_types (
          name,
          category_id,
          typical_cost_per_kg,
          feed_type_categories (
            category_name,
            color
          )
        ),
        feed_consumption_animals!inner (
          id,
          animal_id,
          quantity_kg,
          created_at
        )
      `)
      .eq('farm_id', farmId)
      .eq('feed_consumption_animals.animal_id', animalId)
      .order('consumption_date', { ascending: false })
      .limit(limit)

    if (consumptionError) {
      console.error('Error fetching animal consumption records:', consumptionError)
      return []
    }

    // FIXED: Cast to any[]
    const records = (consumptionData as any[]) || []

    // Get unique feed type IDs from the consumption data
    const feedTypeIds = [...new Set(records.map(record => record.feed_type_id))]

    // Create a map of feed_type_id to most recent cost (use typical_cost_per_kg from feed_types)
    const costMap = new Map()
    // Since cost_per_kg doesn't exist in feed_inventory, use typical_cost_per_kg from feed_types


    // Transform the data to match expected format
    return records.map(record => ({
      ...record.feed_consumption_animals[0],
      feed_consumption: {
        id: record.id,
        consumption_date: record.consumption_date,
        feeding_time: record.feeding_time,
        feeding_mode: record.feeding_mode,
        notes: record.notes,
        recorded_by: record.recorded_by,
        quantity_consumed: record.quantity_consumed,
        animal_count: record.animal_count,
        ration_id: record.ration_id,
        recipe_id: record.recipe_id,
        feed_types: record.feed_types,
        appetite_score: record.appetite_score,
        approximate_waste_kg: record.approximate_waste_kg,
        observations: record.observations,
        cost_per_kg: costMap.get(record.feed_type_id) || record.feed_types?.typical_cost_per_kg || 0,
        total_cost: (costMap.get(record.feed_type_id) || record.feed_types?.typical_cost_per_kg || 0) * (record.quantity_consumed ?? 0),
      },
    }))

  } catch (error) {
    console.error('Error in getAnimalConsumptionRecords:', error)
    return []
  }
}

// ============ INVENTORY UPDATE HELPER ============

// async function updateFeedInventory(
//   farmId: string,
//   feedTypeId: string,
//   quantityChange: number
// ): Promise<void> {
//   const supabase = await createServerSupabaseClient()

//   try {
//     if (quantityChange === 0) return

//     if (quantityChange < 0) {
//       // Deducting from inventory (consumption)
//       const { data: inventoryItemsData } = await supabase
//         .from('feed_inventory')
//         .select('id, quantity_kg')
//         .eq('farm_id', farmId)
//         .eq('feed_type_id', feedTypeId)
//         .gt('quantity_kg', 0)
//         .order('expiry_date', { ascending: true }) // Use oldest first (FIFO)

//       // FIXED: Cast to any[]
//       const inventoryItems = (inventoryItemsData as any[]) || []

//       if (inventoryItems.length === 0) {
//         console.warn(`No inventory available for feed type ${feedTypeId}`)
//         return
//       }

//       let remainingToDeduct = Math.abs(quantityChange)

//       for (const item of inventoryItems) {
//         if (remainingToDeduct <= 0) break

//         const deductFromThisItem = Math.min(remainingToDeduct, item.quantity_kg)
//         const newQuantity = item.quantity_kg - deductFromThisItem

//         // FIXED: Cast to any
//         await (supabase
//           .from('feed_inventory') as any)
//           .update({ quantity_kg: newQuantity })
//           .eq('id', item.id)

//         remainingToDeduct -= deductFromThisItem
//       }

//       if (remainingToDeduct > 0) {
//         console.warn(`Insufficient inventory to fulfill ${Math.abs(quantityChange)}kg consumption. ${remainingToDeduct}kg short.`)
//       }
//     } else {
//       // Adding to inventory (restoration after deletion/update)
//       // Find the most recent inventory item to add back to
//       const { data: recentItemData } = await supabase
//         .from('feed_inventory')
//         .select('id, quantity_kg')
//         .eq('farm_id', farmId)
//         .eq('feed_type_id', feedTypeId)
//         .order('created_at', { ascending: false })
//         .limit(1)
//         .single()

//       // FIXED: Cast to any
//       const recentItem = recentItemData as any;

//       if (recentItem) {
//         // FIXED: Cast to any
//         await (supabase
//           .from('feed_inventory') as any)
//           .update({ quantity_kg: recentItem.quantity_kg + quantityChange })
//           .eq('id', recentItem.id)
//       } else {
//         console.warn(`No inventory item found to restore ${quantityChange}kg for feed type ${feedTypeId}`)
//       }
//     }
//   } catch (error) {
//     console.error('Error updating feed inventory:', error)
//     // Don't throw error as this shouldn't fail the main operation
//   }
// }

export async function getFeedInventory(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('feed_inventory')
    .select(`
      *,
      feed_types (
        id,
        name,
        description,
        category_id,
        typical_cost_per_kg,
        nutritional_value,
        feed_type_categories (
          id,
          category_name,
          color,
          description
        )
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
      console.error('validateConsumptionEntry: feed type not found', { farmId, feedTypeId: entry.feedTypeId, feedError })
      return { valid: false, error: 'Feed type not found' }
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
        console.error('validateConsumptionEntry: error validating animals', animalError)
        return { valid: false, error: 'Error validating animals' }
      }

      if (count !== entry.animalIds.length) {
        console.error('validateConsumptionEntry: animals mismatch', { expected: entry.animalIds.length, found: count })
        return { valid: false, error: 'Some animals not found or inactive' }
      }
    }

    return { valid: true }
  } catch (error) {
    console.error('Error validating consumption entry:', error)
    return { valid: false, error: 'Validation failed' }
  }
}