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
  gender?: string | null  // Added gender field
  characteristics: {
    lactating?: boolean
    pregnant?: boolean
    breeding_male?: boolean
    growth_phase?: boolean
  }
  is_default: boolean | null
  sort_order: number | null
  production_status?: 'calf' | 'heifer' | 'bull' | 'served' | 'lactating' | 'dry'| null
  created_at: string | null
  updated_at: string | null
  matching_animals_count?: number  // Added for displaying count
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
  
  // Get matching animals count for each category
  const categoriesWithCounts = await Promise.all(
    (data || []).map(async (category) => {
      const validStatus = category.production_status === null || 
        ['calf', 'heifer', 'bull', 'served', 'lactating', 'dry'].includes(category.production_status) 
        ? category.production_status as 'calf' | 'heifer' | 'bull' | 'served' | 'lactating' | 'dry' | null
        : null;

      const matchingCount = await getMatchingAnimalsCount(farmId, {
        ...category,
        production_status: validStatus,
        characteristics: category.characteristics as {
          lactating?: boolean;
          pregnant?: boolean;
          breeding_male?: boolean;
          growth_phase?: boolean;
        }
      })
      return {
        ...category,
        production_status: validStatus,
        matching_animals_count: matchingCount
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
  
  // Validate production_status if provided
  const validStatuses = ['calf', 'heifer', 'served', 'lactating', 'dry']
  if (data.production_status && !validStatuses.includes(data.production_status)) {
    return { 
      success: false, 
      error: 'Invalid production status. Must be one of: calf, heifer, served, lactating, dry' 
    }
  }
  
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
      production_status: data.production_status || null  // ← Save production status
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
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('animals')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .eq('status', 'active')
  
  // Apply gender filter
  if (category.gender) {
    query = query.eq('gender', category.gender)
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
  
  // Apply characteristic filters
  if (category.characteristics) {
    if (category.characteristics.lactating) {
      query = query.eq('production_status', 'lactating')
    }
    
    if (category.characteristics.pregnant) {
      query = query.eq('production_status', 'served')
    }
    
    if (category.characteristics.breeding_male) {
      query = query.eq('gender', 'male')
    }
    
    if (category.characteristics.growth_phase) {
      query = query.in('production_status', ['calf', 'heifer'])
    }
  }
  
  const { count, error } = await query
  
  if (error) {
    console.error('Error counting matching animals:', error)
    return 0
  }
  
  return count || 0
}

export async function getMatchingAnimals(
  farmId: string, 
  category: AnimalCategory,
  limit: number = 50
): Promise<MatchingAnimal[]> {
  const supabase = await createServerSupabaseClient()
  
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
    .limit(limit)
  
  // Apply gender filter
  if (category.gender) {
    query = query.eq('gender', category.gender)
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
  
  // Apply characteristic filters
  if (category.characteristics) {
    if (category.characteristics.lactating) {
      query = query.eq('production_status', 'lactating')
    }
    
    if (category.characteristics.pregnant) {
      query = query.eq('production_status', 'served')
    }
    
    if (category.characteristics.breeding_male) {
      query = query.eq('gender', 'male')
    }
    
    if (category.characteristics.growth_phase) {
      query = query.in('production_status', ['calf', 'heifer'])
    }
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching matching animals:', error)
    return []
  }
  
  // Calculate age in days for each animal
  const today = new Date()
  // FIXED: Cast data to any[]
  return (data as any[] || []).map(animal => ({
    ...animal,
    status: animal.status || 'unknown',
    age_days: animal.birth_date 
      ? Math.floor((today.getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24))
      : null
  }))
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
  
  const { data, error } = await supabase
    .from('consumption_batches')
    .select('*')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .order('is_preset', { ascending: false })
    .order('batch_name', { ascending: true })
  
  if (error) {
    console.error('Error fetching consumption batches:', error)
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

        // Apply gender filter
        if (category.gender) {
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

        // Apply characteristic filters
        if (category.characteristics && typeof category.characteristics === 'object' && !Array.isArray(category.characteristics)) {
          const characteristics = category.characteristics as Record<string, any>
          
          if (characteristics.lactating) {
            animalQuery = animalQuery.eq('production_status', 'lactating')
          }
          
          if (characteristics.pregnant) {
            animalQuery = animalQuery.eq('production_status', 'served')
          }
          
          if (characteristics.breeding_male) {
            animalQuery = animalQuery.eq('gender', 'male')
          }
          
          if (characteristics.growth_phase) {
            animalQuery = animalQuery.in('production_status', ['calf', 'heifer'])
          }
        }

        const { count, error: countError } = await animalQuery

        if (!countError && count) {
          fromCategories += count
        }
      }
    }

    // Count specific animals
    const { count: specificCount, error: specificError } = await supabase
      .from('consumption_batch_animals')
      .select('animal_id', { count: 'exact', head: true })
      .eq('consumption_batch_id', batchId)
      .eq('is_active', true)

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

        // Apply gender filter
        if (category.gender) {
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

        // Apply characteristic filters
        if (category.characteristics && typeof category.characteristics === 'object' && !Array.isArray(category.characteristics)) {
          const characteristics = category.characteristics as Record<string, any>
          
          if (characteristics.lactating) {
            animalQuery = animalQuery.eq('production_status', 'lactating')
          }
          
          if (characteristics.pregnant) {
            animalQuery = animalQuery.eq('production_status', 'served')
          }
          
          if (characteristics.breeding_male) {
            animalQuery = animalQuery.eq('gender', 'male')
          }
          
          if (characteristics.growth_phase) {
            animalQuery = animalQuery.in('production_status', ['calf', 'heifer'])
          }
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
    const { data: specificAnimalsData, error: specificError } = await supabase
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
      .eq('animals.status', 'active')
    
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
    const { data, error } = await (supabase
      .from('consumption_batch_animals') as any)
      .insert({
        consumption_batch_id: batchId,
        animal_id: animalId,
        is_active: true
      })
      .select()
      .single()
    
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
    const { error } = await (supabase
      .from('consumption_batch_animals') as any)
      .delete()
      .eq('consumption_batch_id', batchId)
      .eq('animal_id', animalId)
    
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
    const { count: specificCount } = await supabase
      .from('consumption_batch_animals')
      .select('id', { count: 'exact', head: true })
      .eq('consumption_batch_id', batchId)
      .eq('is_active', true)
    
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
      const { data: batchAnimals } = await supabase
        .from('consumption_batch_animals')
        .select('animal_id')
        .eq('consumption_batch_id', batchId)
        .eq('is_active', true)
      
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
    let query = supabase
      .from('animal_batch_factors')
      .select(`
        id,
        animal_id,
        factor_id,
        factor_value,
        is_active,
        animals!inner(
          tag_number
        ),
        consumption_batch_factors!inner(
          factor_name,
          factor_type
        )
      `)
      .eq('farm_id', farmId)
      .eq('consumption_batch_id', batchId)
      .eq('is_active', true)

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
      animal_tag: item.animals.tag_number,
      factor_id: item.factor_id,
      factor_name: item.consumption_batch_factors.factor_name,
      factor_type: item.consumption_batch_factors.factor_type,
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
        const { data, error } = await (supabase
          .from('animal_batch_factors') as any)
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
          .select()
        
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
    const { error } = await (supabase
      .from('animal_batch_factors') as any)
      .delete()
      .eq('farm_id', farmId)
      .eq('consumption_batch_id', batchId)
      .eq('animal_id', animalId)
      .eq('factor_id', factorId)
    
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
    const { error } = await supabase.rpc('setup_farm_feed_defaults')
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