import { createServerSupabaseClient } from '@/lib/supabase/server'
import { InventoryItem, InventoryTransaction, Supplier } from '@/types/database'

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
  
  return data || []
}

export async function getInventoryAlerts(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .or('current_stock.lt.minimum_stock,expiry_date.lt.' + new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  
  if (error) {
    console.error('Error fetching inventory alerts:', error)
    return []
  }
  
  return data || []
}

export async function createInventoryItem(farmId: string, itemData: Partial<InventoryItem>) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      ...itemData,
      farm_id: farmId,
    })
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
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
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
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({ current_stock: newStock })
      .eq('id', itemId)
    
    if (updateError) throw updateError
    
    // Create transaction record
    const { error: transactionError } = await supabase
      .from('inventory_transactions')
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
    
    // Get low stock alerts
    const { count: lowStockItems } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('status', 'active')
      .filter('current_stock', 'lt', 'minimum_stock')
    
    // Get expiring items (within 30 days)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { count: expiringItems } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('status', 'active')
      .not('expiry_date', 'is', null)
      .lte('expiry_date', thirtyDaysFromNow)
    
    // Get inventory value
    const { data: valueData } = await supabase
      .from('inventory_items')
      .select('current_stock, unit_cost')
      .eq('farm_id', farmId)
      .eq('status', 'active')
      .not('unit_cost', 'is', null)
    
    const totalValue = valueData?.reduce((sum, item) => {
      return sum + ((item.current_stock || 0) * (item.unit_cost || 0))
    }, 0) || 0
    
    return {
      totalItems: totalItems || 0,
      lowStockItems: lowStockItems || 0,
      expiringItems: expiringItems || 0,
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
