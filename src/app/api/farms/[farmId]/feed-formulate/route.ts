// src/app/api/farms/[farmId]/feed-formulate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { writeInventoryTransactions } from '@/lib/database/feedInventoryTransactions'

interface IngredientInput {
  feed_type_id: string
  percentage: number   // 0-100
}

interface IngredientRequirement extends IngredientInput {
  required_kg: number
}

/**
 * POST /api/farms/[farmId]/feed-formulate
 *
 * Formulates a batch of feed from user-defined ingredient percentages:
 *   1. Validates percentages sum to 100 and all ingredients have stock
 *   2. Deducts each ingredient from feed_inventory
 *   3. Adds the finished product to inventory (source: 'produced')
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params
    const supabase = await createServerSupabaseClient()

    // ── Auth ─────────────────────────────────────────────────────────────────
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

    // ── Validate body ────────────────────────────────────────────────────────
    const body = await request.json()
    const {
      output_feed_type_id,
      batch_quantity_kg,
      production_date,
      notes,
      ingredients,
      storage_location_id,
    }: {
      output_feed_type_id: string
      batch_quantity_kg: number
      production_date: string
      notes?: string
      ingredients: IngredientInput[]
      storage_location_id?: string
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

    // ── Validate percentages sum to 100 ───────────────────────────────────────
    const totalPct = ingredients.reduce((s, i) => s + Number(i.percentage ?? 0), 0)
    if (totalPct < 98 || totalPct > 100.001) {
      return NextResponse.json(
        {
          error: `Ingredient percentages must sum to at least 98% and not exceed 100% (currently ${totalPct.toFixed(2)}%)`
        },
        { status: 400 }
      )
    }

    // ── Validate no duplicate feed types ─────────────────────────────────────
    const feedTypeIds = ingredients.map(i => i.feed_type_id)
    if (new Set(feedTypeIds).size !== feedTypeIds.length) {
      return NextResponse.json(
        { error: 'Duplicate ingredients found — each feed type can only appear once' },
        { status: 400 }
      )
    }

    // ── Calculate required quantities ────────────────────────────────────────
    const requirements: IngredientRequirement[] = ingredients.map(ing => ({
      feed_type_id: ing.feed_type_id,
      percentage: Number(ing.percentage),
      required_kg: Number(((ing.percentage / 100) * batch_quantity_kg).toFixed(4)),
    }))

    // ── Check current stock for all ingredients ───────────────────────────────
    const [stockRes, ingredientTypesRes] = await Promise.all([
      supabase
        .from('feed_inventory')
        .select('feed_type_id, quantity_kg')
        .eq('farm_id', farmId)
        .in('feed_type_id', feedTypeIds),
      (supabase.from('feed_types') as any)
        .select('id, name, typical_cost_per_kg')
        .in('id', feedTypeIds),
    ])

    if (stockRes.error) {
      console.error('Error fetching stock for formulation:', stockRes.error)
      return NextResponse.json({ error: 'Failed to check ingredient stock levels' }, { status: 500 })
    }

    const stockMap = new Map<string, number>(
      (stockRes.data ?? []).map((s: any) => [s.feed_type_id, Number(s.quantity_kg ?? 0)])
    )

    // Build map of ingredient feed-type info (name + cost)
    const ingredientTypeMap = new Map<string, { name: string; typical_cost_per_kg: number | null }>(
      (ingredientTypesRes.data ?? []).map((ft: any) => [ft.id, { name: ft.name, typical_cost_per_kg: ft.typical_cost_per_kg }])
    )

    // ── Validate all ingredients have sufficient stock ────────────────────────
    const shortfalls = requirements
      .filter(r => (stockMap.get(r.feed_type_id) ?? 0) < r.required_kg)
      .map(r => ({
        feed_type_id: r.feed_type_id,
        required_kg: r.required_kg,
        available_kg: stockMap.get(r.feed_type_id) ?? 0,
      }))

    if (shortfalls.length > 0) {
      return NextResponse.json(
        { error: 'Insufficient stock for one or more ingredients', shortfalls },
        { status: 422 }
      )
    }

    // ── Calculate output cost_per_kg from weighted ingredient costs ──────────
    const outputCostPerKg = requirements.reduce((sum, req) => {
      const costPerKg = ingredientTypeMap.get(req.feed_type_id)?.typical_cost_per_kg ?? 0
      return sum + (costPerKg * (req.percentage / 100))
    }, 0)

    // ── Record the formulated feed as a 'produced' purchase FIRST ────────────
    // (We need the purchase.id to link ingredient deduction transactions.)
    const { data: purchase, error: purchaseError } = await (supabase
      .from('feed_purchases') as any)
      .insert({
        farm_id: farmId,
        feed_type_id: output_feed_type_id,
        quantity_kg: batch_quantity_kg,
        purchase_date: production_date,
        batch_number: body.batch_number || null,
        expiry_date: body.expiry_date || null,
        cost_per_kg: outputCostPerKg > 0 ? Number(outputCostPerKg.toFixed(4)) : null,
        notes: notes || `Formulated batch — ${batch_quantity_kg} kg`,
        storage_location_id: storage_location_id || null,
      })
      .select()
      .single()

    if (purchaseError) {
      console.error('Error recording formulated feed purchase:', purchaseError)
      return NextResponse.json(
        { error: `Failed to record formulated feed: ${purchaseError.message}` },
        { status: 500 }
      )
    }

    // ── Ensure feed_inventory rows exist for all ingredients ───────────────────
    // The trigger that syncs feed_inventory_transactions to feed_inventory
    // requires that the row exists first. We insert with ON CONFLICT DO NOTHING
    // to avoid overwriting existing rows.
    const inventoryInsertData = [
      ...feedTypeIds.map(typeId => ({
        farm_id: farmId,
        feed_type_id: typeId,
        quantity_kg: 0,
        source: 'purchased',  // ingredients come from purchased stock
      })),
      {
        farm_id: farmId,
        feed_type_id: output_feed_type_id,
        quantity_kg: 0,
        source: 'produced',   // output feed is produced via formulation
      }
    ]

    // Insert with conflict handling (won't error if rows exist)
    const { error: inventoryInitError } = await (supabase as any)
      .from('feed_inventory')
      .insert(inventoryInsertData, { 
        onConflict: 'farm_id,feed_type_id' 
      })

    if (inventoryInitError && !inventoryInitError.message?.includes('duplicate')) {
      console.error('Warning: Could not ensure inventory rows exist:', inventoryInitError)
      // Non-fatal - continue anyway
    }

    // ── Deduct each ingredient via ledger (formulation_use transactions) ──────
    // Record each ingredient deduction as a 'formulation_use' transaction
    const ingredientTransactions = requirements.map(req => ({
      farm_id: farmId,
      feed_type_id: req.feed_type_id,
      quantity_kg: -req.required_kg,   // negative = stock out
      transaction_type: 'formulation_use' as const,
      reference_id: purchase.id,        // link to the output purchase
      reference_type: 'feed_formulation',
      notes: `Used in ${batch_quantity_kg} kg batch of ${output_feed_type_id} (${req.percentage}%)`,
      created_by: user.id,
    }))

    // Record all ingredient deductions
    const ingredientTxResult = await writeInventoryTransactions(ingredientTransactions)
    if (!ingredientTxResult.success) {
      console.error('Error recording ingredient deduction transactions:', ingredientTxResult.error)
      return NextResponse.json(
        { error: `Failed to deduct ingredients from stock: ${ingredientTxResult.error}` },
        { status: 500 }
      )
    }

    // ── Sync feed_inventory quantities from transactions (ensure trigger worked) ──
    // Update each ingredient inventory to reflect the deductions
    for (const req of requirements) {
      const { data: latestTx } = await (supabase as any)
        .from('feed_inventory_transactions')
        .select('balance_after_kg')
        .eq('farm_id', farmId)
        .eq('feed_type_id', req.feed_type_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latestTx) {
        await (supabase as any)
          .from('feed_inventory')
          .upsert({
            farm_id: farmId,
            feed_type_id: req.feed_type_id,
            quantity_kg: latestTx.balance_after_kg,
            source: 'purchased',
          }, {
            onConflict: 'farm_id,feed_type_id',
          })
      }
    }

    // ── Add output feed to inventory via ledger (restock_formulation) ────────
    // Record the formulated output as a 'restock_formulation' transaction
    const outputTxResult = await writeInventoryTransactions([{
      farm_id: farmId,
      feed_type_id: output_feed_type_id,
      quantity_kg: batch_quantity_kg,  // positive = stock in
      transaction_type: 'restock_formulation',
      reference_id: purchase.id,        // link to the output purchase
      reference_type: 'feed_formulation',
      notes: `Formulated batch — ${batch_quantity_kg} kg produced on ${production_date}`,
      created_by: user.id,
    }])

    if (!outputTxResult.success) {
      console.error('Error recording formulated output transaction:', outputTxResult.error)
      return NextResponse.json(
        { error: `Failed to add formulated output to stock: ${outputTxResult.error}` },
        { status: 500 }
      )
    }

    // ── Sync feed_inventory for output feed ──────────────────────────────────
    // Ensure the output feed inventory is updated with the new balance
    const { data: outputLatestTx } = await (supabase as any)
      .from('feed_inventory_transactions')
      .select('balance_after_kg')
      .eq('farm_id', farmId)
      .eq('feed_type_id', output_feed_type_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (outputLatestTx) {
      await (supabase as any)
        .from('feed_inventory')
        .upsert({
          farm_id: farmId,
          feed_type_id: output_feed_type_id,
          quantity_kg: outputLatestTx.balance_after_kg,
          source: 'produced',
        }, {
          onConflict: 'farm_id,feed_type_id',
        })
    }

    // ── Return the full inventory row so the UI can update state directly ─────
    const { data: outputInventory } = await (supabase
      .from('feed_inventory') as any)
      .select(`
        *,
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
      .eq('feed_type_id', output_feed_type_id)
      .single()

    return NextResponse.json({
      success: true,
      data: outputInventory ?? purchase,
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
