// src/app/api/farms/[farmId]/feed-formulate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

interface IngredientInput {
  feed_type_id: string
  percentage: number   // 0–100
}

interface IngredientRequirement extends IngredientInput {
  required_kg: number
}

/**
 * POST /api/farms/[farmId]/feed-formulate
 *
 * Schema v2 changes vs the old route:
 *   - Stock levels are now read from `feed_inventory_snapshot` (materialised view)
 *     rather than `feed_inventory` (which is now a plain view over the ledger).
 *   - Ingredient deductions and the output restock are written as
 *     `feed_inventory_transactions` rows. The balance trigger on that table
 *     maintains `balance_after_kg` automatically — no manual upsert needed.
 *   - The finished product is recorded in `feed_formulations` +
 *     `feed_formulation_ingredients` instead of `feed_purchases`.
 *   - `reference_type` is now `'feed_formulation'` and `reference_id` points
 *     to `feed_formulations.id` for every related transaction.
 *   - No manual feed_inventory upsert loop — the VIEW always reflects the
 *     ledger truth and the materialised snapshot is refreshed by its own trigger.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params
    const supabase = await createServerSupabaseClient()

    // ── Auth ──────────────────────────────────────────────────────────────────
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // ── Parse & validate body ─────────────────────────────────────────────────
    const body = await request.json()
    const {
      output_feed_type_id,
      batch_quantity_kg,
      production_date,
      notes,
      ingredients,
      storage_location_id,
      batch_number,
      expiry_date,
    }: {
      output_feed_type_id: string
      batch_quantity_kg: number
      production_date: string
      notes?: string
      ingredients: IngredientInput[]
      storage_location_id?: string
      batch_number?: string
      expiry_date?: string
    } = body

    if (!output_feed_type_id || !batch_quantity_kg || !production_date) {
      return NextResponse.json(
        { error: 'Missing required fields: output_feed_type_id, batch_quantity_kg, production_date' },
        { status: 400 }
      )
    }
    if (batch_quantity_kg <= 0) {
      return NextResponse.json({ error: 'Batch quantity must be greater than 0' }, { status: 400 })
    }
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'At least one ingredient is required' }, { status: 400 })
    }

    // Percentages must sum to ≥98% and ≤100%
    const totalPct = ingredients.reduce((s, i) => s + Number(i.percentage ?? 0), 0)
    if (totalPct < 98 || totalPct > 100.001) {
      return NextResponse.json(
        { error: `Ingredient percentages must sum to 98–100% (currently ${totalPct.toFixed(2)}%)` },
        { status: 400 }
      )
    }

    // No duplicate feed types
    const feedTypeIds = ingredients.map(i => i.feed_type_id)
    if (new Set(feedTypeIds).size !== feedTypeIds.length) {
      return NextResponse.json(
        { error: 'Duplicate ingredients — each feed type may only appear once' },
        { status: 400 }
      )
    }

    // ── Calculate required kg per ingredient ──────────────────────────────────
    const requirements: IngredientRequirement[] = ingredients.map(ing => ({
      feed_type_id: ing.feed_type_id,
      percentage: Number(ing.percentage),
      required_kg: Number(((ing.percentage / 100) * batch_quantity_kg).toFixed(4)),
    }))

    // ── Check stock from the materialised snapshot (fast indexed read) ────────
    // feed_inventory_snapshot is a materialised view refreshed by trigger.
    // Fall back to the live feed_inventory VIEW only if the snapshot is missing rows.
    const [snapshotRes, ingredientTypesRes] = await Promise.all([
      supabase
        .from('feed_inventory_snapshot')
        .select('feed_type_id, quantity_in_stock')
        .eq('farm_id', farmId)
        .in('feed_type_id', feedTypeIds),
      supabase
        .from('feed_types')
        .select('id, name, typical_cost_per_kg')
        .in('id', feedTypeIds),
    ])

    if (snapshotRes.error) {
      console.error('Error fetching snapshot for formulation:', snapshotRes.error)
      return NextResponse.json({ error: 'Failed to check ingredient stock levels' }, { status: 500 })
    }

    const stockMap = new Map<string, number>(
      (snapshotRes.data ?? [])
        .filter((s): s is { feed_type_id: string; quantity_in_stock: number | null } => s.feed_type_id !== null)
        .map(s => [s.feed_type_id, Number(s.quantity_in_stock ?? 0)])
    );

    const ingredientTypeMap = new Map<string, { name: string; typical_cost_per_kg: number | null }>(
      (ingredientTypesRes.data ?? []).map(ft => [ft.id, {
        name: ft.name,
        typical_cost_per_kg: ft.typical_cost_per_kg,
      }])
    )

    // ── Validate sufficient stock ─────────────────────────────────────────────
    const shortfalls = requirements
      .filter(r => (stockMap.get(r.feed_type_id) ?? 0) < r.required_kg)
      .map(r => ({
        feed_type_id: r.feed_type_id,
        feed_name: ingredientTypeMap.get(r.feed_type_id)?.name ?? r.feed_type_id,
        required_kg: r.required_kg,
        available_kg: stockMap.get(r.feed_type_id) ?? 0,
        shortfall_kg: Number((r.required_kg - (stockMap.get(r.feed_type_id) ?? 0)).toFixed(4)),
      }))

    if (shortfalls.length > 0) {
      return NextResponse.json(
        { error: 'Insufficient stock for one or more ingredients', shortfalls },
        { status: 422 }
      )
    }

    // ── Weighted-average cost of output batch ─────────────────────────────────
    const outputCostPerKg = requirements.reduce((sum, req) => {
      const cpk = ingredientTypeMap.get(req.feed_type_id)?.typical_cost_per_kg ?? 0
      return sum + (cpk * (req.percentage / 100))
    }, 0)

    const outputTotalCost = outputCostPerKg > 0
      ? Number((outputCostPerKg * batch_quantity_kg).toFixed(2))
      : null

    // ── 1. Write the formulation document ────────────────────────────────────
    // feed_formulations is the canonical record for this batch.
    // The old code wrote to feed_purchases instead — removed.
    const { data: formulation, error: formulationError } = await supabase
      .from('feed_formulations')
      .insert({
        farm_id: farmId,
        output_feed_type_id,
        storage_location_id: storage_location_id || null,
        batch_quantity_kg,
        batch_number: batch_number || null,
        production_date,
        expiry_date: expiry_date || null,
        cost_per_kg: outputCostPerKg > 0 ? Number(outputCostPerKg.toFixed(4)) : null,
        total_cost: outputTotalCost,
        notes: notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (formulationError || !formulation) {
      console.error('Error creating feed_formulations record:', formulationError)
      return NextResponse.json(
        { error: `Failed to record formulation: ${formulationError?.message}` },
        { status: 500 }
      )
    }

    const totalBatchWeight = Number(body.batch_quantity_kg);

    // 2. Map the ingredients and calculate the weight for each
    const ingredientRows = ingredients.map((ing: any) => ({
      formulation_id: formulation.id, // The ID of the parent formulation
      feed_type_id: ing.feed_type_id,
      percentage: Number(ing.percentage),
      // CALCULATE THE MISSING FIELD:
      // (percentage / 100) * total batch weight
      quantity_kg: Number(((Number(ing.percentage) / 100) * totalBatchWeight).toFixed(4))
    }));

    // 3. Now perform the insert
    const { error: ingredientsError } = await supabase
      .from('feed_formulation_ingredients')
      .insert(ingredientRows);

    if (ingredientsError) {
      console.error('Error inserting formulation ingredients:', ingredientsError);
      // Roll back the formulation record to keep the DB consistent
      await supabase.from('feed_formulations').delete().eq('id', formulation.id);
      return NextResponse.json(
        { error: `Failed to record ingredients: ${ingredientsError.message}` },
        { status: 500 }
      );
    }

    // ── 3. Deduct each ingredient via the transaction ledger ─────────────────
    // quantity_kg is NEGATIVE for stock-out transactions.
    // balance_after_kg is computed automatically by the DB trigger
    // (set_feed_transaction_balance) — we do NOT calculate it here.
    // Update your deductionRows mapping:
    const deductionRows = ingredients.map((ing: any) => ({
      farm_id: farmId,
      feed_type_id: ing.feed_type_id,
      storage_location_id: storage_location_id || null,
      transaction_type: "formulation_use" as const,
      // Ensure ingredients are negative numbers (deductions)
      quantity_kg: -Math.abs(Number(ing.quantity_kg)),
      cost_per_kg: ing.cost_per_kg || null,
      total_cost: null,
      reference_type: 'feed_formulation',
      reference_id: formulation.id,
      transaction_date: body.production_date || new Date().toISOString().split('T')[0],
      notes: `Used for batch: ${body.batch_number || 'Unnamed Batch'}`,
      created_by: user.id,

      // ADD THIS LINE TO SATISFY THE TYPESCRIPT COMPILER:
      balance_after_kg: 0
    }));

    // Now the insert will work:
    const { error: deductError } = await supabase
      .from('feed_inventory_transactions')
      .insert(deductionRows);

    // ── 4. Add the output batch to inventory ──────────────────────────────────
    // A single 'restock_formulation' transaction credits the output feed type.
    const { error: restockError } = await supabase
      .from('feed_inventory_transactions')
      .insert({
        farm_id: farmId,
        feed_type_id: output_feed_type_id,
        storage_location_id: storage_location_id || null,
        transaction_type: 'restock_formulation',
        quantity_kg: batch_quantity_kg,
        balance_after_kg: 0, // Placeholder; DB trigger will compute the actual balance
        cost_per_kg: outputCostPerKg > 0 ? Number(outputCostPerKg.toFixed(4)) : null,
        total_cost: outputTotalCost,
        reference_type: 'feed_formulation',
        reference_id: formulation.id,
        transaction_date: production_date,
        notes: `Formulated batch — ${batch_quantity_kg} kg on ${production_date}`,
        created_by: user.id,
      })

    if (restockError) {
      console.error('Error inserting restock transaction:', restockError)
      // Clean up all writes made so far
      await supabase.from('feed_inventory_transactions').delete().eq('reference_id', formulation.id)
      await supabase.from('feed_formulation_ingredients').delete().eq('formulation_id', formulation.id)
      await supabase.from('feed_formulations').delete().eq('id', formulation.id)
      return NextResponse.json(
        { error: `Failed to add output to stock: ${restockError.message}` },
        { status: 500 }
      )
    }

    // ── 5. Return the updated snapshot balance for the output feed ────────────
    // The materialised view is refreshed by its own trigger after the transaction
    // insert above — by the time we query it, the balance reflects the new batch.
    const { data: outputSnapshot } = await supabase
      .from('feed_inventory_snapshot')
      .select('feed_type_id, quantity_in_stock, last_cost_per_kg, last_restocked_date')
      .eq('farm_id', farmId)
      .eq('feed_type_id', output_feed_type_id)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        formulation,
        output_balance: outputSnapshot ?? null,
      },
      batch_quantity_kg,
      ingredients_used: requirements,
    })

  } catch (error) {
    console.error('Feed formulation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}