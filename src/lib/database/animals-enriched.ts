// src/lib/database/animals-enriched.ts
// Server-side function to fetch enriched animal data for a farm
// This is called directly by server components, avoiding API route cookie issues

import { createServerSupabaseClient } from '@/lib/supabase/server'

interface Animal {
  id: string
  farm_id: string
  tag_number: string
  name?: string
  birth_date?: string
  production_status?: string
  health_status?: string
  [key: string]: any
}

interface BreedingRecord {
  animal_id: string
  record_type: string
  recording_date: string
}

interface WeightRequirement {
  id: string
  animal_id: string
  reason: string
  due_date: string
  is_resolved: boolean
}

interface HealthStatus {
  animal_id: string
  health_status: string
  recorded_at: string
}

interface HealthRecord {
  animal_id: string
  record_date: string
  health_status: string
}

interface EnrichedAnimal {
  id: string
  tag_number: string
  name?: string
  birth_date?: string
  production_status?: string
  health_status?: string
  [key: string]: any
  enrichedData: {
    breeding: {
      hasRecords: boolean
      latestType?: string
      count: number
    }
    weightRequirements: Array<{
      id: string
      reason: string
      due_date: string
      animal_id: string
    }>
    health: {
      status: string
      recorded_at: string
    } | null
    hasIncompleteHealthRecords: boolean
  }
}

export async function getEnrichedAnimalsData(farmId: string): Promise<{
  success: boolean
  animals: EnrichedAnimal[]
  error?: string
}> {
  try {
    const supabase = await createServerSupabaseClient()

    // Fetch all animals with their essential data in parallel
    const [
      animalsResult,
      breedingRecordsResult,
      weightRequirementsResult,
      healthStatusResult,
      incompleteHealthResult,
    ] = await Promise.all([
      // Get all animals for the farm
      supabase
        .from('animals')
        .select('*')
        .eq('farm_id', farmId)
        .order('tag_number', { ascending: true }),

      // Get breeding records for all animals at once
      (supabase as any)
        .from('service_records')
        .select('animal_id, record_type, recording_date')
        .eq('farm_id', farmId)
        .order('recording_date', { ascending: false }),

      // Get animals requiring weight updates
      (supabase as any)
        .from('animals_requiring_weight_update')
        .select('id, animal_id, reason, due_date, is_resolved')
        .eq('farm_id', farmId)
        .eq('is_resolved', false),

      // Get latest health status changes
      (supabase as any)
        .from('health_status_changes')
        .select('animal_id, health_status, recorded_at')
        .eq('farm_id', farmId)
        .order('recorded_at', { ascending: false })
        .limit(200),

      // Get incomplete health records
      (supabase as any)
        .from('health_records')
        .select('animal_id, record_date, health_status')
        .eq('farm_id', farmId)
        .eq('record_type', 'incomplete')
        .order('record_date', { ascending: false }),
    ])

    if (animalsResult.error) {
      console.error('Error fetching animals:', animalsResult.error)
      return {
        success: false,
        animals: [],
        error: 'Failed to fetch animals',
      }
    }

    // Type-safe data extraction
    const animals = (animalsResult.data as Animal[]) || []
    const breedingRecords = (breedingRecordsResult.data as BreedingRecord[]) || []
    const weightRequirements = (weightRequirementsResult.data as WeightRequirement[]) || []
    const healthStatuses = (healthStatusResult.data as HealthStatus[]) || []
    const incompleteHealthRecords = (incompleteHealthResult.data as HealthRecord[]) || []

    // Build enriched data maps for fast lookup
    const breedingRecordsMap = new Map<
      string,
      {
        hasRecords: boolean
        latestType?: string
        count: number
      }
    >()

    for (const record of breedingRecords) {
      const existing = breedingRecordsMap.get(record.animal_id) || {
        hasRecords: false,
        count: 0,
      }
      breedingRecordsMap.set(record.animal_id, {
        hasRecords: true,
        latestType: record.record_type,
        count: existing.count + 1,
      })
    }

    const weightRequirementsMap = new Map<
      string,
      Array<{ id: string; reason: string; due_date: string; animal_id: string }>
    >()

    for (const req of weightRequirements) {
      const existing = weightRequirementsMap.get(req.animal_id) || []
      existing.push({
        id: req.id,
        reason: req.reason,
        due_date: req.due_date,
        animal_id: req.animal_id,
      })
      weightRequirementsMap.set(req.animal_id, existing)
    }

    const healthStatusMap = new Map<
      string,
      {
        status: string
        recorded_at: string
      }
    >()

    for (const status of healthStatuses) {
      if (!healthStatusMap.has(status.animal_id)) {
        healthStatusMap.set(status.animal_id, {
          status: status.health_status,
          recorded_at: status.recorded_at,
        })
      }
    }

    const incompleteHealthSet = new Set<string>()

    for (const record of incompleteHealthRecords) {
      incompleteHealthSet.add(record.animal_id)
    }

    // Build enriched animals with all related data
    const enrichedAnimals: EnrichedAnimal[] = animals.map((animal) => ({
      ...animal,
      enrichedData: {
        breeding: breedingRecordsMap.get(animal.id) || {
          hasRecords: false,
          count: 0,
        },
        weightRequirements: weightRequirementsMap.get(animal.id) || [],
        health: healthStatusMap.get(animal.id) || null,
        hasIncompleteHealthRecords: incompleteHealthSet.has(animal.id),
      },
    }))

    return {
      success: true,
      animals: enrichedAnimals,
    }
  } catch (error) {
    console.error('Error in getEnrichedAnimalsData:', error)
    return {
      success: false,
      animals: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
