// src/app/api/farms/[farmId]/feed-transfer/route.ts
/**
 * POST /api/farms/[farmId]/feed-transfer
 *
 * Transfers feed from one storage location to another within the same farm.
 * 
 * Request body:
 *   - feed_type_id: UUID of the feed type
 *   - quantity_kg: Amount to transfer
 *   - from_storage_location_id: Source storage location UUID
 *   - to_storage_location_id: Destination storage location UUID
 *   - transfer_date: ISO date string (optional, defaults to today)
 *   - notes: Optional transfer notes
 *
 * Response:
 *   Returns both transaction records (transfer_out and transfer_in)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { writeInventoryTransactions } from '@/lib/database/feedInventoryTransactions'

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
      feed_type_id,
      quantity_kg,
      from_storage_location_id,
      to_storage_location_id,
      transfer_date,
      notes,
    }: {
      feed_type_id: string
      quantity_kg: number
      from_storage_location_id?: string
      to_storage_location_id?: string
      transfer_date?: string
      notes?: string
    } = body

    if (!feed_type_id || !quantity_kg) {
      return NextResponse.json(
        { error: 'Missing required fields: feed_type_id, quantity_kg' },
        { status: 400 }
      )
    }

    if (quantity_kg <= 0) {
      return NextResponse.json(
        { error: 'Transfer quantity must be greater than 0' },
        { status: 400 }
      )
    }

    const transferDate = transfer_date ?? new Date().toISOString().split('T')[0]

    // ── Ensure feed_inventory row exists ─────────────────────────────────────
    const { error: inventoryInitError } = await (supabase as any)
      .from('feed_inventory')
      .insert([{
        farm_id: farmId,
        feed_type_id,
        quantity_kg: 0,
      }], {
        onConflict: 'farm_id,feed_type_id'
      })

    if (inventoryInitError && !inventoryInitError.message?.includes('duplicate')) {
      console.error('Warning: Could not ensure inventory row exists:', inventoryInitError)
      // Non-fatal - continue anyway
    }

    // ── Check current stock ──────────────────────────────────────────────────
    const { data: stockData, error: stockError } = await supabase
      .from('feed_inventory')
      .select('quantity_kg')
      .eq('farm_id', farmId)
      .eq('feed_type_id', feed_type_id)
      .single()

    if (stockError) {
      console.error('Error checking stock:', stockError)
      return NextResponse.json(
        { error: 'Failed to check feed stock' },
        { status: 500 }
      )
    }

    const currentStock = stockData?.quantity_kg ?? 0
    if (currentStock < quantity_kg) {
      return NextResponse.json(
        {
          error: 'Insufficient stock for transfer',
          required_kg: quantity_kg,
          available_kg: currentStock,
        },
        { status: 422 }
      )
    }

    // ── Record transfer_out and transfer_in transactions ──────────────────────
    const transferTransactions = [
      {
        farm_id: farmId,
        feed_type_id,
        quantity_kg: -quantity_kg,  // negative = out of inventory
        transaction_type: 'transfer_out' as const,
        reference_id: from_storage_location_id ? undefined : null,
        reference_type: from_storage_location_id ? 'storage_location' : null,
        notes: `Transfer out from storage${from_storage_location_id ? '' : ''}${
          to_storage_location_id ? ' to another location' : ''
        }${notes ? ': ' + notes : ''}`,
        created_by: user.id,
      },
      {
        farm_id: farmId,
        feed_type_id,
        quantity_kg: quantity_kg,  // positive = into inventory
        transaction_type: 'transfer_in' as const,
        reference_id: to_storage_location_id ? undefined : null,
        reference_type: to_storage_location_id ? 'storage_location' : null,
        notes: `Transfer in to storage${to_storage_location_id ? '' : ''}${
          from_storage_location_id ? ' from another location' : ''
        }${notes ? ': ' + notes : ''}`,
        created_by: user.id,
      },
    ]

    const txResult = await writeInventoryTransactions(transferTransactions)
    if (!txResult.success) {
      console.error('Error recording transfer transactions:', txResult.error)
      return NextResponse.json(
        { error: `Failed to record transfer: ${txResult.error}` },
        { status: 500 }
      )
    }

    // ── Sync feed_inventory quantity from latest transaction balance ──────────
    const { data: latestTx } = await supabase
      .from('feed_inventory_transactions')
      .select('balance_after_kg')
      .eq('farm_id', farmId)
      .eq('feed_type_id', feed_type_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (latestTx) {
      await (supabase as any)
        .from('feed_inventory')
        .upsert({
          farm_id: farmId,
          feed_type_id,
          quantity_kg: latestTx.balance_after_kg,
          source: 'purchased',
        }, {
          onConflict: 'farm_id,feed_type_id',
        })
    }

    // ── Get updated inventory ────────────────────────────────────────────────
    const { data: updatedInventory } = await supabase
      .from('feed_inventory')
      .select(`
        *,
        feed_types (
          id,
          name,
          description,
          typical_cost_per_kg,
          unit_of_measure,
          low_stock_threshold,
          is_formulate_feed
        )
      `)
      .eq('farm_id', farmId)
      .eq('feed_type_id', feed_type_id)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        feed_inventory: updatedInventory,
        transfer_transactions: txResult.data,
        quantity_transferred_kg: quantity_kg,
        transfer_date: transferDate,
      },
    })
  } catch (error) {
    console.error('Feed transfer error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
