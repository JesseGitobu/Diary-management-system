// src/lib/database/feedWaste.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { recordFeedTransactionRPC } from './feedInventoryTransactions'

// ── Types ─────────────────────────────────────────────────────────────────────

export type WasteReason = 'spillage' | 'refusal' | 'spoilage' | 'over_supply' | 'other'

export interface FeedWasteRecord {
  id: string
  farm_id: string
  feed_type_id: string
  consumption_id: string | null
  assignment_id: string | null
  waste_kg: number
  waste_reason: WasteReason | null
  waste_date: string
  animal_count: number | null
  notes: string | null
  recorded_by: string | null
  created_at: string
  alert_triggered: boolean
}

export interface WasteRecordInput {
  feed_type_id: string
  consumption_id?: string | null
  assignment_id?: string | null
  waste_kg: number
  waste_reason?: WasteReason | null
  waste_date?: string
  animal_count?: number | null
  notes?: string | null
}

export interface WasteSummaryRow {
  farm_id: string
  feed_type_id: string
  feed_name: string
  week_start: string
  total_waste_kg: number
  waste_events: number
  most_common_reason: WasteReason | null
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function getWasteRecords(
  farmId: string,
  options: {
    fromDate?: string
    toDate?: string
    feedTypeId?: string
    limit?: number
  } = {}
): Promise<(FeedWasteRecord & { feed_types: { name: string } | null })[]> {
  try {
    const supabase = await createServerSupabaseClient()
    let query = (supabase as any)
      .from('feed_waste_records')
      .select('*, feed_types(name)')
      .eq('farm_id', farmId)
      .order('waste_date', { ascending: false })

    if (options.fromDate) query = query.gte('waste_date', options.fromDate)
    if (options.toDate)   query = query.lte('waste_date', options.toDate)
    if (options.feedTypeId) query = query.eq('feed_type_id', options.feedTypeId)
    if (options.limit)    query = query.limit(options.limit)

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  } catch (err) {
    console.error('getWasteRecords error:', err)
    return []
  }
}

export async function createWasteRecord(
  farmId: string,
  input: WasteRecordInput,
  userId: string
): Promise<{ success: boolean; data?: FeedWasteRecord; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await (supabase as any)
      .from('feed_waste_records')
      .insert({
        farm_id: farmId,
        feed_type_id: input.feed_type_id,
        consumption_id: input.consumption_id ?? null,
        assignment_id: input.assignment_id ?? null,
        waste_kg: input.waste_kg,
        waste_reason: input.waste_reason ?? null,
        waste_date: input.waste_date ?? new Date().toISOString().split('T')[0],
        animal_count: input.animal_count ?? null,
        notes: input.notes ?? null,
        recorded_by: userId,
      })
      .select()
      .single()

    if (error) throw error

    // Record the waste transaction in the inventory ledger
    // Negative quantity = stock OUT (waste removal)
    const wasteDate = input.waste_date ?? new Date().toISOString().split('T')[0]
    const txResult = await recordFeedTransactionRPC({
      farmId,
      feedTypeId: input.feed_type_id,
      transactionType: 'wastage',
      quantityKg: -input.waste_kg,  // negative = out of inventory
      notes: `Waste: ${input.waste_reason || 'unknown reason'}. ${input.notes || ''}`.trim(),
      transactionDate: wasteDate,
      createdBy: userId,
    })

    if (!txResult.success) {
      console.error('⚠️ Failed to record waste transaction:', txResult.error)
      // Non-fatal — waste record still created; transaction may be missed
    }

    // Check alert threshold
    await checkAndFlagWasteAlert(farmId, data as FeedWasteRecord)

    return { success: true, data }
  } catch (err) {
    console.error('createWasteRecord error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function deleteWasteRecord(
  farmId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    // Deletion does NOT auto-reverse the ledger (use reverseInventoryTransaction if needed).
    const { error } = await (supabase as any)
      .from('feed_waste_records')
      .delete()
      .eq('farm_id', farmId)
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('deleteWasteRecord error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

export async function getWasteSummary(
  farmId: string,
  weeksBack = 4
): Promise<WasteSummaryRow[]> {
  try {
    const supabase = await createServerSupabaseClient()
    const since = new Date(Date.now() - weeksBack * 7 * 86_400_000).toISOString().split('T')[0]

    const { data, error } = await (supabase as any)
      .from('feed_waste_summary')
      .select('*')
      .eq('farm_id', farmId)
      .gte('week_start', since)
      .order('week_start', { ascending: false })

    if (error) throw error
    return data ?? []
  } catch (err) {
    console.error('getWasteSummary error:', err)
    return []
  }
}

// ── Alert helper ──────────────────────────────────────────────────────────────

/**
 * Compare this waste event against the farm's alert settings.
 * If waste_kg exceeds the configured threshold, mark alert_triggered = true.
 * The actual alert (push/email) is handled by the calling API layer.
 */
async function checkAndFlagWasteAlert(
  farmId: string,
  record: FeedWasteRecord
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()

    // Load alert threshold from feed_alert_settings
    const { data: settings } = await (supabase as any)
      .from('feed_alert_settings')
      .select('waste_threshold_kg')
      .eq('farm_id', farmId)
      .single()

    const threshold = settings?.waste_threshold_kg ?? null
    if (threshold !== null && record.waste_kg >= threshold) {
      await (supabase as any)
        .from('feed_waste_records')
        .update({ alert_triggered: true })
        .eq('id', record.id)
    }
  } catch {
    // Non-critical — don't block the caller
  }
}
