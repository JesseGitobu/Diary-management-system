// src/app/api/feed/inventory/route.ts  (POST + GET)
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

// ─────────────────────────────────────────────────────────────────────────────
// Schema v2 notes for this file
// ─────────────────────────────────────────────────────────────────────────────
// POST:
//   Previously called addFeedInventory() which wrote to feed_purchases or
//   feed_harvests and then upserted feed_inventory.
//   Now:
//     1. Writes to feed_stock_entries (single table for both source types).
//     2. Inserts a feed_inventory_transactions row (restock_purchase or
//        restock_harvest). The balance trigger sets balance_after_kg.
//     3. If nutritional data is present, inserts a feed_nutritional_profiles row.
//     4. Never touches feed_inventory directly — it is now a VIEW.
//
// GET:
//   Previously read from feed_inventory (mutable balance table).
//   Now reads from feed_inventory_snapshot (materialised view) joined with
//   feed_types for a single fast query.  Falls back to the live feed_inventory
//   VIEW if the snapshot has no rows yet for this farm.
// ─────────────────────────────────────────────────────────────────────────────

const VALID_SOURCE_TYPES = new Set([
  'crop_harvest', 'animal_production', 'fermentation', 'processing', 'other',
])

// Map freetext source_type values to the DB enum + append detail to notes.
function resolveSourceType(rawSourceType: string | null | undefined, currentNotes: string | null | undefined): {
  source_type: string | null
  notes: string | null
} {
  if (!rawSourceType) return { source_type: null, notes: currentNotes ?? null }

  if (VALID_SOURCE_TYPES.has(rawSourceType)) {
    return { source_type: rawSourceType, notes: currentNotes ?? null }
  }

  // Freetext: store as 'other' and append the raw value to notes
  const annotation = `Source type: ${rawSourceType}`
  const notes = currentNotes
    ? `${currentNotes}\n${annotation}`
    : annotation
  return { source_type: 'other', notes }
}

// ── POST /api/feed/inventory ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const farmId: string = userRole.farm_id
    const body = await request.json()

    // ── Destructure form payload ─────────────────────────────────────────────
    const {
      feed_type_id,
      source,
      source_type: rawSourceType,
      yield_source,
      storage_location_id,
      supplier_id,
      supplier,           // supplier_name fallback
      quantity_kg,
      quantity_in_preferred_unit,  // display-only quantity (stored for reference)
      cost_per_kg,
      total_cost,
      purchase_date,      // maps to entry_date (works for both purchased & produced)
      expiry_date,
      batch_number,
      notes: rawNotes,
      // Nutritional fields
      protein_pct,
      fat_pct,
      fiber_pct,
      moisture_pct,
      ash_pct,
      dry_matter_pct,
      ndf_pct,
      adf_pct,
      energy_mj_kg,
      nutritional_data,  // alternative: passed as a nested object
    } = body

    if (!feed_type_id || !quantity_kg || !purchase_date) {
      return NextResponse.json(
        { error: 'Missing required fields: feed_type_id, quantity_kg, purchase_date' },
        { status: 400 }
      )
    }

    if (Number(quantity_kg) <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 })
    }

    const resolvedSource = (source === 'produced') ? 'produced' : 'purchased'
    const { source_type, notes } = resolveSourceType(rawSourceType, rawNotes)

    // ── 1. Insert feed_stock_entries ─────────────────────────────────────────
    const stockEntryPayload = {
      farm_id: farmId,
      feed_type_id,
      source: resolvedSource,
      source_type: resolvedSource === 'produced' ? source_type : null,
      yield_source: resolvedSource === 'produced' ? (yield_source ?? null) : null,
      storage_location_id: storage_location_id || null,
      supplier_id: resolvedSource === 'purchased' ? (supplier_id || null) : null,
      supplier_name: resolvedSource === 'purchased' ? (supplier || null) : null,
      quantity_kg: Number(quantity_kg),
      quantity_value: quantity_in_preferred_unit != null ? Number(quantity_in_preferred_unit) : null,
      quantity_unit: body.quantity_unit ?? null,   // unit symbol/UUID for display
      cost_per_kg: cost_per_kg != null ? Number(cost_per_kg) : null,
      total_cost: total_cost != null ? Number(total_cost) : null,
      entry_date: purchase_date,
      expiry_date: expiry_date || null,
      batch_number: batch_number || null,
      notes,
      created_by: user.id,
    }

    const { data: stockEntry, error: stockEntryError } = await supabase
      .from('feed_stock_entries')
      .insert(stockEntryPayload)
      .select()
      .single()

    if (stockEntryError || !stockEntry) {
      console.error('Error inserting feed_stock_entries:', stockEntryError)
      return NextResponse.json(
        { error: stockEntryError?.message ?? 'Failed to create stock entry' },
        { status: 500 }
      )
    }

    // ── 2. Insert the ledger transaction ─────────────────────────────────────
    // The DB trigger (set_feed_transaction_balance) computes balance_after_kg.
    const transactionType = resolvedSource === 'purchased'
      ? 'restock_purchase'
      : 'restock_harvest'

    const { error: txError } = await supabase
      .from('feed_inventory_transactions')
      .insert({
        farm_id: farmId,
        feed_type_id,
        storage_location_id: storage_location_id || null,
        transaction_type: transactionType,
        quantity_kg: Number(quantity_kg),
        balance_after_kg: 0, // Placeholder; DB trigger will compute the actual balance
        cost_per_kg: cost_per_kg != null ? Number(cost_per_kg) : null,
        total_cost: total_cost != null ? Number(total_cost) : null,
        reference_type: 'feed_stock_entry',
        reference_id: stockEntry.id,
        transaction_date: purchase_date,
        notes: notes ?? null,
        created_by: user.id,
      })

    if (txError) {
      console.error('Error inserting feed_inventory_transactions:', txError)
      // Roll back the stock entry to avoid orphaned documents
      await supabase.from('feed_stock_entries').delete().eq('id', stockEntry.id)
      return NextResponse.json(
        { error: `Failed to record ledger transaction: ${txError.message}` },
        { status: 500 }
      )
    }

    // ── 3. Insert nutritional profile if data is present ─────────────────────
    // Accepts either top-level fields OR a nested nutritional_data object.
    const nutrition = nutritional_data ?? {
      protein_pct, fat_pct, fiber_pct, moisture_pct,
      ash_pct, dry_matter_pct, ndf_pct, adf_pct, energy_mj_kg,
    }

    const hasNutrition = Object.values(nutrition).some(v => v != null && v !== '')

    if (hasNutrition) {
      const { error: nutritionError } = await supabase
        .from('feed_nutritional_profiles')
        .insert({
          farm_id: farmId,
          stock_entry_id: stockEntry.id,
          formulation_id: null,
          protein_pct:    nutrition.protein_pct    != null ? Number(nutrition.protein_pct)    : null,
          fat_pct:        nutrition.fat_pct         != null ? Number(nutrition.fat_pct)         : null,
          fiber_pct:      nutrition.fiber_pct       != null ? Number(nutrition.fiber_pct)       : null,
          moisture_pct:   nutrition.moisture_pct    != null ? Number(nutrition.moisture_pct)    : null,
          ash_pct:        nutrition.ash_pct         != null ? Number(nutrition.ash_pct)         : null,
          dry_matter_pct: nutrition.dry_matter_pct  != null ? Number(nutrition.dry_matter_pct)  : null,
          ndf_pct:        nutrition.ndf_pct         != null ? Number(nutrition.ndf_pct)         : null,
          adf_pct:        nutrition.adf_pct         != null ? Number(nutrition.adf_pct)         : null,
          energy_mj_kg:   nutrition.energy_mj_kg    != null ? Number(nutrition.energy_mj_kg)    : null,
        })

      if (nutritionError) {
        // Non-fatal: log but don't fail the whole request
        console.warn('Failed to insert nutritional profile:', nutritionError.message)
      }
    }

    // ── 4. Return the current snapshot balance for this feed type ─────────────
    const { data: snapshot } = await supabase
      .from('feed_inventory_snapshot')
      .select('feed_type_id, quantity_in_stock, last_cost_per_kg, last_restocked_date')
      .eq('farm_id', farmId)
      .eq('feed_type_id', feed_type_id)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        stock_entry: stockEntry,
        balance: snapshot ?? null,
      },
      message: 'Feed stock added successfully',
    })

  } catch (error) {
    console.error('Feed inventory POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── GET /api/feed/inventory ───────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const farmId: string = userRole.farm_id

    // Primary: materialised snapshot (indexed, sub-millisecond for dashboards)
    const { data: snapshot, error: snapshotError } = await supabase
      .from('feed_inventory_snapshot')
      .select(`
        feed_type_id,
        quantity_in_stock,
        last_cost_per_kg,
        last_restocked_date,
        snapshot_at,
        feed_types (
          id,
          name,
          description,
          unit_of_measure,
          typical_cost_per_kg,
          low_stock_threshold,
          low_stock_threshold_unit,
          is_formulate_feed,
          category_id,
          feed_type_categories (
            id,
            category_name,
            color
          )
        )
      `)
      .eq('farm_id', farmId)
      .order('last_restocked_date', { ascending: false })

    if (snapshotError) {
      console.error('Snapshot query error — falling back to live view:', snapshotError)

      // Fallback: live feed_inventory VIEW (always consistent, slightly slower)
      const { data: liveData, error: liveError } = await supabase
        .from('feed_inventory')
        .select(`
          feed_type_id,
          quantity_in_stock,
          last_cost_per_kg,
          last_restocked_date,
          feed_types (
            id,
            name,
            description,
            unit_of_measure,
            typical_cost_per_kg,
            low_stock_threshold,
            low_stock_threshold_unit,
            is_formulate_feed
          )
        `)
        .eq('farm_id', farmId)

      if (liveError) {
        return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: liveData ?? [], source: 'live_view' })
    }

    return NextResponse.json({
      success: true,
      data: snapshot ?? [],
      source: 'snapshot',
    })

  } catch (error) {
    console.error('Feed inventory GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}