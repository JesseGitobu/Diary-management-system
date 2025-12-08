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
  feeding_mode: 'individual' | 'batch'
  animal_count?: number
  notes?: string
  recorded_by?: string
  batch_name?: string
  consumption_batch_id?: string
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
      .from('feed_consumption')
      .select(`
        id,
        feed_type_id,
        quantity_kg,
        feeding_time,
        feeding_mode,
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
        feeding_mode: record.feeding_mode as 'individual' | 'batch',
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

    // Get all active feeding schedules for the farm
    const { data: schedules, error } = await supabase
      .from('feeding_schedules')
      .select('*')
      .eq('farm_id', farmId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching feeding schedules:', error)
      return { success: false, error: error.message, data: [] }
    }

    // Get animal details to check category matching
    const { data: animalData, error: animalError } = await supabase
      .from('animals')
      .select('id, breed, gender, production_status, health_status, birth_date, weight')
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single()

    if (animalError) {
      console.error('Error fetching animal details:', animalError)
      return { success: false, error: animalError.message, data: [] }
    }

    const animal = animalData as any

    // Calculate animal age in days for age-based filtering
    const calculateAgeInDays = (birthDate: string | null): number => {
      if (!birthDate) return 0
      const birth = new Date(birthDate)
      const now = new Date()
      return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))
    }

    const animalAgeInDays = calculateAgeInDays(animal.birth_date)

    // Filter schedules that target this animal
    // FIXED: Cast schedules to any[] to safely access properties
    const relevantSchedules = (schedules as any[] || []).filter(schedule => {
      if (!schedule.target_animals) return false

      const targetAnimals = schedule.target_animals as any

      // Check for specific animal IDs
      if (targetAnimals.animal_ids && Array.isArray(targetAnimals.animal_ids)) {
        if (targetAnimals.animal_ids.includes(animalId)) {
          return true
        }
      }

      // Check for criteria-based targeting (breed, gender, production status, etc.)
      if (targetAnimals.criteria) {
        const criteria = targetAnimals.criteria

        // Check breed matching
        if (criteria.breeds && Array.isArray(criteria.breeds) && animal.breed) {
          if (criteria.breeds.includes(animal.breed)) return true
        }

        // Check gender matching
        if (criteria.genders && Array.isArray(criteria.genders) && animal.gender) {
          if (criteria.genders.includes(animal.gender)) return true
        }

        // Check production status matching
        if (criteria.production_statuses && Array.isArray(criteria.production_statuses) && animal.production_status) {
          if (criteria.production_statuses.includes(animal.production_status)) return true
        }

        // Check health status matching
        if (criteria.health_statuses && Array.isArray(criteria.health_statuses) && animal.health_status) {
          if (criteria.health_statuses.includes(animal.health_status)) return true
        }

        // Check age range matching
        if (criteria.age_range && animal.birth_date) {
          const minAgeDays = criteria.age_range.min_days || 0
          const maxAgeDays = criteria.age_range.max_days || Number.MAX_SAFE_INTEGER
          if (animalAgeInDays >= minAgeDays && animalAgeInDays <= maxAgeDays) {
            return true
          }
        }

        // Check weight range matching
        if (criteria.weight_range && animal.weight) {
          const minWeight = criteria.weight_range.min_kg || 0
          const maxWeight = criteria.weight_range.max_kg || Number.MAX_SAFE_INTEGER
          if (animal.weight >= minWeight && animal.weight <= maxWeight) {
            return true
          }
        }
      }

      // Check for "all animals" targeting
      if (targetAnimals.target_all === true) {
        return true
      }

      return false
    })

    // Transform to expected format
    const transformedSchedules = relevantSchedules.map(schedule => {
      const feedMix = schedule.feed_mix as any
      const scheduleTimes = schedule.schedule_times as any

      return {
        id: schedule.id,
        animal_id: animalId, // Conceptual since it's not stored per animal
        feed_type_id: feedMix.primary_feed_id || feedMix.feed_type_id || '',
        feed_name: schedule.name,
        scheduled_time: scheduleTimes.times?.[0] || scheduleTimes.time || '07:00',
        quantity_kg: feedMix.total_quantity_kg || feedMix.quantity_kg || 0,
        frequency: scheduleTimes.frequency || 'daily',
        start_date: schedule.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        end_date: null,
        is_active: schedule.is_active,
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

    const { data: targets, error } = await supabase
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
      .from('feed_consumption')
      .select(`
        id,
        quantity_kg,
        feeding_time,
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