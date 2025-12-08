// lib/database/inventory.ts - COMPLETE UPDATED VERSION
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { InventoryItem, InventoryTransaction, Supplier } from '@/types/database'
import { getSupabaseClient } from '../supabase/client'

export async function getInventoryItems(
  farmId: string,
  category?: 'equipment' | 'feed' | 'maintenance' | 'supplies' | 'medical' | 'chemicals' | 'other'
) {
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('inventory_items')
    .select(`
      *,
      supplier:supplier_id (
        id,
        name,
        contact_person
      )
    `)
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .order('name')
  
  if (category) {
    query = query.eq('category', category)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching inventory items:', error)
    return []
  }
  
  // FIXED: Cast to any[]
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
      .eq('status', 'active')
    
    if (error) {
      console.error('Error fetching inventory items for alerts:', error)
      return []
    }
    
    // FIXED: Cast to any[] to fix 'never' type error
    const items = (itemsData as any[]) || []
    
    // Filter in JavaScript for low stock and expiring items
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    
    const alerts = items.filter(item => {
      // Check for low stock
      const isLowStock = (item.current_stock || 0) < (item.minimum_stock || 0)
      
      // Check for expiring soon
      const isExpiringSoon = item.expiry_date && 
        new Date(item.expiry_date) <= thirtyDaysFromNow
      
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
  itemData: Omit<Partial<InventoryItem>, 'id' | 'farm_id' | 'created_at' | 'updated_at'>
) {
  const supabase = await createServerSupabaseClient()
  
  // Ensure required fields are present
  const insertData = {
    farm_id: farmId,
    name: itemData.name!,
    category: itemData.category!,
    unit_of_measure: itemData.unit_of_measure!,
    current_stock: itemData.current_stock ?? 0,
    minimum_stock: itemData.minimum_stock ?? 0,
    // Optional fields
    description: itemData.description || null,
    sku: itemData.sku || null,
    maximum_stock: itemData.maximum_stock || null,
    unit_cost: itemData.unit_cost || null,
    supplier_id: itemData.supplier_id || null,
    storage_location: itemData.storage_location || null,
    expiry_date: itemData.expiry_date || null,
    notes: itemData.notes || null,
    status: itemData.status || 'active',
  }
  
  // FIXED: Cast to any
  const { data, error } = await (supabase
    .from('inventory_items') as any)
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
      .eq('status', 'active')
    
    // Get all active items for calculations
    const { data: itemsData } = await supabase
      .from('inventory_items')
      .select('current_stock, minimum_stock, unit_cost, expiry_date')
      .eq('farm_id', farmId)
      .eq('status', 'active')
    
    // FIXED: Cast to any[]
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
    
    // Calculate expiring items (within 30 days)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const expiringItems = items.filter(item => 
      item.expiry_date && new Date(item.expiry_date) <= thirtyDaysFromNow
    ).length
    
    // Calculate inventory value
    const totalValue = items.reduce((sum, item) => {
      return sum + ((item.current_stock || 0) * (item.unit_cost || 0))
    }, 0)
    
    return {
      totalItems: totalItems || 0,
      lowStockItems,
      expiringItems,
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
    
    // Try to use the database function first
    const { data, error } = await supabase
      .rpc('get_available_volume', { 
        target_farm_id: farmId,
        check_date: new Date().toISOString().split('T')[0]
      } as any)

    if (error) {
      console.log('Database function not available, using fallback calculation')
    } else {
      return data || 0
    }
  } catch (error) {
    console.log('RPC function error, using fallback calculation')
  }
  
  // Fallback calculation
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get total production for today and yesterday (available for distribution)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    
    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Get production records for available dates
    const { data: productionData, error: productionError } = await supabase
      .from('production_records')
      .select('milk_volume')
      .eq('farm_id', farmId)
      .in('record_date', [todayStr, yesterdayStr])

    if (productionError) throw productionError

    // FIXED: Cast to any[]
    const production = (productionData as any[]) || []

    const totalProduced = production.reduce((sum, record) => sum + record.milk_volume, 0) || 0

    // Get distributed volume for the same period
    const { data: distributedData, error: distributionError } = await supabase
      .from('distribution_records')
      .select('volume')
      .eq('farm_id', farmId)
      .in('delivery_date', [todayStr, yesterdayStr])

    if (distributionError) throw distributionError

    // FIXED: Cast to any[]
    const distributed = (distributedData as any[]) || []

    const totalDistributed = distributed.reduce((sum, record) => sum + record.volume, 0) || 0

    // Calculate available volume (produced but not yet distributed)
    const availableVolume = Math.max(0, totalProduced - totalDistributed)

    return availableVolume
  } catch (fallbackError) {
    console.error('Fallback calculation failed:', fallbackError)
    return 0
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
        volume: data.volume,
        price_per_liter: data.pricePerLiter,
        total_amount: data.totalAmount,
        delivery_date: data.deliveryDate,
        delivery_time: data.deliveryTime,
        driver_name: data.driverName,
        vehicle_number: data.vehicleNumber,
        payment_method: data.paymentMethod,
        expected_payment_date: data.expectedPaymentDate,
        notes: data.notes,
        status: data.status
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
  
  // FIXED: Cast to any[]
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
    
    // FIXED: Cast to any[]
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