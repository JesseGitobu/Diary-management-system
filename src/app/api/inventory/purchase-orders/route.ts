import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createPurchaseOrder, getPurchaseOrders } from '@/lib/database/inventory'

/**
 * GET /api/inventory/purchase-orders
 * Get list of purchase orders for the current farm
 */
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
  } catch (error) {
    console.error('❌ [API] Error fetching purchase orders:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}

/**
 * POST /api/inventory/purchase-orders
 * Create a new purchase order
 *
 * Request body:
 * {
 *   po_number: string (required) - e.g., "PO-2026-042"
 *   supplier_id?: string (optional - FK to suppliers table)
 *   supplier_name: string (required) - supplier name
 *   supplier_contact?: string (optional)
 *   order_date: string (required) - YYYY-MM-DD
 *   expected_delivery: string (required) - YYYY-MM-DD
 *   payment_terms?: string (optional - e.g., "Net 30")
 *   delivery_terms?: string (optional - e.g., "FOB")
 *   delivery_address?: string (optional)
 *   notes?: string (optional)
 *   items: Array<{
 *     name: string (required)
 *     quantity: number (required)
 *     unit: string (required - e.g., "kg")
 *     unit_price: number (required)
 *     total: number (required) - quantity * unit_price
 *   }> (required)
 *   total_amount: number (required) - sum of all line item totals
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

    // Check if user has permission to manage inventory/purchasing
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions', success: false }, { status: 403 })
    }

    const body = await request.json()

    // Validate required fields
    const errors: Record<string, string> = {}
    
    if (!body.po_number?.trim()) errors.po_number = 'PO number is required'
    if (!body.supplier_name?.trim()) errors.supplier_name = 'Supplier name is required'
    if (!body.order_date) errors.order_date = 'Order date is required'
    if (!body.expected_delivery) errors.expected_delivery = 'Expected delivery date is required'
    
    if (!Array.isArray(body.items) || body.items.length === 0) {
      errors.items = 'At least one line item is required'
    } else {
      // Validate line items
      body.items.forEach((item: any, idx: number) => {
        if (!item.name?.trim()) errors[`item_${idx}_name`] = 'Item name is required'
        if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
          errors[`item_${idx}_quantity`] = 'Quantity must be a positive number'
        }
        if (!item.unit?.trim()) errors[`item_${idx}_unit`] = 'Unit is required'
        if (!item.unit_price || isNaN(Number(item.unit_price)) || Number(item.unit_price) < 0) {
          errors[`item_${idx}_unit_price`] = 'Unit price must be a non-negative number'
        }
      })
    }

    if (isNaN(Number(body.total_amount)) || Number(body.total_amount) <= 0) {
      errors.total_amount = 'Total amount must be a positive number'
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }

    // Verify total amount matches line items sum
    const calculatedTotal = (body.items as any[]).reduce(
      (sum, item) => sum + (Number(item.total) || 0),
      0
    )
    
    const tolerance = 0.01 // Allow for floating point rounding
    if (Math.abs(calculatedTotal - Number(body.total_amount)) > tolerance) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Total amount mismatch. Please recalculate the order total.',
          details: {
            calculated: calculatedTotal,
            provided: Number(body.total_amount)
          }
        },
        { status: 400 }
      )
    }

    // Create the purchase order
    const result = await createPurchaseOrder(userRole.farm_id, {
      po_number: body.po_number.trim(),
      supplier_id: body.supplier_id || undefined,
      supplier_name: body.supplier_name.trim(),
      supplier_contact: body.supplier_contact || undefined,
      order_date: body.order_date,
      expected_delivery: body.expected_delivery,
      payment_terms: body.payment_terms || undefined,
      delivery_terms: body.delivery_terms || undefined,
      delivery_address: body.delivery_address || undefined,
      notes: body.notes || undefined,
      total_amount: Number(body.total_amount),
      items: body.items.map((item: any) => ({
        name: item.name.trim(),
        quantity: Number(item.quantity),
        unit: item.unit.trim(),
        unit_price: Number(item.unit_price),
        total: Number(item.total),
      })),
      created_by: user.id,
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
  } catch (error) {
    console.error('❌ [API] Error creating purchase order:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false, details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}
