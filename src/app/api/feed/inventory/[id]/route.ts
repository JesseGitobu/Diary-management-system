// src/app/api/feed/inventory/[id]/route.ts  (PUT — edit a stock entry)
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

// ─────────────────────────────────────────────────────────────────────────────
// Schema v2 notes
// ─────────────────────────────────────────────────────────────────────────────
// The old PUT wrote directly to feed_inventory (the mutable balance table).
// That table is now a VIEW — it cannot be updated directly.
//
// Edit semantics for v2:
//   - Metadata changes (dates, notes, supplier, batch number, costs, storage)
//     are applied to feed_stock_entries.
//   - If quantity_kg has changed, we write a correcting 'adjustment'
//     transaction for the *delta only*.  The balance trigger recomputes
//     balance_after_kg automatically.
//   - Nutritional data is upserted in feed_nutritional_profiles.
// ─────────────────────────────────────────────────────────────────────────────

const VALID_SOURCE_TYPES = new Set([
  'crop_harvest', 'animal_production', 'fermentation', 'processing', 'other',
])

function resolveSourceType(rawSourceType: string | null | undefined, currentNotes: string | null | undefined) {
  if (!rawSourceType) return { source_type: null, notes: currentNotes ?? null }
  if (VALID_SOURCE_TYPES.has(rawSourceType)) return { source_type: rawSourceType, notes: currentNotes ?? null }
  const annotation = `Source type: ${rawSourceType}`
  return {
    source_type: 'other',
    notes: currentNotes ? `${currentNotes}\n${annotation}` : annotation,
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params   // this is the feed_stock_entries.id (UUID)
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

    // ── Fetch the existing stock entry (ownership check) ─────────────────────
    const { data: existing, error: fetchError } = await supabase
      .from('feed_stock_entries')
      .select('id, farm_id, feed_type_id, quantity_kg, source')
      .eq('id', id)
      .eq('farm_id', farmId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Stock entry not found' }, { status: 404 })
    }

    // ── Destructure update payload ────────────────────────────────────────────
    const {
      feed_type_id,
      source_type: rawSourceType,
      yield_source,
      storage_location_id,
      supplier_id,
      supplier,
      quantity_kg,
      quantity_in_preferred_unit,
      cost_per_kg,
      total_cost,
      purchase_date,
      expiry_date,
      batch_number,
      notes: rawNotes,
      // Nutritional fields
      protein_pct, fat_pct, fiber_pct, moisture_pct,
      ash_pct, dry_matter_pct, ndf_pct, adf_pct, energy_mj_kg,
      nutritional_data,
    } = body

    const { source_type, notes } = resolveSourceType(rawSourceType, rawNotes)

    // ── 1. Update feed_stock_entries ──────────────────────────────────────────
    const updatePayload: Record<string, unknown> = {
      storage_location_id: storage_location_id || null,
      supplier_id:    existing.source === 'purchased' ? (supplier_id  || null) : null,
      supplier_name:  existing.source === 'purchased' ? (supplier     || null) : null,
      source_type:    existing.source === 'produced'  ? source_type            : null,
      yield_source:   existing.source === 'produced'  ? (yield_source || null) : null,
      quantity_value: quantity_in_preferred_unit != null ? Number(quantity_in_preferred_unit) : null,
      quantity_unit:  body.quantity_unit ?? null,
      cost_per_kg:    cost_per_kg != null ? Number(cost_per_kg) : null,
      total_cost:     total_cost  != null ? Number(total_cost)  : null,
      entry_date:     purchase_date ?? undefined,
      expiry_date:    expiry_date  || null,
      batch_number:   batch_number || null,
      notes,
      updated_by: user.id,
    }

    // quantity_kg is intentionally not updated here — it is derived from the
    // ledger.  If the user changed the quantity, we handle it via a delta
    // adjustment transaction below.

    const { data: updatedEntry, error: updateError } = await supabase
      .from('feed_stock_entries')
      .update(updatePayload)
      .eq('id', id)
      .eq('farm_id', farmId)
      .select()
      .single()

    if (updateError || !updatedEntry) {
      console.error('Error updating feed_stock_entries:', updateError)
      return NextResponse.json(
        { error: updateError?.message ?? 'Failed to update stock entry' },
        { status: 500 }
      )
    }

    // ── 2. Quantity correction via adjustment transaction ─────────────────────
    const newQty = quantity_kg != null ? Number(quantity_kg) : null

    if (newQty != null && Math.abs(newQty - Number(existing.quantity_kg)) > 0.0001) {
      const delta = Number((newQty - Number(existing.quantity_kg)).toFixed(4))

      const { error: adjError } = await supabase
        .from('feed_inventory_transactions')
        .insert({
          farm_id: farmId,
          feed_type_id: existing.feed_type_id,
          storage_location_id: storage_location_id || null,
          transaction_type: 'adjustment',
          quantity_kg: delta,         // positive = added, negative = removed
          balance_after_kg: 0, // Placeholder; DB trigger will compute the actual balance
          cost_per_kg: cost_per_kg != null ? Number(cost_per_kg) : null,
          total_cost:  null,
          reference_type: 'feed_stock_entry',
          reference_id: id,
          transaction_date: purchase_date ?? new Date().toISOString().split('T')[0],
          notes: `Quantity corrected from ${existing.quantity_kg} kg to ${newQty} kg`,
          created_by: user.id,
        })

      if (adjError) {
        console.error('Error inserting adjustment transaction:', adjError)
        return NextResponse.json(
          { error: `Metadata saved but quantity adjustment failed: ${adjError.message}` },
          { status: 500 }
        )
      }

      // Also update the stored quantity_kg on the entry itself so it stays
      // consistent with the ledger total for this specific document.
      await supabase
        .from('feed_stock_entries')
        .update({ quantity_kg: newQty })
        .eq('id', id)
    }

    // ── 3. Upsert nutritional profile ─────────────────────────────────────────
    const nutrition = nutritional_data ?? {
      protein_pct, fat_pct, fiber_pct, moisture_pct,
      ash_pct, dry_matter_pct, ndf_pct, adf_pct, energy_mj_kg,
    }

    const hasNutrition = Object.values(nutrition).some(v => v != null && v !== '')

    if (hasNutrition) {
      const { error: nutritionError } = await supabase
        .from('feed_nutritional_profiles')
        .upsert(
          {
            farm_id: farmId,
            stock_entry_id: id,
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
          },
          { onConflict: 'stock_entry_id' }
        )

      if (nutritionError) {
        console.warn('Failed to upsert nutritional profile:', nutritionError.message)
      }
    }

    // ── 4. Return the fresh snapshot balance ─────────────────────────────────
    const { data: snapshot } = await supabase
      .from('feed_inventory_snapshot')
      .select('feed_type_id, quantity_in_stock, last_cost_per_kg, last_restocked_date')
      .eq('farm_id', farmId)
      .eq('feed_type_id', existing.feed_type_id)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        stock_entry: updatedEntry,
        balance: snapshot ?? null,
      },
      message: 'Feed inventory updated successfully',
    })

  } catch (error) {
    console.error('Feed inventory PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


// =============================================================================
// src/app/api/feed/inventory/[id]/deplete/route.ts  (PUT — manual depletion)
// =============================================================================
// ─────────────────────────────────────────────────────────────────────────────
// Schema v2 notes
// ─────────────────────────────────────────────────────────────────────────────
// The old deplete route wrote `quantity_in_stock` directly to feed_inventory.
// That column no longer exists — feed_inventory is a VIEW.
//
// Depletion is now modelled as:
//   - An 'adjustment' transaction with a negative delta (quantity_kg < 0)
//     that brings the balance down to the supplied quantity_kg target.
//   - The balance trigger enforces the result never goes below 0.
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE_STUB() {
  // Placeholder — this file only exports PUT above.
  // The deplete handler lives at /api/feed/inventory/[id]/deplete/route.ts
}