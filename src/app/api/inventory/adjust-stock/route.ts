import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getInventoryItem, updateInventoryItemStock, recordInventoryTransaction } from '@/lib/database/inventory'

/**
 * POST /api/inventory/adjust-stock
 * Record a stock movement (purchase, usage, adjustment, transfer, loss)
 * 
 * Request body:
 * {
 *   inventory_item_id: string (required)
 *   movement_type: 'purchase' | 'usage' | 'adjustment' | 'transfer' | 'loss' | 'return' | 'damage' (required)
 *   quantity_change: number (required) - positive or negative
 *   stock_before: number (required) - current stock before change
 *   stock_after: number (required) - expected stock after change
 *   batch_id?: string (optional - for batch tracking)
 *   reference_id?: string (optional - PO number, FR number, etc)
 *   reference_type?: string (optional - 'purchase_order', 'feeding_record', etc)
 *   usage_type?: string (optional - 'feeding', 'treatment', 'breeding', 'routine', 'other')
 *   loss_reason?: string (optional - 'spillage', 'spoilage', 'expired', 'theft', 'damaged', 'other')
 *   animal_group_id?: string (optional - for usage tracking)
 *   notes?: string (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user', success: false }, { status: 400 })
    }

    // Check if user has permission to manage inventory
    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions', success: false }, { status: 403 })
    }

    const body = await request.json()

    // Validate required fields
    const errors: Record<string, string> = {}
    if (!body.inventory_item_id) errors.inventory_item_id = 'Item ID is required'
    if (!body.movement_type) errors.movement_type = 'Movement type is required'
    
    const validMovementTypes = ['purchase', 'usage', 'adjustment', 'transfer', 'loss', 'return', 'damage']
    if (body.movement_type && !validMovementTypes.includes(body.movement_type)) {
      errors.movement_type = `Invalid movement type. Must be one of: ${validMovementTypes.join(', ')}`
    }

    if (body.quantity_change === undefined || body.quantity_change === null) {
      errors.quantity_change = 'Quantity change is required'
    } else if (isNaN(Number(body.quantity_change)) || Number(body.quantity_change) === 0) {
      errors.quantity_change = 'Quantity change must be a non-zero number'
    }

    if (body.stock_before === undefined || isNaN(Number(body.stock_before)) || Number(body.stock_before) < 0) {
      errors.stock_before = 'Valid current stock is required'
    }

    if (body.stock_after === undefined || isNaN(Number(body.stock_after)) || Number(body.stock_after) < 0) {
      errors.stock_after = 'Valid new stock must be non-negative'
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }

    // Get the item to verify it exists and belongs to this farm
    const item = await getInventoryItem(body.inventory_item_id)
    if (!item || item.farm_id !== userRole.farm_id) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found or access denied' },
        { status: 404 }
      )
    }

    // Verify the stock_after matches the calculation
    const calculatedNewStock = Number(item.current_stock) + Number(body.quantity_change)
    if (Math.abs(Number(body.stock_after) - calculatedNewStock) > 0.01) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Stock calculation mismatch. Please recalculate and try again.',
          details: {
            current: item.current_stock,
            change: Number(body.quantity_change),
            expected: calculatedNewStock,
            provided: Number(body.stock_after)
          }
        },
        { status: 400 }
      )
    }

    // Record the transaction first
    const transactionResult = await recordInventoryTransaction({
      inventory_item_id: body.inventory_item_id,
      movement_type: body.movement_type,
      quantity_change: Number(body.quantity_change),
      stock_before: Number(body.stock_before),
      stock_after: Number(body.stock_after),
      batch_id: body.batch_id || undefined,
      reference_id: body.reference_id || undefined,
      reference_type: body.reference_type || undefined,
      performed_by: user.id,
      usage_type: body.usage_type || undefined,
      loss_reason: body.loss_reason || undefined,
      animal_group_id: body.animal_group_id || undefined,
      notes: body.notes || undefined,
    })

    if (!transactionResult.success) {
      return NextResponse.json(
        { success: false, error: transactionResult.error || 'Failed to record transaction' },
        { status: 400 }
      )
    }

    // Update the item's stock
    const updateResult = await updateInventoryItemStock(
      body.inventory_item_id,
      Number(body.stock_after)
    )

    if (!updateResult.success) {
      return NextResponse.json(
        { success: false, error: updateResult.error || 'Failed to update stock' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      transaction: transactionResult.data,
      item: updateResult.data,
      newStock: Number(body.stock_after),
      message: 'Stock movement recorded successfully'
    })
  } catch (error) {
    console.error('❌ [API] Error adjusting inventory stock:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false, details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}