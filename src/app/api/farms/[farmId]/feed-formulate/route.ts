// src/app/api/farms/[farmId]/feed-formulate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

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
    }: {
      output_feed_type_id: string
      batch_quantity_kg: number
      production_date: string
      notes?: string
      ingredients: IngredientInput[]
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
    if (Math.abs(totalPct - 100) > 0.1) {
      return NextResponse.json(
        { error: `Ingredient percentages must sum to 100% (currently ${totalPct.toFixed(2)}%)` },
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
    const { data: stockRows, error: stockError } = await supabase
      .from('feed_inventory')
      .select('feed_type_id, quantity_in_stock')
      .eq('farm_id', farmId)
      .in('feed_type_id', feedTypeIds)

    if (stockError) {
      console.error('Error fetching stock for formulation:', stockError)
      return NextResponse.json({ error: 'Failed to check ingredient stock levels' }, { status: 500 })
    }

    const stockMap = new Map<string, number>(
      (stockRows ?? []).map(s => [s.feed_type_id, Number(s.quantity_in_stock ?? 0)])
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

    // ── Deduct each ingredient from feed_inventory ────────────────────────────
    for (const req of requirements) {
      const currentStock = stockMap.get(req.feed_type_id) ?? 0
      const newStock = Number((currentStock - req.required_kg).toFixed(4))

      const { error: deductError } = await supabase
        .from('feed_inventory')
        .update({
          quantity_in_stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq('farm_id', farmId)
        .eq('feed_type_id', req.feed_type_id)

      if (deductError) {
        console.error(`Error deducting ingredient ${req.feed_type_id}:`, deductError)
        return NextResponse.json(
          { error: `Failed to deduct ingredient from stock: ${deductError.message}` },
          { status: 500 }
        )
      }
    }

    // ── Record the formulated feed as a 'produced' purchase ──────────────────
    const { data: purchase, error: purchaseError } = await (supabase
      .from('feed_purchases') as any)
      .insert({
        farm_id: farmId,
        feed_type_id: output_feed_type_id,
        quantity_kg: batch_quantity_kg,
        source: 'produced',
        purchase_date: production_date,
        notes: notes || `Formulated batch — ${batch_quantity_kg} kg`,
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

    // ── Update output feed stock ──────────────────────────────────────────────
    const { error: stockUpdateError } = await supabase.rpc('upsert_feed_stock', {
      p_farm_id: farmId,
      p_feed_type_id: output_feed_type_id,
      p_quantity_kg: batch_quantity_kg,
    })

    if (stockUpdateError) {
      console.error('Error updating output feed stock:', stockUpdateError)
      // Non-fatal — purchase record already created
    }

    return NextResponse.json({
      success: true,
      data: purchase,
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
