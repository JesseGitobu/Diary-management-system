// lib/database/animalFeedingRecords.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface AnimalFeedingRecord {
  id: string
  animal_id: string
  feeding_time: string
  feed_type_id: string
  feed_name: string
  quantity_kg: number
  cost_per_kg?: number
  total_cost?: number
  feeding_mode: 'individual' | 'ration' | 'feed-mix-recipe'
  animal_count?: number
  notes?: string
  recorded_by?: string
  batch_name?: string
  created_at: string | null
  updated_at: string | null
}

export interface FarmFeedingSchedule {
  id: string
  name: string
  description: string
  feed_mix: any
  target_animals: any
  schedule_times: any
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AnimalNutritionTargets {
  id?: string
  farm_id: string
  animal_id: string
  daily_dry_matter_kg: number
  daily_protein_kg: number
  daily_energy_mj: number
  target_weight_gain_kg_per_day?: number
  milk_production_target_liters?: number
  created_at?: string
  updated_at?: string
}

// Get feeding records for a specific animal
export async function getAnimalFeedingRecords(
  farmId: string,
  animalId: string,
  limit: number = 50
) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get feeding records where this animal was involved
    const { data: records, error } = await supabase
      .from('feed_consumption_records')
      .select(`
        id,
        feed_type_id,
        quantity_consumed,
        consumption_date,
        animal_count,
        notes,
        recorded_by,
        created_at,
        updated_at,
        feed_types!inner (
          id,
          name,
          typical_cost_per_kg
        ),
        feed_consumption_animals!inner (
          animal_id
        )
      `)
      .eq('farm_id', farmId)
      .eq('feed_consumption_animals.animal_id', animalId)
      .order('feeding_time', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching feeding records:', error)
      return { success: false, error: error.message, data: [] }
    }

    // Transform the data to match expected format
    // FIXED: Cast records to any[] to bypass 'never' type inference
    const transformedRecords: AnimalFeedingRecord[] = (records as any[] || []).map(record => {
      const costPerKg = record.feed_types?.typical_cost_per_kg || 0
      const totalCost = record.quantity_kg * costPerKg

      // Extract batch info from notes if present
      let batch_name = null
      let cleaned_notes = record.notes
      
      if (record.notes && record.notes.includes('Batch feeding:')) {
        const batchMatch = record.notes.match(/Batch feeding: ([^-]+)/)
        if (batchMatch) {
          batch_name = batchMatch[1].trim()
          // Remove batch info from notes for display
          cleaned_notes = record.notes.replace(/Batch feeding: [^-]+ - /, '')
        }
      }

      return {
        id: record.id,
        animal_id: animalId,
        feeding_time: record.feeding_time,
        feed_type_id: record.feed_type_id,
        feed_name: record.feed_types?.name || 'Unknown Feed',
        quantity_kg: record.quantity_kg,
        cost_per_kg: costPerKg,
        total_cost: totalCost,
        feeding_mode: record.feeding_mode as 'individual' | 'ration' | 'feed-mix-recipe',
        animal_count: record.animal_count,
        notes: cleaned_notes || undefined,
        recorded_by: record.recorded_by || undefined,
        batch_name: batch_name || undefined,
        consumption_batch_id: undefined, // Not available in current schema
        created_at: record.created_at,
        updated_at: record.updated_at
      }
    })

    return { success: true, data: transformedRecords }

  } catch (error) {
    console.error('Error in getAnimalFeedingRecords:', error)
    return { 
      success: false, 
      error: 'Failed to fetch feeding records', 
      data: [] 
    }
  }
}

// Get farm feeding schedules that might affect an animal
export async function getFarmFeedingSchedulesForAnimal(
  farmId: string,
  animalId: string
) {
  try {
    const supabase = await createServerSupabaseClient()
    const today = new Date().toISOString().split('T')[0]

    // Fetch pending schedules for this farm that are currently active by date range
    const { data: schedules, error } = await supabase
      .from('scheduled_feedings')
      .select(`
        id,
        schedule_name,
        feeding_time,
        feed_type_id,
        quantity_kg,
        target_mode,
        schedule_date_from,
        schedule_date_to,
        status,
        animal_id,
        feed_types (
          id,
          name
        ),
        scheduled_feeding_entries (
          id,
          feed_type_id,
          quantity_kg_per_animal,
          feed_types (
            id,
            name
          )
        )
      `)
      .eq('farm_id', farmId)
      .eq('status', 'pending')
      .lte('schedule_date_from', today)
      .gte('schedule_date_to', today)

    if (error) {
      console.error('Error fetching feeding schedules:', error)
      return { success: false, error: error.message, data: [] }
    }

    const allSchedules = (schedules as any[]) || []

    // For 'specific' target_mode schedules, check junction table
    const specificIds = allSchedules
      .filter(s => s.target_mode === 'specific')
      .map(s => s.id)

    let animalSpecificScheduleIds: string[] = []
    if (specificIds.length > 0) {
      const { data: animalLinks } = await supabase
        .from('scheduled_feeding_animals')
        .select('scheduled_feeding_id')
        .in('scheduled_feeding_id', specificIds)
        .eq('animal_id', animalId)

      animalSpecificScheduleIds = (animalLinks || []).map((row: any) => row.scheduled_feeding_id)
    }

    // Include schedule if: targets all animals, directly targets this animal, or
    // is 'specific' mode and this animal is in the junction table
    const relevantSchedules = allSchedules.filter(schedule => {
      if (schedule.target_mode === 'all') return true
      if (schedule.animal_id === animalId) return true
      if (schedule.target_mode === 'specific' && animalSpecificScheduleIds.includes(schedule.id)) return true
      return false
    })

    const transformedSchedules = relevantSchedules.map(schedule => {
      const entries = (schedule.scheduled_feeding_entries || []) as any[]
      const primaryEntry = entries[0]
      const feedTypeId = schedule.feed_type_id || primaryEntry?.feed_type_id || ''
      const feedName = schedule.schedule_name || (schedule.feed_types as any)?.name || (primaryEntry?.feed_types as any)?.name || 'Unknown Feed'
      const quantityKg = schedule.quantity_kg || primaryEntry?.quantity_kg_per_animal || 0

      return {
        id: schedule.id,
        animal_id: animalId,
        feed_type_id: feedTypeId,
        feed_name: feedName,
        scheduled_time: schedule.feeding_time || '07:00',
        quantity_kg: quantityKg,
        frequency: 'daily',
        start_date: schedule.schedule_date_from,
        end_date: schedule.schedule_date_to,
        is_active: schedule.status === 'pending',
        created_by: 'Farm Schedule'
      }
    })

    return { success: true, data: transformedSchedules }

  } catch (error) {
    console.error('Error in getFarmFeedingSchedulesForAnimal:', error)
    return {
      success: false,
      error: 'Failed to fetch feeding schedules',
      data: []
    }
  }
}

// Get nutrition targets for an animal
export async function getAnimalNutritionTargets(
  farmId: string,
  animalId: string
) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: targets, error } = await (supabase as any)
      .from('animal_nutrition_targets')
      .select('*')
      .eq('farm_id', farmId)
      .eq('animal_id', animalId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching nutrition targets:', error)
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data: targets || null }

  } catch (error) {
    console.error('Error in getAnimalNutritionTargets:', error)
    return { 
      success: false, 
      error: 'Failed to fetch nutrition targets', 
      data: null 
    }
  }
}

// Create or update nutrition targets for an animal
export async function upsertAnimalNutritionTargets(
  farmId: string,
  animalId: string,
  targets: Omit<AnimalNutritionTargets, 'id' | 'farm_id' | 'animal_id' | 'created_at' | 'updated_at'>
) {
  try {
    const supabase = await createServerSupabaseClient()

    // FIXED: Cast .from(...) to any to bypass 'never' type on .upsert()
    const { data, error } = await (supabase
      .from('animal_nutrition_targets') as any)
      .upsert({
        farm_id: farmId,
        animal_id: animalId,
        ...targets,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting nutrition targets:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }

  } catch (error) {
    console.error('Error in upsertAnimalNutritionTargets:', error)
    return { 
      success: false, 
      error: 'Failed to save nutrition targets' 
    }
  }
}

// Delete nutrition targets for an animal
export async function deleteAnimalNutritionTargets(
  farmId: string,
  animalId: string
) {
  try {
    const supabase = await createServerSupabaseClient()

    // FIXED: Cast .from(...) to any to bypass 'never' type on .delete()
    const { error } = await (supabase
      .from('animal_nutrition_targets') as any)
      .delete()
      .eq('farm_id', farmId)
      .eq('animal_id', animalId)

    if (error) {
      console.error('Error deleting nutrition targets:', error)
      return { success: false, error: error.message }
    }

    return { success: true }

  } catch (error) {
    console.error('Error in deleteAnimalNutritionTargets:', error)
    return { 
      success: false, 
      error: 'Failed to delete nutrition targets' 
    }
  }
}

// Get feeding statistics for an animal
export async function getAnimalFeedingStats(
  farmId: string,
  animalId: string,
  days: number = 30
) {
  try {
    const supabase = await createServerSupabaseClient()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data: records, error } = await supabase
      .from('feed_consumption_records')
      .select(`
        id,
        quantity_consumed,
        consumption_date,
        feed_types!inner (
          typical_cost_per_kg
        ),
        feed_consumption_animals!inner (
          animal_id
        )
      `)
      .eq('farm_id', farmId)
      .eq('feed_consumption_animals.animal_id', animalId)
      .gte('feeding_time', startDate.toISOString())

    if (error) {
      console.error('Error fetching feeding stats:', error)
      return { 
        success: false, 
        error: error.message, 
        data: {
          totalQuantity: 0,
          totalCost: 0,
          feedingCount: 0,
          avgDailyQuantity: 0,
          avgDailyCost: 0
        }
      }
    }

    // FIXED: Cast records to any[] to safely access joined properties
    const safeRecords = (records as any[]) || []

    const totalQuantity = safeRecords.reduce((sum, record) => sum + record.quantity_kg, 0) || 0
    const totalCost = safeRecords.reduce((sum, record) => {
      const cost = (record.feed_types?.typical_cost_per_kg ?? 0) * record.quantity_kg
      return sum + cost
    }, 0) || 0

    const stats = {
      totalQuantity,
      totalCost,
      feedingCount: safeRecords.length || 0,
      avgDailyQuantity: days > 0 ? totalQuantity / days : 0,
      avgDailyCost: days > 0 ? totalCost / days : 0
    }

    return { success: true, data: stats }

  } catch (error) {
    console.error('Error in getAnimalFeedingStats:', error)
    return { 
      success: false, 
      error: 'Failed to fetch feeding statistics',
      data: {
        totalQuantity: 0,
        totalCost: 0,
        feedingCount: 0,
        avgDailyQuantity: 0,
        avgDailyCost: 0
      }
    }
  }
}