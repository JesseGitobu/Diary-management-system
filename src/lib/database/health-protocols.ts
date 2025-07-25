// 2. Database Operations - src/lib/database/health-protocols.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Fix: Update the HealthProtocol interface to match database reality
// src/lib/database/health-protocols.ts - Updated interfaces

export interface HealthProtocol {
  id: string
  farm_id: string
  protocol_name: string
  protocol_type: 'vaccination' | 'treatment' | 'checkup' | 'breeding' | 'nutrition'
  description: string
  frequency_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time'
  frequency_value: number
  start_date: string
  end_date: string | null // ✅ Allow null
  target_animals: 'all' | 'group' | 'individual'
  animal_groups: string[] | null // ✅ Allow null
  individual_animals: string[] | null // ✅ Allow null
  veterinarian: string | null // ✅ Allow null
  estimated_cost: number | null // ✅ Allow null
  notes: string | null // ✅ Allow null
  auto_create_records: boolean
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// Add a separate interface for database responses that might have different nullability
export interface HealthProtocolRow {
  id: string
  farm_id: string
  protocol_name: string | null
  protocol_type: string | null
  description: string | null
  frequency_type: string | null
  frequency_value: number | null
  start_date: string | null
  end_date: string | null
  target_animals: string | null
  animal_groups: string[] | null
  individual_animals: string[] | null
  veterinarian: string | null
  estimated_cost: number | null
  notes: string | null
  auto_create_records: boolean | null
  is_active: boolean | null
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

export interface CreateProtocolData {
  protocol_name: string
  protocol_type: 'vaccination' | 'treatment' | 'checkup' | 'breeding' | 'nutrition'
  description: string
  frequency_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time'
  frequency_value: number
  start_date: string
  end_date?: string | null
  target_animals: 'all' | 'group' | 'individual'
  animal_groups?: string[] | null
  individual_animals?: string[] | null
  veterinarian?: string | null
  estimated_cost?: number | null
  notes?: string | null
  auto_create_records?: boolean
}

// Helper function to convert database row to clean HealthProtocol
function mapRowToProtocol(row: HealthProtocolRow): HealthProtocol {
  return {
    id: row.id,
    farm_id: row.farm_id,
    protocol_name: row.protocol_name || '',
    protocol_type: (row.protocol_type as HealthProtocol['protocol_type']) || 'vaccination',
    description: row.description || '',
    frequency_type: (row.frequency_type as HealthProtocol['frequency_type']) || 'monthly',
    frequency_value: row.frequency_value || 1,
    start_date: row.start_date || '',
    end_date: row.end_date,
    target_animals: (row.target_animals as HealthProtocol['target_animals']) || 'all',
    animal_groups: row.animal_groups,
    individual_animals: row.individual_animals,
    veterinarian: row.veterinarian,
    estimated_cost: row.estimated_cost,
    notes: row.notes,
    auto_create_records: row.auto_create_records ?? true,
    is_active: row.is_active ?? true,
    created_by: row.created_by || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  }
}

// Updated createHealthProtocol function
export async function createHealthProtocol(
  farmId: string,
  userId: string,
  protocolData: CreateProtocolData
): Promise<{ success: boolean; data?: HealthProtocol; error?: string }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Enhanced validation
    if (!protocolData.protocol_name || protocolData.protocol_name.trim().length < 2) {
      return { success: false, error: 'Protocol name must be at least 2 characters' }
    }
    
    if (!protocolData.description || protocolData.description.trim().length < 5) {
      return { success: false, error: 'Description must be at least 5 characters' }
    }
    
    if (!protocolData.start_date) {
      return { success: false, error: 'Start date is required' }
    }
    
    // Validate date formats
    if (isNaN(Date.parse(protocolData.start_date))) {
      return { success: false, error: 'Invalid start date format' }
    }
    
    if (protocolData.end_date && isNaN(Date.parse(protocolData.end_date))) {
      return { success: false, error: 'Invalid end date format' }
    }
    
    // Validate end date is after start date
    if (protocolData.end_date) {
      const startDate = new Date(protocolData.start_date)
      const endDate = new Date(protocolData.end_date)
      
      if (endDate <= startDate) {
        return { success: false, error: 'End date must be after start date' }
      }
    }
    
    // Validate individual animals if selected
    if (protocolData.target_animals === 'individual' && protocolData.individual_animals?.length) {
      const { data: animals, error: animalError } = await supabase
        .from('animals')
        .select('id')
        .eq('farm_id', farmId)
        .in('id', protocolData.individual_animals)
      
      if (animalError) {
        console.error('Error validating animals:', animalError)
        return { success: false, error: 'Error validating selected animals' }
      }
      
      if (animals.length !== protocolData.individual_animals.length) {
        return { success: false, error: 'Some selected animals do not belong to your farm' }
      }
    }
    
    // Prepare clean data for insertion
    const insertData = {
      farm_id: farmId,
      created_by: userId,
      protocol_name: protocolData.protocol_name.trim(),
      protocol_type: protocolData.protocol_type,
      description: protocolData.description.trim(),
      frequency_type: protocolData.frequency_type,
      frequency_value: protocolData.frequency_value,
      start_date: protocolData.start_date,
      end_date: protocolData.end_date || null,
      target_animals: protocolData.target_animals,
      animal_groups: protocolData.animal_groups || null,
      individual_animals: protocolData.individual_animals || null,
      veterinarian: protocolData.veterinarian?.trim() || null,
      estimated_cost: protocolData.estimated_cost || null,
      notes: protocolData.notes?.trim() || null,
      auto_create_records: protocolData.auto_create_records ?? true,
      is_active: true
    }
    
    console.log('Inserting protocol data:', insertData)
    
    // ✅ Fixed: Use proper typing and handle the response correctly
    const { data: protocolRows, error } = await supabase
      .from('health_protocols')
      .insert(insertData)
      .select('*')
      .returns<HealthProtocolRow[]>()
    
    if (error) {
      console.error('Supabase insert error:', error)
      return { success: false, error: `Database error: ${error.message}` }
    }
    
    if (!protocolRows || protocolRows.length === 0) {
      return { success: false, error: 'No protocol was created' }
    }
    
    // ✅ Convert the database row to proper HealthProtocol type
    const protocol = mapRowToProtocol(protocolRows[0])
    
    // Create initial tasks if needed
    if (protocol.auto_create_records && protocol.frequency_type !== 'one_time') {
      try {
        await createInitialProtocolTasks(protocol)
      } catch (taskError) {
        console.error('Error creating initial tasks:', taskError)
        // Don't fail the protocol creation if task creation fails
      }
    }
    
    return { success: true, data: protocol }
    
  } catch (error) {
    console.error('Error in createHealthProtocol:', error)
    return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

// Updated getFarmHealthProtocols function
export async function getFarmHealthProtocols(farmId: string): Promise<HealthProtocol[]> {
  const supabase = await createServerSupabaseClient()
  
  const { data: protocolRows, error } = await supabase
    .from('health_protocols')
    .select('*')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .returns<HealthProtocolRow[]>()
  
  if (error) {
    console.error('Error fetching health protocols:', error)
    return []
  }
  
  if (!protocolRows) {
    return []
  }
  
  // ✅ Convert all rows to proper HealthProtocol type
  return protocolRows.map(mapRowToProtocol)
}

// Updated updateHealthProtocol function
export async function updateHealthProtocol(
  protocolId: string,
  updates: Partial<CreateProtocolData>
): Promise<{ success: boolean; data?: HealthProtocol; error?: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: protocolRows, error } = await supabase
      .from('health_protocols')
      .update(updates)
      .eq('id', protocolId)
      .select('*')
      .returns<HealthProtocolRow[]>()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    if (!protocolRows || protocolRows.length === 0) {
      return { success: false, error: 'Protocol not found or not updated' }
    }
    
    const protocol = mapRowToProtocol(protocolRows[0])
    return { success: true, data: protocol }
    
  } catch (error) {
    console.error('Error updating health protocol:', error)
    return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

// Keep the existing deleteHealthProtocol and helper functions as they are
export async function deleteHealthProtocol(protocolId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { error } = await supabase
      .from('health_protocols')
      .update({ is_active: false })
      .eq('id', protocolId)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
    
  } catch (error) {
    console.error('Error deleting health protocol:', error)
    return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

// Keep existing helper functions
async function createInitialProtocolTasks(protocol: HealthProtocol) {
  console.log(`Creating initial tasks for protocol: ${protocol.protocol_name}`)
  
  const tasks = generateProtocolTasks(protocol, 3)
  
  // Implementation depends on your task system
  // For now, just log the tasks that would be created
  console.log(`Generated ${tasks.length} tasks for protocol`)
}

function generateProtocolTasks(protocol: HealthProtocol, monthsAhead: number) {
  const tasks = []
  const startDate = new Date(protocol.start_date)
  const endDate = protocol.end_date ? new Date(protocol.end_date) : new Date()
  endDate.setMonth(endDate.getMonth() + monthsAhead)
  
  let currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    tasks.push({
      protocol_id: protocol.id,
      scheduled_date: new Date(currentDate),
      status: 'pending',
      title: `${protocol.protocol_name} - ${protocol.protocol_type}`,
      description: protocol.description,
    })
    
    // Calculate next date based on frequency
    switch (protocol.frequency_type) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + protocol.frequency_value)
        break
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (protocol.frequency_value * 7))
        break
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + protocol.frequency_value)
        break
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + (protocol.frequency_value * 3))
        break
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + protocol.frequency_value)
        break
      default:
        return tasks // one_time protocols don't repeat
    }
  }
  
  return tasks
}
