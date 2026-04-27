import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'
import { recordFeedTransactionRPC, writeInventoryTransactions, type TransactionType } from './feedInventoryTransactions'

type FeedType = Database['public']['Tables']['feed_types']['Row']
type FeedTypeInsert = Database['public']['Tables']['feed_types']['Insert']
type FeedInventory = Database['public']['Tables']['feed_inventory']['Row']
type FeedInventoryInsert = Database['public']['Tables']['feed_inventory']['Insert']
type FeedConsumption = Database['public']['Tables']['feed_consumption_records']['Row']
type FeedConsumptionInsert = Database['public']['Tables']['feed_consumption_records']['Insert']

/**
 * Feed Management
 * 
 * Supports three feed sources:
 * 1. PURCHASED FEEDS (source='purchased')
 *    - Stored in feed_purchases table
 *    - Requires: feed_type_id, quantity_kg, source, purchase_date, supplier (optional)
 *    - Fields: cost_per_kg, supplier, batch_number, notes, expiry_date, storage_location_id
 * 
 * 2. FARM-PRODUCED FEEDS (source='produced')
 *    - Stored in feed_harvests table
 *    - Requires: feed_type_id, quantity_kg, purchase_date (used as harvest_date)
 *    - Fields: cost_per_kg, batch_number, notes, expiry_date, storage_location_id
 *    - Optional: source_type (crop_harvest|animal_production|fermentation|processing|other)
 *    - Optional: yield_source (e.g., "Field A", "Cow #5", "Tank 1")
 * 
 * 3. FORMULATED FEEDS (source='formulate')
 *    - Stored in feed_purchases table
 *    - Created from ingredient formulations using feed_inventory_transactions
 *    - Tracks ingredient breakdowns via feed_inventory_transactions with transaction_type='formulation_use'
 *    - Records output via 'restock_formulation' transaction type
 */

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
  'is_formulate_feed',
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
    } as any)
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
  const authUser = (await supabase.auth.getUser()).data.user

  const {
    feed_type_id, 
    quantity_kg, 
    source = 'purchased', // 'purchased', 'produced', 'formulate'
    cost_per_kg, 
    purchase_date, 
    expiry_date,
    supplier_id,
    supplier,
    batch_number, 
    notes,
    storage_location_id,
    nutritional_data,
    source_type,
    yield_source,
  } = data

  // 1. Determine Logic based on Source
  // ─────────────────────────────────────────────────────────
  const isPurchased = source === 'purchased' || source === 'formulate';

  // Mapping for the Database Table "feed_inventory"
  // Note: source='formulate' is stored as-is (not mapped)
  const dbInventorySource = source === 'formulate' ? 'formulate' : (isPurchased ? 'purchased' : 'produced');

  // Determine the Transaction Type for the Ledger
  let transactionType: TransactionType = 'restock_purchase';
  if (source === 'produced') transactionType = 'restock_harvest';
  if (source === 'formulate') transactionType = 'restock_formulation';

  // Determine which source table to use
  // Formulated feeds use feed_purchases just like regular purchases
  const tableName = isPurchased ? 'feed_purchases' : 'feed_harvests';
  const dateField = isPurchased ? 'purchase_date' : 'harvest_date';

  // Calculate total_cost
  const totalCost = data.total_cost ?? 
    (cost_per_kg && quantity_kg ? Number((cost_per_kg * quantity_kg).toFixed(2)) : null);

  // 2. Ensure feed_inventory record exists
  // ─────────────────────────────────────────────────────────
  const { data: feedTypeData, error: feedTypeError } = await supabase
    .from('feed_types')
    .select('id, low_stock_threshold')
    .eq('id', feed_type_id)
    .eq('farm_id', farmId)
    .single();

  if (feedTypeError) return { success: false, error: 'Feed type not found' };

  const { data: existingInventory, error: checkError } = await supabase
    .from('feed_inventory')
    .select('id')
    .eq('farm_id', farmId)
    .eq('feed_type_id', feed_type_id)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    return { success: false, error: checkError.message };
  }

  if (!existingInventory) {
    const { error: createError } = await supabase
      .from('feed_inventory')
      .insert({
        farm_id: farmId,
        feed_type_id: feed_type_id,
        source: dbInventorySource, // 'purchased', 'formulate', or 'produced'
        quantity_kg: 0,
        minimum_threshold: feedTypeData?.low_stock_threshold ?? null,
        storage_location_id: storage_location_id ?? null,
        created_by: authUser?.id ?? null,
      });

    if (createError) return { success: false, error: createError.message };
  }

  // 3. Record the source entry (Purchase or Harvest)
  // ─────────────────────────────────────────────────────────
  const recordData: any = {
    farm_id: farmId,
    feed_type_id,
    quantity_kg,
    cost_per_kg: cost_per_kg ?? null,
    total_cost: totalCost,
    [dateField]: purchase_date ?? new Date().toISOString().split('T')[0],
    expiry_date: expiry_date ?? null,
    batch_number: batch_number ?? null,
    notes: notes ?? null,
    storage_location_id: storage_location_id ?? null,
    created_by: authUser?.id ?? null,
  };

  if (isPurchased) {
    recordData.supplier_id = supplier_id ?? null;
    recordData.supplier = supplier ?? null;
  } else {
    recordData.source_type = source_type ?? (source === 'formulate' ? 'processing' : null);
    recordData.yield_source = yield_source ?? null;
  }

  const { data: record, error: recordError } = await (supabase
    .from(tableName) as any)
    .insert(recordData)
    .select()
    .single();

  if (recordError) return { success: false, error: recordError.message };

  // 4. Record transaction via RPC (Ledger + Quantity Sync)
  // ─────────────────────────────────────────────────────────
  const txResult = await recordFeedTransactionRPC({
    farmId,
    feedTypeId: feed_type_id,
    transactionType: transactionType,
    quantityKg: quantity_kg,
    storageLoc: storage_location_id,
    costPerKg: cost_per_kg,
    totalCost: totalCost,
    purchaseId: isPurchased ? record.id : undefined,
    harvestId: !isPurchased ? record.id : undefined,
    notes: notes || `${transactionType.replace('_', ' ')} recorded`,
    createdBy: authUser?.id,
    transactionDate: recordData[dateField],
  });

  // Fallback to direct transaction write if RPC fails
  if (!txResult.success) {
    console.warn('RPC failed, falling back to direct transaction write:', txResult.error)
    const fallbackResult = await writeInventoryTransactions([{
      farm_id: farmId,
      feed_type_id,
      quantity_kg,
      transaction_type: transactionType,
      reference_id: isPurchased ? record.id : (!isPurchased ? record.id : undefined),
      reference_type: isPurchased ? 'feed_purchase' : 'feed_harvest',
      notes: notes || `${transactionType.replace('_', ' ')} recorded`,
      created_by: authUser?.id,
    }])
    
    if (!fallbackResult.success) {
      return { success: false, error: fallbackResult.error };
    }
    
    // Sync feed_inventory quantity from the transaction balance
    if (fallbackResult.data && fallbackResult.data.length > 0) {
      const latestTx = fallbackResult.data[fallbackResult.data.length - 1]
      await (supabase as any)
        .from('feed_inventory')
        .upsert({
          farm_id: farmId,
          feed_type_id,
          quantity_kg: latestTx.balance_after_kg,
          source: dbInventorySource,
        }, {
          onConflict: 'farm_id,feed_type_id',
        })
    }
    
    return { success: true, data: record, transaction: fallbackResult.data };
  }

  // RPC succeeded - sync feed_inventory if needed
  const { data: latestTx } = await (supabase as any)
    .from('feed_inventory_transactions')
    .select('balance_after_kg')
    .eq('farm_id', farmId)
    .eq('feed_type_id', feed_type_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (latestTx) {
    await (supabase as any)
      .from('feed_inventory')
      .upsert({
        farm_id: farmId,
        feed_type_id,
        quantity_kg: latestTx.balance_after_kg,
        source: dbInventorySource,
      }, {
        onConflict: 'farm_id,feed_type_id',
      })
  }

  // 5. Update Inventory Total Cost Snapshot
  // ─────────────────────────────────────────────────────────
  const { data: currentInventory } = await supabase
    .from('feed_inventory')
    .select('total_cost')
    .eq('farm_id', farmId)
    .eq('feed_type_id', feed_type_id)
    .single();

  if (currentInventory) {
    const existingCost = currentInventory.total_cost || 0;
    const newTotalCost = totalCost ? existingCost + totalCost : existingCost;

    await supabase
      .from('feed_inventory')
      .update({
        total_cost: Number(newTotalCost.toFixed(2)),
        updated_by: authUser?.id ?? null,
      })
      .eq('farm_id', farmId)
      .eq('feed_type_id', feed_type_id);
  }

  return { success: true, data: record, transaction: txResult.data };
}

// Update Feed Inventory
export async function updateFeedInventory(farmId: string, feedTypeId: string, data: any) {
  const supabase = await createServerSupabaseClient()
  const authUser = (await supabase.auth.getUser()).data.user

  const {
    quantity_kg, source = 'purchased',
    cost_per_kg, purchase_date, expiry_date,
    supplier_id,
    supplier,
    batch_number, notes,
    storage_location_id,
    nutritional_data,
    source_type,
    yield_source,
    record_id, // The specific record ID to update (from initialData)
  } = data



  try {
    const isPurchased = source === 'purchased'
    const tableName = isPurchased ? 'feed_purchases' : 'feed_harvests'
    const dateField = isPurchased ? 'purchase_date' : 'harvest_date'

    // 1. Find the record to update
    // ─────────────────────────────────────────────────────────────
    let query = (supabase.from(tableName) as any)
      .select('id, quantity_kg, cost_per_kg, total_cost')
      .eq('farm_id', farmId)
      .eq('feed_type_id', feedTypeId)

    // If a specific record ID is provided, use it. Otherwise, get the most recent one.
    if (record_id) {
      query = query.eq('id', record_id)
    } else {
      query = query.order(dateField, { ascending: false }).limit(1)
    }

    const { data: existingRecords, error: fetchError } = await query

    if (fetchError) {
      console.error(`Error fetching existing ${tableName}:`, fetchError)
      return { success: false, error: fetchError.message }
    }

    if (!existingRecords || existingRecords.length === 0) {
      return { success: false, error: `No existing ${tableName} record found for this feed type` }
    }

    const existingRecord = existingRecords[0]
    const oldQuantity = existingRecord.quantity_kg
    const quantityDifference = (quantity_kg || 0) - oldQuantity

    // Calculate total_cost
    const totalCost = data.total_cost ??
      (cost_per_kg && quantity_kg ? Number((cost_per_kg * quantity_kg).toFixed(2)) : null)

    // 2. Update the source record (feed_purchases or feed_harvests)
    // ───────────────────────────────────────────────────────────────
    const updateData: any = {
      quantity_kg,
      cost_per_kg: cost_per_kg ?? null,
      total_cost: totalCost,
      [dateField]: purchase_date ?? new Date().toISOString().split('T')[0],
      expiry_date: expiry_date ?? null,
      batch_number: batch_number ?? null,
      notes: notes ?? null,
      storage_location_id: storage_location_id ?? null,
      updated_by: authUser?.id ?? null,
      updated_at: new Date().toISOString(),
    }

    // Add source-specific fields
    if (isPurchased) {
      updateData.supplier_id = supplier_id ?? null
      updateData.supplier = supplier ?? null
    } else {
      updateData.source_type = source_type ?? null
      updateData.yield_source = yield_source ?? null
    }

    const { data: updatedRecord, error: updateError } = await (supabase
      .from(tableName) as any)
      .update(updateData)
      .eq('id', existingRecord.id)
      .eq('farm_id', farmId)
      .select()
      .single()

    if (updateError) {
      console.error(`Error updating ${tableName}:`, updateError)
      return { success: false, error: updateError.message }
    }

    // 3. Update nutritional data if provided
    // ──────────────────────────────────────
    if (nutritional_data) {
      const hasValues = Object.values(nutritional_data).some(v => v !== null && v !== undefined && v !== '')
      if (hasValues) {
        const nutritionTableName = 'feed_nutritional_records'
        const referenceColumn = isPurchased ? 'feed_purchase_id' : 'feed_harvest_id'

        // Delete existing nutritional data for this record
        await supabase
          .from(nutritionTableName)
          .delete()
          .eq(referenceColumn, existingRecord.id)
          .eq('farm_id', farmId)

        // Insert new nutritional data
        const { error: nutritionError } = await (supabase
          .from(nutritionTableName) as any)
          .insert({
            farm_id: farmId,
            [referenceColumn]: existingRecord.id,
            feed_type_id: feedTypeId,
            ...nutritional_data,
          })

        if (nutritionError) {
          console.error('Error updating nutritional data:', nutritionError)
          // Non-fatal error
        }
      }
    }

    // 4. Update feed_inventory table if quantity changed
    // ──────────────────────────────────────────────────
    if (quantityDifference !== 0) {
      const { data: currentInventory, error: inventoryCheckError } = await supabase
        .from('feed_inventory')
        .select('quantity_kg, total_cost')
        .eq('farm_id', farmId)
        .eq('feed_type_id', feedTypeId)
        .single()

      if (!inventoryCheckError && currentInventory) {
        const newQuantity = (currentInventory.quantity_kg || 0) + quantityDifference
        const currentTotalCost = currentInventory.total_cost || 0

        // Recalculate total cost based on new quantities
        let newTotalCost = currentTotalCost
        if (newQuantity > 0 && totalCost && quantity_kg > 0 && oldQuantity > 0) {
          const costPerKgNew = totalCost / quantity_kg
          const costPerKgOld = (existingRecord.total_cost || 0) / oldQuantity
          newTotalCost = newQuantity * ((costPerKgOld * oldQuantity + costPerKgNew * quantity_kg) / (oldQuantity + quantity_kg))
        }

        const { error: inventoryUpdateError } = await supabase
          .from('feed_inventory')
          .update({
            quantity_kg: Math.max(0, newQuantity),
            total_cost: newTotalCost > 0 ? Number(newTotalCost.toFixed(2)) : null,
            updated_by: authUser?.id ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('farm_id', farmId)
          .eq('feed_type_id', feedTypeId)

        if (inventoryUpdateError) {
          console.error('Error updating feed_inventory:', inventoryUpdateError)
          // Non-fatal error
        }
      }
    }

    return { success: true, data: updatedRecord }
  } catch (error) {
    console.error('Unexpected error in updateFeedInventory:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get Feed Harvests
export async function getFeedHarvests(farmId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('feed_harvests')
    .select(`
      *,
      feed_types (
        id,
        name,
        description,
        typical_cost_per_kg,
        unit_of_measure,
        low_stock_threshold,
        is_formulate_feed
      )
    `)
    .eq('farm_id', farmId)
    .order('harvest_date', { ascending: false })

  if (error) {
    console.error('Error fetching feed harvests:', error)
    return []
  }

  return data || []
}

// Update Feed Harvest
export async function updateFeedHarvest(
  farmId: string,
  harvestId: string,
  data: {
    quantity_kg?: number
    cost_per_kg?: number
    harvest_date?: string
    expiry_date?: string
    batch_number?: string
    storage_location_id?: string | null
    source_type?: string | null
    yield_source?: string | null
    notes?: string | null
  }
) {
  const supabase = await createServerSupabaseClient()

  // Verify harvest belongs to this farm
  const { data: existingHarvest, error: checkError } = await supabase
    .from('feed_harvests')
    .select('id')
    .eq('id', harvestId)
    .eq('farm_id', farmId)
    .single()

  if (checkError || !existingHarvest) {
    return { success: false, error: 'Harvest record not found or access denied' }
  }

  const updateData: any = { updated_at: new Date().toISOString() }

  if (data.quantity_kg !== undefined) updateData.quantity_kg = data.quantity_kg
  if (data.cost_per_kg !== undefined) updateData.cost_per_kg = data.cost_per_kg
  if (data.harvest_date !== undefined) updateData.harvest_date = data.harvest_date
  if (data.expiry_date !== undefined) updateData.expiry_date = data.expiry_date
  if (data.batch_number !== undefined) updateData.batch_number = data.batch_number
  if (data.storage_location_id !== undefined) updateData.storage_location_id = data.storage_location_id
  if (data.source_type !== undefined) updateData.source_type = data.source_type
  if (data.yield_source !== undefined) updateData.yield_source = data.yield_source
  if (data.notes !== undefined) updateData.notes = data.notes

  const { data: updated, error } = await (supabase
    .from('feed_harvests') as any)
    .update(updateData)
    .eq('id', harvestId)
    .eq('farm_id', farmId)
    .select()
    .single()

  if (error) {
    console.error('Error updating feed harvest:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data: updated }
}

// Delete Feed Harvest
export async function deleteFeedHarvest(farmId: string, harvestId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: existingHarvest, error: checkError } = await supabase
      .from('feed_harvests')
      .select('id')
      .eq('id', harvestId)
      .eq('farm_id', farmId)
      .single()

    if (checkError || !existingHarvest) {
      return { success: false, error: 'Harvest record not found or access denied' }
    }

    const { error: deleteError } = await supabase
      .from('feed_harvests')
      .delete()
      .eq('id', harvestId)
      .eq('farm_id', farmId)

    if (deleteError) {
      console.error('Error deleting feed harvest:', deleteError)
      return { success: false, error: deleteError.message }
    }

    return { success: true, message: 'Harvest record deleted successfully' }
  } catch (error) {
    console.error('Error in deleteFeedHarvest:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function getFeedInventory(farmId: string) {
  const supabase = await createServerSupabaseClient()

  // Get inventory data with feed type information
  const { data: inventoryData, error: inventoryError } = await supabase
    .from('feed_inventory')
    .select(`
    *,
    storage_locations (
      name
    ),
    feed_types (
      id,
      name,
      description,
      typical_cost_per_kg,
      preferred_measurement_unit:unit_of_measure,
      low_stock_threshold,
      is_formulate_feed
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

  const inventorySources = inventoryData.map((i: any) => ({ feedTypeId: i.feed_type_id, source: i.source }));
  console.log('[FeedInventory] DEBUG: inventoryData items sources:', inventorySources);
  console.log('[FeedInventory] DEBUG: inventoryData sources that are "produced":', inventorySources.filter(s => s.source === 'produced'));

  // Get the most recent purchase/harvest for each feed type (check both tables)
  const feedTypeIds = inventoryData.map(item => item.feed_type_id)

  const [
    { data: purchasesData, error: purchasesError },
    { data: harvestsData, error: harvestsError }
  ] = await Promise.all([
    supabase
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
        notes
      `)
      .in('feed_type_id', feedTypeIds)
      .eq('farm_id', farmId)
      .order('purchase_date', { ascending: false }),
    supabase
      .from('feed_harvests')
      .select(`
        id,
        feed_type_id,
        quantity_kg,
        cost_per_kg,
        harvest_date,
        expiry_date,
        batch_number,
        notes,
        source_type,
        yield_source
      `)
      .in('feed_type_id', feedTypeIds)
      .eq('farm_id', farmId)
      .order('harvest_date', { ascending: false })
  ])

  console.log('[FeedInventory] DEBUG: purchasesData count:', purchasesData?.length);
  console.log('[FeedInventory] DEBUG: harvestsData count:', harvestsData?.length);
  console.log('[FeedInventory] DEBUG: harvestsError:', harvestsError);

  if (purchasesError) {
    console.error('Error fetching purchase data:', purchasesError)
  }
  if (harvestsError) {
    console.error('Error fetching harvest data:', harvestsError)
  }

  // Get nutritional data for the most recent purchases
  let nutritionalData: any[] = []
  if (purchasesData && purchasesData.length > 0) {
    const purchaseIds = purchasesData.map(p => p.id)
    const { data: nutritionData, error: nutritionError } = await supabase
      .from('feed_nutritional_records')
      .select(`
        feed_purchase_id,
        feed_harvest_id,
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

    if (!nutritionError) {
      nutritionalData = nutritionData || []
    }
  }

  // Get nutritional data for harvests
  if (harvestsData && harvestsData.length > 0) {
    const harvestIds = harvestsData.map(h => h.id)
    const { data: harvestNutritionData, error: harvestNutritionError } = await supabase
      .from('feed_nutritional_records')
      .select(`
        feed_purchase_id,
        feed_harvest_id,
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
      .in('feed_harvest_id', harvestIds)
      .eq('farm_id', farmId)

    if (!harvestNutritionError) {
      nutritionalData = [...nutritionalData, ...(harvestNutritionData || [])]
    }
  }

  // Create maps for efficient lookup and merge purchases + harvests
  const latestPurchases = new Map()
  const allRecords = [
    ...(purchasesData || []).map(p => ({ ...p, _source: 'purchase' })),
    ...(harvestsData || []).map(h => ({ ...h, purchase_date: h.harvest_date, _source: 'harvest' }))
  ]

  // Sort by date descending and keep the latest record per feed type
  allRecords.sort((a, b) => {
    const dateA = new Date(a.purchase_date).getTime()
    const dateB = new Date(b.purchase_date).getTime()
    return dateB - dateA
  })

  for (const record of allRecords) {
    if (!latestPurchases.has(record.feed_type_id)) {
      latestPurchases.set(record.feed_type_id, record)
    }
  }

  const nutritionalMap = new Map()
  nutritionalData.forEach(nutrition => {
    // Map by feed_purchase_id for purchases, feed_harvest_id for harvests
    const recordId = nutrition.feed_purchase_id || nutrition.feed_harvest_id
    if (recordId) {
      nutritionalMap.set(recordId, nutrition)
    }
  })

  // ── Fetch formulation ingredient breakdown for formulated feeds ──────────
  const formulatedFeedTypeIds = inventoryData
    .filter((i: any) => i.source === 'formulate' || i.source === 'formulated')
    .map((i: any) => i.feed_type_id)

  const formulatedPurchaseIds = [...latestPurchases.values()]
    .filter((p: any) => p._source === 'purchase' && formulatedFeedTypeIds.includes(p.feed_type_id))
    .map((p: any) => p.id)

  const formulationIngredientsMap = new Map<string, any[]>()

  if (formulatedPurchaseIds.length > 0) {
    const { data: txRows, error: txError } = await (supabase
      .from('feed_inventory_transactions') as any)
      .select(`
        reference_id,
        feed_type_id,
        quantity_kg,
        feed_types (
          id,
          name,
          typical_cost_per_kg
        )
      `)
      .eq('farm_id', farmId)
      .eq('transaction_type', 'formulation_use')
      .eq('reference_type', 'feed_formulation')
      .in('reference_id', formulatedPurchaseIds)

    if (txError) {
      console.error('[FeedInventory] Error fetching formulation ingredient transactions:', txError);
    }

    if (txRows && Array.isArray(txRows)) {
      txRows.forEach((tx: any) => {
        if (!tx.reference_id) return;
        if (!formulationIngredientsMap.has(tx.reference_id)) {
          formulationIngredientsMap.set(tx.reference_id, [])
        }
        const usedKg = Math.abs(Number(tx.quantity_kg))
        const costPerKg = tx.feed_types?.typical_cost_per_kg ?? 0
        formulationIngredientsMap.get(tx.reference_id)!.push({
          feed_type_id: tx.feed_type_id,
          feed_name: tx.feed_types?.name ?? 'Unknown',
          quantity_kg: usedKg,
          cost_per_kg: costPerKg,
          ingredient_cost: Number((usedKg * costPerKg).toFixed(2)),
        })
      })
    }
  }

  // ── Merge all data ────────────────────────────────────────────────────────
  const processedData = inventoryData.map(item => {
    const latestPurchase = latestPurchases.get(item.feed_type_id)
    const nutrition = latestPurchase ? nutritionalMap.get(latestPurchase.id) : null
    const isFormulated = item.source === 'formulate' || item.source === 'formulated'
    const formulationIngredients = (
      latestPurchase?._source === 'harvest' ||
      (latestPurchase?._source === 'purchase' && isFormulated)
    ) ? (formulationIngredientsMap.get(latestPurchase.id) ?? null)
      : null

    return {
      ...item,
      // Normalize field name: feed_inventory stores quantity as `quantity_kg`
      // but FeedMixRecipeManager (and other callers) check `quantity_in_stock`.
      quantity_in_stock: item.quantity_kg,
      // Hoist cost_per_kg from the most recent purchase/harvest so callers
      // don't have to reach into latest_purchase for recipe cost calculations.
      cost_per_kg: latestPurchase?.cost_per_kg ?? null,
      storage_location: (item as any).storage_locations?.name || null,
      latest_purchase: latestPurchase
        ? {
          ...latestPurchase,
          source: item.source,
          formulation_ingredients: formulationIngredients
        }
        : null,
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

export async function getFeedStats(farmId: string, days: number = 30) {
  const supabase = await createServerSupabaseClient()

  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  try {
    // Query both feed_types and their inventory, plus consumption records for the period
    const [feedTypesRes, inventoryRes, consumptionRes] = await Promise.all([
      supabase
        .from('feed_types')
        .select('id, name, description, typical_cost_per_kg')
        .eq('farm_id', farmId),

      // Get current inventory snapshot
      supabase
        .from('feed_inventory')
        .select('feed_type_id, quantity_kg, total_cost, minimum_threshold')
        .eq('farm_id', farmId),

      // Get consumption for the period
      supabase
        .from('feed_consumption_records')
        .select('feed_type_id, quantity_consumed, animal_id')
        .eq('farm_id', farmId)
        .gte('consumption_date', startDate)
        .lte('consumption_date', endDate),
    ])

    const feedTypes = (feedTypesRes.data as any[]) ?? []
    const inventoryRows = (inventoryRes.data as any[]) ?? []
    const consumptionRows = (consumptionRes.data as any[]) ?? []

    // Build lookup maps in JS (O(n), not O(n) DB round-trips)
    const invByFeed = new Map<string, { quantity_kg: number; total_cost: number | null; minimum_threshold: number | null }[]>()
    for (const row of inventoryRows) {
      if (!invByFeed.has(row.feed_type_id)) invByFeed.set(row.feed_type_id, [])
      invByFeed.get(row.feed_type_id)!.push(row)
    }

    const consByFeed = new Map<string, { quantity_consumed: number; animal_id: string | null }[]>()
    for (const row of consumptionRows) {
      if (!consByFeed.has(row.feed_type_id)) consByFeed.set(row.feed_type_id, [])
      consByFeed.get(row.feed_type_id)!.push(row)
    }

    const stockLevels = []
    let totalQuantity = 0
    let totalCost = 0
    let totalSessions = 0
    let totalAnimalsFed = 0

    for (const feedType of feedTypes) {
      const inventory = invByFeed.get(feedType.id) ?? []
      const consumption = consByFeed.get(feedType.id) ?? []

      const currentStock = inventory.reduce((s, i) => s + (i.quantity_kg || 0), 0)
      const periodConsumption = consumption.reduce((s, c) => s + (c.quantity_consumed || 0), 0)
      const inventoryTotalCost = inventory.reduce((s, i) => s + (i.total_cost || 0), 0)
      const periodSessions = consumption.length
      const periodAnimalsFed = new Set(consumption.map(c => c.animal_id).filter(Boolean)).size
      const threshold = inventory[0]?.minimum_threshold ?? 50

      if (periodConsumption > 0 || currentStock > 0) {
        stockLevels.push({
          feedType: { id: feedType.id, name: feedType.name, description: feedType.description },
          currentStock,
          avgCostPerKg: feedType.typical_cost_per_kg || 0,
          totalPurchased: currentStock,
          totalCost: inventoryTotalCost,
          periodConsumption,
          periodSessions,
          periodAnimalsFed,
          avgPerSession: periodSessions > 0 ? periodConsumption / periodSessions : 0,
          avgAnimalsPerSession: periodSessions > 0 ? periodAnimalsFed / periodSessions : 0,
          threshold,
          percentageOfThreshold: (currentStock / threshold) * 100,
          status: currentStock <= threshold * 0.2 ? 'critical'
            : currentStock < threshold ? 'low'
              : 'good',
        })

        totalQuantity += currentStock
        totalCost += inventoryTotalCost
        totalSessions += periodSessions
        totalAnimalsFed += periodAnimalsFed
      }
    }

    const avgDailyCost = totalSessions > 0 ? totalCost / Math.max(1, days) : 0
    const avgDailyQuantity = totalSessions > 0 ? totalQuantity / Math.max(1, days) : 0

    return {
      totalCost,
      totalQuantity,
      avgDailyCost,
      avgDailyQuantity,
      totalAnimalsFed,
      totalSessions,
      stockLevels,
      dailySummaries: [],
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
    // Verify the feed type belongs to this farm
    const { data: existingFeedType, error: checkError } = await supabase
      .from('feed_types')
      .select('id, name')
      .eq('id', feedTypeId)
      .eq('farm_id', farmId)
      .single()

    if (checkError || !existingFeedType) {
      return { success: false, error: 'Feed type not found or access denied' }
    }

    // Block deletion if this feed type is used in any ration recipe.
    // feed_ration_ingredients uses ON DELETE RESTRICT — the user must
    // remove or replace the ingredient in those rations first.
    const { data: rationIngredients, error: rationError } = await supabase
      .from('feed_ration_ingredients')
      .select('id, feed_rations(name)')
      .eq('feed_type_id', feedTypeId)
      .limit(1)

    if (rationError) {
      console.error('Error checking ration ingredients:', rationError)
      return { success: false, error: 'Error checking related records' }
    }

    if (rationIngredients && rationIngredients.length > 0) {
      return {
        success: false,
        error: `Cannot delete "${existingFeedType.name}" — it is used as an ingredient in one or more feed rations. Remove it from those rations first.`
      }
    }

    // feed_inventory, feed_inventory_transactions, feed_waste_records,
    // and feed_consumption_records all use ON DELETE CASCADE, so they
    // will be removed automatically when the feed type is deleted.
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
    animalCount?: number | null
    feedingTime?: string
    notes?: string | null
    feedingMode?: string
    appetiteScore?: number | null
    approximateWasteKg?: number | null
    observations?: Record<string, any> | null
    feedTimeSlotId?: string | null
    slotName?: string | null
    sessionPercentage?: number | null
    // New feed line items (migration 070)
    entries?: Array<{
      feedTypeId: string
      quantityKg: number
      percentage?: number | null
      costPerKg?: number | null
      notes?: string | null
    }>
  }
) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: existingRecord, error: checkError } = await supabase
      .from('feed_consumption_records')
      .select('id, farm_id')
      .eq('id', consumptionId)
      .eq('farm_id', farmId)
      .single()

    if (checkError || !existingRecord) {
      return { success: false, error: 'Consumption record not found or access denied' }
    }

    // ── Update session header ──────────────────────────────────
    const headerUpdate: any = { updated_at: new Date().toISOString() }

    if (data.feedingTime) {
      headerUpdate.feeding_time = data.feedingTime
      headerUpdate.consumption_date = new Date(data.feedingTime).toISOString().split('T')[0]
    }
    if (data.feedingMode) headerUpdate.feeding_mode = data.feedingMode
    if (data.animalCount != null) headerUpdate.animal_count = data.animalCount
    if (data.notes !== undefined) headerUpdate.notes = data.notes
    if (data.appetiteScore !== undefined) headerUpdate.appetite_score = data.appetiteScore
    if (data.approximateWasteKg !== undefined) headerUpdate.approximate_waste_kg = data.approximateWasteKg
    if (data.observations !== undefined) headerUpdate.observations = data.observations
    if (data.feedTimeSlotId !== undefined) headerUpdate.feed_time_slot_id = data.feedTimeSlotId
    if (data.slotName !== undefined) headerUpdate.slot_name = data.slotName
    if (data.sessionPercentage !== undefined) headerUpdate.session_percentage = data.sessionPercentage
    // Deprecated scalar columns — keep in sync for backward compat
    if (data.feedTypeId) headerUpdate.feed_type_id = data.feedTypeId
    if (data.quantityKg !== undefined) headerUpdate.quantity_consumed = data.quantityKg

    const { data: updatedRecord, error: updateError } = await (supabase
      .from('feed_consumption_records') as any)
      .update(headerUpdate)
      .eq('id', consumptionId)
      .eq('farm_id', farmId)
      .select(`
        *,
        feed_consumption_feeds (
          id, feed_type_id, quantity_kg, percentage_of_mix, cost_per_kg,
          feed_types ( name, category_id )
        ),
        feed_consumption_animals (
          animal_id, quantity_kg,
          animals ( tag_number, name )
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating consumption record:', updateError)
      return { success: false, error: updateError.message }
    }

    // ── Replace feed line items if provided ───────────────────
    const entries = data.entries
    if (entries && entries.length > 0) {
      await (supabase as any)
        .from('feed_consumption_feeds')
        .delete()
        .eq('consumption_id', consumptionId)

      await (supabase as any)
        .from('feed_consumption_feeds')
        .insert(entries.map(e => ({
          consumption_id: consumptionId,
          feed_type_id: e.feedTypeId,
          quantity_kg: Math.max(0, e.quantityKg),
          percentage_of_mix: e.percentage ?? null,
          cost_per_kg: e.costPerKg ?? null,
          notes: e.notes ?? null,
        })))
    }

    // ── Replace animal links if provided ──────────────────────
    const animalIds = data.animalIds
    if (animalIds && animalIds.length > 0) {
      await (supabase as any)
        .from('feed_consumption_animals')
        .delete()
        .eq('consumption_id', consumptionId)

      const totalQty = data.quantityKg ?? 0
      await (supabase as any)
        .from('feed_consumption_animals')
        .insert(animalIds.map(aid => ({
          consumption_id: consumptionId,
          animal_id: aid,
          quantity_kg: animalIds.length > 0
            ? parseFloat((totalQty / animalIds.length).toFixed(4))
            : null,
        })))
    }

    return { success: true, data: updatedRecord }

  } catch (error) {
    console.error('Error in updateFeedConsumption:', error)
    return { success: false, error: 'An unexpected error occurred while updating the record' }
  }
}

// Delete Feed Consumption Record
// The CASCADE on feed_consumption_feeds and feed_consumption_animals
// handles child rows automatically.
export async function deleteFeedConsumption(farmId: string, consumptionId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const { error: deleteError } = await supabase
      .from('feed_consumption_records')
      .delete()
      .eq('id', consumptionId)
      .eq('farm_id', farmId)

    if (deleteError) {
      console.error('Error deleting consumption record:', deleteError)
      return { success: false, error: deleteError.message }
    }

    return { success: true, message: 'Consumption record deleted successfully' }

  } catch (error) {
    console.error('Error in deleteFeedConsumption:', error)
    return { success: false, error: 'An unexpected error occurred while deleting the record' }
  }
}

// Get a single Feed Consumption Record by ID
export async function getFeedConsumptionById(farmId: string, consumptionId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data, error } = await (supabase
      .from('feed_consumption_records') as any)
      .select(`
        *,
        feed_consumption_feeds (
          id, feed_type_id, quantity_kg, percentage_of_mix, cost_per_kg, notes,
          feed_types ( id, name, description, category_id )
        ),
        feed_consumption_animals (
          animal_id, quantity_kg,
          animals ( id, tag_number, name )
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