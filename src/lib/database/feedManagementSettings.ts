// lib/database/feedManagementSettings.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Types
export interface FeedTypeCategory {
  id: string
  farm_id: string
  name: string
  description: string | null
  color: string | null
  is_default: boolean | null
  sort_order: number | null
  created_at: string | null
  updated_at: string | null
  feed_count?: number
}

export interface AnimalCategory {
  id: string
  farm_id: string
  name: string
  description: string | null
  min_age_days?: number | null
  max_age_days?: number | null
  gender?: string | null  // 'any' | 'male' | 'female'
  characteristics?: Record<string, any>  // Flexible for ranges, checkboxes, milking_schedules
  is_default: boolean | null
  sort_order: number | null
  production_status?: 'calf' | 'heifer' | 'bull' | 'served' | 'lactating' | 'dry' | 'steaming_dry_cows' | 'open_culling_dry_cows' | null
  production_statuses?: string[] // Support for multiple production statuses
  created_at: string | null
  updated_at: string | null
  matching_animals_count?: number  // Animals matching category criteria
  assigned_animals_count?: number  // Animals actually assigned to this category
}

export interface WeightConversion {
  id: string
  farm_id: string
  unit_name: string
  unit_symbol: string
  conversion_to_kg: number
  description: string | null
  is_default: boolean | null
  created_at: string | null
  updated_at: string | null
}

// Enhanced ConsumptionBatch interface
export interface ConsumptionBatch {
  id: string
  farm_id: string
  batch_name: string
  description: string | null
  animal_category_ids: string[] | null
  batch_factors: any
  default_quantity_kg: number | null
  feeding_frequency_per_day: number | null
  is_active: boolean | null
  is_preset: boolean | null
  created_at: string | null
  updated_at: string | null
  daily_consumption_per_animal_kg: number | null
  consumption_unit: string | null
  feeding_schedule: any
  feeding_times: string[] | null
  feed_type_categories: any
  target_mode: string | null // 'category' | 'specific' | 'mixed'
  targeted_animals_count?: number
  category_animals_count?: number
  specific_animals_count?: number
}

export interface ConsumptionBatchFactor {
  id: string
  farm_id: string
  factor_name: string
  factor_type: string
  description: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

// Animal interface for matching animals
export interface MatchingAnimal {
  id: string
  tag_number: string
  name: string | null
  gender: string | null
  birth_date: string | null
  production_status: string | null
  status: string
  days_in_milk: number | null
  current_daily_production: number | null
  current_average_production: number | null
  age_days: number | null
}

// Enhanced interfaces for batch animal targeting
export interface BatchTargetedAnimal {
  animal_id: string
  tag_number: string
  name: string | null
  gender: string | null
  birth_date: string | null
  production_status: string | null
  status: string
  days_in_milk: number | null
  current_daily_production: number | null
  age_days: number | null
  source: string // 'category' | 'specific'
  is_active: boolean
}

export interface AnimalBatchFactor {
  id?: string
  animal_id: string
  animal_tag: string
  factor_id: string
  factor_name: string
  factor_type: string
  factor_value: string
  is_active: boolean
}

export interface BatchFactorUpdate {
  animal_id: string
  factor_id: string
  factor_value: string
}

// ============ FEED TYPE CATEGORIES ============

export async function getFeedTypeCategories(farmId: string): Promise<FeedTypeCategory[]> {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('feed_type_categories')
    .select(`
      *,
      feed_count:feed_types(count)
    `)
    .eq('farm_id', farmId)
    .order('sort_order', { ascending: true })
  
  if (error) {
    console.error('Error fetching feed type categories:', error)
    return []
  }
  
  // FIXED: Cast data to any[] to avoid 'spread types' error
  return (data as any[])?.map(category => ({
    ...category,
    feed_count: category.feed_count?.[0]?.count || 0
  })) || []
}

export async function createFeedTypeCategory(
  farmId: string, 
  data: Omit<FeedTypeCategory, 'id' | 'farm_id' | 'created_at' | 'updated_at' | 'feed_count'>
) {
  const supabase = await createServerSupabaseClient()
  
  // Get the next sort order
  const { data: maxOrder } = await (supabase
    .from('feed_type_categories') as any)
    .select('sort_order')
    .eq('farm_id', farmId)
    .order('sort_order', { ascending: false })
    .limit(1)
  
  const nextOrder = (maxOrder?.[0]?.sort_order || 0) + 1
  
  // FIXED: Cast to any for insert
  const { data: category, error } = await (supabase
    .from('feed_type_categories') as any)
    .insert({
      ...data,
      farm_id: farmId,
      sort_order: nextOrder
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating feed type category:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data: category }
}

export async function updateFeedTypeCategory(
  categoryId: string,
  farmId: string,
  data: Partial<Omit<FeedTypeCategory, 'id' | 'farm_id' | 'created_at' | 'updated_at'>>
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: category, error } = await (supabase
    .from('feed_type_categories') as any)
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', categoryId)
    .eq('farm_id', farmId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating feed type category:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data: category }
}

export async function deleteFeedTypeCategory(categoryId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  // Check if category has feed types
  const { data: feedTypes } = await supabase
    .from('feed_types')
    .select('id')
    .eq('category_id', categoryId)
    .limit(1)
  
  if (feedTypes && feedTypes.length > 0) {
    // Remove category reference from feed types
    await (supabase
      .from('feed_types') as any)
      .update({ category_id: null })
      .eq('category_id', categoryId)
  }
  
  // FIXED: Cast to any for delete
  const { error } = await (supabase
    .from('feed_type_categories') as any)
    .delete()
    .eq('id', categoryId)
    .eq('farm_id', farmId)
  
  if (error) {
    console.error('Error deleting feed type category:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

export async function reorderFeedTypeCategory(
  categoryId: string,
  farmId: string,
  newSortOrder: number
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: category, error } = await (supabase
    .from('feed_type_categories') as any)
    .update({ sort_order: newSortOrder })
    .eq('id', categoryId)
    .eq('farm_id', farmId)
    .select()
    .single()
  
  if (error) {
    console.error('Error reordering feed type category:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data: category }
}

// ============ ANIMAL CATEGORIES ============

export async function getAnimalCategories(farmId: string): Promise<AnimalCategory[]> {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('animal_categories')
    .select('*')
    .eq('farm_id', farmId)
    .order('sort_order', { ascending: true })
    .then(({ data, error }) => ({
      // FIXED: Cast data to any[]
      data: (data as any[])?.map(category => ({
        ...category,
        characteristics: category.characteristics as {
          lactating?: boolean;
          pregnant?: boolean;
          breeding_male?: boolean;
          growth_phase?: boolean;
        } || {}
      })),
      error
    }))
  
  if (error) {
    console.error('Error fetching animal categories:', error)
    return []
  }
  
  // Get matching animals count and assigned animals count for each category
  const categoriesWithCounts = await Promise.all(
    (data || []).map(async (category) => {
      const validStatus = category.production_status === null || 
        ['calf', 'heifer', 'bull', 'served', 'lactating', 'dry', 'steaming_dry_cows', 'open_culling_dry_cows'].includes(category.production_status) 
        ? category.production_status as 'calf' | 'heifer' | 'bull' | 'served' | 'lactating' | 'dry' | 'steaming_dry_cows' | 'open_culling_dry_cows' | null
        : null;

      // Get matching animals count based on category criteria
      const matchingCount = await getMatchingAnimalsCount(farmId, category as AnimalCategory)
      
      // Get assigned animals count (actual assignments)
      const assignedCount = await getAssignedAnimalsCount(farmId, category.id)

      return {
        ...category,
        production_status: validStatus,
        matching_animals_count: matchingCount,
        assigned_animals_count: assignedCount
      }
    })
  )
  
  return categoriesWithCounts
}

export async function createAnimalCategory(
  farmId: string,
  data: Omit<AnimalCategory, 'id' | 'farm_id' | 'created_at' | 'updated_at' | 'matching_animals_count'>
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: maxOrder } = await (supabase
    .from('animal_categories') as any)
    .select('sort_order')
    .eq('farm_id', farmId)
    .order('sort_order', { ascending: false })
    .limit(1)
  
  const nextOrder = (maxOrder?.[0]?.sort_order || 0) + 1
  
  const { data: category, error } = await (supabase
    .from('animal_categories') as any)
    .insert({
      ...data,
      farm_id: farmId,
      sort_order: nextOrder,
      production_status: data.production_status || null,
      characteristics: data.characteristics || {}
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating animal category:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data: category }
}

export async function updateAnimalCategory(
  categoryId: string,
  farmId: string,
  data: Partial<Omit<AnimalCategory, 'id' | 'farm_id' | 'created_at' | 'updated_at' | 'matching_animals_count'>>
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: category, error } = await (supabase
    .from('animal_categories') as any)
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', categoryId)
    .eq('farm_id', farmId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating animal category:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data: category }
}

export async function deleteAnimalCategory(categoryId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  // FIXED: Cast to any for delete
  const { error } = await (supabase
    .from('animal_categories') as any)
    .delete()
    .eq('id', categoryId)
    .eq('farm_id', farmId)
  
  if (error) {
    console.error('Error deleting animal category:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

// ============ ANIMAL MATCHING FUNCTIONS ============

export async function getMatchingAnimalsCount(
  farmId: string, 
  category: AnimalCategory
): Promise<number> {
  try {
    // Use the full matching animals function and just count results
    const matchingAnimals = await getMatchingAnimals(farmId, category, 1000)
    return matchingAnimals.length
  } catch (error) {
    console.error('Error counting matching animals:', error)
    return 0
  }
}

/**
 * Get count of animals actually assigned to a category
 * (from animal_category_assignments table, where removed_at IS NULL)
 */
export async function getAssignedAnimalsCount(
  farmId: string,
  categoryId: string
): Promise<number> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { count, error } = await supabase
      .from('animal_category_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('category_id', categoryId)
      .is('removed_at', null)  // Only active assignments
    
    if (error) {
      console.error('Error counting assigned animals:', error)
      return 0
    }
    
    return count || 0
  } catch (error) {
    console.error('Error in getAssignedAnimalsCount:', error)
    return 0
  }
}

/**
 * Enhanced function to filter animals based on detailed characteristics.
 * This function retrieves animals and filters them based on:
 * - Basic attributes (gender, age, production_status)
 * - Lactation metrics (DIM, milk yield, lactation number)
 * - Pregnancy metrics (days pregnant, days to calving)
 * - Health characteristics (mastitis risk, treatment status, etc.)
 * - Body metrics (weight, body condition score)
 * - Breeding characteristics (services per conception, heat timing)
 * - Growth metrics (daily gain, age ranges)
 */
export async function getMatchingAnimals(
  farmId: string, 
  category: AnimalCategory,
  limit: number = 50
): Promise<MatchingAnimal[]> {
  const supabase = await createServerSupabaseClient()
  
  // Step 1: Get base animals matching basic filters
  let query = supabase
    .from('animals')
    .select(`
      id,
      tag_number,
      name,
      gender,
      birth_date,
      production_status,
      status
    `)
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .order('tag_number', { ascending: true })
    .limit(limit * 3) // Get more to filter later
  
  // Apply gender filter (skip 'any' gender)
  if (category.gender && category.gender !== 'any') {
    query = (query as any).eq('gender', category.gender as any)
  }
  
  // Apply age filters
  if (category.min_age_days || category.max_age_days) {
    const today = new Date()
    
    if (category.min_age_days) {
      const maxBirthDate = new Date(today.getTime() - category.min_age_days * 24 * 60 * 60 * 1000)
      query = query.lte('birth_date', maxBirthDate.toISOString().split('T')[0])
    }
    
    if (category.max_age_days) {
      const minBirthDate = new Date(today.getTime() - category.max_age_days * 24 * 60 * 60 * 1000)
      query = query.gte('birth_date', minBirthDate.toISOString().split('T')[0])
    }
  }
  
  // Apply production status filter if specified (support both single and multiple)
  const targetStatuses = (category as any).production_statuses && (category as any).production_statuses.length > 0
    ? (category as any).production_statuses
    : category.production_status 
      ? [category.production_status]
      : []
  
  if (targetStatuses.length > 0) {
    query = query.in('production_status', targetStatuses)
  } else if (category.characteristics) {
    // If no production_status, apply characteristic-based filters
    const hasCharacteristics = 
      category.characteristics.lactating ||
      category.characteristics.pregnant ||
      category.characteristics.breeding_male ||
      category.characteristics.growth_phase

    if (hasCharacteristics) {
      // Build list of applicable production statuses from characteristics
      const applicableStatuses: string[] = []
      
      if (category.characteristics.lactating) {
        applicableStatuses.push('lactating')
      }
      
      if (category.characteristics.pregnant) {
        applicableStatuses.push('served')
      }
      
      if (category.characteristics.growth_phase) {
        applicableStatuses.push('calf', 'heifer')
      }
      
      // Filter by applicable statuses (OR condition)
      if (applicableStatuses.length > 0) {
        query = (query as any).in('production_status', applicableStatuses as any)
      }
    }
  }
  
  // Handle breeding male constraint separately (overrides gender if both specified)
  if (category.characteristics?.breeding_male) {
    query = query.eq('gender', 'male')
  }
  
  const { data: baseAnimals, error } = await query
  
  if (error) {
    console.error('Error fetching matching animals:', error)
    return []
  }
  
  // Step 2: Fetch detailed data for characteristic filtering
  const animalIds = (baseAnimals as any[] || []).map(a => a.id)
  if (animalIds.length === 0) return []
  
  let filteredAnimals = baseAnimals as any[] || []
  const today = new Date()
  
  // Fetch lactation data upfront for all animals (needed for filtering and enrichment)
  let lactationMap = new Map()
  const { data: allLactationData } = await supabase
    .from('lactation_cycle_records')
    .select('animal_id, days_in_milk, peak_yield_litres, current_average_production, lactation_number')
    .in('animal_id', animalIds)
    .order('created_at', { ascending: false })
  
  ;(allLactationData as any[] || []).forEach(rec => {
    if (!lactationMap.has(rec.animal_id)) {
      lactationMap.set(rec.animal_id, rec)
    }
  })
  
  // Apply advanced characteristic filters
  if (category.characteristics) {
    const chars = category.characteristics
    
    // Filter by lactation characteristics (DIM, milk yield, lactation number)
    // Handle both flat (dim_range_min) and nested (dim_range: { min, max }) structures
    const dimRangeMin = chars.dim_range_min || chars.dim_range?.min
    const dimRangeMax = chars.dim_range_max || chars.dim_range?.max
    const yieldRangeMin = chars.milk_yield_range_min || chars.milk_yield_range?.min
    const yieldRangeMax = chars.milk_yield_range_max || chars.milk_yield_range?.max
    const lactNumMin = chars.lactation_number_range_min || chars.lactation_number_range?.min
    const lactNumMax = chars.lactation_number_range_max || chars.lactation_number_range?.max
    
    if (dimRangeMin || dimRangeMax || yieldRangeMin || yieldRangeMax || lactNumMin || lactNumMax) {
      
      filteredAnimals = filteredAnimals.filter(animal => {
        const lactRec = lactationMap.get(animal.id)
        if (!lactRec) return false
        
        if (dimRangeMin && (lactRec.days_in_milk || 0) < dimRangeMin) return false
        if (dimRangeMax && (lactRec.days_in_milk || 0) > dimRangeMax) return false
        
        // Use current_average_production for milk_yield_range (current daily production)
        // Falls back to peak_yield_litres if current_average_production not yet populated
        const yieldToCheck = lactRec.current_average_production || lactRec.peak_yield_litres || 0
        if (yieldRangeMin && yieldToCheck < yieldRangeMin) return false
        if (yieldRangeMax && yieldToCheck > yieldRangeMax) return false
        
        if (lactNumMin && (lactRec.lactation_number || 0) < lactNumMin) return false
        if (lactNumMax && (lactRec.lactation_number || 0) > lactNumMax) return false
        
        return true
      })
    }
    
    // Filter by pregnancy characteristics (days pregnant, days to calving)
    if (chars.days_pregnant_range_min || chars.days_pregnant_range_max ||
        chars.days_to_calving_range_min || chars.days_to_calving_range_max) {
      
      const { data: pregnancyData } = await supabase
        .from('pregnancy_records')
        .select('animal_id, expected_calving_date')
        .in('animal_id', animalIds)
        .not('expected_calving_date', 'is', null) // Get active pregnancies with a set calving date
      
      const pregnancyMap = new Map()
      ;(pregnancyData as any[] || []).forEach(rec => {
        if (!pregnancyMap.has(rec.animal_id)) {
          pregnancyMap.set(rec.animal_id, rec)
        }
      })
      
      filteredAnimals = filteredAnimals.filter(animal => {
        const pregRec = pregnancyMap.get(animal.id)
        if (!pregRec) return false
        
        if (pregRec.expected_calving_date) {
          const calvingDate = new Date(pregRec.expected_calving_date)
          const daysToCalving = Math.floor((calvingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          
          if (chars.days_to_calving_range_min && daysToCalving < chars.days_to_calving_range_min) return false
          if (chars.days_to_calving_range_max && daysToCalving > chars.days_to_calving_range_max) return false
        }
        
        return true
      })
    }
    
    // Filter by body metrics (weight, body condition score)
    if (chars.weight_kg_range_min || chars.weight_kg_range_max ||
        chars.body_condition_score_range_min || chars.body_condition_score_range_max) {
      
      const { data: weightData } = await supabase
        .from('animal_weight_records')
        .select('animal_id, weight_kg, body_condition_score')
        .in('animal_id', animalIds)
        .order('record_date', { ascending: false })
      
      const weightMap = new Map()
      ;(weightData as any[] || []).forEach(rec => {
        if (!weightMap.has(rec.animal_id)) {
          weightMap.set(rec.animal_id, rec)
        }
      })
      
      filteredAnimals = filteredAnimals.filter(animal => {
        const weightRec = weightMap.get(animal.id)
        if (!weightRec) return false
        
        if (chars.weight_kg_range_min && (weightRec.weight_kg || 0) < chars.weight_kg_range_min) return false
        if (chars.weight_kg_range_max && (weightRec.weight_kg || 0) > chars.weight_kg_range_max) return false
        
        if (chars.body_condition_score_range_min && (weightRec.body_condition_score || 0) < chars.body_condition_score_range_min) return false
        if (chars.body_condition_score_range_max && (weightRec.body_condition_score || 0) > chars.body_condition_score_range_max) return false
        
        return true
      })
    }
  }
  
  // Step 3: Calculate age in days and limit results, enriched with lactation data
  return filteredAnimals.slice(0, limit).map(animal => {
    const lactRec = lactationMap.get(animal.id)
    return {
      ...animal,
      status: animal.status || 'unknown',
      days_in_milk: lactRec?.days_in_milk || null,
      current_average_production: lactRec?.current_average_production || null,
      age_days: animal.birth_date 
        ? Math.floor((today.getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24))
        : null
    }
  })
}

/**
 * Get animals that are explicitly assigned to a category in the animal_category_assignments table
 * This is used for retrieving actual assigned animals (e.g., for milking groups)
 * Returns animals with enriched lactation data matching the MatchingAnimal interface
 */
export async function getAssignedAnimals(
  farmId: string,
  categoryId: string,
  limit: number = 100
): Promise<MatchingAnimal[]> {
  const supabase = await createServerSupabaseClient()
  
  // Step 1: Get all animals assigned to this category (active assignments only)
  const { data: assignments, error: assignmentError } = await supabase
    .from('animal_category_assignments')
    .select('animal_id')
    .eq('farm_id', farmId)
    .eq('category_id', categoryId)
    .is('removed_at', null)  // Only active assignments
    .order('assigned_at', { ascending: true })
    .limit(limit)
  
  if (assignmentError) {
    console.error('Error fetching category assignments:', assignmentError)
    return []
  }
  
  const animalIds = (assignments as any[]).map(a => a.animal_id)
  if (animalIds.length === 0) return []
  
  // Step 2: Get animal details from animals table
  const { data: animals, error: animalError } = await supabase
    .from('animals')
    .select(`
      id,
      tag_number,
      name,
      gender,
      birth_date,
      production_status,
      status
    `)
    .in('id', animalIds)
    .eq('status', 'active')
    .order('tag_number', { ascending: true })
  
  if (animalError) {
    console.error('Error fetching animal details:', animalError)
    return []
  }
  
  // Step 3: Enrich with lactation data
  let lactationMap = new Map()
  const { data: lactationData } = await supabase
    .from('lactation_cycle_records')
    .select('animal_id, days_in_milk, current_average_production, peak_yield_litres')
    .in('animal_id', animalIds)
    .order('created_at', { ascending: false })
  
  ;(lactationData as any[] || []).forEach(rec => {
    if (!lactationMap.has(rec.animal_id)) {
      lactationMap.set(rec.animal_id, rec)
    }
  })
  
  // Step 4: Format and return with enriched data
  const today = new Date()
  return ((animals as any[]) || []).map(animal => {
    const lactRec = lactationMap.get(animal.id)
    return {
      id: animal.id,
      tag_number: animal.tag_number,
      name: animal.name || null,
      gender: animal.gender || null,
      birth_date: animal.birth_date || null,
      production_status: animal.production_status || null,
      status: animal.status || 'unknown',
      days_in_milk: lactRec?.days_in_milk || null,
      current_daily_production: lactRec?.peak_yield_litres || null,
      current_average_production: lactRec?.current_average_production || null,
      age_days: animal.birth_date 
        ? Math.floor((today.getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24))
        : null
    }
  })
}

// ============ WEIGHT CONVERSIONS ============

export async function getWeightConversions(farmId: string): Promise<WeightConversion[]> {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('weight_conversions')
    .select('*')
    .eq('farm_id', farmId)
    .order('is_default', { ascending: false })
    .order('unit_name', { ascending: true })
  
  if (error) {
    console.error('Error fetching weight conversions:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data as any[]) || []
}

export async function createWeightConversion(
  farmId: string,
  data: Omit<WeightConversion, 'id' | 'farm_id' | 'created_at' | 'updated_at'>
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: conversion, error } = await (supabase
    .from('weight_conversions') as any)
    .insert({
      ...data,
      farm_id: farmId
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating weight conversion:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data: conversion }
}

export async function updateWeightConversion(
  conversionId: string,
  farmId: string,
  data: Partial<Omit<WeightConversion, 'id' | 'farm_id' | 'created_at' | 'updated_at'>>
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: conversion, error } = await (supabase
    .from('weight_conversions') as any)
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversionId)
    .eq('farm_id', farmId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating weight conversion:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data: conversion }
}

export async function deleteWeightConversion(conversionId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  // FIXED: Cast to any
  const { error } = await (supabase
    .from('weight_conversions') as any)
    .delete()
    .eq('id', conversionId)
    .eq('farm_id', farmId)
  
  if (error) {
    console.error('Error deleting weight conversion:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

// ============ ENHANCED CONSUMPTION BATCHES ============

export async function getConsumptionBatches(farmId: string): Promise<ConsumptionBatch[]> {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .from('consumption_batches')
      .select('*')
      .eq('farm_id', farmId)
      .eq('is_active', true)
      .order('batch_name', { ascending: true })
    
    if (error) {
      console.error('❌ Error fetching consumption batches:', error)
      return []
    }

    // Get animal counts for each batch
    const batchesWithCounts = await Promise.all(
      // FIXED: Cast data to any[]
      (data as any[] || []).map(async (batch) => {
        const animalCounts = await getBatchAnimalCounts(farmId, batch.id)
        return {
          ...batch,
          feed_type_categories: batch.feed_type_categories || [],
          feeding_times: batch.feeding_times || [],
          animal_category_ids: batch.animal_category_ids || [],
          targeted_animals_count: animalCounts.total,
          category_animals_count: animalCounts.fromCategories,
          specific_animals_count: animalCounts.fromSpecific
        }
      })
    )
    
    return batchesWithCounts
  } catch (err) {
    console.error('⚠️ Error in getConsumptionBatches:', err)
    return []
  }
}

export async function getBatchAnimalCounts(farmId: string, batchId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get the batch details first
    const { data: batch, error: batchError } = await (supabase
      .from('consumption_batches') as any)
      .select('animal_category_ids, target_mode')
      .eq('id', batchId)
      .eq('farm_id', farmId)
      .single()
    
    if (batchError) {
      console.error('Error getting batch details:', batchError)
      return { total: 0, fromCategories: 0, fromSpecific: 0 }
    }

    let fromCategories = 0
    let fromSpecific = 0

    // Count animals from categories
    if (batch?.animal_category_ids && batch.animal_category_ids.length > 0) {
      // For each category, we need to count matching animals
      for (const categoryId of batch.animal_category_ids) {
        // Get the category details
        const { data: categoryData, error: categoryError } = await supabase
          .from('animal_categories')
          .select('*')
          .eq('id', categoryId)
          .eq('farm_id', farmId)
          .single()

        if (categoryError || !categoryData) continue
        
        // FIXED: Cast to any
        const category = categoryData as any

        // Build query based on category criteria
        let animalQuery = supabase
          .from('animals')
          .select('id', { count: 'exact', head: true })
          .eq('farm_id', farmId)
          .eq('status', 'active')

        // Apply gender filter (skip 'any' gender)
        if (category.gender && category.gender !== 'any') {
          animalQuery = animalQuery.eq('gender', category.gender)
        }

        // Apply age filters
        if (category.min_age_days || category.max_age_days) {
          const today = new Date()
          
          if (category.min_age_days) {
            const maxBirthDate = new Date(today.getTime() - category.min_age_days * 24 * 60 * 60 * 1000)
            animalQuery = animalQuery.lte('birth_date', maxBirthDate.toISOString().split('T')[0])
          }
          
          if (category.max_age_days) {
            const minBirthDate = new Date(today.getTime() - category.max_age_days * 24 * 60 * 60 * 1000)
            animalQuery = animalQuery.gte('birth_date', minBirthDate.toISOString().split('T')[0])
          }
        }

        // Apply production status filter if specified
        if (category.production_status) {
          animalQuery = animalQuery.eq('production_status', category.production_status)
        } else if (category.characteristics && typeof category.characteristics === 'object' && !Array.isArray(category.characteristics)) {
          // Build applicable statuses from characteristics using OR logic
          const characteristics = category.characteristics as Record<string, any>
          const applicableStatuses: string[] = []
          
          if (characteristics.lactating) {
            applicableStatuses.push('lactating')
          }
          
          if (characteristics.pregnant) {
            applicableStatuses.push('served')
          }
          
          if (characteristics.growth_phase) {
            applicableStatuses.push('calf', 'heifer')
          }
          
          // Apply as single OR condition if we have multiple statuses
          if (applicableStatuses.length > 0) {
            animalQuery = (animalQuery as any).in('production_status', applicableStatuses as any)
          }
        }

        // Handle breeding male constraint separately (overrides gender if both specified)
        if (category.characteristics?.breeding_male) {
          animalQuery = (animalQuery as any).eq('gender', 'male' as any)
        }

        const { count, error: countError } = await animalQuery

        if (!countError && count) {
          fromCategories += count
        }
      }
    }

    // Count specific animals
    const { count: specificCount, error: specificError } = await ((supabase as any)
      .from('consumption_batch_animals')
      .select('animal_id', { count: 'exact', head: true })
      .eq('consumption_batch_id', batchId)
      .eq('is_active', true)) as any

    if (!specificError) {
      fromSpecific = specificCount || 0
    }

    return {
      total: fromCategories + fromSpecific,
      fromCategories,
      fromSpecific
    }
  } catch (error) {
    console.error('Error in getBatchAnimalCounts:', error)
    return { total: 0, fromCategories: 0, fromSpecific: 0 }
  }
}

export async function createConsumptionBatch(
  farmId: string,
  data: Omit<ConsumptionBatch, 'id' | 'farm_id' | 'created_at' | 'updated_at' | 'targeted_animals_count' | 'category_animals_count' | 'specific_animals_count'>
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: batch, error } = await (supabase
    .from('consumption_batches') as any)
    .insert({
      ...data,
      farm_id: farmId,
      target_mode: data.target_mode || 'category'
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating consumption batch:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data: batch }
}

export async function updateConsumptionBatch(
  batchId: string,
  farmId: string,
  data: Partial<Omit<ConsumptionBatch, 'id' | 'farm_id' | 'created_at' | 'updated_at' | 'targeted_animals_count' | 'category_animals_count' | 'specific_animals_count'>>
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: batch, error } = await (supabase
    .from('consumption_batches') as any)
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', batchId)
    .eq('farm_id', farmId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating consumption batch:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data: batch }
}

export async function deleteConsumptionBatch(batchId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  // FIXED: Cast to any
  const { error } = await (supabase
    .from('consumption_batches') as any)
    .delete()
    .eq('id', batchId)
    .eq('farm_id', farmId)
  
  if (error) {
    console.error('Error deleting consumption batch:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

// ============ BATCH ANIMAL TARGETING ============

export async function getBatchTargetedAnimals(farmId: string, batchId: string): Promise<BatchTargetedAnimal[]> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get the batch details first
    const { data: batch, error: batchError } = await (supabase
      .from('consumption_batches') as any)
      .select('animal_category_ids, target_mode')
      .eq('id', batchId)
      .eq('farm_id', farmId)
      .single()
    
    if (batchError) {
      console.error('Error getting batch details:', batchError)
      return []
    }

    const targetedAnimals: BatchTargetedAnimal[] = []
    const today = new Date()

    // Get animals from categories
    if (batch?.animal_category_ids && batch.animal_category_ids.length > 0) {
      for (const categoryId of batch.animal_category_ids) {
        // Get the category details
        const { data: categoryData, error: categoryError } = await supabase
          .from('animal_categories')
          .select('*')
          .eq('id', categoryId)
          .eq('farm_id', farmId)
          .single()

        if (categoryError || !categoryData) continue
        
        // FIXED: Cast to any
        const category = categoryData as any

        // Build query based on category criteria
        let animalQuery = supabase
          .from('animals')
          .select(`
            id,
            tag_number,
            name,
            gender,
            birth_date,
            production_status,
            status,
            days_in_milk,
            current_daily_production
          `)
          .eq('farm_id', farmId)
          .eq('status', 'active')
          .order('tag_number', { ascending: true })

        // Apply gender filter (skip 'any' gender)
        if (category.gender && category.gender !== 'any') {
          animalQuery = animalQuery.eq('gender', category.gender)
        }

        // Apply age filters
        if (category.min_age_days || category.max_age_days) {
          if (category.min_age_days) {
            const maxBirthDate = new Date(today.getTime() - category.min_age_days * 24 * 60 * 60 * 1000)
            animalQuery = animalQuery.lte('birth_date', maxBirthDate.toISOString().split('T')[0])
          }
          
          if (category.max_age_days) {
            const minBirthDate = new Date(today.getTime() - category.max_age_days * 24 * 60 * 60 * 1000)
            animalQuery = animalQuery.gte('birth_date', minBirthDate.toISOString().split('T')[0])
          }
        }

        // Apply production status filter if specified
        if (category.production_status) {
          animalQuery = animalQuery.eq('production_status', category.production_status)
        } else if (category.characteristics && typeof category.characteristics === 'object' && !Array.isArray(category.characteristics)) {
          // Build applicable statuses from characteristics using OR logic
          const characteristics = category.characteristics as Record<string, any>
          const applicableStatuses: string[] = []
          
          if (characteristics.lactating) {
            applicableStatuses.push('lactating')
          }
          
          if (characteristics.pregnant) {
            applicableStatuses.push('served')
          }
          
          if (characteristics.growth_phase) {
            applicableStatuses.push('calf', 'heifer')
          }
          
          // Apply as single OR condition if we have multiple statuses
          if (applicableStatuses.length > 0) {
            animalQuery = (animalQuery as any).in('production_status', applicableStatuses as any)
          }
        }

        // Handle breeding male constraint separately (overrides gender if both specified)
        if (category.characteristics?.breeding_male) {
          animalQuery = (animalQuery as any).eq('gender', 'male' as any)
        }

        const { data: categoryAnimalsData, error: animalsError } = await animalQuery
        
        // FIXED: Cast to any[]
        const categoryAnimals = (categoryAnimalsData as any[]) || []

        if (!animalsError && categoryAnimals) {
          categoryAnimals.forEach(animal => {
            targetedAnimals.push({
              animal_id: animal.id,
              tag_number: animal.tag_number,
              name: animal.name,
              gender: animal.gender,
              birth_date: animal.birth_date,
              production_status: animal.production_status,
              status: animal.status || 'unknown',
              days_in_milk: animal.days_in_milk,
              current_daily_production: animal.current_daily_production,
              age_days: animal.birth_date 
                ? Math.floor((today.getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24))
                : null,
              source: 'category',
              is_active: true
            })
          })
        }
      }
    }

    // Get specific animals assigned to batch
    const { data: specificAnimalsData, error: specificError } = await ((supabase as any)
      .from('consumption_batch_animals')
      .select(`
        animal_id,
        is_active,
        animals!inner(
          id,
          tag_number,
          name,
          gender,
          birth_date,
          production_status,
          status,
          days_in_milk,
          current_daily_production
        )
      `)
      .eq('consumption_batch_id', batchId)
      .eq('is_active', true)
      .eq('animals.status', 'active')) as any
    
    // FIXED: Cast to any[]
    const specificAnimals = (specificAnimalsData as any[]) || []

    if (!specificError && specificAnimals) {
      specificAnimals.forEach(item => {
        const animal = item.animals
        targetedAnimals.push({
          animal_id: animal.id,
          tag_number: animal.tag_number,
          name: animal.name,
          gender: animal.gender,
          birth_date: animal.birth_date,
          production_status: animal.production_status,
          status: animal.status || 'unknown',
          days_in_milk: animal.days_in_milk,
          current_daily_production: animal.current_daily_production,
          age_days: animal.birth_date 
            ? Math.floor((today.getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24))
            : null,
          source: 'specific',
          is_active: item.is_active ?? true
        })
      })
    }

    // Remove duplicates (in case an animal appears in both category and specific)
    const uniqueAnimals = targetedAnimals.reduce((acc, animal) => {
      const existing = acc.find(a => a.animal_id === animal.animal_id)
      if (!existing) {
        acc.push(animal)
      } else if (animal.source === 'specific' && existing.source === 'category') {
        // Prefer specific over category for the same animal
        existing.source = 'specific'
      }
      return acc
    }, [] as BatchTargetedAnimal[])

    return uniqueAnimals.sort((a, b) => a.tag_number.localeCompare(b.tag_number))
  } catch (error) {
    console.error('Error in getBatchTargetedAnimals:', error)
    return []
  }
}

export async function addAnimalToBatch(farmId: string, batchId: string, animalId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // First verify the animal belongs to the farm
    const { data: animal, error: animalError } = await supabase
      .from('animals')
      .select('id')
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single()
    
    if (animalError || !animal) {
      return { success: false, error: 'Animal not found or access denied' }
    }
    
    // Add animal to batch
    // FIXED: Cast to any
    const { data, error } = await ((supabase as any)
      .from('consumption_batch_animals')
      .insert({
        consumption_batch_id: batchId,
        animal_id: animalId,
        is_active: true
      })
      .select()
      .single()) as any
    
    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return { success: false, error: 'Animal is already in this batch' }
      }
      console.error('Error adding animal to batch:', error)
      return { success: false, error: error.message }
    }
    
    // Update batch target_mode to mixed or specific
    await updateBatchTargetMode(farmId, batchId)
    
    return { success: true, data }
  } catch (error) {
    console.error('Error in addAnimalToBatch:', error)
    return { success: false, error: 'Failed to add animal to batch' }
  }
}

export async function removeAnimalFromBatch(farmId: string, batchId: string, animalId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // FIXED: Cast to any
    const { error } = await ((supabase as any)
      .from('consumption_batch_animals')
      .delete()
      .eq('consumption_batch_id', batchId)
      .eq('animal_id', animalId)) as any
    
    if (error) {
      console.error('Error removing animal from batch:', error)
      return { success: false, error: error.message }
    }
    
    // Update batch target_mode
    await updateBatchTargetMode(farmId, batchId)
    
    return { success: true }
  } catch (error) {
    console.error('Error in removeAnimalFromBatch:', error)
    return { success: false, error: 'Failed to remove animal from batch' }
  }
}

export async function updateBatchTargetMode(farmId: string, batchId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get batch details
    const { data: batch } = await (supabase
      .from('consumption_batches') as any)
      .select('animal_category_ids')
      .eq('id', batchId)
      .eq('farm_id', farmId)
      .single()
    
    if (!batch) return
    
    // Count specific animals
    const { count: specificCount } = await ((supabase as any)
      .from('consumption_batch_animals')
      .select('id', { count: 'exact', head: true })
      .eq('consumption_batch_id', batchId)
      .eq('is_active', true)) as any
    
    const hasCategories = batch.animal_category_ids && batch.animal_category_ids.length > 0
    const hasSpecific = (specificCount || 0) > 0
    
    let targetMode = 'category'
    if (hasCategories && hasSpecific) {
      targetMode = 'mixed'
    } else if (hasSpecific) {
      targetMode = 'specific'
    }
    
    // Update batch target mode
    // FIXED: Cast to any
    await (supabase
      .from('consumption_batches') as any)
      .update({ target_mode: targetMode })
      .eq('id', batchId)
      .eq('farm_id', farmId)
    
  } catch (error) {
    console.error('Error updating batch target mode:', error)
  }
}

export async function getAvailableAnimalsForBatch(
  farmId: string,
  batchId?: string
): Promise<BatchTargetedAnimal[]> {
  const supabase = await createServerSupabaseClient()
  
  try {
    let query = supabase
      .from('animals')
      .select(`
        id,
        tag_number,
        name,
        gender,
        birth_date,
        production_status,
        status,
        days_in_milk,
        current_daily_production
      `)
      .eq('farm_id', farmId)
      .eq('status', 'active')
      .order('tag_number', { ascending: true })
    
    const { data: animalsData, error } = await query
    
    if (error) {
      console.error('Error fetching available animals:', error)
      return []
    }
    
    // FIXED: Cast to any[]
    const animals = (animalsData as any[]) || []

    // Calculate age and filter out animals already in the batch
    let availableAnimals = animals.map(animal => ({
      animal_id: animal.id,
      tag_number: animal.tag_number,
      name: animal.name,
      gender: animal.gender,
      birth_date: animal.birth_date,
      production_status: animal.production_status,
      status: animal.status || 'unknown',
      days_in_milk: animal.days_in_milk,
      current_daily_production: animal.current_daily_production,
      age_days: animal.birth_date 
        ? Math.floor((new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      source: 'available' as const,
      is_active: true
    }))
    
    // If we have a batch ID, filter out animals already in the batch
    if (batchId) {
      const { data: batchAnimals } = await ((supabase as any)
        .from('consumption_batch_animals')
        .select('animal_id')
        .eq('consumption_batch_id', batchId)
        .eq('is_active', true)) as any
      
      const batchAnimalIds = new Set(batchAnimals?.map((ba: any) => ba.animal_id) || [])
      availableAnimals = availableAnimals.filter(animal => !batchAnimalIds.has(animal.animal_id))
    }
    
    return availableAnimals
  } catch (error) {
    console.error('Error in getAvailableAnimalsForBatch:', error)
    return []
  }
}

// ============ ANIMAL BATCH FACTORS ============

export async function getAnimalBatchFactors(
  farmId: string, 
  batchId: string, 
  animalId?: string
): Promise<AnimalBatchFactor[]> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Build the query for animal batch factors
    let query = ((supabase as any)
      .from('consumption_batch_factors')
      .select(`
        id,
        animal_id,
        factor_id,
        factor_value,
        is_active
      `)
      .eq('farm_id', farmId)
      .eq('consumption_batch_id', batchId)
      .eq('is_active', true)) as any

    // Filter by specific animal if provided
    if (animalId) {
      query = query.eq('animal_id', animalId)
    }

    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching animal batch factors:', error)
      return []
    }
    
    // Transform the data to match the expected interface
    // FIXED: Cast to any[]
    const factors: AnimalBatchFactor[] = (data as any[] || []).map(item => ({
      id: item.id,
      animal_id: item.animal_id,
      animal_tag: '', // Will be populated from animal query if needed
      factor_id: item.factor_id,
      factor_name: '', // Field not available in consumption_batch_factors table
      factor_type: '', // Field not available in consumption_batch_factors table
      factor_value: item.factor_value,
      is_active: item.is_active ?? true
    }))
    
    // Sort by tag_number in JavaScript since we can't do it in the query with joins
    factors.sort((a, b) => {
      const tagA = a.animal_tag || ''
      const tagB = b.animal_tag || ''
      return tagA.localeCompare(tagB, undefined, { numeric: true, sensitivity: 'base' })
    })
    
    return factors
  } catch (error) {
    console.error('Error in getAnimalBatchFactors:', error)
    return []
  }
}

export async function updateAnimalBatchFactors(
  farmId: string,
  batchId: string,
  factorUpdates: BatchFactorUpdate[]
) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const results = await Promise.all(
      factorUpdates.map(async (update) => {
        // FIXED: Cast to any
    const { data, error } = await ((supabase as any)
      .from('consumption_batch_factors')
      .upsert({
        farm_id: farmId,
        consumption_batch_id: batchId,
        animal_id: update.animal_id,
        factor_id: update.factor_id,
        factor_value: update.factor_value,
        is_active: true
      }, {
        onConflict: 'animal_id,consumption_batch_id,factor_id'
      })
      .select()) as any
        if (error) {
          console.error('Error updating animal batch factor:', error)
          return { success: false, error: error.message }
        }
        
        return { success: true, data }
      })
    )
    
    const failedUpdates = results.filter(r => !r.success)
    if (failedUpdates.length > 0) {
      return { 
        success: false, 
        error: `Failed to update ${failedUpdates.length} factor(s)` 
      }
    }
    
    return { success: true, data: results }
  } catch (error) {
    console.error('Error in updateAnimalBatchFactors:', error)
    return { success: false, error: 'Failed to update animal batch factors' }
  }
}

export async function deleteAnimalBatchFactor(
  farmId: string,
  batchId: string,
  animalId: string,
  factorId: string
) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // FIXED: Cast to any
    const { error } = await ((supabase as any)
      .from('consumption_batch_factors')
      .delete()
      .eq('farm_id', farmId)
      .eq('consumption_batch_id', batchId)
      .eq('animal_id', animalId)
      .eq('factor_id', factorId)) as any
    
    if (error) {
      console.error('Error deleting animal batch factor:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error in deleteAnimalBatchFactor:', error)
    return { success: false, error: 'Failed to delete animal batch factor' }
  }
}

// ============ BATCH INSIGHTS ============

export async function getBatchInsights(farmId: string, batchId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get targeted animals
    const targetedAnimals = await getBatchTargetedAnimals(farmId, batchId)
    
    // Get batch factors
    const animalFactors = await getAnimalBatchFactors(farmId, batchId)
    
    // Calculate insights
    const insights = {
      totalAnimals: targetedAnimals.length,
      animalsBySource: {
        category: targetedAnimals.filter(a => a.source === 'category').length,
        specific: targetedAnimals.filter(a => a.source === 'specific').length
      },
      animalsByGender: {
        male: targetedAnimals.filter(a => a.gender === 'male').length,
        female: targetedAnimals.filter(a => a.gender === 'female').length,
        unknown: targetedAnimals.filter(a => !a.gender).length
      },
      animalsByProductionStatus: targetedAnimals.reduce((acc, animal) => {
        const status = animal.production_status || 'unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      averageAge: targetedAnimals.length > 0 
        ? Math.round(targetedAnimals
            .filter(a => a.age_days)
            .reduce((sum, a) => sum + (a.age_days || 0), 0) / 
          targetedAnimals.filter(a => a.age_days).length)
        : 0,
      averageDailyProduction: targetedAnimals.length > 0
        ? targetedAnimals
            .filter(a => a.current_daily_production)
            .reduce((sum, a) => sum + (a.current_daily_production || 0), 0) /
          targetedAnimals.filter(a => a.current_daily_production).length
        : 0,
      factorsCount: animalFactors.length,
      animalsWithFactors: new Set(animalFactors.map(f => f.animal_id)).size
    }
    
    return { success: true, data: insights }
  } catch (error) {
    console.error('Error getting batch insights:', error)
    return { success: false, error: 'Failed to get batch insights' }
  }
}

// ============ CONSUMPTION BATCH FACTORS ============

export async function getConsumptionBatchFactors(farmId: string): Promise<ConsumptionBatchFactor[]> {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('consumption_batch_factors')
    .select('*')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .order('factor_type', { ascending: true })
    .order('factor_name', { ascending: true })
  
  if (error) {
    console.error('Error fetching consumption batch factors:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data as any[]) || []
}

export async function createConsumptionBatchFactor(
  farmId: string,
  data: Omit<ConsumptionBatchFactor, 'id' | 'farm_id' | 'created_at' | 'updated_at'>
) {
  const supabase = await createServerSupabaseClient()
  
  // FIXED: Cast to any
  const { data: factor, error } = await (supabase
    .from('consumption_batch_factors') as any)
    .insert({
      ...data,
      farm_id: farmId
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating consumption batch factor:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data: factor }
}

// ============ INITIALIZATION ============

// lib/database/feedManagementSettings.ts

export async function initializeFarmFeedManagementSettings(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // If the RPC expects no arguments, call without params
    // FIXED: Cast to any for unregistered RPC function
    const { error } = await (supabase.rpc('setup_farm_feed_defaults' as any) as any)
    if (error) {
      console.error('Error initializing feed management settings:', {
        message: error.message,
        code: error.code,
        details: error.details
      })
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error) {
    console.error('Initialization Exception:', error)
    return { success: false, error: 'Failed to initialize settings' }
  }
}