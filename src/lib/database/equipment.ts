import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Equipment, EquipmentMaintenance } from '@/types/database'

export async function getEquipment(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('equipment')
    .select(`
      *,
      equipment_type:equipment_type_id(id, code, label),
      category:category_id(id, code, label)
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
  equipmentData: any
) {
  const supabase = await createServerSupabaseClient()
  
  try {
    console.log('📦 Creating equipment for farm:', farmId)
    console.log('Equipment data:', equipmentData)
    
    // Validate required fields
    if (!equipmentData.name) {
      console.log('❌ Equipment name is required')
      return { success: false, error: 'Equipment name is required' }
    }
    if (!equipmentData.equipment_type) {
      console.log('❌ Equipment type is required')
      return { success: false, error: 'Equipment type is required' }
    }
    if (!equipmentData.category) {
      console.log('❌ Category is required')
      return { success: false, error: 'Category is required' }
    }

    // Validate custom fields if 'other' is selected
    if (equipmentData.equipment_type === 'other' && !equipmentData.custom_equipment_type?.trim()) {
      console.log('❌ Custom equipment type is required when selecting "other"')
      return { success: false, error: 'Please specify a custom equipment type' }
    }
    if (equipmentData.category === 'other' && !equipmentData.custom_category?.trim()) {
      console.log('❌ Custom category is required when selecting "other"')
      return { success: false, error: 'Please specify a custom category' }
    }

    console.log('✓ Basic validation passed')

    let equipment_type_id: string
    let category_id: string

    // Handle custom category
    if (equipmentData.category === 'other') {
      const customCategoryCode = equipmentData.custom_category.toLowerCase().replace(/\s+/g, '_').substring(0, 50)
      console.log('Creating custom category:', customCategoryCode)
      
      const { data: categoryData, error: categoryError } = await supabase
        .from('equipment_categories')
        .insert({
          code: customCategoryCode,
          label: equipmentData.custom_category,
          description: `Custom category: ${equipmentData.custom_category}`,
        })
        .select('id')
        .single()
      
      if (categoryError && !categoryError.message.includes('duplicate')) {
        console.log('❌ Failed to create custom category:', categoryError)
        return { success: false, error: `Failed to create category: ${categoryError.message}` }
      }
      
      if (categoryData) {
        category_id = categoryData.id
        console.log('✓ Custom category created:', category_id)
      } else {
        // Category might already exist, try to fetch it
        const { data: existingCategory, error: fetchError } = await supabase
          .from('equipment_categories')
          .select('id')
          .eq('code', customCategoryCode)
          .single()
        
        if (fetchError || !existingCategory) {
          return { success: false, error: 'Failed to create or retrieve custom category' }
        }
        category_id = existingCategory.id
      }
    } else {
      // Look up standard category
      const { data: categoryResult, error: categoryError } = await supabase
        .from('equipment_categories')
        .select('id')
        .eq('code', equipmentData.category.toLowerCase())
        .single()

      if (categoryError) {
        console.log('❌ Category not found:', equipmentData.category, categoryError)
        return { success: false, error: `Category not found: ${equipmentData.category}` }
      }
      category_id = categoryResult.id
    }

    // Handle custom equipment type
    if (equipmentData.equipment_type === 'other') {
      const customTypeCode = equipmentData.custom_equipment_type.toLowerCase().replace(/\s+/g, '_').substring(0, 50)
      console.log('Creating custom equipment type:', customTypeCode)
      
      const { data: typeData, error: typeError } = await supabase
        .from('equipment_types')
        .insert({
          code: customTypeCode,
          label: equipmentData.custom_equipment_type,
          description: `Custom equipment type: ${equipmentData.custom_equipment_type}`,
          default_category_id: category_id,
        })
        .select('id')
        .single()
      
      if (typeError && !typeError.message.includes('duplicate')) {
        console.log('❌ Failed to create custom equipment type:', typeError)
        return { success: false, error: `Failed to create equipment type: ${typeError.message}` }
      }
      
      if (typeData) {
        equipment_type_id = typeData.id
        console.log('✓ Custom equipment type created:', equipment_type_id)
      } else {
        // Type might already exist, try to fetch it
        const { data: existingType, error: fetchError } = await supabase
          .from('equipment_types')
          .select('id')
          .eq('code', customTypeCode)
          .single()
        
        if (fetchError || !existingType) {
          return { success: false, error: 'Failed to create or retrieve custom equipment type' }
        }
        equipment_type_id = existingType.id
      }
    } else {
      // Look up standard equipment type
      const { data: typeResult, error: typeError } = await supabase
        .from('equipment_types')
        .select('id')
        .eq('code', equipmentData.equipment_type.toLowerCase())
        .single()

      if (typeError) {
        console.log('❌ Equipment type not found:', equipmentData.equipment_type, typeError)
        return { success: false, error: `Equipment type not found: ${equipmentData.equipment_type}` }
      }
      equipment_type_id = typeResult.id
    }

    console.log('✓ Type and category lookups/creation successful')

    // Generate asset_id if not provided
    let asset_id = equipmentData.asset_id
    if (!asset_id || asset_id.trim() === '') {
      const year = new Date().getFullYear()
      // Get next sequence number for this year
      const { data: existingAssets } = await supabase
        .from('equipment')
        .select('asset_id', { count: 'exact' })
        .eq('farm_id', farmId)
        .like('asset_id', `EQ-${year}-%`)

      const sequence = (existingAssets?.length || 0) + 1
      asset_id = `EQ-${year}-${sequence.toString().padStart(3, '0')}`
      console.log('Generated asset_id:', asset_id)
    }

    // Prepare equipment insert data for new normalized schema
    const insertData = {
      farm_id: farmId,
      name: equipmentData.name,
      asset_id,
      serial_number: equipmentData.serial_number || null,
      equipment_type_id,
      category_id,
      brand: equipmentData.brand || null,
      model: equipmentData.model || null,
      year_manufactured: equipmentData.year_manufactured || null,
      description: equipmentData.description || null,
      status: equipmentData.status || 'operational',
      condition: equipmentData.condition || 'good',
      ownership_type: equipmentData.ownership_type || 'owned',
      home_location: equipmentData.home_location || null,
      current_location: equipmentData.current_location || null,
      purchase_date: equipmentData.purchase_date || null,
      purchase_cost: equipmentData.purchase_cost || null,
      current_value: equipmentData.current_value || equipmentData.purchase_cost || null,
      expected_useful_life_years: equipmentData.expected_useful_life_years || null,
      warranty_expiry: equipmentData.warranty_expiry || null,
      odometer_hours: equipmentData.odometer_hours || 0,
      fuel_level_pct: equipmentData.fuel_level_pct || null,
      utilization_rate_pct: 0,
    }
    
    console.log('Insert data prepared:', insertData)

    // Check for duplicate asset_id
    const { data: duplicateCheck } = await supabase
      .from('equipment')
      .select('id', { count: 'exact' })
      .eq('farm_id', farmId)
      .eq('asset_id', asset_id)

    if (duplicateCheck && duplicateCheck.length > 0) {
      console.log('❌ Asset ID already exists:', asset_id)
      return { success: false, error: `Asset ID already exists: ${asset_id}` }
    }

    console.log('✓ Asset ID is unique, inserting...')

    // Insert equipment
    const { data: equipment, error: insertError } = await supabase
      .from('equipment')
      .insert([insertData])
      .select(`
        *,
        equipment_type:equipment_type_id(id, code, label),
        category:category_id(id, code, label)
      `)
      .single()

    if (insertError) {
      console.error('❌ Equipment insert error:', insertError)
      return { success: false, error: insertError.message || 'Failed to insert equipment' }
    }

    console.log('✓ Equipment inserted successfully:', equipment?.id)
    return { success: true, data: equipment }
  } catch (error) {
    console.error('❌ Create equipment error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Internal server error' }
  }
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
        .from('maintenance_records')
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
    .from('maintenance_records')
    .select(`
      *,
      parts:maintenance_parts(id, part_name, part_number, quantity, unit_cost, supplier),
      created_by_worker:created_by(id, name),
      technician:technician_staff_id(id, name)
    `)
    .eq('equipment_id', equipmentId)
    .order('maintenance_date', { ascending: false })
  
  if (error) {
    console.error('Error fetching equipment maintenance:', error)
    return []
  }
  
  return (data as any[]) || []
}

/**
 * Get maintenance records for a farm with filtering and pagination
 */
export async function getMaintenanceRecordsByFarmId(
  farmId: string,
  status?: string,
  limit: number = 50,
  offset: number = 0
) {
  const supabase = await createServerSupabaseClient()
  
  try {
    console.log('📋 [DB] Fetching maintenance records for farm:', farmId)
    
    let query = supabase
      .from('maintenance_records')
      .select(`
        id,
        farm_id,
        equipment_id,
        maintenance_type,
        priority,
        description,
        maintenance_date,
        status,
        cost,
        labour_hours,
        downtime_hours,
        performed_by,
        notes,
        created_at,
        updated_at,
        completed_at,
        equipment:equipment_id(id, name, asset_id),
        parts:maintenance_parts(id, part_name, part_number, quantity, unit_cost, supplier)
      `, { count: 'exact' })
      .eq('farm_id', farmId)
    
    if (status && ['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      query = query.eq('status', status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled')
    }
    
    const { data, error, count } = await query
      .order('maintenance_date', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('❌ [DB] Error fetching maintenance records:', error)
      return {
        success: false,
        data: [],
        count: 0,
        error: error.message,
      }
    }
    
    console.log('✅ [DB] Maintenance records fetched:', data?.length || 0)
    
    return {
      success: true,
      data: (data as any[]) || [],
      count: count ?? 0,
    }
  } catch (error) {
    console.error('❌ [DB] Unexpected error fetching maintenance records:', error)
    return {
      success: false,
      data: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function createMaintenanceRecord(
  farmId: string,
  userId: string,
  maintenanceData: any
) {
  const supabase = await createServerSupabaseClient()
  
  try {
    console.log('📋 Creating maintenance record for farm:', farmId)
    console.log('Maintenance data:', maintenanceData)
    
    // Validate required fields
    if (!maintenanceData.equipment_id) {
      console.log('❌ Equipment ID is required')
      return { success: false, error: 'Equipment ID is required' }
    }
    if (!maintenanceData.maintenance_type) {
      console.log('❌ Maintenance type is required')
      return { success: false, error: 'Maintenance type is required' }
    }
    if (!maintenanceData.description) {
      console.log('❌ Description is required')
      return { success: false, error: 'Description is required' }
    }
    if (!maintenanceData.maintenance_date) {
      console.log('❌ Maintenance date is required')
      return { success: false, error: 'Maintenance date is required' }
    }
    if (!maintenanceData.priority) {
      console.log('❌ Priority is required')
      return { success: false, error: 'Priority is required' }
    }

    console.log('✓ Basic validation passed')

    // Prepare maintenance record
    const insertData = {
      farm_id: farmId,
      equipment_id: maintenanceData.equipment_id,
      maintenance_type: maintenanceData.maintenance_type,
      priority: maintenanceData.priority,
      description: maintenanceData.description,
      maintenance_date: maintenanceData.maintenance_date,
      status: maintenanceData.status || 'scheduled',
      next_maintenance_date: maintenanceData.next_maintenance_date || null,
      service_interval_hours: maintenanceData.service_interval_hours || null,
      cost: maintenanceData.cost || null,
      labour_hours: maintenanceData.labor_hours || null,
      downtime_hours: maintenanceData.downtime_hours || null,
      performed_by: maintenanceData.performed_by || null,
      technician_staff_id: maintenanceData.technician_staff_id || null,
      notes: maintenanceData.notes || null,
      created_by: userId,
    }

    console.log('Inserting maintenance record:', insertData)

    // Insert maintenance record
    const { data: record, error: insertError } = await supabase
      .from('maintenance_records')
      .insert([insertData])
      .select()
      .single()

    if (insertError) {
      console.error('❌ Maintenance record insert error:', insertError)
      return { success: false, error: insertError.message || 'Failed to create maintenance record' }
    }

    console.log('✓ Maintenance record created:', record?.id)

    // Insert maintenance parts if provided
    let parts: any[] = []
    if (maintenanceData.parts && Array.isArray(maintenanceData.parts) && maintenanceData.parts.length > 0) {
      const validParts = maintenanceData.parts.filter((p: any) => p.part_name?.trim())
      
      if (validParts.length > 0) {
        const partsInsertData = validParts.map((p: any) => ({
          maintenance_id: record.id,
          part_name: p.part_name,
          part_number: p.part_number || null,
          quantity: p.quantity || 1,
          unit_cost: p.unit_cost || null,
          supplier: p.supplier || null,
        }))

        console.log('Inserting maintenance parts:', partsInsertData)

        const { data: insertedParts, error: partsError } = await supabase
          .from('maintenance_parts')
          .insert(partsInsertData)
          .select()

        if (partsError) {
          console.error('⚠️ Warning: Failed to insert maintenance parts:', partsError)
          // Don't fail the entire operation if parts insertion fails
        } else {
          parts = insertedParts || []
          console.log('✓ Maintenance parts created:', parts.length)
        }
      }
    }

    // Fetch the complete record with relations
    const { data: completeRecord, error: fetchError } = await supabase
      .from('maintenance_records')
      .select(`
        *,
        parts:maintenance_parts(id, part_name, part_number, quantity, unit_cost, supplier),
        created_by_worker:created_by(id, name),
        technician:technician_staff_id(id, name)
      `)
      .eq('id', record.id)
      .single()

    if (fetchError) {
      console.error('⚠️ Warning: Failed to fetch complete record:', fetchError)
      // Still return success with the basic record
      return { success: true, data: { ...record, parts } }
    }

    console.log('✓ Maintenance record created successfully with all relations')
    return { success: true, data: completeRecord }
  } catch (error) {
    console.error('❌ Create maintenance record error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Internal server error' }
  }
}

// Legacy function - kept for backward compatibility
export async function addEquipmentMaintenance(
  maintenanceData: Omit<Partial<EquipmentMaintenance>, 'id' | 'created_at'>
) {
  console.log('⚠️ addEquipmentMaintenance is deprecated. Please use createMaintenanceRecord instead.')
  return { success: false, error: 'Deprecated function. Use createMaintenanceRecord instead.' }
}