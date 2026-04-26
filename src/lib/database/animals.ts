// src/lib/database/animals.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { 
  Animal, 
  AnimalInsert, 
  AnimalUpdate, 
  AnimalStats, 
  AvailableMother,
  ReleaseRecord,
  ReleaseFormData,
  NewbornCalfFormData,
  PurchasedAnimalFormData 
} from '@/types/database'

import { 
  calculateAgeDays, 
  getProductionStatusFromCategories 
} from '@/lib/utils/productionStatusUtils'

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
      ),
      father:father_id (
        id,
        tag_number,
        name,
        breed
      ),
      weights:animal_weight_records(weight_kg, weight_date, measurement_purpose)
        .order('weight_date', { ascending: false })
        .limit(1),
      lactation:lactation_cycle_records(
        lactation_number, 
        peak_yield_litres,
        total_yield_litres,
        status,
        start_date,
        expected_end_date
      )
        .order('created_at', { ascending: false })
        .limit(1),
      purchase:animal_purchases(
        id,
        purchase_date,
        purchase_price,
        farm_seller_name,
        farm_seller_contact,
        previous_farm_tag,
        dam_tag_at_origin,
        dam_name_at_origin,
        sire_tag_or_semen_code,
        sire_name_or_semen_source
      )
        .limit(1),
      latestService:service_records(
        id,
        service_number,
        service_date,
        service_type,
        bull_tag_or_semen_code,
        bull_name_or_semen_source,
        sire_id,
        expected_calving_date,
        service_cost
      )
        .order('service_date', { ascending: false })
        .limit(1),
      latestPregnancy:pregnancy_records(
        id,
        pregnancy_status,
        confirmed_date,
        expected_calving_date
      )
        .order('created_at', { ascending: false })
        .limit(1)
    `)
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })
  
  // Modified status filtering to include quarantined animals
  if (!options.includeInactive) {
    // Show both active and quarantined animals by default
    query = query.in('status', ['active', 'quarantined'])
  }
  
  // Rest of your filtering logic...
  if (options.animalSource) {
    query = (query as any).eq('animal_source', options.animalSource)
  }
  
  if (options.productionStatus) {
    query = (query as any).eq('production_status', options.productionStatus)
  }
  
  if (options.healthStatus) {
    query = (query as any).eq('health_status', options.healthStatus)
  }
  
  if (options.gender) {
    query = (query as any).eq('gender', options.gender)
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
    expected_calving_date: item.latestPregnancy?.[0]?.expected_calving_date ?? item.latestService?.[0]?.expected_calving_date ?? item.expected_calving_date ?? null,
    lactation_number: item.lactation?.[0]?.lactation_number ?? null,
    purchase_price: item.purchase?.[0]?.purchase_price ?? null,
    purchase_date: item.purchase?.[0]?.purchase_date ?? null,
    seller_info: item.purchase?.[0]?.farm_seller_name ?? null,
    seller_contact: item.purchase?.[0]?.farm_seller_contact ?? null,
    previous_farm_tag: item.purchase?.[0]?.previous_farm_tag ?? null,
    origin_dam_tag: item.purchase?.[0]?.dam_tag_at_origin ?? null,
    origin_dam_name: item.purchase?.[0]?.dam_name_at_origin ?? null,
    origin_sire_tag: item.purchase?.[0]?.sire_tag_or_semen_code ?? null,
    origin_sire_name: item.purchase?.[0]?.sire_name_or_semen_source ?? null,
    weight: item.weights?.[0]?.weight_kg ?? null,
    birth_weight: item.birth_weight ?? null,
    notes: item.notes ?? null,
    service_date: item.latestService?.[0]?.service_date ?? null,
    service_method: item.latestService?.[0]?.service_type ?? null,
    current_daily_production: item.lactation?.[0]?.peak_yield_litres ?? null,
  })) as Animal[]
}

// Get single animal by ID with all related data
export async function getAnimalById(animalId: string) {
  const supabase = await createServerSupabaseClient()
  
  // Query main animal data with FK relationships
  const { data, error } = await supabase
    .from('animals')
    .select(`
      *,
      mother:mother_id (
        id,
        tag_number,
        name,
        breed,
        birth_date
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
  
  if (!data) {
    console.warn('[getAnimalById] No data returned for animal:', animalId)
    return null
  }
  
  const typedData = data as any
  
  // ========== FETCH ALL RELATED DATA SEPARATELY ==========
  // This approach is more reliable than using PostgREST relation syntax
  
  // Fetch weight data
  const { data: weightData } = await supabase
    .from('animal_weight_records')
    .select('weight_kg, weight_date, measurement_purpose')
    .eq('animal_id', animalId)
    .order('weight_date', { ascending: false })
    .limit(1)
  
  // Fetch purchase data
  const { data: purchaseData } = await supabase
    .from('animal_purchases')
    .select('*')
    .eq('animal_id', animalId)
    .limit(1)
  
  // Fetch lactation data
  const { data: lactationData } = await supabase
    .from('lactation_cycle_records')
    .select('id, lactation_number, peak_yield_litres, total_yield_litres, status, start_date, expected_end_date, actual_end_date')
    .eq('animal_id', animalId)
    .order('created_at', { ascending: false })
    .limit(1)
  
  // Fetch service records
  const { data: serviceData } = await supabase
    .from('service_records')
    .select('id, service_number, service_date, service_type, bull_tag_or_semen_code, bull_name_or_semen_source, sire_id, expected_calving_date, service_cost')
    .eq('animal_id', animalId)
    .order('service_date', { ascending: false })
    .limit(1)
  
  // Fetch pregnancy records
  const { data: pregnancyData } = await supabase
    .from('pregnancy_records')
    .select('id, pregnancy_status, confirmed_date, expected_calving_date')
    .eq('animal_id', animalId)
    .order('created_at', { ascending: false })
    .limit(1)
  
  // Fetch calf records with dam info
  const { data: calfData } = await supabase
    .from('calf_records')
    .select(`
      id,
      birth_date,
      gender,
      birth_weight,
      weaning_date,
      weaning_weight,
      health_status,
      breed,
      sire_tag,
      sire_name,
      dam_id,
      dam:dam_id (id, tag_number, name)
    `)
    .eq('animal_id', animalId)
    .limit(1)
  
  // Fetch calving records
  const { data: calvingData } = await supabase
    .from('calving_records')
    .select('id, calving_date, calving_time, calving_difficulty, assistance_required, calf_alive, colostrum_quality, steaming_date, colostrum_produced, complications')
    .eq('mother_id', animalId)
    .order('calving_date', { ascending: false })
    .limit(1)
  
  // Fetch all calvings for history
  const { data: allCalvingsData } = await supabase
    .from('calving_records')
    .select('id, calving_date, calving_difficulty, assistance_required, calf_alive')
    .eq('mother_id', animalId)
    .order('calving_date', { ascending: false })
  
  // Fetch release records
  const { data: releaseData } = await supabase
    .from('animal_release_records')
    .select('id, release_date, release_reason, buyer_name, sale_price, death_cause, notes')
    .eq('animal_id', animalId)
    .order('release_date', { ascending: false })
    .limit(1)
  
  // Fetch breeding events
  const { data: breedingData } = await supabase
    .from('breeding_events')
    .select('id, event_type, event_date, heat_signs, heat_action_taken')
    .eq('animal_id', animalId)
    .order('event_date', { ascending: false })
    .limit(5)
  
  // ========== DEBUG LOGGING ==========
  console.log('[getAnimalById] === DEBUG START ===')
  console.log('[getAnimalById] Animal ID:', animalId)
  console.log('[getAnimalById] Tag/Name:', typedData.tag_number, typedData.name)
  console.log('[getAnimalById] Animal Source:', typedData.animal_source)
  console.log('[getAnimalById] Production Status:', typedData.production_status)
  
  console.log('[getAnimalById] --- PURCHASE DATA ---')
  console.log('[getAnimalById] Purchase data:', purchaseData)
  
  console.log('[getAnimalById] --- LACTATION DATA ---')
  console.log('[getAnimalById] Lactation data:', lactationData)
  
  console.log('[getAnimalById] --- WEIGHT DATA ---')
  console.log('[getAnimalById] Weight data:', weightData)
  
  console.log('[getAnimalById] === DEBUG END ===')
  // ========== END DEBUG LOGGING ==========
  
  // Map the data to extract weight and lactation info from joined tables
  // Calculate days_in_milk from lactation start_date
  const lactationStartDate = (lactationData as any)?.[0]?.start_date
  const daysInMilk = lactationStartDate 
    ? Math.floor((new Date().getTime() - new Date(lactationStartDate).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return {
    ...typedData,
    // Physical measurements
    weight: (weightData as any)?.[0]?.weight_kg ?? null,
    
    // Lactation cycle info
    lactation_number: (lactationData as any)?.[0]?.lactation_number ?? null,
    days_in_milk: daysInMilk ?? null,
    current_daily_production: (lactationData as any)?.[0]?.peak_yield_litres ?? null,
    lactation_start_date: (lactationData as any)?.[0]?.start_date ?? null,
    lactation_expected_end: (lactationData as any)?.[0]?.expected_end_date ?? null,
    
    // Purchase info (for bought animals)
    purchase_date: (purchaseData as any)?.[0]?.purchase_date ?? null,
    purchase_price: (purchaseData as any)?.[0]?.purchase_price ?? null,
    seller_info: (purchaseData as any)?.[0]?.farm_seller_name ?? null,
    seller_contact: (purchaseData as any)?.[0]?.farm_seller_contact ?? null,
    previous_farm_tag: (purchaseData as any)?.[0]?.previous_farm_tag ?? null,
    // Origin dam info (for purchased animals)
    origin_dam_tag: (purchaseData as any)?.[0]?.dam_tag_at_origin ?? null,
    origin_dam_name: (purchaseData as any)?.[0]?.dam_name_at_origin ?? null,
    // Origin sire info (for purchased animals - bull code/tag or semen source)
    origin_sire_tag: (purchaseData as any)?.[0]?.sire_tag_or_semen_code ?? null,
    origin_sire_name: (purchaseData as any)?.[0]?.sire_name_or_semen_source ?? null,
    
    // Latest breeding service
    service_date: (serviceData as any)?.[0]?.service_date ?? null,
    service_method: (serviceData as any)?.[0]?.service_type ?? null,
    
    // Expected calving (prioritize pregnancy record)
    expected_calving_date: 
      (pregnancyData as any)?.[0]?.expected_calving_date 
      ?? (serviceData as any)?.[0]?.expected_calving_date 
      ?? null,
    
    // Calf record info (for newborn calves) - extract dam and sire details
    calf_info: (calfData as any)?.[0] ? {
      ...(calfData as any)[0],
      // Dam (mother) info from FK relationship
      dam_tag_number: (calfData as any)[0]?.dam?.[0]?.tag_number ?? null,
      dam_name: (calfData as any)[0]?.dam?.[0]?.name ?? null,
      // Sire (father) info stored directly in calf_records
      sire_tag: (calfData as any)[0]?.sire_tag ?? null,
      sire_name: (calfData as any)[0]?.sire_name ?? null,
    } : null,
    
    // Latest calving history
    latest_calving: (calvingData as any)?.[0] ?? null,
    
    // All calvings (useful for timeline)
    calving_history: allCalvingsData ?? [],
    
    // Release/sale information
    release_info: (releaseData as any)?.[0] ?? null,
    
    // Timeline of breeding events
    breeding_events: breedingData ?? [],
  }
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
      .neq('status', 'deceased') // Don't check against deleted animals
    
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
    .in('production_status', ['lactating', 'steaming_dry_cows', 'open_culling_dry_cows', 'served'])
    .order('tag_number', { ascending: true })
  
  if (error) {
    console.error('Error fetching available mothers:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data || []) as any[]
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
    .in('production_status', ['lactating', 'steaming_dry_cows', 'open_culling_dry_cows', 'served'])
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
  
  // FIXED: Cast to any[]
  return (data || []) as any[]
}

export async function getEnhancedAnimalStats(farmId: string): Promise<AnimalStats> {
  const supabase = await createServerSupabaseClient()
  
  // Get all animals for statistics
  const { data: animalsData } = await supabase
    .from('animals')
    .select('animal_source, production_status, health_status, gender, birth_date')
    .eq('farm_id', farmId)
    .eq('status', 'active')
  
  // FIXED: Cast to any[] to fix the 'Property does not exist on type never' error
  const animals = (animalsData || []) as any[]
  
  if (!animals.length) {
    return {
      total: 0,
      female: 0,
      male: 0,
      bySource: { newborn_calves: 0, purchased: 0 },
      byProduction: { calves: 0, heifers: 0, bulls: 0, served: 0, lactating: 0, steaming_dry_cows: 0, open_culling_dry_cows: 0 },
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
      bulls: animals.filter(a => a.production_status === 'bull').length,
      served: animals.filter(a => a.production_status === 'served').length,
      lactating: animals.filter(a => a.production_status === 'lactating').length,
      steaming_dry_cows: animals.filter(a => a.production_status === 'steaming_dry_cows').length,
      open_culling_dry_cows: animals.filter(a => a.production_status === 'open_culling_dry_cows').length,
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
    
    // NOTE: purchase_date belongs in animal_purchases table, not animals table.
    // The route handler validates and inserts purchase data separately.

    // Prepare the data for insertion
    const insertData: AnimalInsert = {
      farm_id: farmId,
      tag_number: animalData.tag_number,
      name: animalData.name || null,
      breed: animalData.breed || null,
      gender: animalData.gender,
      birth_date: animalData.birth_date || null,
      status: animalData.status || 'active',
      notes: animalData.notes || null,
      animal_source: animalData.animal_source,
      
      // Newborn calf specific fields
      mother_id: animalData.mother_id || null,
      father_id: animalData.father_id || null,
      father_info: animalData.father_info || null,

      // Status fields
      health_status: animalData.health_status || 'healthy',
      production_status: animalData.production_status || 'calf',
      
      // Tag generation preference (defaults to true if not specified)
      auto_generate_tag: animalData.auto_generate_tag !== undefined ? animalData.auto_generate_tag : true,
    } as any
    
    // ✅ NOTE: DO NOT include these fields here - they belong in separate tables:
    // - birth_weight → calf_records table
    // - weight, purchase_weight, current_daily_production, days_in_milk → animal_weight_records table
    // - purchase_date, purchase_price, seller_info → animal_purchases table
    // - service_date, service_method, expected_calving_date → service_records table
    // - mother_production_info → calf_records table
    
    // FIXED: Cast to any to bypass 'never' type on insert
    const { data, error } = await (supabase
      .from('animals') as any)
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
    
    // ✅ DATE FIELDS that should accept null instead of empty strings
    const dateFields = [
      'birth_date',
      'purchase_date',
      'service_date',
      'expected_calving_date'
    ]
    
    // Prepare update data
    const updateData = {
      ...animalData,
      updated_at: new Date().toISOString(),
    }
    
    // ✅ FIXED: Convert empty strings to null for date fields, remove undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      } else if (updateData[key] === '' && dateFields.includes(key)) {
        // ✅ Convert empty string to null for date fields
        updateData[key] = null
      } else if (updateData[key] === '') {
        // For non-date fields, also convert empty string to null
        updateData[key] = null
      }
    })
    
    // 🔍 Log BEFORE update to see what we're sending
    console.log('🔍 [DB] Updating animal:', animalId, 'with data:', updateData)
    
    // Update the animal
    // FIXED: Cast to any to bypass 'never' type on update
    const { data, error } = await (supabase
      .from('animals') as any)
      .update(updateData)
      .eq('id', animalId)
      .eq('farm_id', farmId)
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
      console.error('❌ [DB] Error updating animal:', error)
      return { success: false, error: error.message }
    }

    // ✅ FIXED: Log the returned data (which has the ID)
    console.log('✅ [DB] Animal updated:', data.id, 'Weight:', data.weight)
    
    return { success: true, data }
  } catch (error) {
    console.error('❌ [DB] Error in updateAnimal:', error)
    return { success: false, error: 'Failed to update animal' }
  }
}

export async function updateAnimalProductionStatusByAge(
  animalId: string,
  farmId: string
): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Fetch the animal
    const { data: animalData, error: fetchError } = await supabase
      .from('animals')
      .select('id, birth_date, gender, production_status, health_status')
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single()
    
    // FIXED: Cast animalData to any
    const animal = animalData as any

    if (fetchError || !animal) {
      return { success: false, error: 'Animal not found' }
    }
    
    if (!animal.birth_date) {
      return { success: false, error: 'Animal has no birth date' }
    }
    
    // Don't auto-update if animal has health issues (optional - you may want to update anyway)
    if (animal.health_status && ['sick', 'quarantined'].includes(animal.health_status)) {
      console.log('Skipping production status update for animal with health issues')
      return { success: false, error: 'Animal has health issues - status not auto-updated' }
    }
    
    // Fetch animal categories
    const { data: categories } = await supabase
      .from('animal_categories')
      .select('*')
      .eq('farm_id', farmId)
      .order('sort_order', { ascending: true })
    
    // Calculate age and determine new production status
    const ageDays = animal.birth_date ? calculateAgeDays(animal.birth_date) : 0
    if (!animal.gender) {
      return { success: false, error: 'Animal gender is required' }
    }
    const newProductionStatus = getProductionStatusFromCategories(
      ageDays,
      animal.gender as 'male' | 'female',
      (categories || []).map((cat: any) => ({
            ...cat,
        min_age_days: cat.min_age_days ?? undefined,
        max_age_days: cat.max_age_days ?? undefined,
        gender: cat.gender ?? undefined,
        production_status: (cat.production_status as "calf" | "heifer" | "bull" | "served" | "lactating" | "dry" | null | undefined),
        characteristics: cat.characteristics ? {
          lactating: (cat.characteristics as any).lactating,
          pregnant: (cat.characteristics as any).pregnant,
          breeding_male: (cat.characteristics as any).breeding_male,
          growth_phase: (cat.characteristics as any).growth_phase
        } : {}
      }))
    )
    
    // Only update if status has changed
    if (newProductionStatus === animal.production_status) {
      return { 
        success: true, 
        data: animal,
        error: 'Production status already up to date' 
      }
    }
    
    // Update the animal
    // FIXED: Cast to any
    const { data: updatedAnimal, error: updateError } = await (supabase
      .from('animals') as any)
      .update({ 
        production_status: newProductionStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', animalId)
      .select()
      .single()
    
    if (updateError) {
      return { success: false, error: updateError.message }
    }
    
    return { 
      success: true, 
      data: updatedAnimal,
      message: `Production status updated from ${animal.production_status} to ${newProductionStatus}`
    }
    
  } catch (error) {
    console.error('Error updating production status:', error)
    return { success: false, error: 'Failed to update production status' }
  }
}

export async function bulkUpdateProductionStatusesByAge(
  farmId: string,
  options: {
    onlyOutdated?: boolean // Only update animals where status doesn't match
    excludeHealthIssues?: boolean // Skip animals with health issues
  } = {}
): Promise<{
  success: boolean
  updated: number
  skipped: number
  errors: number
  details?: any[]
}> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Fetch all active animals with birth dates
    let query = supabase
      .from('animals')
      .select('id, birth_date, gender, production_status, health_status, tag_number, name')
      .eq('farm_id', farmId)
      .eq('status', 'active')
      .not('birth_date', 'is', null)
    
    if (options.excludeHealthIssues) {
      query = query.not('health_status', 'in', '(sick,quarantined)')
    }
    
    const { data: animalsData, error: fetchError } = await query
    
    // FIXED: Cast to any[]
    const animals = (animalsData || []) as any[]
    
    if (fetchError || !animals) {
      return { success: false, updated: 0, skipped: 0, errors: 1 }
    }
    
    // Fetch animal categories
    const { data: categories } = await supabase
      .from('animal_categories')
      .select('*')
      .eq('farm_id', farmId)
      .order('sort_order', { ascending: true })
    
    let updated = 0
    let skipped = 0
    let errors = 0
    const details: any[] = []
    
    for (const animal of animals) {
      try {
        const ageDays = animal.birth_date ? calculateAgeDays(animal.birth_date) : 0
        if (!animal.gender || !['male', 'female'].includes(animal.gender)) {
          throw new Error('Invalid gender value')
        }
        const calculatedStatus = getProductionStatusFromCategories(
          ageDays,
          animal.gender as 'male' | 'female',
          (categories || []).map((cat: any) => ({
            ...cat,
            min_age_days: cat.min_age_days ?? undefined,
            max_age_days: cat.max_age_days ?? undefined,
            gender: cat.gender ?? undefined,
            production_status: (cat.production_status as "calf" | "heifer" | "bull" | "served" | "lactating" | "dry" | null | undefined),
            characteristics: cat.characteristics ? {
              lactating: (cat.characteristics as any).lactating,
              pregnant: (cat.characteristics as any).pregnant,
              breeding_male: (cat.characteristics as any).breeding_male,
              growth_phase: (cat.characteristics as any).growth_phase
            } : {}
          }))
        )
        
        if (calculatedStatus === animal.production_status) {
          skipped++
          continue
        }
        
        if (options.onlyOutdated && calculatedStatus === animal.production_status) {
          skipped++
          continue
        }
        
        // Update the animal
        // FIXED: Cast to any
        const { error: updateError } = await (supabase
          .from('animals') as any)
          .update({
            production_status: calculatedStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', animal.id)
        
        if (updateError) {
          errors++
          details.push({
            animal_id: animal.id,
            tag: animal.tag_number,
            error: updateError.message
          })
        } else {
          updated++
          details.push({
            animal_id: animal.id,
            tag: animal.tag_number,
            old_status: animal.production_status,
            new_status: calculatedStatus
          })
        }
      } catch (error) {
        errors++
        details.push({
          animal_id: animal.id,
          tag: animal.tag_number,
          error: 'Processing error'
        })
      }
    }
    
    return {
      success: true,
      updated,
      skipped,
      errors,
      details
    }
    
  } catch (error) {
    console.error('Error in bulk update:', error)
    return { success: false, updated: 0, skipped: 0, errors: 1 }
  }
}

export async function getAnimalsWithOutdatedProductionStatus(
  farmId: string
): Promise<Array<{
  animal: any
  current_status: string
  calculated_status: string
  age_days: number
}>> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Fetch all active animals with birth dates
    const { data: animalsData, error: fetchError } = await supabase
      .from('animals')
      .select('*')
      .eq('farm_id', farmId)
      .eq('status', 'active')
      .not('birth_date', 'is', null)
    
    // FIXED: Cast to any[]
    const animals = (animalsData || []) as any[]
    
    if (fetchError || !animals) {
      return []
    }
    
    // Fetch animal categories
    const { data: categories } = await supabase
      .from('animal_categories')
      .select('*')
      .eq('farm_id', farmId)
      .order('sort_order', { ascending: true })
    
    const outdated: any[] = []
    
    for (const animal of animals) {
      const ageDays = calculateAgeDays(animal.birth_date)
      const calculatedStatus = getProductionStatusFromCategories(
        ageDays,
        animal.gender as 'male' | 'female',
        (categories || []).map((cat: any) => ({
            ...cat,
          min_age_days: cat.min_age_days ?? undefined,
          max_age_days: cat.max_age_days ?? undefined,
          gender: cat.gender ?? undefined,
          production_status: (cat.production_status as "calf" | "heifer" | "bull" | "served" | "lactating" | "dry" | null | undefined),
          characteristics: cat.characteristics ? {
            lactating: (cat.characteristics as any).lactating,
            pregnant: (cat.characteristics as any).pregnant,
            breeding_male: (cat.characteristics as any).breeding_male,
            growth_phase: (cat.characteristics as any).growth_phase
          } : {}
        }))
      )
      
      if (calculatedStatus !== animal.production_status) {
        outdated.push({
          animal,
          current_status: animal.production_status,
          calculated_status: calculatedStatus,
          age_days: ageDays
        })
      }
    }
    
    return outdated
    
  } catch (error) {
    console.error('Error getting outdated statuses:', error)
    return []
  }
}

// Release an animal with proper audit trail
/**
 * Map release reason to animal status
 */
function mapReleaseReasonToStatus(reason: string): 'sold' | 'deceased' {
  switch (reason) {
    case 'sold':
      return 'sold'
    case 'died':
    case 'deceased':
      return 'deceased'
    case 'transferred':
    case 'culled':
    case 'retired':
    case 'other':
      // Transferred, culled, retired, and other reasons all result in 'sold' status
      // (animal is no longer in active herd but records are kept)
      return 'sold'
    default:
      return 'sold'
  }
}

export async function releaseAnimal(
  animalId: string,
  farmId: string,
  releaseData: {
    release_reason: 'sold' | 'deceased' | 'transferred' | 'culled' | 'retired' | 'other';
    release_date: string;
    sale_price?: number;
    buyer_name?: string;
    death_cause?: string;
    destination_farm?: string;
    notes: string;
  },
  userId: string
): Promise<{ success: boolean; error?: string; releaseId?: string }> {
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
    
    // Determine new status based on release reason
    const newStatus = mapReleaseReasonToStatus(releaseData.release_reason)
    
    // Create release record for audit trail
    const { data: releaseRecord, error: releaseRecordError } = await (supabase
      .from('animal_release_records') as any)
      .insert({
        animal_id: animalId,
        farm_id: farmId,
        created_by: userId,
        release_reason: releaseData.release_reason,
        release_date: releaseData.release_date,
        sale_price: releaseData.sale_price || null,
        buyer_name: releaseData.buyer_name || null,
        death_cause: releaseData.death_cause || null,
        destination_farm: releaseData.destination_farm || null,
        notes: releaseData.notes,
      })
      .select('id')
      .single()
    
    if (releaseRecordError) {
      console.error('Error creating release record:', releaseRecordError)
      return { success: false, error: 'Failed to create release record' }
    }
    
    // Update animal status
    const { error: updateError } = await (supabase
      .from('animals') as any)
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', animalId)
      .eq('farm_id', farmId)
    
    if (updateError) {
      console.error('Error updating animal status:', updateError)
      return { success: false, error: 'Failed to update animal status' }
    }
    
    return { success: true, releaseId: releaseRecord?.id }
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
      .from('animal_release_records')
      .select('*')
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
    .from('animal_release_records')
    .select('*')
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
    // FIXED: Cast to any
    const { error } = await (supabase
      .from('animals') as any)
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

  const { data: animalsData, error } = await supabase
    .from('animals')
    .select('gender, animal_source, production_status, health_status, birth_date')
    .eq('farm_id', farmId)
    .eq('status', 'active')
  
  // FIXED: Cast to any[] to bypass 'never' type error
  const animals = (animalsData || []) as any[]

  if (error || !animals.length) {
    return {
      total: 0,
      female: 0,
      male: 0,
      bySource: { newborn_calves: 0, purchased: 0 },
      byProduction: { 
        calves: 0, 
        heifers: 0, 
        bulls: 0,
        served: 0, 
        lactating: 0, 
        steaming_dry_cows: 0,
        open_culling_dry_cows: 0
      },
      byHealth: { healthy: 0, needsAttention: 0 }
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
      bulls: animals.filter(a => a.production_status === 'bull').length,
      served: animals.filter(a => a.production_status === 'served').length,
      lactating: animals.filter(a => a.production_status === 'lactating').length,
      steaming_dry_cows: animals.filter(a => a.production_status === 'steaming_dry_cows').length,
      open_culling_dry_cows: animals.filter(a => a.production_status === 'open_culling_dry_cows').length,
    },
    
    byHealth: {
      healthy: animals.filter(a => a.health_status === 'healthy').length,
      needsAttention: animals.filter(a => a.health_status !== 'healthy').length,
    },
    
    averageAge: calculateAverageAge(animals),
    milkingCows: animals.filter(a => a.production_status === 'lactating' || a.production_status === 'steaming_dry_cows').length,
    dryCows: animals.filter(a => a.production_status === 'open_culling_dry_cows').length
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
      ),
      weights:animal_weight_records(weight_kg, weight_date, measurement_purpose)
        .order('weight_date', { ascending: false })
        .limit(1),
      lactation:lactation_cycle_records(
        lactation_number,
        peak_yield_litres,
        total_yield_litres,
        days_in_milk,
        status
      )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
    `)
    .eq('farm_id', farmId)
    .eq('status', 'active')
  
  // Apply search term
  if (searchTerm) {
    query = query.or(`tag_number.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,breed.ilike.%${searchTerm}%`)
  }
  
  // Apply filters
  if (filters.animalSource) {
    query = (query as any).eq('animal_source', filters.animalSource)
  }
  
  if (filters.productionStatus) {
    query = (query as any).eq('production_status', filters.productionStatus)
  }
  
  if (filters.healthStatus) {
    query = (query as any).eq('health_status', filters.healthStatus)
  }
  
  if (filters.gender) {
    query = (query as any).eq('gender', filters.gender)
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
    days_in_milk: item.lactation?.[0]?.days_in_milk ?? item.days_in_milk ?? null,
    lactation_number: item.lactation?.[0]?.lactation_number ?? null,
    purchase_price: item.purchase_price ?? null,
    purchase_date: item.purchase_date ?? null,
    seller_info: item.seller_info ?? null,
    weight: item.weights?.[0]?.weight_kg ?? null,
    birth_weight: item.birth_weight ?? null,
    notes: item.notes ?? null,
    service_date: item.service_date ?? null,
    service_method: item.service_method ?? null,
    mother_production_info: item.mother_production_info ?? null,
    father_info: item.father_info ?? null,
    updated_at: item.updated_at ?? null,
    current_daily_production: item.lactation?.[0]?.peak_yield_litres ?? null,
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
      ),
      weights:animal_weight_records(weight_kg, weight_date, measurement_purpose)
        .order('weight_date', { ascending: false })
        .limit(1),
      lactation:lactation_cycle_records(
        lactation_number,
        peak_yield_litres,
        total_yield_litres,
        days_in_milk,
        status
      )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
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
    days_in_milk: item.lactation?.[0]?.days_in_milk ?? item.days_in_milk ?? null,
    lactation_number: item.lactation?.[0]?.lactation_number ?? null,
    purchase_price: item.purchase_price ?? null,
    purchase_date: item.purchase_date ?? null,
    seller_info: item.seller_info ?? null,
    weight: item.weights?.[0]?.weight_kg ?? null,
    birth_weight: item.birth_weight ?? null,
    notes: item.notes ?? null,
    service_date: item.service_date ?? null,
    service_method: item.service_method ?? null,
    mother_production_info: item.mother_production_info ?? null,
    father_info: item.father_info ?? null,
    updated_at: item.updated_at ?? null,
    current_daily_production: item.lactation?.[0]?.peak_yield_litres ?? null,
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
      ),
      weights:animal_weight_records(weight_kg, weight_date, measurement_purpose)
        .order('weight_date', { ascending: false })
        .limit(1),
      lactation:lactation_cycle_records(
        lactation_number,
        peak_yield_litres,
        total_yield_litres,
        days_in_milk,
        status
      )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
    `)
    .eq('farm_id', farmId)
    .eq('production_status', productionStatus as any)
    .eq('status', 'active')
    .order('tag_number', { ascending: true })
  
  if (error) {
    console.error('Error fetching animals by production status:', error)
    return []
  }
  
  return (data || []).map((item: any) => ({
    ...item,
    expected_calving_date: item.expected_calving_date ?? null,
    days_in_milk: item.lactation?.[0]?.days_in_milk ?? item.days_in_milk ?? null,
    lactation_number: item.lactation?.[0]?.lactation_number ?? null,
    purchase_price: item.purchase_price ?? null,
    purchase_date: item.purchase_date ?? null,
    seller_info: item.seller_info ?? null,
    weight: item.weights?.[0]?.weight_kg ?? null,
    birth_weight: item.birth_weight ?? null,
    notes: item.notes ?? null,
    service_date: item.service_date ?? null,
    service_method: item.service_method ?? null,
    mother_production_info: item.mother_production_info ?? null,
    father_info: item.father_info ?? null,
    updated_at: item.updated_at ?? null,
    current_daily_production: item.lactation?.[0]?.peak_yield_litres ?? null,
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
      ),
      weights:animal_weight_records(weight_kg, weight_date, measurement_purpose)
        .order('weight_date', { ascending: false })
        .limit(1),
      lactation:lactation_cycle_records(
        lactation_number,
        peak_yield_litres,
        total_yield_litres,
        days_in_milk,
        status
      )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
    `)
    .eq('farm_id', farmId)
    .eq('production_status', 'lactating')
    .eq('status', 'active')
    .order('lactation', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching top performing animals:', error)
    return []
  }
  
  return (data || []).map((item: any) => ({
    ...item,
    expected_calving_date: item.expected_calving_date ?? null,
    days_in_milk: item.lactation?.[0]?.days_in_milk ?? item.days_in_milk ?? null,
    lactation_number: item.lactation?.[0]?.lactation_number ?? null,
    purchase_price: item.purchase_price ?? null,
    purchase_date: item.purchase_date ?? null,
    seller_info: item.seller_info ?? null,
    weight: item.weights?.[0]?.weight_kg ?? null,
    birth_weight: item.birth_weight ?? null,
    notes: item.notes ?? null,
    service_date: item.service_date ?? null,
    service_method: item.service_method ?? null,
    mother_production_info: item.mother_production_info ?? null,
    father_info: item.father_info ?? null,
    updated_at: item.updated_at ?? null,
    current_daily_production: item.lactation?.[0]?.peak_yield_litres ?? null,
  })) as Animal[]
}

// Bulk update animals (for batch operations)
export async function bulkUpdateAnimals(
  animalIds: string[], 
  updateData: Partial<Animal>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  try {
    // FIXED: Cast to any
    const { error } = await (supabase
      .from('animals') as any)
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
      ),
      weights:animal_weight_records(weight_kg, weight_date, measurement_purpose)
        .order('weight_date', { ascending: false })
        .limit(1),
      lactation:lactation_cycle_records(
        lactation_number,
        peak_yield_litres,
        total_yield_litres,
        days_in_milk,
        status
      )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
    `)
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .eq('gender', 'female')
    .in('production_status', ['heifer', 'steaming_dry_cows', 'open_culling_dry_cows'])
    .order('tag_number', { ascending: true })
  
  if (error) {
    console.error('Error fetching animals due for breeding:', error)
    return []
  }
  
  return (data || []).map((item: any) => ({
    ...item,
    expected_calving_date: item.expected_calving_date ?? null,
    days_in_milk: item.lactation?.[0]?.days_in_milk ?? item.days_in_milk ?? null,
    lactation_number: item.lactation?.[0]?.lactation_number ?? null,
    purchase_price: item.purchase_price ?? null,
    purchase_date: item.purchase_date ?? null,
    seller_info: item.seller_info ?? null,
    weight: item.weights?.[0]?.weight_kg ?? null,
    birth_weight: item.birth_weight ?? null,
    notes: item.notes ?? null,
    service_date: item.service_date ?? null,
    service_method: item.service_method ?? null,
    mother_production_info: item.mother_production_info ?? null,
    father_info: item.father_info ?? null,
    updated_at: item.updated_at ?? null,
    current_daily_production: item.lactation?.[0]?.peak_yield_litres ?? null,
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
      ),
      weights:animal_weight_records(weight_kg, weight_date, measurement_purpose)
        .order('weight_date', { ascending: false })
        .limit(1),
      lactation:lactation_cycle_records(
        lactation_number,
        peak_yield_litres,
        total_yield_litres,
        days_in_milk,
        status
      )
        .order('created_at', { ascending: false })
        .limit(1)
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
    days_in_milk: item.lactation?.[0]?.days_in_milk ?? item.days_in_milk ?? null,
    lactation_number: item.lactation?.[0]?.lactation_number ?? null,
    purchase_price: item.purchase_price ?? null,
    purchase_date: item.purchase_date ?? null,
    seller_info: item.seller_info ?? null,
    weight: item.weights?.[0]?.weight_kg ?? null,
    birth_weight: item.birth_weight ?? null,
    notes: item.notes ?? null,
    service_date: item.service_date ?? null,
    service_method: item.service_method ?? null,
    mother_production_info: item.mother_production_info ?? null,
    father_info: item.father_info ?? null,
    updated_at: item.updated_at ?? null,
    current_daily_production: item.lactation?.[0]?.peak_yield_litres ?? null,
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
  
  const { data: releasesData, error } = await (supabase as any)
    .from('animal_release_records')
    .select('release_reason, release_date, sale_price')
    .eq('farm_id', farmId)
  
  const releases = (releasesData || []) as any[]

  if (error || !releases.length) {
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