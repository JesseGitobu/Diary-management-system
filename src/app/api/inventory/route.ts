// src/app/api/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createInventoryItem, getInventoryItems } from '@/lib/database/inventory'

/**
 * GET /api/inventory
 * Get list of inventory items for the current farm
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
    
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as any
    
    const items = await getInventoryItems(userRole.farm_id, category)
    
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error('❌ [API] Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}

/**
 * POST /api/inventory
 * Create a new inventory item with proper validation
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
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions', success: false }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Validate required fields
    const errors: Record<string, string> = {}
    if (!body.name?.trim()) errors.name = 'Item name is required'
    if (!body.category_id) errors.category_id = 'Category is required'
    if (!body.unit_of_measure) errors.unit_of_measure = 'Unit of measure is required'
    if (body.current_stock === undefined || body.current_stock === null) {
      errors.current_stock = 'Current stock is required'
    } else if (isNaN(Number(body.current_stock)) || Number(body.current_stock) < 0) {
      errors.current_stock = 'Current stock must be a non-negative number'
    }

    // Validate optional numeric fields
    if (body.minimum_stock !== undefined && (isNaN(Number(body.minimum_stock)) || Number(body.minimum_stock) < 0)) {
      errors.minimum_stock = 'Minimum stock must be a non-negative number'
    }
    if (body.reorder_level !== undefined && (isNaN(Number(body.reorder_level)) || Number(body.reorder_level) < 0)) {
      errors.reorder_level = 'Reorder level must be a non-negative number'
    }
    if (body.cost_per_unit !== undefined && (isNaN(Number(body.cost_per_unit)) || Number(body.cost_per_unit) < 0)) {
      errors.cost_per_unit = 'Cost per unit must be a non-negative number'
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }

    // Perishable items must have batch tracking enabled
    if (body.is_perishable && !body.requires_batch_tracking) {
      return NextResponse.json(
        { success: false, error: 'Perishable items must have batch tracking enabled' },
        { status: 400 }
      )
    }

    const result = await createInventoryItem(userRole.farm_id, {
      name: body.name.trim(),
      category_id: body.category_id,
      subcategory_id: body.subcategory_id || undefined,
      department_id: body.department_id || undefined,
      equipment_id: body.equipment_id || undefined,
      unit_of_measure: body.unit_of_measure,
      current_stock: Number(body.current_stock),
      minimum_stock: Number(body.minimum_stock) || 0,
      reorder_level: Number(body.reorder_level) || 0,
      reorder_quantity: Number(body.reorder_quantity) || 0,
      cost_per_unit: Number(body.cost_per_unit) || 0,
      storage_location_id: body.storage_location_id || undefined,
      is_perishable: Boolean(body.is_perishable),
      requires_batch_tracking: Boolean(body.requires_batch_tracking),
      shelf_life_days: body.shelf_life_days ? Number(body.shelf_life_days) : undefined,
      supplier_preferred: body.supplier || undefined,
      description: body.description || undefined,
      notes: body.notes || undefined,
      sku: body.sku || undefined,
      created_by: user.id,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, item: result.data }, { status: 201 })
  } catch (error) {
    console.error('❌ [API] Error creating inventory item:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}