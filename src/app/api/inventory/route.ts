//src/app/api/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser }            from '@/lib/supabase/server'
import { getUserRole }               from '@/lib/database/auth'
import {
  getInventoryItems,
  createInventoryItem,
  getStockMovementTypes,
  getUnitsOfMeasure,
  getSuppliers,
  getMetadataFields,
} from '@/lib/database/inventory'
import { createServerSupabaseClient } from '@/lib/supabase/server'
 
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
    const categoryId = searchParams.get('category_id') ?? undefined
 
    const items = await getInventoryItems(userRole.farm_id, categoryId)
    return NextResponse.json({ success: true, data: items })
  } catch (err) {
    console.error('❌ GET /api/inventory:', err)
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
 
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [POST /api/inventory] Request received')

    const user = await getCurrentUser()
    console.log('👤 [POST /api/inventory] Current user:', user?.id)
    if (!user) {
      console.error('❌ [POST /api/inventory] No user found')
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    console.log('🔐 [POST /api/inventory] User role:', { role_type: userRole?.role_type, farm_id: userRole?.farm_id })
    
    if (!userRole?.farm_id) {
      console.error('❌ [POST /api/inventory] No farm associated with user')
      return NextResponse.json({ error: 'No farm associated with user', success: false }, { status: 400 })
    }

    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      console.error('❌ [POST /api/inventory] Insufficient permissions:', userRole.role_type)
      return NextResponse.json({ error: 'Insufficient permissions', success: false }, { status: 403 })
    }

    const body = await request.json()
    console.log('📦 [POST /api/inventory] Request body:', JSON.stringify(body, null, 2))

    // ── RESOLVE IDs from codes/names (frontend may send codes instead of IDs) ──
    console.log('🔍 [POST /api/inventory] Resolving IDs from codes/names...')

    // Resolve unit_of_measure_id if sent as code (e.g., 'kg')
    let unit_of_measure_id = body.unit_of_measure_id
    if (!unit_of_measure_id && body.unit_of_measure) {
      const units = await getUnitsOfMeasure()
      const unit = units.find((u: any) => u.code === body.unit_of_measure || u.label === body.unit_of_measure)
      unit_of_measure_id = unit?.id
      console.log(`  📏 Resolved unit_of_measure "${body.unit_of_measure}" → ${unit_of_measure_id}`)
    }

    // Resolve purchase_unit_id if sent as code
    let purchase_unit_id = body.purchase_unit_id
    if (!purchase_unit_id && body.purchase_quantity_unit) {
      const units = await getUnitsOfMeasure()
      const unit = units.find((u: any) => u.code === body.purchase_quantity_unit || u.label === body.purchase_quantity_unit)
      purchase_unit_id = unit?.id
      console.log(`  📦 Resolved purchase_quantity_unit "${body.purchase_quantity_unit}" → ${purchase_unit_id}`)
    }

    // Resolve preferred_supplier_id if sent as name
    let preferred_supplier_id = body.preferred_supplier_id
    if (!preferred_supplier_id && body.supplier_preferred) {
      const suppliers = await getSuppliers(userRole.farm_id)
      const supplier = suppliers.find((s: any) => s.name === body.supplier_preferred)
      preferred_supplier_id = supplier?.id
      console.log(`  🏪 Resolved supplier_preferred "${body.supplier_preferred}" → ${preferred_supplier_id}`)
    }

    // Convert category_metadata object to metadata array with field_ids
    // Fetch field definitions for this category to resolve field_ids
    let metadata: any[] = []
    console.log(`  🏷️  Raw category_metadata from request body:`, body.category_metadata)
    console.log(`  🏷️  category_metadata type:`, typeof body.category_metadata)
    console.log(`  🏷️  Is object?`, body.category_metadata && typeof body.category_metadata === 'object')
    
    if (body.category_metadata && typeof body.category_metadata === 'object') {
      console.log(`  📥 category_metadata entries:`, Object.entries(body.category_metadata))
      
      const metadataFields = await getMetadataFields(body.category_id, body.subcategory_id)
      console.log(`  📋 Fetched ${metadataFields.length} metadata field definitions for category`)
      console.log(`  📋 Field definitions:`, JSON.stringify(metadataFields.map((f: any) => ({ id: f.id, field_key: f.field_key, field_type: f.field_type })), null, 2))

      metadata = Object.entries(body.category_metadata)
        .map(([key, value]) => {
          console.log(`  🔍 Processing metadata entry: key="${key}", value="${value}"`)
          
          // Find the field definition by key
          const fieldDef = metadataFields.find((f: any) => f.field_key === key)
          if (!fieldDef) {
            console.warn(`  ⚠️  No field definition found for key "${key}" — skipping`)
            return null
          }

          console.log(`  ✓ Found field definition for key "${key}": field_id=${fieldDef.id}, field_type=${fieldDef.field_type}`)

          // Determine which column to populate based on field type
          const entry: any = { field_id: fieldDef.id }
          
          if (fieldDef.field_type === 'number') {
            entry.number_value = Number(value)
            console.log(`    → Setting number_value = ${entry.number_value}`)
          } else if (fieldDef.field_type === 'date') {
            entry.date_value = String(value)
            console.log(`    → Setting date_value = ${entry.date_value}`)
          } else if (fieldDef.field_type === 'toggle' || fieldDef.field_type === 'checkbox') {
            entry.boolean_value = Boolean(value)
            console.log(`    → Setting boolean_value = ${entry.boolean_value}`)
          } else {
            entry.text_value = String(value)
            console.log(`    → Setting text_value = ${entry.text_value}`)
          }

          console.log(`  ✅ Created metadata entry:`, entry)
          return entry
        })
        .filter(m => m !== null)

      console.log(`  🏷️  Converted category_metadata to ${metadata.length} metadata entries with field_ids`)
      console.log(`  📋 Final metadata array:`, JSON.stringify(metadata, null, 2))
    } else {
      console.log(`  ⊘ Skipping metadata conversion: category_metadata is falsy or not an object`)
    }

    console.log('✅ [POST /api/inventory] ID resolution complete')

    // ── Validate required fields ────────────────────────────────────────────
    const errors: Record<string, string> = {}

    if (!body.name?.trim())             errors.name             = 'Item name is required'
    if (!body.category_id)              errors.category_id      = 'Category is required'
    if (!unit_of_measure_id)            errors.unit_of_measure_id = 'Unit of measure is required (provide unit_of_measure_id or unit_of_measure code)'

    const currentStock = Number(body.current_stock)
    if (body.current_stock === undefined || body.current_stock === null) {
      errors.current_stock = 'Current stock is required'
    } else if (isNaN(currentStock) || currentStock < 0) {
      errors.current_stock = 'Current stock must be a non-negative number'
    }

    if (body.minimum_stock !== undefined && (isNaN(Number(body.minimum_stock)) || Number(body.minimum_stock) < 0)) {
      errors.minimum_stock = 'Minimum stock must be a non-negative number'
    }
    if (body.reorder_level !== undefined && (isNaN(Number(body.reorder_level)) || Number(body.reorder_level) < 0)) {
      errors.reorder_level = 'Reorder level must be a non-negative number'
    }
    if (body.cost_per_unit !== undefined && (isNaN(Number(body.cost_per_unit)) || Number(body.cost_per_unit) < 0)) {
      errors.cost_per_unit = 'Cost per unit must be a non-negative number'
    }
    if (body.is_perishable && !body.requires_batch_tracking) {
      errors.requires_batch_tracking = 'Perishable items must have batch tracking enabled'
    }

    if (Object.keys(errors).length > 0) {
      console.warn('⚠️  [POST /api/inventory] Validation errors:', errors)
      return NextResponse.json({ success: false, errors }, { status: 400 })
    }

    console.log('✅ [POST /api/inventory] All validations passed')

    // ── Resolve the 'purchase' movement type ID ─────────────────────────────
    // We need the UUID of the 'purchase' row in stock_movement_types to record
    // the opening stock movement.
    const movementTypes = await getStockMovementTypes()
    console.log('📋 [POST /api/inventory] Available movement types:', movementTypes)
    
    const purchaseType  = movementTypes.find((t: any) => t.code === 'purchase')
    const adjustType    = movementTypes.find((t: any) => t.code === 'adjustment')
    console.log('🏷️  [POST /api/inventory] Movement types found - purchase:', purchaseType?.id, 'adjust:', adjustType?.id)

    // Use 'purchase' if a supplier was supplied, otherwise 'adjustment'
    const openingMovementTypeId = (body.preferred_supplier_id && purchaseType)
      ? purchaseType.id
      : (adjustType?.id ?? purchaseType?.id)

    if (!openingMovementTypeId) {
      console.error('❌ [POST /api/inventory] No movement type ID found')
      return NextResponse.json(
        { success: false, error: 'Stock movement types not configured. Run seed data.' },
        { status: 500 }
      )
    }

    console.log('✅ [POST /api/inventory] Using movement type ID:', openingMovementTypeId)
    console.log('📝 [POST /api/inventory] Metadata entries:', metadata.length)

    console.log('💾 [POST /api/inventory] About to create inventory item for farm:', userRole.farm_id)

    const result = await createInventoryItem(
      userRole.farm_id,
      {
        name:                    body.name.trim(),
        category_id:             body.category_id,
        subcategory_id:          body.subcategory_id          || null,
        department_id:           body.department_id           || null,
        equipment_id:            body.equipment_id            || null,
        unit_of_measure_id:      unit_of_measure_id,
        preferred_supplier_id:   preferred_supplier_id        || null,
        storage_location_id:     body.storage_location_id     || null,
        current_stock:           currentStock,
        minimum_stock:           Number(body.minimum_stock)   || 0,
        reorder_level:           Number(body.reorder_level)   || 0,
        reorder_quantity:        Number(body.reorder_quantity) || 0,
        cost_per_unit:           Number(body.cost_per_unit)   || 0,
        is_perishable:           Boolean(body.is_perishable),
        requires_batch_tracking: Boolean(body.requires_batch_tracking),
        shelf_life_days:         body.shelf_life_days ? Number(body.shelf_life_days) : null,
        description:             body.description?.trim()     || null,
        notes:                   body.notes?.trim()           || null,
        sku:                     body.sku?.trim()             || null,
        created_by:              user.id,
        // Purchase receipt fields
        purchase_quantity:       body.purchase_quantity ? Number(body.purchase_quantity) : null,
        purchase_unit_id:        purchase_unit_id             || null,
        purchase_amount:         body.purchase_amount ? Number(body.purchase_amount) : null,
        metadata,
      },
      openingMovementTypeId,
    )

    console.log('📊 [POST /api/inventory] createInventoryItem result:', { success: result.success, error: result.error })

    if (!result.success) {
      console.error('❌ [POST /api/inventory] Item creation failed:', result.error)
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    console.log('✅ [POST /api/inventory] Item created successfully:', result.data?.id)
    return NextResponse.json({ success: true, item: result.data }, { status: 201 })
  } catch (err) {
    console.error('❌ [POST /api/inventory] Exception caught:', err)
    console.error('❌ [POST /api/inventory] Stack trace:', (err as Error).stack)
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}