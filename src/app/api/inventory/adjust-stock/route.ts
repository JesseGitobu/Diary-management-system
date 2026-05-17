import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser }            from '@/lib/supabase/server'
import { getUserRole }               from '@/lib/database/auth'
import {
  getInventoryItem,
  getStockMovementTypes,
  recordStockMovement,
} from '@/lib/database/inventory'
 
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
 
    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions', success: false }, { status: 403 })
    }
 
    const body = await request.json()
 
    // ── Validate ────────────────────────────────────────────────────────────
    const errors: Record<string, string> = {}
 
    if (!body.inventory_item_id)     errors.inventory_item_id  = 'Item ID is required'
    if (!body.movement_type_code)    errors.movement_type_code = 'Movement type is required'
 
    const validCodes = ['purchase', 'usage', 'adjustment', 'transfer', 'loss', 'reversal']
    if (body.movement_type_code && !validCodes.includes(body.movement_type_code)) {
      errors.movement_type_code = `Must be one of: ${validCodes.join(', ')}`
    }
 
    const quantityChange = Number(body.quantity_change)
    if (body.quantity_change === undefined || body.quantity_change === null) {
      errors.quantity_change = 'Quantity change is required'
    } else if (isNaN(quantityChange) || quantityChange === 0) {
      errors.quantity_change = 'Quantity change must be a non-zero number'
    }
 
    if (body.stock_before === undefined || isNaN(Number(body.stock_before)) || Number(body.stock_before) < 0) {
      errors.stock_before = 'Valid stock_before is required'
    }
 
    if (body.stock_after === undefined || isNaN(Number(body.stock_after)) || Number(body.stock_after) < 0) {
      errors.stock_after = 'stock_after must be ≥ 0'
    }
 
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }
 
    // ── Verify item belongs to this farm ────────────────────────────────────
    const item = await getInventoryItem(body.inventory_item_id)
    if (!item || item.farm_id !== userRole.farm_id) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found or access denied' },
        { status: 404 }
      )
    }
 
    // ── Verify stock arithmetic against live DB value ────────────────────────
    const liveStock      = Number(item.current_stock)
    const providedBefore = Number(body.stock_before)
 
    if (Math.abs(liveStock - providedBefore) > 0.01) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stock has changed since you loaded this page. Please refresh and try again.',
          current_stock: liveStock,
        },
        { status: 409 }
      )
    }
 
    // ── Resolve movement_type_id from code ───────────────────────────────────
    const movementTypes = await getStockMovementTypes()
    const movementType  = movementTypes.find((t: any) => t.code === body.movement_type_code)
 
    if (!movementType) {
      return NextResponse.json(
        { success: false, error: `Unknown movement type: ${body.movement_type_code}` },
        { status: 400 }
      )
    }
 
    // ── Record the movement ──────────────────────────────────────────────────
    const result = await recordStockMovement({
      inventory_item_id: body.inventory_item_id,
      movement_type_id:  movementType.id,
      quantity_change:   quantityChange,
      stock_before:      liveStock,
      stock_after:       liveStock + quantityChange,
      batch_id:          body.batch_id          || null,
      supplier_id:       body.supplier_id       || null,
      storage_from_id:   body.storage_from_id   || null,
      storage_to_id:     body.storage_to_id     || null,
      usage_type_id:     body.usage_type_id     || null,
      waste_reason_id:   body.waste_reason_id   || null,
      unit_cost:         body.unit_cost != null ? Number(body.unit_cost) : null,
      source_module:     body.source_module     || null,
      source_record_id:  body.source_record_id  || null,
      reference_number:  body.reference_number  || null,
      animal_group_id:   body.animal_group_id   || null,
      performed_by:      user.id,
      movement_date:     body.movement_date      || null,
      notes:             body.notes             || null,
    })
 
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }
 
    return NextResponse.json({
      success:    true,
      movement:   result.data,
      newStock:   result.newStock,
      message:    'Stock movement recorded successfully',
    })
  } catch (err) {
    console.error('❌ POST /api/inventory/adjust-stock:', err)
    return NextResponse.json(
      { error: 'Internal server error', success: false,
        details: err instanceof Error ? err.message : undefined },
      { status: 500 }
    )
  }
}