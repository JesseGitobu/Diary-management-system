// src/lib/database/feedInventoryTransactions.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type TransactionType =
  | 'restock_purchase'
  | 'restock_harvest'
  | 'restock_formulation'
  | 'feeding'
  | 'wastage'
  | 'adjustment'
  | 'transfer_out'
  | 'transfer_in'
  | 'formulation_use'

export interface InventoryTransaction {
  id: string
  farm_id: string
  feed_type_id: string
  quantity_kg: number
  transaction_type: TransactionType
  balance_after_kg: number
  reference_id: string | null
  reference_type: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface WriteTransactionInput {
  farm_id: string
  feed_type_id: string
  quantity_kg: number          // positive = in, negative = out
  transaction_type: TransactionType
  reference_id?: string | null
  reference_type?: string | null
  notes?: string | null
  created_by?: string | null
}

// ── Write a single transaction row ───────────────────────────────────────────
export async function writeInventoryTransaction(
  input: WriteTransactionInput
): Promise<{ success: boolean; data?: InventoryTransaction; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()

    // ── Get the current balance for this farm + feed_type ────────────────────
    const { data: latestTx } = await (supabase as any)
      .from('feed_inventory_transactions')
      .select('balance_after_kg')
      .eq('farm_id', input.farm_id)
      .eq('feed_type_id', input.feed_type_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const previousBalance = latestTx?.balance_after_kg ?? 0
    const newBalance = previousBalance + input.quantity_kg

    const { data, error } = await (supabase as any)
      .from('feed_inventory_transactions')
      .insert({
        ...input,
        balance_after_kg: newBalance,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('writeInventoryTransaction error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Write multiple transactions atomically ────────────────────────────────────
export async function writeInventoryTransactions(
  inputs: WriteTransactionInput[]
): Promise<{ success: boolean; data?: InventoryTransaction[]; error?: string }> {
  if (inputs.length === 0) return { success: true, data: [] }
  try {
    const supabase = await createServerSupabaseClient()

    // ── Calculate running balances ────────────────────────────────────────────
    // For each transaction, we need to get the current balance and add the new quantity
    const enrichedInputs: any[] = []

    for (const input of inputs) {
      // Get the latest balance for this farm + feed_type
      const { data: latestTx } = await (supabase as any)
        .from('feed_inventory_transactions')
        .select('balance_after_kg')
        .eq('farm_id', input.farm_id)
        .eq('feed_type_id', input.feed_type_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const previousBalance = latestTx?.balance_after_kg ?? 0
      const newBalance = previousBalance + input.quantity_kg

      enrichedInputs.push({
        ...input,
        balance_after_kg: newBalance,
      })
    }

    // ── Insert all transactions with calculated balances ────────────────────
    const { data, error } = await (supabase as any)
      .from('feed_inventory_transactions')
      .insert(enrichedInputs)
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('writeInventoryTransactions error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Write an adjustment to reverse a previous transaction ────────────────────
export async function reverseInventoryTransaction(
  originalTxn: { farm_id: string; feed_type_id: string; quantity_kg: number; id: string },
  userId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  return writeInventoryTransaction({
    farm_id: originalTxn.farm_id,
    feed_type_id: originalTxn.feed_type_id,
    quantity_kg: -originalTxn.quantity_kg,
    transaction_type: 'adjustment',
    reference_id: originalTxn.id,
    reference_type: 'feed_inventory_transaction',
    notes: notes ?? 'Reversal of transaction ' + originalTxn.id,
    created_by: userId,
  })
}

// ── Record transaction via RPC (record_feed_transaction stored procedure) ────
// This is the PRIMARY way to record all inventory movements.
// RPC handles: row locking → balance calculation → ledger insert → feed_inventory update
export async function recordFeedTransactionRPC(options: {
  farmId: string
  feedTypeId: string
  transactionType: TransactionType
  quantityKg: number                 // positive = IN, negative = OUT
  storageLoc?: string
  costPerKg?: number
  totalCost?: number
  purchaseId?: string                // for restock_purchase
  harvestId?: string                 // for restock_harvest
  formulationId?: string             // for restock_formulation or formulation_use
  animalGroupId?: string             // for feeding
  notes?: string
  transactionDate?: string           // ISO date, defaults to today
  createdBy?: string
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase.rpc('record_feed_transaction', {
      p_farm_id:             options.farmId,
      p_feed_type_id:        options.feedTypeId,
      p_transaction_type:    options.transactionType,
      p_quantity_kg:         options.quantityKg,
      p_storage_location_id: options.storageLoc,
      p_cost_per_kg:         options.costPerKg,
      p_total_cost:          options.totalCost,
      p_purchase_id:         options.purchaseId,
      p_harvest_id:          options.harvestId,
      p_formulation_id:      options.formulationId,
      p_animal_group_id:     options.animalGroupId,
      p_notes:               options.notes,
      p_transaction_date:    options.transactionDate ?? new Date().toISOString().split('T')[0],
      p_created_by:          options.createdBy,
    })

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('recordFeedTransactionRPC error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Get current stock balance per feed type ───────────────────────────────────
export async function getCurrentStock(
  farmId: string
): Promise<{ feed_type_id: string; quantity_in_stock: number; as_of: string }[]> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await (supabase as any)
      .from('feed_current_stock')
      .select('feed_type_id, quantity_in_stock, as_of')
      .eq('farm_id', farmId)

    if (error) throw error
    return data ?? []
  } catch (err) {
    console.error('getCurrentStock error:', err)
    return []
  }
}

// ── Get transaction history for a feed type ───────────────────────────────────
export async function getFeedTypeTransactions(
  farmId: string,
  feedTypeId: string,
  limit = 50
): Promise<InventoryTransaction[]> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await (supabase as any)
      .from('feed_inventory_transactions')
      .select('*')
      .eq('farm_id', farmId)
      .eq('feed_type_id', feedTypeId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data ?? []
  } catch (err) {
    console.error('getFeedTypeTransactions error:', err)
    return []
  }
}

// ── Get recent transactions for a farm (dashboard feed) ──────────────────────
export async function getRecentTransactions(
  farmId: string,
  days = 7,
  limit = 100
): Promise<(InventoryTransaction & { feed_types: { name: string } | null })[]> {
  try {
    const supabase = await createServerSupabaseClient()
    const since = new Date(Date.now() - days * 86_400_000).toISOString()

    const { data, error } = await (supabase as any)
      .from('feed_inventory_transactions')
      .select('*, feed_types(name)')
      .eq('farm_id', farmId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data ?? []
  } catch (err) {
    console.error('getRecentTransactions error:', err)
    return []
  }
}

// ── Check if stock will go negative ──────────────────────────────────────────
export async function checkStockSufficiency(
  farmId: string,
  requirements: { feed_type_id: string; quantity_kg: number }[]
): Promise<{ sufficient: boolean; shortfalls: { feed_type_id: string; available_kg: number; required_kg: number }[] }> {
  const current = await getCurrentStock(farmId)
  const stockMap = new Map(current.map(s => [s.feed_type_id, s.quantity_in_stock]))
  const shortfalls: { feed_type_id: string; available_kg: number; required_kg: number }[] = []

  for (const req of requirements) {
    const available = stockMap.get(req.feed_type_id) ?? 0
    if (available < req.quantity_kg) {
      shortfalls.push({ feed_type_id: req.feed_type_id, available_kg: available, required_kg: req.quantity_kg })
    }
  }

  return { sufficient: shortfalls.length === 0, shortfalls }
}
