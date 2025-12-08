import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Supplier } from '@/types/database'

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
  
  // FIXED: Cast to any[] or Supplier[] to avoid 'never' type issues downstream
  return (data as any[]) || []
}

export async function createSupplier(farmId: string, supplierData: Partial<Supplier>) {
  const supabase = await createServerSupabaseClient()

  // Ensure required fields are present and not undefined
  if (!supplierData.name) {
    return { success: false, error: 'Supplier name is required.' }
  }

  const { data, error } = await (supabase
    .from('suppliers') as any)
    .insert({
      ...supplierData,
      name: supplierData.name ?? '', // fallback to empty string if undefined
      farm_id: farmId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating supplier:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function updateSupplier(supplierId: string, farmId: string, supplierData: Partial<Supplier>) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await (supabase
    .from('suppliers') as any)
    .update(supplierData)
    .eq('id', supplierId)
    .eq('farm_id', farmId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating supplier:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function getSupplierStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get total suppliers
    const { count: totalSuppliers } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('status', 'active')
    
    // Get suppliers by type
    const { data: typeData } = await supabase
      .from('suppliers')
      .select('supplier_type')
      .eq('farm_id', farmId)
      .eq('status', 'active')
    
    // FIXED: Cast typeData to any[] to fix "Property does not exist on type 'never'"
    const supplierTypes = (typeData as any[])?.reduce((acc, supplier) => {
      const type = supplier.supplier_type || 'other'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    return {
      totalSuppliers: totalSuppliers || 0,
      supplierTypes,
    }
  } catch (error) {
    console.error('Error getting supplier stats:', error)
    return {
      totalSuppliers: 0,
      supplierTypes: {},
    }
  }
}