// src/lib/database/health-protocols.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ✅ Updated interfaces - aligned with normalized schema
export interface HealthProtocol {
  id: string
  farm_id: string
  protocol_name: string
  protocol_type: 'vaccination' | 'treatment' | 'checkup' | 'breeding' | 'nutrition' | 'deworming_parasites' | 'dehorning' | 'post_mortem'
  description: string
  frequency_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time'
  frequency_value: number
  start_date: string // ISO date: YYYY-MM-DD
  end_date: string | null // ISO date or null
  target_animals: 'all' | 'group' | 'individual'
  veterinarian: string | null
  estimated_cost: number | null // numeric(12,2)
  notes: string | null
  auto_create_records: boolean
  is_active: boolean
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

// Database row interface - handles nullable fields from Supabase
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
  veterinarian: string | null
  estimated_cost: number | null
  notes: string | null
  auto_create_records: boolean | null
  is_active: boolean | null
  created_by: string | null
  updated_by: string | null
  created_at: string | null
  updated_at: string | null
}

// Protocol animals association interface
export interface ProtocolAnimal {
  id: string
  protocol_id: string
  animal_id: string
}

// Input data interface for creating protocols
export interface CreateProtocolData {
  protocol_name: string
  protocol_type: 'vaccination' | 'treatment' | 'checkup' | 'breeding' | 'nutrition' | 'deworming_parasites' | 'dehorning' | 'post_mortem'
  description: string
  frequency_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time'
  frequency_value: number
  start_date: string // ISO date: YYYY-MM-DD
  end_date?: string | null
  target_animals: 'all' | 'group' | 'individual'
  animal_groups?: string[] | null
  individual_animals?: string[] | null // IDs of individual animals to apply protocol to
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
    end_date: row.end_date || null,
    target_animals: (row.target_animals as HealthProtocol['target_animals']) || 'all',
    veterinarian: row.veterinarian || null,
    estimated_cost: row.estimated_cost || null,
    notes: row.notes || null,
    auto_create_records: row.auto_create_records ?? true,
    is_active: row.is_active ?? true,
    created_by: row.created_by || '',
    updated_by: row.updated_by || null,
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  }
}

// ✅ Updated createHealthProtocol - handles animals through junction table
export async function createHealthProtocol(
  farmId: string,
  userId: string,
  protocolData: CreateProtocolData
): Promise<{ success: boolean; data?: HealthProtocol; error?: string }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // ✅ VALIDATION LAYER
    if (!protocolData.protocol_name || protocolData.protocol_name.trim().length < 2) {
      return { success: false, error: 'Protocol name must be at least 2 characters' }
    }
    
    if (!protocolData.description || protocolData.description.trim().length < 5) {
      return { success: false, error: 'Description must be at least 5 characters' }
    }
    
    if (!protocolData.start_date) {
      return { success: false, error: 'Start date is required' }
    }
    
    // Validate date formats (ISO format: YYYY-MM-DD)
    if (isNaN(Date.parse(protocolData.start_date))) {
      return { success: false, error: 'Invalid start date format (use YYYY-MM-DD)' }
    }
    
    if (protocolData.end_date && isNaN(Date.parse(protocolData.end_date))) {
      return { success: false, error: 'Invalid end date format (use YYYY-MM-DD)' }
    }
    
    // Validate end date is after start date
    if (protocolData.end_date) {
      const startDate = new Date(protocolData.start_date)
      const endDate = new Date(protocolData.end_date)
      
      if (endDate <= startDate) {
        return { success: false, error: 'End date must be after start date' }
      }
    }
    
    // ✅ Validate individual animals if selected (through normalized table)
    let validatedAnimalIds: string[] = []
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
      
      if (!animals || animals.length !== protocolData.individual_animals.length) {
        return { success: false, error: 'Some selected animals do not belong to your farm' }
      }
      
      validatedAnimalIds = animals.map(a => a.id)
    }
    
    // ✅ Prepare clean data for insertion (no array columns)
    const insertData = {
      farm_id: farmId,
      protocol_name: protocolData.protocol_name.trim(),
      protocol_type: protocolData.protocol_type,
      description: protocolData.description.trim(),
      frequency_type: protocolData.frequency_type,
      frequency_value: protocolData.frequency_value,
      start_date: protocolData.start_date,
      end_date: (protocolData.end_date && protocolData.end_date.trim() !== '') ? protocolData.end_date : null,
      target_animals: protocolData.target_animals,
      veterinarian: (protocolData.veterinarian && protocolData.veterinarian.trim() !== '') ? protocolData.veterinarian.trim() : null,
      estimated_cost: protocolData.estimated_cost || null,
      notes: (protocolData.notes && protocolData.notes.trim() !== '') ? protocolData.notes.trim() : null,
      auto_create_records: protocolData.auto_create_records ?? true,
      is_active: true
    }
    
    console.log('Inserting protocol data:', insertData)
    
    // ✅ Insert protocol (cast to any to bypass type issues with Supabase)
    const { data: rawData, error } = await (supabase
      .from('health_protocols') as any)
      .insert(insertData)
      .select('*')
    
    const protocolRows = rawData as HealthProtocolRow[]

    if (error) {
      console.error('Supabase insert error:', error)
      return { success: false, error: `Database error: ${error.message}` }
    }
    
    if (!protocolRows || protocolRows.length === 0) {
      return { success: false, error: 'No protocol was created' }
    }
    
    // ✅ Convert database row to proper HealthProtocol type
    const protocol = mapRowToProtocol(protocolRows[0])
    
    // ✅ Associate individual animals through junction table
    if (validatedAnimalIds.length > 0) {
      try {
        await associateAnimalsWithProtocol(protocol.id, validatedAnimalIds)
      } catch (assocError) {
        console.error('Error associating animals with protocol:', assocError)
        // Don't fail - protocol was created, just animal association had issues
      }
    }
    
    // ✅ Create initial tasks if needed
    if (protocol.auto_create_records && protocol.frequency_type !== 'one_time') {
      try {
        await createInitialProtocolTasks(protocol)
      } catch (taskError) {
        console.error('Error creating initial tasks:', taskError)
        // Don't fail - protocol was created, just task creation failed
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
  
  // FIXED: Cast to any to bypass potential type errors on table access
  const { data: rawData, error } = await (supabase
    .from('health_protocols') as any)
    .select('*')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  
  const protocolRows = rawData as HealthProtocolRow[]

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
    // FIXED: Cast to any to bypass 'never' type error on update, and cast result manually
    const { data: rawData, error } = await (supabase
      .from('health_protocols') as any)
      .update(updates)
      .eq('id', protocolId)
      .select('*')
    
    const protocolRows = rawData as HealthProtocolRow[]

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

// ✅ NEW: Associate individual animals with a protocol through junction table
export async function associateAnimalsWithProtocol(
  protocolId: string,
  animalIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    if (!animalIds || animalIds.length === 0) {
      return { success: true }
    }
    
    // Create protocol_animals associations
    const associations = animalIds.map(animalId => ({
      protocol_id: protocolId,
      animal_id: animalId,
    }))
    
    const { error } = await (supabase
      .from('protocol_animals') as any)
      .insert(associations)
    
    if (error) {
      console.error('Error associating animals:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
    
  } catch (error) {
    console.error('Error in associateAnimalsWithProtocol:', error)
    return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

// Get animals associated with a protocol
export async function getProtocolAnimals(protocolId: string): Promise<ProtocolAnimal[]> {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data, error } = await (supabase
      .from('protocol_animals') as any)
      .select('*')
      .eq('protocol_id', protocolId)
    
    if (error) {
      console.error('Error fetching protocol animals:', error)
      return []
    }
    
    return data as ProtocolAnimal[]
    
  } catch (error) {
    console.error('Error in getProtocolAnimals:', error)
    return []
  }
}

// Remove animal association from protocol
export async function removeAnimalFromProtocol(
  protocolId: string,
  animalId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { error } = await (supabase
      .from('protocol_animals') as any)
      .delete()
      .eq('protocol_id', protocolId)
      .eq('animal_id', animalId)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
    
  } catch (error) {
    console.error('Error in removeAnimalFromProtocol:', error)
    return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

// Delete a protocol (soft delete - just mark as inactive)
export async function deleteHealthProtocol(protocolId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // FIXED: Cast to any for delete update
    const { error } = await (supabase
      .from('health_protocols') as any)
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

// Helper functions
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