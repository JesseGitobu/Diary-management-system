import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Supplier } from '@/types/database'

// Columns that callers are allowed to write — guards against accidental
// mass-assignment of id, farm_id, created_at, updated_at, etc.
const WRITABLE_COLUMNS = [
  'name',
  'supplier_type',
  'status',
  'kra_pin',
  'contact_person',
  'phone',
  'alternative_phone',
  'email',
  'website',
  'address',
  'town',
  'county',
  'payment_terms',
  'credit_limit_ksh',
  'minimum_order_kg',
  'lead_time_days',
  'notes',
  'created_by',
  'updated_by',
] as const

type WritableColumn = typeof WRITABLE_COLUMNS[number]

function sanitizeSupplierPayload(data: Partial<Supplier>): Partial<Supplier> {
  return Object.fromEntries(
    Object.entries(data).filter(([key]) =>
      WRITABLE_COLUMNS.includes(key as WritableColumn)
    )
  ) as Partial<Supplier>
}

// ── GET all suppliers for a farm ─────────────────────────────────────────────

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

// ── GET suppliers including inactive / suspended ──────────────────────────────

export async function getAllSuppliers(farmId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('farm_id', farmId)
    .order('name')

  if (error) {
    console.error('Error fetching all suppliers:', error)
    return []
  }

  return (data as any[]) || []
}

// ── CREATE supplier ───────────────────────────────────────────────────────────

export async function createSupplier(
  farmId: string,
  supplierData: Partial<Supplier>,
  createdByUserId?: string,
) {
  const supabase = await createServerSupabaseClient()

  if (!supplierData.name?.trim()) {
    return { success: false, error: 'Supplier name is required.' }
  }

  const payload = sanitizeSupplierPayload(supplierData)

  const { data, error } = await (supabase
    .from('suppliers') as any)
    .insert({
      ...payload,
      farm_id:    farmId,
      status:     payload.status ?? 'active',
      created_by: createdByUserId ?? null,
      updated_by: createdByUserId ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating supplier:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ── UPDATE supplier ───────────────────────────────────────────────────────────

export async function updateSupplier(
  supplierId: string,
  farmId: string,
  supplierData: Partial<Supplier>,
  updatedByUserId?: string,
) {
  const supabase = await createServerSupabaseClient()

  const payload = sanitizeSupplierPayload(supplierData)

  const { data, error } = await (supabase
    .from('suppliers') as any)
    .update({
      ...payload,
      updated_by: updatedByUserId ?? null,
      updated_at: new Date().toISOString(),
    })
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

// ── DELETE (soft-delete) supplier ─────────────────────────────────────────────

export async function deleteSupplier(
  supplierId: string,
  farmId: string,
  deletedByUserId?: string,
) {
  const supabase = await createServerSupabaseClient()

  const { error } = await (supabase
    .from('suppliers') as any)
    .update({
      status:     'inactive',
      updated_by: deletedByUserId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', supplierId)
    .eq('farm_id', farmId)

  if (error) {
    console.error('Error soft-deleting supplier:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
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