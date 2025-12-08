import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Equipment, EquipmentMaintenance } from '@/types/database'

export async function getEquipment(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('equipment')
    .select(`
      *,
      supplier:supplier_id (
        id,
        name,
        contact_person
      )
    `)
    .eq('farm_id', farmId)
    .order('name')
  
  if (error) {
    console.error('Error fetching equipment:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data as any[]) || []
}

export async function createEquipment(
  farmId: string, 
  equipmentData: Omit<Partial<Equipment>, 'id' | 'farm_id' | 'created_at' | 'updated_at'>
) {
  const supabase = await createServerSupabaseClient()
  
  // Ensure required fields are present
  const insertData = {
    farm_id: farmId,
    name: equipmentData.name!,
    equipment_type: equipmentData.equipment_type!,
    // Optional fields
    description: equipmentData.description || null,
    brand: equipmentData.brand || null,
    model: equipmentData.model || null,
    serial_number: equipmentData.serial_number || null,
    purchase_date: equipmentData.purchase_date || null,
    purchase_cost: equipmentData.purchase_cost || null,
    supplier_id: equipmentData.supplier_id || null,
    warranty_expiry: equipmentData.warranty_expiry || null,
    status: equipmentData.status || 'operational',
    location: equipmentData.location || null,
    notes: equipmentData.notes || null,
  }
  
  const { data, error } = await (supabase
    .from('equipment') as any)
    .insert(insertData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating equipment:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function getEquipmentStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get total equipment
    const { count: totalEquipment } = await supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
    
    // Get equipment by status
    const { data: statusData } = await supabase
      .from('equipment')
      .select('status')
      .eq('farm_id', farmId)
    
    // FIXED: Cast to any[] to bypass 'never' type error
    const statusCounts = (statusData as any[])?.reduce((acc, item) => {
      if (item.status !== null) {
        acc[item.status] = (acc[item.status] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>) || {}
    
    // Get maintenance due (next 30 days)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    // Fetch equipment IDs for the farm
    const { data: equipmentIdsData, error: equipmentIdsError } = await supabase
      .from('equipment')
      .select('id')
      .eq('farm_id', farmId)
      
    // FIXED: Cast to any[]
    const equipmentIds = (equipmentIdsData as any[])?.map(e => e.id) || []
    
    let maintenanceDue = 0
    if (equipmentIds.length > 0) {
      const { count } = await supabase
        .from('equipment_maintenance')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .lte('maintenance_date', thirtyDaysFromNow)
        .in('equipment_id', equipmentIds)
      maintenanceDue = count || 0
    }

    return {
      totalEquipment: totalEquipment || 0,
      operational: statusCounts.operational || 0,
      maintenanceDue: statusCounts.maintenance_due || 0,
      inMaintenance: statusCounts.in_maintenance || 0,
      broken: statusCounts.broken || 0,
      upcomingMaintenance: maintenanceDue,
    }
  } catch (error) {
    console.error('Error getting equipment stats:', error)
    return {
      totalEquipment: 0,
      operational: 0,
      maintenanceDue: 0,
      inMaintenance: 0,
      broken: 0,
      upcomingMaintenance: 0,
    }
  }
}

export async function getEquipmentMaintenance(equipmentId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('equipment_maintenance')
    .select(`
      *,
      supplier:supplier_id (
        id,
        name
      )
    `)
    .eq('equipment_id', equipmentId)
    .order('maintenance_date', { ascending: false })
  
  if (error) {
    console.error('Error fetching equipment maintenance:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data as any[]) || []
}

export async function addEquipmentMaintenance(
  maintenanceData: Omit<Partial<EquipmentMaintenance>, 'id' | 'created_at'>
) {
  const supabase = await createServerSupabaseClient()
  
  // Ensure required fields are present
  const insertData = {
    equipment_id: maintenanceData.equipment_id!,
    maintenance_type: maintenanceData.maintenance_type!,
    description: maintenanceData.description!,
    maintenance_date: maintenanceData.maintenance_date!,
    // Optional fields
    next_maintenance_date: maintenanceData.next_maintenance_date || null,
    cost: maintenanceData.cost || null,
    performed_by: maintenanceData.performed_by || null,
    supplier_id: maintenanceData.supplier_id || null,
    parts_used: maintenanceData.parts_used || null,
    labor_hours: maintenanceData.labor_hours || null,
    notes: maintenanceData.notes || null,
    status: maintenanceData.status || 'completed',
  }
  
  const { data, error } = await (supabase
    .from('equipment_maintenance') as any)
    .insert(insertData)
    .select()
    .single()
  
  if (error) {
    console.error('Error adding equipment maintenance:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}