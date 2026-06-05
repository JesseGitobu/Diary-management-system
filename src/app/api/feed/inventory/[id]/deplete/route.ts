// src/app/api/feed/inventory/[id]/deplete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

// ─────────────────────────────────────────────────────────────────────────────
// Schema v2 notes
// ─────────────────────────────────────────────────────────────────────────────
// Old behaviour: directly wrote `quantity_in_stock` to the `feed_inventory`
// table — impossible now because feed_inventory is a VIEW derived from the
// transaction ledger.
//
// New behaviour:
//   1. Reads the current live balance from feed_inventory (the VIEW) for this
//      farm + feed_type_id.
//   2. Computes the delta (target_qty - current_balance). If negative, writes
//      a negative 'adjustment' transaction. If the user passes quantity_kg = 0
//      it fully drains the stock.
//   3. The balance trigger validates the result never goes below 0.
//   4. The [id] route parameter is the feed_stock_entries.id — we resolve the
//      feed_type_id from that record. (The old route accepted feed_type_id
//      directly; we stay backwards-compatible by also accepting feed_type_id
//      in the request body as a fallback.)
// ─────────────────────────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    const {
      quantity_kg = 0,    // desired ending balance (0 = full depletion)
      depleted_at,
      notes,
      feed_type_id: bodyFeedTypeId,  // backwards-compat fallback
    } = body

    // ── Resolve feed_type_id ──────────────────────────────────────────────────
    // Prefer looking it up from feed_stock_entries (new flow).
    // Fall back to the body's feed_type_id (old flow where id was feed_type_id).
    let feedTypeId: string | null = bodyFeedTypeId ?? null

    const { data: stockEntry } = await supabase
      .from('feed_stock_entries')
      .select('id, farm_id, feed_type_id')
      .eq('id', id)
      .eq('farm_id', farmId)
      .maybeSingle()

    if (stockEntry) {
      feedTypeId = stockEntry.feed_type_id
    } else if (!feedTypeId) {
      // Last resort: treat id as feed_type_id (legacy callers)
      feedTypeId = id
    }

    if (!feedTypeId) {
      return NextResponse.json({ error: 'Could not resolve feed type for this entry' }, { status: 400 })
    }

    // ── Get the current live balance from the ledger VIEW ─────────────────────
    const { data: currentBalance, error: balanceError } = await supabase
      .from('feed_inventory')
      .select('quantity_in_stock')
      .eq('farm_id', farmId)
      .eq('feed_type_id', feedTypeId)
      .single()

    if (balanceError || !currentBalance) {
      return NextResponse.json(
        { error: 'No inventory record found for this feed type' },
        { status: 404 }
      )
    }

    const currentQty = Number(currentBalance.quantity_in_stock ?? 0)
    const targetQty  = Math.max(0, Number(quantity_kg))
    const delta      = Number((targetQty - currentQty).toFixed(4))

    // Nothing to do if already at target
    if (Math.abs(delta) <= 0.0001) {
      return NextResponse.json({
        success: true,
        data: { feed_type_id: feedTypeId, quantity_in_stock: currentQty },
        message: 'Balance already at target — no change made',
      })
    }

    if (delta > 0) {
      // Depletion should never increase stock — use the add-stock endpoint instead
      return NextResponse.json(
        { error: `Target quantity (${targetQty}) is higher than current stock (${currentQty}). Use the add-stock endpoint to increase inventory.` },
        { status: 400 }
      )
    }

    // ── Write the adjustment transaction ──────────────────────────────────────
    const transactionDate = depleted_at
      ? new Date(depleted_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    const { error: txError } = await supabase
      .from('feed_inventory_transactions')
      .insert({
        farm_id: farmId,
        feed_type_id: feedTypeId,
        transaction_type: 'adjustment',
        quantity_kg: delta,   // negative value reduces the balance
        balance_after_kg: 0,
        reference_type: stockEntry ? 'feed_stock_entry' : null,
        reference_id:   stockEntry ? stockEntry.id       : null,
        transaction_date: transactionDate,
        notes: notes ?? `Manual depletion — adjusted from ${currentQty} kg to ${targetQty} kg`,
        created_by: user.id,
      })

    if (txError) {
      console.error('Error inserting depletion transaction:', txError)
      return NextResponse.json(
        { error: txError.message },
        { status: 500 }
      )
    }

    // ── Return refreshed snapshot balance ─────────────────────────────────────
    const { data: snapshot } = await supabase
      .from('feed_inventory_snapshot')
      .select('feed_type_id, quantity_in_stock, last_restocked_date')
      .eq('farm_id', farmId)
      .eq('feed_type_id', feedTypeId)
      .single()

    return NextResponse.json({
      success: true,
      data: snapshot ?? { feed_type_id: feedTypeId, quantity_in_stock: targetQty },
      message: 'Feed inventory depleted successfully',
    })

  } catch (error) {
    console.error('Feed inventory deplete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}