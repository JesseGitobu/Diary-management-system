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
  characteristics: any
  is_default: boolean | null
  sort_order: number | null
  created_at: string | null
  updated_at: string | null
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
  
  return data?.map(category => ({
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
  const { data: maxOrder } = await supabase
    .from('feed_type_categories')
    .select('sort_order')
    .eq('farm_id', farmId)
    .order('sort_order', { ascending: false })
    .limit(1)
  
  const nextOrder = (maxOrder?.[0]?.sort_order || 0) + 1
  
  const { data: category, error } = await supabase
    .from('feed_type_categories')
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
  
  const { data: category, error } = await supabase
    .from('feed_type_categories')
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
    await supabase
      .from('feed_types')
      .update({ category_id: null })
      .eq('category_id', categoryId)
  }
  
  const { error } = await supabase
    .from('feed_type_categories')
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
  
  const { data: category, error } = await supabase
    .from('feed_type_categories')
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
  
  if (error) {
    console.error('Error fetching animal categories:', error)
    return []
  }
  
  return data || []
}

export async function createAnimalCategory(
  farmId: string,
  data: Omit<AnimalCategory, 'id' | 'farm_id' | 'created_at' | 'updated_at'>
) {
  const supabase = await createServerSupabaseClient()
  
  // Get the next sort order
  const { data: maxOrder } = await supabase
    .from('animal_categories')
    .select('sort_order')
    .eq('farm_id', farmId)
    .order('sort_order', { ascending: false })
    .limit(1)
  
  const nextOrder = (maxOrder?.[0]?.sort_order || 0) + 1
  
  const { data: category, error } = await supabase
    .from('animal_categories')
    .insert({
      ...data,
      farm_id: farmId,
      sort_order: nextOrder
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
  data: Partial<Omit<AnimalCategory, 'id' | 'farm_id' | 'created_at' | 'updated_at'>>
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: category, error } = await supabase
    .from('animal_categories')
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
  
  const { error } = await supabase
    .from('animal_categories')
    .delete()
    .eq('id', categoryId)
    .eq('farm_id', farmId)
  
  if (error) {
    console.error('Error deleting animal category:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
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
  
  return data || []
}

export async function createWeightConversion(
  farmId: string,
  data: Omit<WeightConversion, 'id' | 'farm_id' | 'created_at' | 'updated_at'>
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: conversion, error } = await supabase
    .from('weight_conversions')
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
  
  const { data: conversion, error } = await supabase
    .from('weight_conversions')
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
  
  const { error } = await supabase
    .from('weight_conversions')
    .delete()
    .eq('id', conversionId)
    .eq('farm_id', farmId)
  
  if (error) {
    console.error('Error deleting weight conversion:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

// ============ CONSUMPTION BATCHES ============

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
  
  return data?.map(batch => ({
    ...batch,
    feed_type_categories: batch.feed_type_categories || [], // Ensure always array
    feeding_times: batch.feeding_times || [], // Ensure always array
    animal_category_ids: batch.animal_category_ids || [] // Ensure always array
  })) || []
}

export async function createConsumptionBatch(
  farmId: string,
  data: Omit<ConsumptionBatch, 'id' | 'farm_id' | 'created_at' | 'updated_at'>
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: batch, error } = await supabase
    .from('consumption_batches')
    .insert({
      ...data,
      farm_id: farmId
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
  data: Partial<Omit<ConsumptionBatch, 'id' | 'farm_id' | 'created_at' | 'updated_at'>>
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: batch, error } = await supabase
    .from('consumption_batches')
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
  
  const { error } = await supabase
    .from('consumption_batches')
    .delete()
    .eq('id', batchId)
    .eq('farm_id', farmId)
  
  if (error) {
    console.error('Error deleting consumption batch:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
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
  
  return data || []
}

export async function createConsumptionBatchFactor(
  farmId: string,
  data: Omit<ConsumptionBatchFactor, 'id' | 'farm_id' | 'created_at' | 'updated_at'>
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: factor, error } = await supabase
    .from('consumption_batch_factors')
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

export async function initializeFarmFeedManagementSettings(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Call the database function to insert defaults
    const { error } = await supabase.rpc('insert_default_feed_management_data', {
      p_farm_id: farmId
    })
    
    if (error) {
      console.error('Error initializing feed management settings:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error initializing feed management settings:', error)
    return { success: false, error: 'Failed to initialize settings' }
  }
}