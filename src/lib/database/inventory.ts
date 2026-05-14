// lib/database/inventory.ts - COMPLETE UPDATED VERSION
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { InventoryItem, InventoryTransaction, Supplier } from '@/types/database'
import { getSupabaseClient } from '../supabase/client'

export async function getInventoryItems(
  farmId: string,
  categoryId?: string
) {
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('inventory_items')
    .select(`
      *,
      category:category_id (
        id,
        code,
        name,
        display_name,
        emoji
      ),
      subcategory:subcategory_id (
        id,
        name
      )
    `)
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .order('name')
  
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching inventory items:', error)
    return []
  }
  
  return (data as any[]) || []
}

export async function getInventoryAlerts(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get all active inventory items
    const { data: itemsData, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('farm_id', farmId)
      .eq('is_active', true)
    
    if (error) {
      console.error('Error fetching inventory items for alerts:', error)
      return []
    }
    
    const items = (itemsData as any[]) || []
    
    // Filter in JavaScript for low stock and expiring items
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    
    const alerts = items.filter(item => {
      // Check for low stock
      const isLowStock = (item.current_stock || 0) < (item.minimum_stock || 0)
      
      // Check for expiring soon (only for perishable items with batch tracking)
      const isExpiringSoon = item.is_perishable && item.requires_batch_tracking
      
      return isLowStock || isExpiringSoon
    })
    
    return alerts
  } catch (error) {
    console.error('Error fetching inventory alerts:', error)
    return []
  }
}

export async function createInventoryItem(
  farmId: string, 
  itemData: {
    name: string
    category_id: string
    subcategory_id?: string
    department_id?: string
    equipment_id?: string
    unit_of_measure: string
    current_stock: number
    minimum_stock?: number
    reorder_level?: number
    reorder_quantity?: number
    cost_per_unit?: number
    storage_location_id?: string
    is_perishable?: boolean
    requires_batch_tracking?: boolean
    shelf_life_days?: number
    supplier_preferred?: string
    description?: string
    notes?: string
    sku?: string
    created_by?: string
  }
) {
  const supabase = await createServerSupabaseClient()
  
  // Build insert data with all normalized schema fields
  const insertData = {
    farm_id: farmId,
    name: itemData.name,
    category_id: itemData.category_id,
    subcategory_id: itemData.subcategory_id || null,
    department_id: itemData.department_id || null,
    equipment_id: itemData.equipment_id || null,
    unit_of_measure: itemData.unit_of_measure,
    current_stock: itemData.current_stock ?? 0,
    minimum_stock: itemData.minimum_stock ?? 0,
    reorder_level: itemData.reorder_level ?? 0,
    reorder_quantity: itemData.reorder_quantity ?? 0,
    cost_per_unit: itemData.cost_per_unit ?? 0,
    total_value: (itemData.current_stock ?? 0) * (itemData.cost_per_unit ?? 0),
    storage_location_id: itemData.storage_location_id || null,
    is_perishable: itemData.is_perishable ?? false,
    requires_batch_tracking: itemData.requires_batch_tracking ?? false,
    shelf_life_days: itemData.shelf_life_days || null,
    supplier_preferred: itemData.supplier_preferred || null,
    description: itemData.description || null,
    notes: itemData.notes || null,
    sku: itemData.sku || null,
    created_by: itemData.created_by || null,
    is_active: true,
  }
  
  const { data, error } = await supabase
    .from('inventory_items')
    .insert(insertData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating inventory item:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function updateInventoryStock(
  itemId: string,
  farmId: string,
  transaction: {
    type: 'in' | 'out' | 'adjustment'
    quantity: number
    reference_type?: string
    reference_id?: string
    notes?: string
    performed_by?: string
  }
) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Start transaction
    // FIXED: Cast to any
    const { data: item, error: itemError } = await (supabase
      .from('inventory_items') as any)
      .select('current_stock, unit_cost')
      .eq('id', itemId)
      .eq('farm_id', farmId)
      .single()
    
    if (itemError) throw itemError
    
    // Calculate new stock
    let newStock = typeof item.current_stock === 'number' ? item.current_stock : 0
    if (transaction.type === 'in') {
      newStock += transaction.quantity
    } else if (transaction.type === 'out') {
      newStock -= transaction.quantity
    } else {
      newStock = transaction.quantity // adjustment sets absolute value
    }
    
    // Update inventory item stock
    // FIXED: Cast to any
    const { error: updateError } = await (supabase
      .from('inventory_items') as any)
      .update({ current_stock: newStock })
      .eq('id', itemId)
    
    if (updateError) throw updateError
    
    // Create transaction record
    // FIXED: Cast to any
    const { error: transactionError } = await (supabase
      .from('inventory_transactions') as any)
      .insert({
        farm_id: farmId,
        inventory_item_id: itemId,
        transaction_type: transaction.type,
        quantity: transaction.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.unit_cost ? item.unit_cost * transaction.quantity : null,
        reference_type: transaction.reference_type,
        reference_id: transaction.reference_id,
        performed_by: transaction.performed_by,
        notes: transaction.notes,
      })
    
    if (transactionError) throw transactionError
    
    return { success: true, newStock }
  } catch (error) {
    console.error('Error updating inventory stock:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getInventoryStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get total items
    const { count: totalItems } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('is_active', true)
    
    // Get all active items for calculations
    const { data: itemsData } = await supabase
      .from('inventory_items')
      .select('current_stock, minimum_stock, cost_per_unit')
      .eq('farm_id', farmId)
      .eq('is_active', true)
    
    const items = (itemsData as any[]) || []
    
    if (items.length === 0) {
      return {
        totalItems: 0,
        lowStockItems: 0,
        expiringItems: 0,
        totalValue: 0,
      }
    }
    
    // Calculate low stock items
    const lowStockItems = items.filter(item => 
      (item.current_stock || 0) < (item.minimum_stock || 0)
    ).length
    
    // Calculate inventory value
    const totalValue = items.reduce((sum, item) => {
      return sum + ((item.current_stock || 0) * (item.cost_per_unit || 0))
    }, 0)
    
    return {
      totalItems: totalItems || 0,
      lowStockItems,
      expiringItems: 0,
      totalValue,
    }
  } catch (error) {
    console.error('Error getting inventory stats:', error)
    return {
      totalItems: 0,
      lowStockItems: 0,
      expiringItems: 0,
      totalValue: 0,
    }
  }
}

export async function getAvailableVolume(farmId: string): Promise<number> {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get total production from daily_production_summary table
    const { data: summaryData, error: summaryError } = await supabase
      .from('daily_production_summary')
      .select('total_milk_volume')
      .eq('farm_id', farmId)

    if (summaryError) throw summaryError

    // FIXED: Cast to any[]
    const summaries = (summaryData as any[]) || []

    const totalProduced = summaries.reduce((sum, record) => sum + (record.total_milk_volume || 0), 0) || 0

    // Get ALL distributed volume (not limited by date)
    try {
      const { data: distributedData, error: distributionError } = await supabase
        .from('distribution_records')
        .select('quantity_distributed')
        .eq('farm_id', farmId)

      if (distributionError) throw distributionError

      // FIXED: Cast to any[]
      const distributed = (distributedData as any[]) || []

      const totalDistributed = distributed.reduce((sum, record) => sum + (record.quantity_distributed || 0), 0) || 0

      // Calculate available volume (produced but not yet distributed)
      const availableVolume = Math.max(0, totalProduced - totalDistributed)

      return availableVolume
    } catch (innerError) {
      // If distribution query fails, just use production count
      console.warn('⚠️ Distribution query failed:', (innerError as any).message)
      return Math.max(0, totalProduced)
    }
  } catch (fallbackError) {
    console.error('⚠️ Fallback calculation failed:', fallbackError)
    return 0
  }
}

export async function getProductionSummary(farmId: string, recordDate: string): Promise<{
  todayProduction: number
  cumulativeAvailable: number
  totalProduced: number
  totalDistributed: number
}> {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get today's production from daily_production_summary
    const { data: todayData, error: todayError } = await supabase
      .from('daily_production_summary')
      .select('total_milk_volume')
      .eq('farm_id', farmId)
      .eq('record_date', recordDate)
      .single()

    const todayProduction = !todayError && todayData ? (todayData.total_milk_volume || 0) : 0

    // Get total production across all dates
    const { data: summaryData, error: summaryError } = await supabase
      .from('daily_production_summary')
      .select('total_milk_volume')
      .eq('farm_id', farmId)

    if (summaryError) throw summaryError

    // FIXED: Cast to any[]
    const summaries = (summaryData as any[]) || []
    const totalProduced = summaries.reduce((sum, record) => sum + (record.total_milk_volume || 0), 0) || 0

    // Get all distributed volume
    const { data: distributedData, error: distributionError } = await supabase
      .from('distribution_records')
      .select('quantity_distributed')
      .eq('farm_id', farmId)

    if (distributionError) throw distributionError

    // FIXED: Cast to any[]
    const distributed = (distributedData as any[]) || []
    const totalDistributed = distributed.reduce((sum, record) => sum + (record.quantity_distributed || 0), 0) || 0

    // Calculate cumulative available volume
    const cumulativeAvailable = Math.max(0, totalProduced - totalDistributed)

    return {
      todayProduction,
      cumulativeAvailable,
      totalProduced,
      totalDistributed
    }
  } catch (error) {
    console.error('⚠️ Production summary calculation failed:', error)
    return {
      todayProduction: 0,
      cumulativeAvailable: 0,
      totalProduced: 0,
      totalDistributed: 0
    }
  }
}

// Client-side functions for components
export async function createDistributionRecord(data: {
  farmId: string
  channelId: string
  volume: number
  pricePerLiter: number
  totalAmount: number
  deliveryDate: string
  deliveryTime?: string
  driverName: string
  vehicleNumber?: string
  paymentMethod: string
  expectedPaymentDate?: string
  notes?: string
  status: 'pending' | 'delivered' | 'paid'
}) {
  try {
    const supabase = getSupabaseClient()
    
    // FIXED: Cast to any
    const { data: record, error } = await (supabase
      .from('distribution_records') as any)
      .insert({
        farm_id: data.farmId,
        channel_id: data.channelId,
        quantity_distributed: data.volume,
        unit_price: data.pricePerLiter,
        total_amount: data.totalAmount,
        distribution_date: data.deliveryDate,
        distribution_status: data.status,
        notes: data.notes
      })
      .select()
      .single()

    if (error) throw error

    return record
  } catch (error) {
    console.error('Error creating distribution record:', error)
    throw error
  }
}

export async function updateDistributionRecord(
  recordId: string,
  updates: Partial<{
    status: 'pending' | 'delivered' | 'paid'
    actual_delivery_time: string
    payment_date: string
    payment_reference: string
    notes: string
  }>
) {
  try {
    const supabase = getSupabaseClient()
    
    // FIXED: Cast to any
    const { data: record, error } = await (supabase
      .from('distribution_records') as any)
      .update(updates)
      .eq('id', recordId)
      .select()
      .single()

    if (error) throw error

    return record
  } catch (error) {
    console.error('Error updating distribution record:', error)
    throw error
  }
}

// Supplier functions
export async function getSuppliers(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .order('name')
  
  if (error) {
    console.error('Error fetching suppliers:', error)
    return []
  }
  
  return (data as any[]) || []
}

export async function getSupplierStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data: suppliersData, error } = await supabase
      .from('suppliers')
      .select('supplier_type')
      .eq('farm_id', farmId)
      .eq('status', 'active')
    
    if (error) throw error
    
    const suppliers = (suppliersData as any[]) || []

    const supplierTypes = suppliers.reduce((acc: any, supplier) => {
      const type = supplier.supplier_type || 'other'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})
    
    return {
      totalSuppliers: suppliers.length || 0,
      supplierTypes: supplierTypes || {}
    }
  } catch (error) {
    console.error('Error getting supplier stats:', error)
    return {
      totalSuppliers: 0,
      supplierTypes: {}
    }
  }
}

// ============================================================================
// New normalized inventory functions for adjust-stock and purchase orders
// ============================================================================

export async function getInventoryItem(itemId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching inventory item:', error)
    return null
  }
}

export async function updateInventoryItemStock(itemId: string, newStock: number) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get current item to calculate total_value
    const { data: item, error: getError } = await supabase
      .from('inventory_items')
      .select('cost_per_unit')
      .eq('id', itemId)
      .single()
    
    if (getError) throw getError
    
    const totalValue = newStock * (item.cost_per_unit || 0)
    
    const { data, error } = await supabase
      .from('inventory_items')
      .update({
        current_stock: newStock,
        total_value: totalValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single()
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error) {
    console.error('Error updating inventory stock:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update stock' }
  }
}

export async function recordInventoryTransaction(data: {
  inventory_item_id: string
  movement_type: 'purchase' | 'usage' | 'adjustment' | 'transfer' | 'loss' | 'return' | 'damage'
  quantity_change: number
  stock_before: number
  stock_after: number
  batch_id?: string
  reference_id?: string
  reference_type?: string
  performed_by: string
  usage_type?: string
  loss_reason?: string
  animal_group_id?: string
  notes?: string
}) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data: transaction, error } = await supabase
      .from('inventory_transactions')
      .insert({
        inventory_item_id: data.inventory_item_id,
        movement_type: data.movement_type,
        quantity_change: data.quantity_change,
        stock_before: data.stock_before,
        stock_after: data.stock_after,
        batch_id: data.batch_id || null,
        reference_id: data.reference_id || null,
        reference_type: data.reference_type || null,
        performed_by: data.performed_by,
        usage_type: data.usage_type || null,
        loss_reason: data.loss_reason || null,
        animal_group_id: data.animal_group_id || null,
        notes: data.notes || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (error) throw error
    
    return { success: true, data: transaction }
  } catch (error) {
    console.error('Error recording inventory transaction:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to record transaction' }
  }
}

export async function createPurchaseOrder(farmId: string, data: {
  po_number: string
  supplier_id?: string
  supplier_name: string
  supplier_contact?: string
  order_date: string
  expected_delivery: string
  payment_terms?: string
  delivery_terms?: string
  delivery_address?: string
  notes?: string
  total_amount: number
  items: Array<{
    name: string
    quantity: number
    unit: string
    unit_price: number
    total: number
  }>
  created_by: string
}) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // First, create the purchase order header
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        farm_id: farmId,
        po_number: data.po_number,
        supplier_id: data.supplier_id || null,
        supplier_name: data.supplier_name,
        supplier_contact: data.supplier_contact || null,
        order_date: data.order_date,
        expected_delivery: data.expected_delivery,
        payment_terms: data.payment_terms || null,
        delivery_terms: data.delivery_terms || null,
        delivery_address: data.delivery_address || null,
        notes: data.notes || null,
        total_amount: data.total_amount,
        status: 'pending',
        created_by: data.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (poError) throw poError
    
    // Then create line items
    const lineItems = data.items.map(item => ({
      purchase_order_id: po.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      total: item.total,
      received_quantity: 0,
      line_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
    
    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(lineItems)
    
    if (itemsError) throw itemsError
    
    // Fetch the complete PO with items
    const { data: completePO, error: fetchError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        items:purchase_order_items(*)
      `)
      .eq('id', po.id)
      .single()
    
    if (fetchError) throw fetchError
    
    return { success: true, data: completePO }
  } catch (error) {
    console.error('Error creating purchase order:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create purchase order' }
  }
}

export async function getPurchaseOrders(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        items:purchase_order_items(*)
      `)
      .eq('farm_id', farmId)
      .order('order_date', { ascending: false })
    
    if (error) throw error
    
    return data || []
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return []
  }
}