// src/app/api/suppliers/[id]/purchases/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /api/suppliers/[id]/purchases
 *
 * Returns purchase history for a given supplier, combining:
 *   1. feed_purchases  — matched by supplier.name  (text field)
 *   2. inventory_transactions — matched by supplier_id FK on inventory_items
 *
 * Query params:
 *   ?limit=50        (default 50, max 200)
 *   ?page=1          (1-based)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplierId } = await params

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit  = Math.min(Number(searchParams.get('limit')  ?? 50), 200)
    const page   = Math.max(Number(searchParams.get('page')   ??  1),   1)
    const offset = (page - 1) * limit

    const supabase = await createServerSupabaseClient()

    // ── 1. Fetch the supplier so we know its name ─────────────────────────
    const { data: supplier, error: supplierError } = await (supabase
      .from('suppliers') as any)
      .select('id, name, farm_id')
      .eq('id', supplierId)
      .eq('farm_id', userRole.farm_id)
      .single()

    if (supplierError || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // ── 2. Feed purchases matched by supplier name (case-insensitive) ─────
    const feedPurchasesPromise = (supabase
      .from('feed_purchases') as any)
      .select(`
        id,
        purchase_date,
        quantity_kg,
        cost_per_kg,
        batch_number,
        expiry_date,
        source,
        notes,
        created_at,
        feed_types (
          id,
          name
        )
      `)
      .eq('farm_id', userRole.farm_id)
      .eq('source', 'purchased')
      .ilike('supplier', supplier.name)
      .order('purchase_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // ── 3. General inventory transactions linked via inventory_items ──────
    const inventoryTxPromise = (supabase
      .from('inventory_transactions') as any)
      .select(`
        id,
        transaction_date,
        quantity,
        unit_cost,
        total_cost,
        transaction_type,
        reference_id,
        notes,
        created_at,
        inventory_items (
          id,
          name,
          unit_of_measure,
          supplier_id
        )
      `)
      .eq('farm_id', userRole.farm_id)
      .eq('transaction_type', 'purchase')
      .eq('inventory_items.supplier_id', supplierId)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1)

    const [feedRes, invRes] = await Promise.all([feedPurchasesPromise, inventoryTxPromise])

    if (feedRes.error) {
      console.error('Feed purchases query error:', feedRes.error)
    }
    if (invRes.error) {
      console.error('Inventory transactions query error:', invRes.error)
    }

    // ── 4. Normalise into a unified shape ─────────────────────────────────
    const feedPurchases: any[] = (feedRes.data ?? []).map((row: any) => ({
      id:           row.id,
      type:         'feed',
      item_name:    row.feed_types?.name ?? 'Unknown Feed',
      item_id:      row.feed_types?.id   ?? null,
      date:         row.purchase_date,
      quantity:     row.quantity_kg,
      unit:         'kg',
      unit_cost:    row.cost_per_kg     ?? null,
      total_cost:   row.cost_per_kg != null
                      ? Number((row.quantity_kg * row.cost_per_kg).toFixed(2))
                      : null,
      batch_number: row.batch_number    ?? null,
      expiry_date:  row.expiry_date     ?? null,
      notes:        row.notes           ?? null,
      created_at:   row.created_at,
    }))

    const invPurchases: any[] = (invRes.data ?? [])
      // only rows where the join actually matched this supplier
      .filter((row: any) => row.inventory_items?.supplier_id === supplierId)
      .map((row: any) => ({
        id:           row.id,
        type:         'inventory',
        item_name:    row.inventory_items?.name          ?? 'Unknown Item',
        item_id:      row.inventory_items?.id            ?? null,
        date:         row.transaction_date,
        quantity:     row.quantity,
        unit:         row.inventory_items?.unit_of_measure ?? 'units',
        unit_cost:    row.unit_cost                      ?? null,
        total_cost:   row.total_cost                     ?? null,
        batch_number: row.reference_id                   ?? null,
        expiry_date:  null,
        notes:        row.notes                          ?? null,
        created_at:   row.created_at,
      }))

    // Merge and re-sort by date descending
    const allPurchases = [...feedPurchases, ...invPurchases].sort(
      (a, b) => new Date(b.date ?? b.created_at).getTime()
              - new Date(a.date ?? a.created_at).getTime()
    )

    // ── 5. Summary stats ──────────────────────────────────────────────────
    const totalCount    = allPurchases.length
    const totalSpend    = allPurchases.reduce((s, p) => s + (p.total_cost ?? 0), 0)
    const lastPurchase  = allPurchases[0]?.date ?? null

    return NextResponse.json({
      supplier: { id: supplier.id, name: supplier.name },
      purchases: allPurchases,
      summary: {
        total_count:   totalCount,
        total_spend:   Number(totalSpend.toFixed(2)),
        last_purchase: lastPurchase,
      },
      pagination: { page, limit, has_more: allPurchases.length === limit },
    })
  } catch (error) {
    console.error('Error fetching supplier purchases:', error)
    return NextResponse.json({ error: 'Failed to fetch purchase history' }, { status: 500 })
  }
}
