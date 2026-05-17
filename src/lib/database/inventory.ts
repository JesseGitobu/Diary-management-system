// lib/database/inventory.ts
// Aligned with the normalized schema:
//   inventory_items         — core item (unit_of_measure_id FK, preferred_supplier_id FK)
//   stock_movements         — immutable ledger (replaces inventory_transactions)
//   purchase_orders         — PO header
//   purchase_order_lines    — PO line items (replaces purchase_order_items)
//   inventory_usage_events  — cross-feature usage (health, breeding, feeding)
//   inventory_waste_records — waste / loss register
//   inventory_batches       — batch / expiry tracking
//   suppliers               — supplier master
//   storage_locations       — storage areas
//   v_inventory_items       — view: items + joined labels
//   v_stock_movements       — view: movements + joined labels
//   v_inventory_batches     — view: batches + expiry countdown
//   v_inventory_alerts      — view: unresolved alerts
//   v_inventory_usage       — view: usage events + labels
//   v_inventory_waste       — view: waste records + labels
//   v_purchase_orders       — view: POs + JSON items array

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSupabaseClient }          from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateInventoryItemInput {
  name:                    string
  category_id:             string
  subcategory_id?:         string | null
  department_id?:          string | null
  equipment_id?:           string | null
  unit_of_measure_id:      string          // FK → units_of_measure.id
  preferred_supplier_id?:  string | null   // FK → suppliers.id
  storage_location_id?:    string | null
  current_stock:           number
  minimum_stock?:          number
  reorder_level?:          number
  reorder_quantity?:       number
  cost_per_unit?:          number
  is_perishable?:          boolean
  requires_batch_tracking?: boolean
  shelf_life_days?:        number | null
  description?:            string | null
  notes?:                  string | null
  sku?:                    string | null
  created_by?:             string | null
  // Optional: purchase receipt fields saved alongside item creation
  purchase_quantity?:      number | null
  purchase_unit_id?:       string | null   // FK → units_of_measure.id
  purchase_amount?:        number | null
  // Optional: category metadata key-value pairs  { field_id: uuid → value }
  metadata?:               MetadataEntry[]
}

export interface MetadataEntry {
  field_id:       string
  text_value?:    string | null
  number_value?:  number | null
  date_value?:    string | null   // ISO date string → cast to DATE in DB
  boolean_value?: boolean | null
  other_text?:    string | null
}

export interface RecordStockMovementInput {
  inventory_item_id: string
  movement_type_id:  string          // FK → stock_movement_types.id
  quantity_change:   number          // signed: +in / -out / ±adjustment
  stock_before:      number
  stock_after:       number
  batch_id?:         string | null
  supplier_id?:      string | null
  storage_from_id?:  string | null
  storage_to_id?:    string | null
  usage_type_id?:    string | null
  waste_reason_id?:  string | null
  unit_cost?:        number | null
  source_module?:    string | null   // 'health' | 'breeding' | 'feeding' | 'maintenance'
  source_record_id?: string | null
  reference_number?: string | null
  animal_group_id?:  string | null
  performed_by:      string          // auth.users.id
  movement_date?:    string          // ISO timestamp; defaults to NOW()
  notes?:            string | null
}

export interface CreatePurchaseOrderInput {
  po_number:         string
  supplier_id?:      string | null
  order_date:        string
  expected_delivery: string
  payment_terms?:    string | null
  delivery_terms?:   string | null
  delivery_address?: string | null
  notes?:            string | null
  total_amount:      number
  created_by:        string
  items: Array<{
    inventory_item_id?:  string | null   // FK if item already in system
    item_name_snapshot:  string          // snapshot of name at order time
    quantity:            number
    unit_of_measure_id:  string          // FK → units_of_measure.id
    unit_price:          number
  }>
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — READ  (inventory items)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches inventory items via the v_inventory_items view which already
 * joins category, subcategory, unit label, supplier and storage names.
 * Optionally filtered by category_id.
 */
export async function getInventoryItems(farmId: string, categoryId?: string) {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('v_inventory_items')
    .select('*')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .order('name')

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching inventory items:', error)
    return []
  }

  return (data as any[]) ?? []
}

/**
 * Fetches a single inventory item by ID (raw table — no view join needed
 * for internal logic that only needs IDs and numeric columns).
 */
export async function getInventoryItem(itemId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('inventory_items')
    .select(`
      id, farm_id, name, sku,
      category_id, subcategory_id, department_id, equipment_id,
      unit_of_measure_id, preferred_supplier_id, storage_location_id,
      current_stock, minimum_stock, reorder_level, reorder_quantity,
      cost_per_unit, total_value,
      is_perishable, requires_batch_tracking, shelf_life_days,
      is_active, last_restocked_at, created_at, updated_at
    `)
    .eq('id', itemId)
    .single()

  if (error) {
    console.error('Error fetching inventory item:', error)
    return null
  }

  return data as any
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — READ  (stats & alerts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lightweight stats used by the dashboard overview cards.
 * Uses the view so we don't repeat the join logic.
 */
export async function getInventoryStats(farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('v_inventory_items')
      .select('current_stock, minimum_stock, total_value, is_low_stock, is_out_of_stock')
      .eq('farm_id', farmId)
      .eq('is_active', true)

    if (error) throw error

    const items = (data as any[]) ?? []

    return {
      totalItems:    items.length,
      lowStockItems: items.filter(i => i.is_low_stock).length,
      outOfStock:    items.filter(i => i.is_out_of_stock).length,
      totalValue:    items.reduce((s, i) => s + (i.total_value ?? 0), 0),
      // expiringItems is resolved from v_inventory_batches below
      expiringItems: 0,
    }
  } catch (err) {
    console.error('Error getting inventory stats:', err)
    return { totalItems: 0, lowStockItems: 0, outOfStock: 0, totalValue: 0, expiringItems: 0 }
  }
}

/**
 * Unresolved alerts from v_inventory_alerts (pre-sorted critical-first).
 */
export async function getInventoryAlerts(farmId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('v_inventory_alerts')
    .select('*')
    .eq('farm_id', farmId)

  if (error) {
    console.error('Error fetching inventory alerts:', error)
    return []
  }

  return (data as any[]) ?? []
}

/**
 * Batches expiring within the next `withinDays` days.
 * Uses the v_inventory_batches view which calculates days_to_expiry.
 */
export async function getExpiringBatches(farmId: string, withinDays = 30) {
  const supabase = await createServerSupabaseClient()

  // The view already filters is_expired = FALSE and current_quantity > 0
  const { data, error } = await supabase
    .from('v_inventory_batches')
    .select('*')
    .eq('farm_id', farmId)           // farm_id comes through the join to inventory_items
    .lte('days_to_expiry', withinDays)
    .order('days_to_expiry')

  if (error) {
    console.error('Error fetching expiring batches:', error)
    return []
  }

  return (data as any[]) ?? []
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — CREATE  (inventory item)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an inventory item and — in the same logical operation — inserts:
 *   • The opening stock_movement (type = purchase or adjustment)
 *   • An inventory_purchase_receipt if purchase details were supplied
 *   • inventory_item_metadata rows for each category field value
 *
 * All three inserts share the same Supabase client but are NOT wrapped in a
 * DB transaction here (Supabase JS does not expose BEGIN/COMMIT directly).
 * For ACID guarantees, wrap this in a Postgres function / RPC if required.
 */
export async function createInventoryItem(
  farmId:           string,
  itemData:         CreateInventoryItemInput,
  openingMovementTypeId: string,   // FK to stock_movement_types — typically the 'purchase' or 'adjustment' row id
) {
  const supabase = await createServerSupabaseClient()

  console.log('💾 [createInventoryItem] Starting creation for farm:', farmId)
  
  // Track which tables received data
  const tableStatus = {
    inventory_items: { attempted: false, success: false, error: null as string | null },
    stock_movements: { attempted: false, success: false, error: null as string | null },
    inventory_purchase_receipts: { attempted: false, success: false, error: null as string | null },
    inventory_item_metadata: { attempted: false, success: false, error: null as string | null },
  }

  // ── 1. Insert the core item ──────────────────────────────────────────────
  const costPerUnit   = itemData.cost_per_unit   ?? 0
  const currentStock  = itemData.current_stock   ?? 0

  console.log('📦 [createInventoryItem] Inserting item:', {
    name: itemData.name,
    category_id: itemData.category_id,
    farm_id: farmId,
    current_stock: currentStock,
    cost_per_unit: costPerUnit,
  })

  tableStatus.inventory_items.attempted = true

  const { data: item, error: itemError } = await supabase
    .from('inventory_items')
    .insert({
      farm_id:                farmId,
      name:                   itemData.name,
      category_id:            itemData.category_id,
      subcategory_id:         itemData.subcategory_id          ?? null,
      department_id:          itemData.department_id           ?? null,
      equipment_id:           itemData.equipment_id            ?? null,
      unit_of_measure_id:     itemData.unit_of_measure_id,
      preferred_supplier_id:  itemData.preferred_supplier_id   ?? null,
      storage_location_id:    itemData.storage_location_id     ?? null,
      current_stock:          currentStock,
      minimum_stock:          itemData.minimum_stock           ?? 0,
      reorder_level:          itemData.reorder_level           ?? 0,
      reorder_quantity:       itemData.reorder_quantity        ?? 0,
      cost_per_unit:          costPerUnit,
      // total_value is maintained by the DB trigger trg_update_item_total_value
      is_perishable:          itemData.is_perishable           ?? false,
      requires_batch_tracking: itemData.requires_batch_tracking ?? false,
      shelf_life_days:        itemData.shelf_life_days         ?? null,
      description:            itemData.description             ?? null,
      notes:                  itemData.notes                   ?? null,
      sku:                    itemData.sku                     ?? null,
      created_by:             itemData.created_by              ?? null,
      last_restocked_at:      currentStock > 0 ? new Date().toISOString() : null,
      is_active:              true,
    })
    .select()
    .single()

  if (itemError) {
    tableStatus.inventory_items.success = false
    tableStatus.inventory_items.error = itemError.message
    console.error('❌ [createInventoryItem] Error inserting inventory item:', {
      message: itemError.message,
      code: (itemError as any).code,
      details: (itemError as any).details,
      hint: (itemError as any).hint,
    })
    console.error('📊 [createInventoryItem] Table Status:', tableStatus)
    return { success: false, error: itemError.message }
  }

  tableStatus.inventory_items.success = true
  console.log('✅ [createInventoryItem] Item created successfully:', item.id)

  // ── 2. Record the opening stock movement (if stock > 0) ──────────────────
  if (currentStock > 0) {
    console.log('📝 [createInventoryItem] Recording opening stock movement:', {
      inventory_item_id: item.id,
      quantity_change: currentStock,
      movement_type_id: openingMovementTypeId,
    })

    tableStatus.stock_movements.attempted = true

    const { error: mvtError } = await supabase
      .from('stock_movements')
      .insert({
        inventory_item_id: item.id,
        movement_type_id:  openingMovementTypeId,
        supplier_id:       itemData.preferred_supplier_id ?? null,
        quantity_change:   currentStock,
        stock_before:      0,
        stock_after:       currentStock,
        unit_cost:         costPerUnit || null,
        reference_number:  'OPENING STOCK',
        performed_by:      itemData.created_by ?? null,
        movement_date:     new Date().toISOString(),
        notes:             'Initial stock on item creation',
      })

    if (mvtError) {
      tableStatus.stock_movements.success = false
      tableStatus.stock_movements.error = mvtError.message
      // Non-fatal — item was created; log and continue
      console.error('⚠️  [createInventoryItem] Error recording opening stock movement:', {
        message: mvtError.message,
        code: (mvtError as any).code,
        details: (mvtError as any).details,
      })
    } else {
      tableStatus.stock_movements.success = true
      console.log('✅ [createInventoryItem] Opening stock movement recorded')
    }
  } else {
    console.log('⊘ [createInventoryItem] Skipping stock movement (current_stock = 0)')
  }

  // ── 3. Record purchase receipt (if purchase details provided) ─────────────
  if (
    itemData.purchase_quantity &&
    itemData.purchase_amount   &&
    itemData.purchase_unit_id
  ) {
    const cpuFromReceipt = itemData.purchase_amount / itemData.purchase_quantity

    console.log('🧾 [createInventoryItem] Recording purchase receipt:', {
      inventory_item_id: item.id,
      purchase_quantity: itemData.purchase_quantity,
      purchase_amount: itemData.purchase_amount,
      cost_per_unit: cpuFromReceipt,
    })

    tableStatus.inventory_purchase_receipts.attempted = true

    const { error: receiptError } = await supabase
      .from('inventory_purchase_receipts')
      .insert({
        inventory_item_id: item.id,
        supplier_id:       itemData.preferred_supplier_id ?? null,
        purchase_quantity: itemData.purchase_quantity,
        purchase_unit_id:  itemData.purchase_unit_id,
        purchase_amount:   itemData.purchase_amount,
        cost_per_unit:     cpuFromReceipt,
        received_date:     new Date().toISOString().split('T')[0],
        received_by:       itemData.created_by ?? null,
      })

    if (receiptError) {
      tableStatus.inventory_purchase_receipts.success = false
      tableStatus.inventory_purchase_receipts.error = receiptError.message
      console.error('⚠️  [createInventoryItem] Error recording purchase receipt:', {
        message: receiptError.message,
        code: (receiptError as any).code,
        details: (receiptError as any).details,
      })
    } else {
      tableStatus.inventory_purchase_receipts.success = true
      console.log('✅ [createInventoryItem] Purchase receipt recorded')
    }
  } else {
    console.log('⊘ [createInventoryItem] Skipping purchase receipt (missing purchase details)')
  }

  // ── 4. Insert category metadata ───────────────────────────────────────────
  console.log('🏷️  [createInventoryItem] Checking metadata...')
  console.log('   - itemData.metadata exists?', !!itemData.metadata)
  console.log('   - itemData.metadata type:', typeof itemData.metadata)
  console.log('   - itemData.metadata value:', itemData.metadata)

  if (itemData.metadata && itemData.metadata.length > 0) {
    console.log('🏷️  [createInventoryItem] Processing metadata entries:', itemData.metadata.length)
    console.log('   📋 Raw metadata entries:', JSON.stringify(itemData.metadata, null, 2))

    tableStatus.inventory_item_metadata.attempted = true

    // Log each metadata entry before filtering
    itemData.metadata.forEach((m, idx) => {
      console.log(`   Entry ${idx}:`, {
        field_id: m.field_id,
        text_value: m.text_value,
        number_value: m.number_value,
        date_value: m.date_value,
        boolean_value: m.boolean_value,
        other_text: m.other_text,
        hasValue: (m.text_value != null || m.number_value != null || m.date_value != null || m.boolean_value != null),
      })
    })

    const metaRows = itemData.metadata
      .filter(m => {
        const hasValue = (
          m.text_value    != null ||
          m.number_value  != null ||
          m.date_value    != null ||
          m.boolean_value != null
        )
        if (!hasValue) {
          console.log(`   ⊘ Filtering out entry (all values null):`, m.field_id)
        }
        return hasValue
      })
      .map(m => {
        const row = {
          inventory_item_id: item.id,
          field_id:          m.field_id,
          text_value:        m.text_value    ?? null,
          number_value:      m.number_value  ?? null,
          date_value:        m.date_value    ?? null,
          boolean_value:     m.boolean_value ?? null,
          other_text:        m.other_text    ?? null,
        }
        console.log(`   ✓ Will insert metadata row:`, row)
        return row
      })

    console.log('📝 [createInventoryItem] Filtered metadata rows to insert:', metaRows.length)
    console.log('   📋 Rows payload:', JSON.stringify(metaRows, null, 2))

    if (metaRows.length > 0) {
      console.log('   🔌 Attempting to insert into inventory_item_metadata...')
      
      const { data: metaData, error: metaError } = await supabase
        .from('inventory_item_metadata')
        .insert(metaRows)
        .select()

      if (metaError) {
        tableStatus.inventory_item_metadata.success = false
        tableStatus.inventory_item_metadata.error = metaError.message
        console.error('⚠️  [createInventoryItem] Error inserting item metadata:', {
          message: metaError.message,
          code: (metaError as any).code,
          details: (metaError as any).details,
          hint: (metaError as any).hint,
          rows_attempted: metaRows.length,
        })
      } else {
        tableStatus.inventory_item_metadata.success = true
        console.log('✅ [createInventoryItem] Metadata inserted successfully')
        console.log('   📦 Inserted rows:', metaData)
      }
    } else {
      console.log('⊘ [createInventoryItem] No valid metadata rows to insert (all values were null)')
    }
  } else {
    console.log('⊘ [createInventoryItem] Skipping metadata')
    console.log('   Reason: itemData.metadata is falsy or has 0 length')
    console.log('   - itemData.metadata:', itemData.metadata)
    console.log('   - length:', itemData.metadata?.length ?? 'N/A')
  }

  // ── SUMMARY: Show which tables received data ────────────────────────────────
  console.log('📊 [createInventoryItem] FINAL TABLE STATUS:', {
    inventory_items: tableStatus.inventory_items.success ? '✅ SUCCESS' : '❌ FAILED',
    stock_movements: tableStatus.stock_movements.attempted 
      ? (tableStatus.stock_movements.success ? '✅ SUCCESS' : '❌ FAILED')
      : '⊘ SKIPPED',
    inventory_purchase_receipts: tableStatus.inventory_purchase_receipts.attempted
      ? (tableStatus.inventory_purchase_receipts.success ? '✅ SUCCESS' : '❌ FAILED')
      : '⊘ SKIPPED',
    inventory_item_metadata: tableStatus.inventory_item_metadata.attempted
      ? (tableStatus.inventory_item_metadata.success ? '✅ SUCCESS' : '❌ FAILED')
      : '⊘ SKIPPED',
  })

  console.log('✅ [createInventoryItem] Item creation complete:', item.id)
  return { success: true, data: item }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — STOCK MOVEMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records a stock movement row and updates inventory_items.current_stock
 * atomically (best-effort; for true atomicity wrap in a DB function/RPC).
 *
 * Also inserts an inventory_usage_events row when movement is usage-type,
 * or an inventory_waste_records row when movement is loss-type.
 */
export async function recordStockMovement(input: RecordStockMovementInput) {
  const supabase = await createServerSupabaseClient()

  // ── 1. Validate stock_after = stock_before + quantity_change ─────────────
  const expected = Number((input.stock_before + input.quantity_change).toFixed(4))
  if (Math.abs(input.stock_after - expected) > 0.01) {
    return {
      success: false,
      error: `Stock calculation mismatch: ${input.stock_before} + ${input.quantity_change} ≠ ${input.stock_after}`,
    }
  }

  if (input.stock_after < 0) {
    return { success: false, error: 'Stock cannot go negative' }
  }

  // ── 2. Insert movement row ────────────────────────────────────────────────
  const { data: movement, error: mvtError } = await supabase
    .from('stock_movements')
    .insert({
      inventory_item_id: input.inventory_item_id,
      movement_type_id:  input.movement_type_id,
      batch_id:          input.batch_id          ?? null,
      supplier_id:       input.supplier_id       ?? null,
      storage_from_id:   input.storage_from_id   ?? null,
      storage_to_id:     input.storage_to_id     ?? null,
      usage_type_id:     input.usage_type_id     ?? null,
      waste_reason_id:   input.waste_reason_id   ?? null,
      quantity_change:   input.quantity_change,
      stock_before:      input.stock_before,
      stock_after:       input.stock_after,
      unit_cost:         input.unit_cost          ?? null,
      source_module:     input.source_module      ?? null,
      source_record_id:  input.source_record_id  ?? null,
      reference_number:  input.reference_number  ?? null,
      animal_group_id:   input.animal_group_id   ?? null,
      performed_by:      input.performed_by,
      movement_date:     input.movement_date ?? new Date().toISOString(),
      notes:             input.notes              ?? null,
    })
    .select()
    .single()

  if (mvtError) {
    console.error('Error recording stock movement:', mvtError)
    return { success: false, error: mvtError.message }
  }

  // ── 3. Update item's current_stock ────────────────────────────────────────
  //    The DB trigger handles total_value recalculation automatically.
  const updatePayload: Record<string, any> = {
    current_stock: input.stock_after,
    updated_at:    new Date().toISOString(),
  }
  if (input.quantity_change > 0) {
    updatePayload.last_restocked_at = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from('inventory_items')
    .update(updatePayload)
    .eq('id', input.inventory_item_id)

  if (updateError) {
    console.error('Error updating item current_stock:', updateError)
    return { success: false, error: updateError.message }
  }

  // ── 4a. Insert usage event (if usage movement) ────────────────────────────
  if (input.usage_type_id) {
    const qty       = Math.abs(input.quantity_change)
    const totalCost = input.unit_cost ? qty * input.unit_cost : null

    const { error: usageError } = await supabase
      .from('inventory_usage_events')
      .insert({
        inventory_item_id:  input.inventory_item_id,
        stock_movement_id:  movement.id,
        usage_type_id:      input.usage_type_id,
        quantity_used:      qty,
        unit_cost_snapshot: input.unit_cost ?? null,
        total_cost:         totalCost,
        source_module:      input.source_module     ?? null,
        source_record_id:   input.source_record_id  ?? null,
        animal_group_id:    input.animal_group_id   ?? null,
        performed_by:       input.performed_by,
        usage_date:         input.movement_date ?? new Date().toISOString(),
        notes:              input.notes              ?? null,
      })

    if (usageError) {
      console.error('Error inserting usage event:', usageError)
    }
  }

  // ── 4b. Insert waste record (if loss movement) ────────────────────────────
  if (input.waste_reason_id) {
    const qty       = Math.abs(input.quantity_change)
    const lossValue = input.unit_cost ? qty * input.unit_cost : null

    const { error: wasteError } = await supabase
      .from('inventory_waste_records')
      .insert({
        inventory_item_id:   input.inventory_item_id,
        stock_movement_id:   movement.id,
        waste_reason_id:     input.waste_reason_id,
        batch_id:            input.batch_id          ?? null,
        storage_location_id: input.storage_from_id   ?? null,
        quantity_lost:       qty,
        unit_cost_snapshot:  input.unit_cost          ?? null,
        estimated_loss:      lossValue,
        loss_date:           (input.movement_date ?? new Date().toISOString()).split('T')[0],
        recorded_by:         input.performed_by,
        notes:               input.notes              ?? null,
      })

    if (wasteError) {
      console.error('Error inserting waste record:', wasteError)
    }
  }

  return { success: true, data: movement, newStock: input.stock_after }
}

/**
 * Fetches paginated stock movements for the "Movements" dashboard tab.
 * Uses v_stock_movements which already joins all labels.
 */
export async function getStockMovements(
  farmId:          string,
  movementTypeCode?: string,   // e.g. 'purchase' | 'usage' | 'adjustment'
  limit = 100,
) {
  const supabase = await createServerSupabaseClient()

  // The view joins through inventory_items.farm_id
  let query = supabase
    .from('v_stock_movements')
    .select('*')
    .order('movement_date', { ascending: false })
    .limit(limit)

  // Filter by farm via the item's farm_id — we need a sub-query approach;
  // since views flatten the join we filter on item's farm directly.
  // If your view exposes farm_id, use: .eq('farm_id', farmId)
  // Otherwise filter via inventory_item_id IN (select id from inventory_items where farm_id = ?)
  const { data: itemIds } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('farm_id', farmId)
    .eq('is_active', true)

  const ids = ((itemIds as any[]) ?? []).map(i => i.id)
  if (ids.length === 0) return []

  query = query.in('inventory_item_id', ids)

  if (movementTypeCode && movementTypeCode !== 'all') {
    query = query.eq('movement_type', movementTypeCode)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching stock movements:', error)
    return []
  }

  return (data as any[]) ?? []
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — SUPPLIERS
// ─────────────────────────────────────────────────────────────────────────────

export async function getSuppliers(farmId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('suppliers')
    .select(`
      id, name, contact_person, phone, email, address,
      payment_terms, reliability_score,
      total_purchases_ytd, last_delivery_date, status,
      supplier_categories (
        category_id,
        category:inventory_categories ( code, display_name )
      )
    `)
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching suppliers:', error)
    return []
  }

  // Flatten supplier_categories into a product_categories array to match
  // the shape the dashboard component expects.
  return ((data as any[]) ?? []).map(s => ({
    ...s,
    product_categories: (s.supplier_categories ?? []).map(
      (sc: any) => sc.category?.code ?? ''
    ),
    supplier_categories: undefined,
  }))
}

export async function getSupplierStats(farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    // Get all active supplier-category links in one query
    const { data, error } = await supabase
      .from('suppliers')
      .select(`
        id,
        supplier_categories (
          category:inventory_categories ( code )
        )
      `)
      .eq('farm_id', farmId)
      .eq('is_active', true)

    if (error) throw error

    const suppliers = (data as any[]) ?? []
    const supplierTypes: Record<string, number> = {}

    for (const s of suppliers) {
      for (const sc of (s.supplier_categories ?? [])) {
        const code = sc.category?.code ?? 'other'
        supplierTypes[code] = (supplierTypes[code] ?? 0) + 1
      }
    }

    return { totalSuppliers: suppliers.length, supplierTypes }
  } catch (err) {
    console.error('Error getting supplier stats:', err)
    return { totalSuppliers: 0, supplierTypes: {} }
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — PURCHASE ORDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a PO header + line items.
 * Returns the full PO via v_purchase_orders which includes the JSON items array.
 */
export async function createPurchaseOrder(farmId: string, input: CreatePurchaseOrderInput) {
  const supabase = await createServerSupabaseClient()

  // ── 1. PO header ──────────────────────────────────────────────────────────
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      farm_id:           farmId,
      po_number:         input.po_number,
      supplier_id:       input.supplier_id       ?? null,
      order_date:        input.order_date,
      expected_delivery: input.expected_delivery,
      payment_terms:     input.payment_terms      ?? null,
      delivery_terms:    input.delivery_terms      ?? null,
      delivery_address:  input.delivery_address   ?? null,
      notes:             input.notes              ?? null,
      total_amount:      input.total_amount,
      status:            'pending',
      created_by:        input.created_by,
      updated_by:        input.created_by,
    })
    .select('id, po_number, status, order_date, expected_delivery, total_amount')
    .single()

  if (poError) {
    console.error('Error creating purchase order:', poError)
    return { success: false, error: poError.message }
  }

  // ── 2. Line items ─────────────────────────────────────────────────────────
  const lines = input.items.map(item => ({
    purchase_order_id:   po.id,
    inventory_item_id:   item.inventory_item_id   ?? null,
    item_name_snapshot:  item.item_name_snapshot,
    quantity:            item.quantity,
    unit_of_measure_id:  item.unit_of_measure_id,
    unit_price:          item.unit_price,
    // line_total is a GENERATED ALWAYS column; no need to supply it
    quantity_received:   0,
  }))

  const { error: linesError } = await supabase
    .from('purchase_order_lines')
    .insert(lines)

  if (linesError) {
    console.error('Error inserting PO lines:', linesError)
    return { success: false, error: linesError.message }
  }

  // ── 3. Return full PO via view ────────────────────────────────────────────
  const { data: completePO, error: fetchError } = await supabase
    .from('v_purchase_orders')
    .select('*')
    .eq('id', po.id)
    .single()

  if (fetchError) {
    console.error('Error fetching completed PO:', fetchError)
    // Return the header at minimum
    return { success: true, data: po }
  }

  return { success: true, data: completePO }
}

/**
 * Fetches all purchase orders for a farm via the v_purchase_orders view
 * (which includes the JSON items array — no N+1 queries).
 */
export async function getPurchaseOrders(farmId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('v_purchase_orders')
    .select('*')
    .eq('farm_id', farmId)
    .order('order_date', { ascending: false })

  if (error) {
    console.error('Error fetching purchase orders:', error)
    return []
  }

  return (data as any[]) ?? []
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — REFERENCE DATA  (categories, units, movement types)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns categories with their subcategories nested.
 * Used by AddInventoryModal to populate the category picker.
 */
export async function getInventoryCategories() {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('inventory_categories')
    .select(`
      id, code, name, display_name, emoji, color_bg, color_text, sort_order,
      subcategories:inventory_subcategories (
        id, code, name, sort_order
      )
    `)
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('Error fetching inventory categories:', error)
    return []
  }

  return (data as any[]) ?? []
}

/**
 * Returns all active units of measure.
 * Used to populate unit selectors in the modals.
 */
export async function getUnitsOfMeasure() {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('units_of_measure')
    .select('id, code, label, unit_type')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('Error fetching units of measure:', error)
    return []
  }

  return (data as any[]) ?? []
}

/**
 * Returns all active stock movement types.
 * The API layer uses these IDs when building stock movement payloads.
 */
export async function getStockMovementTypes() {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('stock_movement_types')
    .select('id, code, label, direction')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching stock movement types:', error)
    return []
  }

  return (data as any[]) ?? []
}

/**
 * Returns metadata field definitions for a given category (and optionally
 * subcategory).  The modal uses these to render the "Category Details" step.
 * 
 * Uses admin client to bypass RLS, since inventory_metadata_fields is a
 * reference table with no farm_id column — all farms can see all metadata fields.
 */
export async function getMetadataFields(categoryId: string, subcategoryId?: string) {
  const supabase = await createServerSupabaseClient()

  console.log('🔧 [getMetadataFields] Starting query with:', { categoryId, subcategoryId })

  let query = supabase
    .from('inventory_metadata_fields')
    .select(`
      id, field_key, label, field_type, placeholder, hint, unit_label,
      is_required, sort_order, subcategory_id,
      options:inventory_metadata_options ( id, value, sort_order )
    `)
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('sort_order')

  console.log('🔧 [getMetadataFields] Query after category & is_active filters')

  // Fetch fields that apply to the whole category (no subcategory restriction)
  // OR fields scoped to this specific subcategory.
  if (subcategoryId) {
    console.log(`🔧 [getMetadataFields] Adding OR filter for subcategory: ${subcategoryId}`)
    query = query.or(`subcategory_id.is.null,subcategory_id.eq.${subcategoryId}`)
  } else {
    console.log(`🔧 [getMetadataFields] Filtering for subcategory_id IS NULL (category-wide fields only)`)
    query = query.is('subcategory_id', null)
  }

  console.log('🔧 [getMetadataFields] About to execute query...')

  const { data, error } = await query

  if (error) {
    console.error('❌ [getMetadataFields] Query error:', {
      message: error.message,
      code: (error as any).code,
      details: (error as any).details,
      hint: (error as any).hint,
    })
    console.log('⚠️  [getMetadataFields] RLS might be blocking reads. This is a reference table and should be readable by all authenticated users.')
    return []
  }

  console.log('✅ [getMetadataFields] Query success. Returned', (data as any[])?.length ?? 0, 'fields')
  if (data && (data as any[]).length > 0) {
    console.log('   Sample fields:', JSON.stringify((data as any[]).slice(0, 3).map((f: any) => ({ 
      id: f.id, 
      field_key: f.field_key, 
      field_type: f.field_type,
      subcategory_id: f.subcategory_id 
    })), null, 2))
  }

  return (data as any[]) ?? []
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — USAGE & WASTE  (dashboard tabs)
// ─────────────────────────────────────────────────────────────────────────────

export async function getUsageRecords(farmId: string, limit = 100) {
  const supabase = await createServerSupabaseClient()

  const { data: itemIds } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('farm_id', farmId)

  const ids = ((itemIds as any[]) ?? []).map(i => i.id)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('v_inventory_usage')
    .select('*')
    .in('inventory_item_id', ids)
    .order('usage_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching usage records:', error)
    return []
  }

  return (data as any[]) ?? []
}

export async function getWasteRecords(farmId: string, limit = 100) {
  const supabase = await createServerSupabaseClient()

  const { data: itemIds } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('farm_id', farmId)

  const ids = ((itemIds as any[]) ?? []).map(i => i.id)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('v_inventory_waste')
    .select('*')
    .in('inventory_item_id', ids)
    .order('loss_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching waste records:', error)
    return []
  }

  return (data as any[]) ?? []
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — STORAGE LOCATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getStorageLocations(farmId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('v_storage_utilisation')
    .select('*')
    .eq('farm_id', farmId)
    .order('name')

  if (error) {
    console.error('Error fetching storage locations:', error)
    return []
  }

  return (data as any[]) ?? []
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 — PRODUCTION / DISTRIBUTION  (unchanged — not inventory-related)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAvailableVolume(farmId: string): Promise<number> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: produced, error: pErr } = await supabase
      .from('daily_production_summary')
      .select('total_milk_volume')
      .eq('farm_id', farmId)

    if (pErr) throw pErr

    const totalProduced = ((produced as any[]) ?? [])
      .reduce((s, r) => s + (r.total_milk_volume ?? 0), 0)

    const { data: distributed, error: dErr } = await supabase
      .from('distribution_records')
      .select('quantity_distributed')
      .eq('farm_id', farmId)

    if (dErr) throw dErr

    const totalDistributed = ((distributed as any[]) ?? [])
      .reduce((s, r) => s + (r.quantity_distributed ?? 0), 0)

    return Math.max(0, totalProduced - totalDistributed)
  } catch (err) {
    console.error('Error getting available volume:', err)
    return 0
  }
}

export async function getProductionSummary(farmId: string, recordDate: string) {
  try {
    const supabase = await createServerSupabaseClient()

    const [{ data: todayData }, { data: allData }, { data: distData }] = await Promise.all([
      supabase
        .from('daily_production_summary')
        .select('total_milk_volume')
        .eq('farm_id', farmId)
        .eq('record_date', recordDate)
        .single(),
      supabase
        .from('daily_production_summary')
        .select('total_milk_volume')
        .eq('farm_id', farmId),
      supabase
        .from('distribution_records')
        .select('quantity_distributed')
        .eq('farm_id', farmId),
    ])

    const todayProduction    = (todayData as any)?.total_milk_volume ?? 0
    const totalProduced      = ((allData  as any[]) ?? []).reduce((s, r) => s + (r.total_milk_volume    ?? 0), 0)
    const totalDistributed   = ((distData as any[]) ?? []).reduce((s, r) => s + (r.quantity_distributed ?? 0), 0)
    const cumulativeAvailable = Math.max(0, totalProduced - totalDistributed)

    return { todayProduction, cumulativeAvailable, totalProduced, totalDistributed }
  } catch (err) {
    console.error('Error getting production summary:', err)
    return { todayProduction: 0, cumulativeAvailable: 0, totalProduced: 0, totalDistributed: 0 }
  }
}

// Client-side distribution helpers (unchanged)
export async function createDistributionRecord(data: {
  farmId: string; channelId: string; volume: number; pricePerLiter: number
  totalAmount: number; deliveryDate: string; deliveryTime?: string
  driverName: string; vehicleNumber?: string; paymentMethod: string
  expectedPaymentDate?: string; notes?: string; status: 'pending' | 'delivered' | 'paid'
}) {
  try {
    const supabase = getSupabaseClient()
    const { data: record, error } = await (supabase.from('distribution_records') as any)
      .insert({
        farm_id: data.farmId, channel_id: data.channelId,
        quantity_distributed: data.volume, unit_price: data.pricePerLiter,
        total_amount: data.totalAmount, distribution_date: data.deliveryDate,
        distribution_status: data.status, notes: data.notes,
      })
      .select().single()
    if (error) throw error
    return record
  } catch (err) {
    console.error('Error creating distribution record:', err)
    throw err
  }
}

export async function updateDistributionRecord(
  recordId: string,
  updates: Partial<{ status: string; actual_delivery_time: string; payment_date: string; notes: string }>
) {
  try {
    const supabase = getSupabaseClient()
    const { data: record, error } = await (supabase.from('distribution_records') as any)
      .update(updates).eq('id', recordId).select().single()
    if (error) throw error
    return record
  } catch (err) {
    console.error('Error updating distribution record:', err)
    throw err
  }
}