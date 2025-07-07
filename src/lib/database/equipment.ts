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
  
  return data || []
}

export async function createEquipment(farmId: string, equipmentData: Partial<Equipment>) {
  const supabase = await createServerSupabaseClient()

  // Remove properties not in the DB schema (like supplier) and ensure required fields are present
  const {
    name,
    description,
    equipment_type,
    brand,
    model,
    serial_number,
    purchase_date,
    warranty_expiry,
    status,
    location,
    notes,
    supplier_id,
    id,
    created_at,
    updated_at
  } = equipmentData;

  if (!equipment_type) {
    return { success: false, error: 'equipment_type is required' };
  }
  if (!name) {
    return { success: false, error: 'name is required' };
  }

  const insertData = {
    name,
    description,
    equipment_type,
    brand,
    model,
    serial_number,
    purchase_date,
    warranty_expiry,
    status,
    location,
    notes,
    supplier_id,
    farm_id: farmId,
    id,
    created_at,
    updated_at
  };

  // Remove undefined fields
  Object.keys(insertData).forEach(
    key => insertData[key as keyof typeof insertData] === undefined && delete insertData[key as keyof typeof insertData]
  );

  const { data, error } = await supabase
    .from('equipment')
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
    
    const statusCounts = statusData?.reduce((acc, item) => {
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
    const equipmentIds = equipmentIdsData?.map(e => e.id) || []
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
  
  return data || []
}

export async function addEquipmentMaintenance(maintenanceData: Partial<EquipmentMaintenance>) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('equipment_maintenance')
    .insert(maintenanceData)
    .select()
    .single()
  
  if (error) {
    console.error('Error adding equipment maintenance:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}