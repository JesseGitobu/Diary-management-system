import { NextRequest, NextResponse }          from 'next/server'
import { getCurrentUser }                     from '@/lib/supabase/server'
import { getUserRole }                        from '@/lib/database/auth'
import {
  getPurchaseOrders,
  createPurchaseOrder,
  getUnitsOfMeasure,
} from '@/lib/database/inventory'
 
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }
 
    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user', success: false }, { status: 400 })
    }
 
    const orders = await getPurchaseOrders(userRole.farm_id)
    return NextResponse.json({ success: true, data: orders })
  } catch (err) {
    console.error('❌ GET /api/inventory/purchase-orders:', err)
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
 
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
 
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions', success: false }, { status: 403 })
    }
 
    const body = await request.json()
 
    // ── Validate header fields ───────────────────────────────────────────────
    const errors: Record<string, string> = {}
 
    if (!body.po_number?.trim())       errors.po_number         = 'PO number is required'
    if (!body.supplier_name?.trim())   errors.supplier_name     = 'Supplier name is required'
    if (!body.order_date)              errors.order_date        = 'Order date is required'
    if (!body.expected_delivery)       errors.expected_delivery = 'Expected delivery date is required'
 
    if (!Array.isArray(body.items) || body.items.length === 0) {
      errors.items = 'At least one line item is required'
    } else {
      body.items.forEach((item: any, idx: number) => {
        if (!item.name?.trim())
          errors[`item_${idx}_name`]       = 'Item name required'
        if (!item.unit_of_measure_id)
          errors[`item_${idx}_uom`]        = 'Unit of measure required'
        if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0)
          errors[`item_${idx}_quantity`]   = 'Quantity must be > 0'
        if (item.unit_price === undefined || isNaN(Number(item.unit_price)) || Number(item.unit_price) < 0)
          errors[`item_${idx}_unit_price`] = 'Unit price must be ≥ 0'
      })
    }
 
    const totalAmount = Number(body.total_amount)
    if (isNaN(totalAmount) || totalAmount <= 0) {
      errors.total_amount = 'Total amount must be > 0'
    }
 
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }
 
    // ── Verify total matches line items sum ──────────────────────────────────
    const calculatedTotal = (body.items as any[]).reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
      0
    )
 
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return NextResponse.json(
        {
          success:    false,
          error:      'Total amount does not match the sum of line items.',
          calculated: calculatedTotal,
          provided:   totalAmount,
        },
        { status: 400 }
      )
    }
 
    // ── Resolve supplier_id: if supplier_name matches an existing supplier,
    //    use its ID; otherwise the PO will just store the name in the snapshot.
    //    (The modal already provides supplier_id when a known supplier is picked.)
    const supplierId = body.supplier_id ?? null
 
    // ── Build the purchase order input ───────────────────────────────────────
    const result = await createPurchaseOrder(userRole.farm_id, {
      po_number:         body.po_number.trim(),
      supplier_id:       supplierId,
      order_date:        body.order_date,
      expected_delivery: body.expected_delivery,
      payment_terms:     body.payment_terms      || null,
      delivery_terms:    body.delivery_terms     || null,
      delivery_address:  body.delivery_address   || null,
      notes:             body.notes              || null,
      total_amount:      totalAmount,
      created_by:        user.id,
      items: (body.items as any[]).map(item => ({
        inventory_item_id:  item.inventory_item_id  || null,
        item_name_snapshot: item.name.trim(),
        quantity:           Number(item.quantity),
        unit_of_measure_id: item.unit_of_measure_id,
        unit_price:         Number(item.unit_price),
      })),
    })
 
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create purchase order' },
        { status: 400 }
      )
    }
 
    return NextResponse.json(
      { success: true, purchaseOrder: result.data, message: 'Purchase order created successfully' },
      { status: 201 }
    )
  } catch (err) {
    console.error('❌ POST /api/inventory/purchase-orders:', err)
    return NextResponse.json(
      { error: 'Internal server error', success: false,
        details: err instanceof Error ? err.message : undefined },
      { status: 500 }
    )
  }
}