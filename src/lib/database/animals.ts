// src/lib/database/animals.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { 
  Animal, 
  AnimalInsert, 
  AnimalUpdate, 
  AnimalStats, 
  AvailableMother,
  ReleaseRecord,        // Add this
  ReleaseFormData,
  NewbornCalfFormData,
  PurchasedAnimalFormData 
} from '@/types/database'

// Get all animals for a farm with enhanced filtering
export async function getFarmAnimals(
  farmId: string, 
  options: {
    includeInactive?: boolean;
    animalSource?: string;
    productionStatus?: string;
    healthStatus?: string;
    gender?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('animals')
    .select(`
      *,
      mother:mother_id (
        id,
        tag_number,
        name,
        breed
      ),
      father:father_id (
        id,
        tag_number,
        name,
        breed
      )
    `)
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })
  
  // Apply filters
  if (!options.includeInactive) {
    query = query.eq('status', 'active')
  }
  
  if (options.animalSource) {
    query = query.eq('animal_source', options.animalSource)
  }
  
  if (options.productionStatus) {
    query = query.eq('production_status', options.productionStatus)
  }
  
  if (options.healthStatus) {
    query = query.eq('health_status', options.healthStatus)
  }
  
  if (options.gender) {
    query = query.eq('gender', options.gender)
  }
  
  // Apply pagination
  if (options.limit) {
    query = query.limit(options.limit)
  }
  
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching animals:', error)
    return []
  }
  
  return (data || []).map((item: any) => ({
    ...item,
    expected_calving_date: item.expected_calving_date ?? null,
    days_in_milk: item.days_in_milk ?? null,
    lactation_number: item.lactation_number ?? null,
    purchase_price: item.purchase_price ?? null,
    purchase_date: item.purchase_date ?? null,
    seller_info: item.seller_info ?? null,
    weight: item.weight ?? null,
    birth_weight: item.birth_weight ?? null,
    notes: item.notes ?? null,
    service_date: item.service_date ?? null,
    service_method: item.service_method ?? null,
    mother_production_info: item.mother_production_info ?? null,
    father_info: item.father_info ?? null,
    updated_at: item.updated_at ?? null,
  })) as Animal[]
}

// Get single animal by ID with all related data
export async function getAnimalById(animalId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('animals')
    .select(`
      *,
      mother:mother_id (
        id,
        tag_number,
        name,
        breed,
        birth_date,
        current_daily_production
      ),
      father:father_id (
        id,
        tag_number,
        name,
        breed
      )
    `)
    .eq('id', animalId)
    .single()
  
  if (error) {
    console.error('Error fetching animal:', error)
    return null
  }
  
  return data
}

/**
 * Check if tag number exists (excluding current animal for updates)
 */
export async function getAnimalByTagNumber(
  tagNumber: string, 
  farmId: string, 
  excludeAnimalId?: string
) {
  const supabase = await createServerSupabaseClient()
  
  try {
    let query = supabase
      .from('animals')
      .select('id, tag_number')
      .eq('farm_id', farmId)
      .eq('tag_number', tagNumber)
      .neq('status', 'inactive') // Don't check against deleted animals
    
    // Exclude current animal for updates
    if (excludeAnimalId) {
      query = query.neq('id', excludeAnimalId)
    }
    
    const { data, error } = await query.single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking tag number:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error in getAnimalByTagNumber:', error)
    return null
  }
}

// Get available mothers for newborn calf selection
export async function getAvailableMothers(farmId: string): Promise<AvailableMother[]> {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('animals')
    .select('id, tag_number, name, breed, production_status, birth_date')
    .eq('farm_id', farmId)
    .eq('gender', 'female')
    .eq('status', 'active')
    .in('production_status', ['lactating', 'dry', 'served'])
    .order('tag_number', { ascending: true })
  
  if (error) {
    console.error('Error fetching available mothers:', error)
    return []
  }
  
  return data || []
}

// Get available mothers excluding specific animal (for editing)
export async function getAvailableMothersForEdit(
  farmId: string, 
  excludeAnimalId?: string
): Promise<AvailableMother[]> {
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('animals')
    .select('id, tag_number, name, breed, production_status, birth_date')
    .eq('farm_id', farmId)
    .eq('gender', 'female')
    .eq('status', 'active')
    .in('production_status', ['lactating', 'dry', 'served'])
    .order('tag_number', { ascending: true })
  
  // Exclude specific animal (useful when editing to prevent circular references)
  if (excludeAnimalId) {
    query = query.neq('id', excludeAnimalId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching available mothers for edit:', error)
    return []
  }
  
  return data || []
}

export async function getEnhancedAnimalStats(farmId: string): Promise<AnimalStats> {
  const supabase = await createServerSupabaseClient()
  
  // Get all animals for statistics
  const { data: animals } = await supabase
    .from('animals')
    .select('animal_source, production_status, health_status, gender, birth_date')
    .eq('farm_id', farmId)
    .eq('status', 'active')
  
  if (!animals) {
    return {
      total: 0,
      female: 0,
      male: 0,
      bySource: { newborn_calves: 0, purchased: 0 },
      byProduction: { calves: 0, heifers: 0, served: 0, lactating: 0, dry: 0 },
      byHealth: { healthy: 0, needsAttention: 0 }
    }
  }
  
  // Calculate statistics
  const stats: AnimalStats = {
    total: animals.length,
    female: animals.filter(a => a.gender === 'female').length,
    male: animals.filter(a => a.gender === 'male').length,
    bySource: {
      newborn_calves: animals.filter(a => a.animal_source === 'newborn_calf').length,
      purchased: animals.filter(a => a.animal_source === 'purchased_animal').length,
    },
    byProduction: {
      calves: animals.filter(a => a.production_status === 'calf').length,
      heifers: animals.filter(a => a.production_status === 'heifer').length,
      served: animals.filter(a => a.production_status === 'served').length,
      lactating: animals.filter(a => a.production_status === 'lactating').length,
      dry: animals.filter(a => a.production_status === 'dry').length,
    },
    byHealth: {
      healthy: animals.filter(a => a.health_status === 'healthy').length,
      needsAttention: animals.filter(a => a.health_status !== 'healthy').length,
    }
  }
  
  return stats
}


// Create a new animal (handles both newborn calves and purchased animals)
export async function createAnimal(
  farmId: string, 
  animalData: Partial<Animal>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Validate required fields
    if (!animalData.tag_number) {
      return { success: false, error: 'Tag number is required' }
    }
    
    if (!animalData.gender) {
      return { success: false, error: 'Gender is required' }
    }
    
    if (!animalData.animal_source) {
      return { success: false, error: 'Animal source is required' }
    }
    
    // Check for duplicate tag number
    const { data: existingAnimal } = await supabase
      .from('animals')
      .select('id')
      .eq('farm_id', farmId)
      .eq('tag_number', animalData.tag_number)
      .single()
    
    if (existingAnimal) {
      return { success: false, error: 'Tag number already exists' }
    }
    
    // Validate source-specific requirements
    if (animalData.animal_source === 'newborn_calf' && !animalData.mother_id) {
      return { success: false, error: 'Mother selection is required for newborn calves' }
    }
    
    if (animalData.animal_source === 'purchased_animal' && !animalData.purchase_date) {
      return { success: false, error: 'Purchase date is required for purchased animals' }
    }
    
    // Prepare the data for insertion
    const insertData: AnimalInsert = {
      farm_id: farmId,
      tag_number: animalData.tag_number,
      name: animalData.name || null,
      breed: animalData.breed || null,
      gender: animalData.gender,
      birth_date: animalData.birth_date || null,
      birth_weight: animalData.birth_weight || null,
      weight: animalData.weight || null,
      status: animalData.status || 'active',
      notes: animalData.notes || null,
      animal_source: animalData.animal_source,
      
      // Newborn calf specific fields
      mother_id: animalData.mother_id || null,
      father_id: animalData.father_id || null,
      father_info: animalData.father_info || null,

      // Purchase specific fields
      purchase_date: animalData.purchase_date || null,
      purchase_price: animalData.purchase_price || null,
      seller_info: animalData.seller_info || null,

      // Status fields
      health_status: animalData.health_status || 'healthy',
      production_status: animalData.production_status || 'calf',
      
      // Service fields (for served animals)
      service_date: animalData.service_date || null,
      service_method: animalData.service_method || null,
      expected_calving_date: animalData.expected_calving_date || null,

      // Production fields (for lactating animals)
      current_daily_production: animalData.current_daily_production || null,
      days_in_milk: animalData.days_in_milk || null,
      lactation_number: animalData.lactation_number || null,

      // Mother production info (for heifers)
      mother_production_info: animalData.mother_production_info || null,
    }
    
    const { data, error } = await supabase
      .from('animals')
      .insert(insertData)
      .select(`
        *,
        mother:mother_id (
          id,
          tag_number,
          name,
          breed
        ),
        father:father_id (
          id,
          tag_number,
          name,
          breed
        )
      `)
      .single()
    
    if (error) {
      console.error('Error creating animal:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
    
  } catch (error) {
    console.error('Error in createAnimal:', error)
    return { success: false, error: 'Failed to create animal' }
  }
}

// Update an existing animal
export async function updateAnimal(animalId: string, farmId: string, animalData: any) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Verify animal belongs to the farm
    const existingAnimal = await getAnimalById(animalId)
    
    if (!existingAnimal) {
      return { success: false, error: 'Animal not found or access denied' }
    }
    
    // Prepare update data
    const updateData = {
      ...animalData,
      updated_at: new Date().toISOString(),
    }
    
    // Remove undefined/null values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === '') {
        delete updateData[key]
      }
    })
    
    // Update the animal
    const { data, error } = await supabase
      .from('animals')
      .update(updateData)
      .eq('id', animalId)
      .eq('farm_id', farmId) // Double-check farm ownership
      .select(`
        *,
        mother:mother_id (
          id,
          tag_number,
          name
        ),
        father:father_id (
          id,
          tag_number,
          name
        )
      `)
      .single()
    
    if (error) {
      console.error('Error updating animal:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('Error in updateAnimal:', error)
    return { success: false, error: 'Failed to update animal' }
  }
}

// Release an animal with proper audit trail
export async function releaseAnimal(
  animalId: string,
  farmId: string,
  releaseData: {
    release_reason: 'sold' | 'died' | 'transferred' | 'culled' | 'other';
    release_date: string;
    sale_price?: number;
    buyer_info?: string;
    death_cause?: string;
    transfer_location?: string;
    notes: string;
  },
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Verify animal belongs to the farm and get complete data
    const { data: existingAnimal, error: fetchError } = await supabase
      .from('animals')
      .select(`
        *,
        mother:mother_id (
          id,
          tag_number,
          name,
          breed
        ),
        father:father_id (
          id,
          tag_number,
          name,
          breed
        )
      `)
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single()
    
    if (fetchError || !existingAnimal) {
      return { success: false, error: 'Animal not found or access denied' }
    }
    
    // Create release record for audit trail
    const { error: releaseRecordError } = await supabase
      .from('animal_releases')
      .insert({
        animal_id: animalId,
        farm_id: farmId,
        released_by: userId,
        release_reason: releaseData.release_reason,
        release_date: releaseData.release_date,
        sale_price: releaseData.sale_price || null,
        buyer_info: releaseData.buyer_info || null,
        death_cause: releaseData.death_cause || null,
        transfer_location: releaseData.transfer_location || null,
        notes: releaseData.notes,
        animal_data: existingAnimal, // Store complete animal data for records
      })
    
    if (releaseRecordError) {
      console.error('Error creating release record:', releaseRecordError)
      return { success: false, error: 'Failed to create release record' }
    }
    
    // Update animal status to released
    const { error: updateError } = await supabase
      .from('animals')
      .update({
        status: 'released',
        release_date: releaseData.release_date,
        release_reason: releaseData.release_reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', animalId)
    
    if (updateError) {
      console.error('Error updating animal status:', updateError)
      return { success: false, error: 'Failed to update animal status' }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error in releaseAnimal:', error)
    return { success: false, error: 'Failed to release animal' }
  }
}

/**
 * Get release information for an animal
 */
export async function getAnimalReleaseInfo(animalId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .from('animal_releases')
      .select(`
        *,
        released_by_user:released_by (
          user_metadata
        )
      `)
      .eq('animal_id', animalId)
      .eq('farm_id', farmId)
      .single()
    
    if (error) {
      console.error('Error fetching release info:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error in getAnimalReleaseInfo:', error)
    return null
  }
}

// Get released animals with release information
export async function getReleasedAnimals(
  farmId: string,
  options: {
    limit?: number;
    offset?: number;
    releaseReason?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
): Promise<any[]> {
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('animal_releases')
    .select(`
      *,
      released_by_user:released_by (
        user_metadata
      )
    `)
    .eq('farm_id', farmId)
    .order('release_date', { ascending: false })
  
  // Apply filters
  if (options.releaseReason) {
    query = query.eq('release_reason', options.releaseReason)
  }
  
  if (options.dateFrom) {
    query = query.gte('release_date', options.dateFrom)
  }
  
  if (options.dateTo) {
    query = query.lte('release_date', options.dateTo)
  }
  
  // Apply pagination
  if (options.limit) {
    query = query.limit(options.limit)
  }
  
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching released animals:', error)
    return []
  }
  
  return data || []
}

// Delete an animal (soft delete by changing status)
export async function deleteAnimal(animalId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { error } = await supabase
      .from('animals')
      .update({ 
        status: 'deceased',
        updated_at: new Date().toISOString()
      })
      .eq('id', animalId)
    
    if (error) {
      console.error('Error deleting animal:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
    
  } catch (error) {
    console.error('Error in deleteAnimal:', error)
    return { success: false, error: 'Failed to delete animal' }
  }
}

// Get comprehensive animal statistics
export async function getAnimalStats(farmId: string): Promise<AnimalStats> {
  const supabase = await createServerSupabaseClient()

  const { data: animals, error } = await supabase
    .from('animals')
    .select('gender, animal_source, production_status, health_status, birth_date, current_daily_production')
    .eq('farm_id', farmId)
    .eq('status', 'active')
  
  if (error) {
    console.error('Error fetching animal stats:', error)
    return {
      total: 0,
      female: 0,
      male: 0,
      bySource: { newborn_calves: 0, purchased: 0 },
      byProduction: { calves: 0, heifers: 0, served: 0, lactating: 0, dry: 0 },
      byHealth: { healthy: 0, needsAttention: 0 },
      averageAge: 0,
      averageProduction: 0
    }
  }
  
  const stats = {
    total: animals.length,
    female: animals.filter(a => a.gender === 'female').length,
    male: animals.filter(a => a.gender === 'male').length,
    
    bySource: {
      newborn_calves: animals.filter(a => a.animal_source === 'newborn_calf').length,
      purchased: animals.filter(a => a.animal_source === 'purchased_animal').length,
    },
    
    byProduction: {
      calves: animals.filter(a => a.production_status === 'calf').length,
      heifers: animals.filter(a => a.production_status === 'heifer').length,
      served: animals.filter(a => a.production_status === 'served').length,
      lactating: animals.filter(a => a.production_status === 'lactating').length,
      dry: animals.filter(a => a.production_status === 'dry').length,
    },
    
    byHealth: {
      healthy: animals.filter(a => a.health_status === 'healthy').length,
      needsAttention: animals.filter(a => a.health_status !== 'healthy').length,
    },
    
    averageAge: calculateAverageAge(animals),
    averageProduction: calculateAverageProduction(animals)
  }
  
  return stats
}

// Helper function to calculate average age
function calculateAverageAge(animals: any[]): number {
  const animalsWithBirthDate = animals.filter(a => a.birth_date)
  
  if (animalsWithBirthDate.length === 0) return 0
  
  const totalAgeInDays = animalsWithBirthDate.reduce((sum, animal) => {
    const birthDate = new Date(animal.birth_date)
    const today = new Date()
    const ageInDays = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24))
    return sum + ageInDays
  }, 0)
  
  return Math.round(totalAgeInDays / animalsWithBirthDate.length)
}

// Helper function to calculate average production
function calculateAverageProduction(animals: any[]): number {
  const lactatingAnimals = animals.filter(a => 
    a.production_status === 'lactating' && a.current_daily_production
  )
  
  if (lactatingAnimals.length === 0) return 0
  
  const totalProduction = lactatingAnimals.reduce((sum, animal) => {
    return sum + (animal.current_daily_production || 0)
  }, 0)
  
  return Math.round((totalProduction / lactatingAnimals.length) * 100) / 100
}

// Search animals with flexible criteria
// Updated functions with proper typing
export async function searchAnimals(
  farmId: string,
  searchTerm: string,
  filters: {
    animalSource?: string;
    productionStatus?: string;
    healthStatus?: string;
    gender?: string;
  } = {}
): Promise<Animal[]> {
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('animals')
    .select(`
      *,
      mother:mother_id (
        id,
        tag_number,
        name,
        breed
      )
    `)
    .eq('farm_id', farmId)
    .eq('status', 'active')
  
  // Apply search term
  if (searchTerm) {
    query = query.or(`tag_number.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,breed.ilike.%${searchTerm}%`)
  }
  
  // Apply filters
  if (filters.animalSource) {
    query = query.eq('animal_source', filters.animalSource)
  }
  
  if (filters.productionStatus) {
    query = query.eq('production_status', filters.productionStatus)
  }
  
  if (filters.healthStatus) {
    query = query.eq('health_status', filters.healthStatus)
  }
  
  if (filters.gender) {
    query = query.eq('gender', filters.gender)
  }
  
  query = query.order('tag_number', { ascending: true })
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error searching animals:', error)
    return []
  }
  
  return (data || []).map((item: any) => ({
    ...item,
    expected_calving_date: item.expected_calving_date ?? null,
    days_in_milk: item.days_in_milk ?? null,
    lactation_number: item.lactation_number ?? null,
    purchase_price: item.purchase_price ?? null,
    purchase_date: item.purchase_date ?? null,
    seller_info: item.seller_info ?? null,
    weight: item.weight ?? null,
    birth_weight: item.birth_weight ?? null,
    notes: item.notes ?? null,
    service_date: item.service_date ?? null,
    service_method: item.service_method ?? null,
    mother_production_info: item.mother_production_info ?? null,
    father_info: item.father_info ?? null,
    updated_at: item.updated_at ?? null,
  })) as Animal[]
}

// Get animals that need attention (health alerts, breeding reminders, etc.)
export async function getAnimalsNeedingAttention(farmId: string): Promise<Animal[]> {
  const supabase = await createServerSupabaseClient() // Remove await here
  
  const { data, error } = await supabase
    .from('animals')
    .select(`
      *,
      mother:mother_id (
        id,
        tag_number,
        name,
        breed
      )
    `)
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .or('health_status.neq.healthy,production_status.eq.served')
    .order('health_status', { ascending: false })
  
  if (error) {
    console.error('Error fetching animals needing attention:', error)
    return []
  }
  
  return (data || []).map((item: any) => ({
    ...item,
    expected_calving_date: item.expected_calving_date ?? null,
    days_in_milk: item.days_in_milk ?? null,
    lactation_number: item.lactation_number ?? null,
    purchase_price: item.purchase_price ?? null,
    purchase_date: item.purchase_date ?? null,
    seller_info: item.seller_info ?? null,
  })) as Animal[]
}

// Get animals by production status
export async function getAnimalsByProductionStatus(
  farmId: string, 
  productionStatus: string
): Promise<Animal[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('animals')
    .select(`
      *,
      mother:mother_id (
        id,
        tag_number,
        name,
        breed
      )
    `)
    .eq('farm_id', farmId)
    .eq('production_status', productionStatus)
    .eq('status', 'active')
    .order('tag_number', { ascending: true })
  
  if (error) {
    console.error('Error fetching animals by production status:', error)
    return []
  }
  
  return (data || []).map((item: any) => ({
    ...item,
    expected_calving_date: item.expected_calving_date ?? null,
    days_in_milk: item.days_in_milk ?? null,
    lactation_number: item.lactation_number ?? null,
    purchase_price: item.purchase_price ?? null,
    purchase_date: item.purchase_date ?? null,
    seller_info: item.seller_info ?? null,
    weight: item.weight ?? null,
    birth_weight: item.birth_weight ?? null,
    notes: item.notes ?? null,
    service_date: item.service_date ?? null,
    service_method: item.service_method ?? null,
    mother_production_info: item.mother_production_info ?? null,
    father_info: item.father_info ?? null,
    updated_at: item.updated_at ?? null,
  })) as Animal[]
}
// Get top performing animals based on production
export async function getTopPerformingAnimals(
  farmId: string, 
  limit: number = 10
): Promise<Animal[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('animals')
    .select(`
      *,
      mother:mother_id (
        id,
        tag_number,
        name,
        breed
      )
    `)
    .eq('farm_id', farmId)
    .eq('production_status', 'lactating')
    .eq('status', 'active')
    .not('current_daily_production', 'is', null)
    .order('current_daily_production', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching top performing animals:', error)
    return []
  }
  
  return (data || []).map((item: any) => ({
    ...item,
    expected_calving_date: item.expected_calving_date ?? null,
    days_in_milk: item.days_in_milk ?? null,
    lactation_number: item.lactation_number ?? null,
    purchase_price: item.purchase_price ?? null,
    purchase_date: item.purchase_date ?? null,
    seller_info: item.seller_info ?? null,
    weight: item.weight ?? null,
    birth_weight: item.birth_weight ?? null,
    notes: item.notes ?? null,
    service_date: item.service_date ?? null,
    service_method: item.service_method ?? null,
    mother_production_info: item.mother_production_info ?? null,
    father_info: item.father_info ?? null,
    updated_at: item.updated_at ?? null,
  })) as Animal[]
}

// Bulk update animals (for batch operations)
export async function bulkUpdateAnimals(
  animalIds: string[], 
  updateData: Partial<Animal>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    const { error } = await supabase
      .from('animals')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .in('id', animalIds)
    
    if (error) {
      console.error('Error bulk updating animals:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
    
  } catch (error) {
    console.error('Error in bulkUpdateAnimals:', error)
    return { success: false, error: 'Failed to update animals' }
  }
}

// Get animals due for breeding
export async function getAnimalsDueForBreeding(farmId: string): Promise<Animal[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('animals')
    .select(`
      *,
      mother:mother_id (
        id,
        tag_number,
        name,
        breed
      )
    `)
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .eq('gender', 'female')
    .in('production_status', ['heifer', 'dry'])
    .order('tag_number', { ascending: true })
  
  if (error) {
    console.error('Error fetching animals due for breeding:', error)
    return []
  }
  
  return (data || []).map((item: any) => ({
    ...item,
    expected_calving_date: item.expected_calving_date ?? null,
    days_in_milk: item.days_in_milk ?? null,
    lactation_number: item.lactation_number ?? null,
    purchase_price: item.purchase_price ?? null,
    purchase_date: item.purchase_date ?? null,
    seller_info: item.seller_info ?? null,
    weight: item.weight ?? null,
    birth_weight: item.birth_weight ?? null,
    notes: item.notes ?? null,
    service_date: item.service_date ?? null,
    service_method: item.service_method ?? null,
    mother_production_info: item.mother_production_info ?? null,
    father_info: item.father_info ?? null,
    updated_at: item.updated_at ?? null,
  })) as Animal[]
}

// Get animals approaching calving
export async function getAnimalsApproachingCalving(
  farmId: string, 
  daysAhead: number = 30
): Promise<Animal[]> {
  const supabase = await createServerSupabaseClient()

  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + daysAhead)
  
  const { data, error } = await supabase
    .from('animals')
    .select(`
      *,
      mother:mother_id (
        id,
        tag_number,
        name,
        breed
      )
    `)
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .eq('production_status', 'served')
    .not('expected_calving_date', 'is', null)
    .lte('expected_calving_date', targetDate.toISOString().split('T')[0])
    .order('expected_calving_date', { ascending: true })
  
  if (error) {
    console.error('Error fetching animals approaching calving:', error)
    return []
  }
  
  return (data || []).map((item: any) => ({
    ...item,
    expected_calving_date: item.expected_calving_date ?? null,
    days_in_milk: item.days_in_milk ?? null,
    lactation_number: item.lactation_number ?? null,
    purchase_price: item.purchase_price ?? null,
    purchase_date: item.purchase_date ?? null,
    seller_info: item.seller_info ?? null,
    weight: item.weight ?? null,
    birth_weight: item.birth_weight ?? null,
    notes: item.notes ?? null,
    service_date: item.service_date ?? null,
    service_method: item.service_method ?? null,
    mother_production_info: item.mother_production_info ?? null,
    father_info: item.father_info ?? null,
    updated_at: item.updated_at ?? null,
  })) as Animal[]
}

// Get release statistics for dashboard
export async function getReleaseStats(farmId: string): Promise<{
  totalReleased: number;
  byReason: Record<string, number>;
  thisMonth: number;
  thisYear: number;
  totalRevenue: number;
}> {
  const supabase = await createServerSupabaseClient()
  
  const { data: releases, error } = await supabase
    .from('animal_releases')
    .select('release_reason, release_date, sale_price')
    .eq('farm_id', farmId)
  
  if (error || !releases) {
    return {
      totalReleased: 0,
      byReason: {},
      thisMonth: 0,
      thisYear: 0,
      totalRevenue: 0
    }
  }
  
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  
  const stats = {
    totalReleased: releases.length,
    byReason: {} as Record<string, number>,
    thisMonth: 0,
    thisYear: 0,
    totalRevenue: 0
  }
  
  releases.forEach(release => {
    // Count by reason
    stats.byReason[release.release_reason] = (stats.byReason[release.release_reason] || 0) + 1
    
    // Count this month and year
    const releaseDate = new Date(release.release_date)
    if (releaseDate.getFullYear() === thisYear) {
      stats.thisYear++
      if (releaseDate.getMonth() === thisMonth) {
        stats.thisMonth++
      }
    }
    
    // Sum revenue from sales
    if (release.release_reason === 'sold' && release.sale_price) {
      stats.totalRevenue += release.sale_price
    }
  })
  
  return stats
}