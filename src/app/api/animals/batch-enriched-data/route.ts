// src/app/api/animals/batch-enriched-data/route.ts
// Efficiently fetches enriched data for all animals in a farm in ONE call instead of N+1 queries

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'

// Type definitions for the data we're fetching
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

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')

    if (!farmId) {
      return NextResponse.json({ error: 'farmId required' }, { status: 400 })
    }

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
        .eq('is_resolved', false),  // Only unresolved requirements

      // Get latest health status changes
      (supabase as any)
        .from('health_status_changes')
        .select('animal_id, health_status, recorded_at')
        .eq('farm_id', farmId)
        .order('recorded_at', { ascending: false })
        .limit(200), // Recent status changes

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
      return NextResponse.json(
        { error: 'Failed to fetch animals' },
        { status: 500 }
      )
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

    // Calculate production status for each animal
    const calculateProductionStatus = (animal: Animal): string => {
      if (!animal.birth_date) return 'unknown'

      const birthDate = new Date(animal.birth_date)
      const today = new Date()
      const ageInDays = Math.floor(
        (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // If already has production status set, use it if reasonable
      if (animal.production_status) {
        const breedingStatuses = [
          'served',
          'lactating',
          'steaming_dry_cows',
          'open_culling_dry_cows',
        ]
        if (breedingStatuses.includes(animal.production_status)) {
          return animal.production_status
        }
      }

      // Age-based progression
      if (ageInDays < 365) return 'calf'
      if (ageInDays < 730) return 'heifer'
      if (ageInDays < 2190) return 'first_lactation' // 3 years
      return 'mature_cow'
    }

    // Enrich each animal with calculated data
    const enrichedAnimals = animals.map((animal: Animal) => ({
      ...animal,
      enrichedData: {
        breedingRecords: breedingRecordsMap.get(animal.id) || {
          hasRecords: false,
          count: 0,
        },
        weightRequirement: weightRequirementsMap.get(animal.id) || null,
        latestHealthStatus: healthStatusMap.get(animal.id) || null,
        needsHealthRecord: incompleteHealthSet.has(animal.id),
        calculatedProductionStatus: calculateProductionStatus(animal),
      },
    }))

    // Cache for 5 minutes (revalidate frequently as farm data changes)
    const response = NextResponse.json({
      success: true,
      animals: enrichedAnimals,
      // ✅ Return weight requirements for banner - includes id, reason, due_date
      weightRequirements: Array.from(weightRequirementsMap.values())
        .flat()
        .map(req => {
          const animal = animals.find(a => a.id === req.animal_id)
          return {
            id: req.id,
            animal_id: req.animal_id,
            tag_number: animal?.tag_number,
            name: animal?.name,
            reason: req.reason,
            due_date: req.due_date,
          }
        }),
      timestamp: new Date().toISOString(),
    })

    // Set cache headers
    response.headers.set('Cache-Control', 'private, max-age=300') // 5 minutes

    return response
  } catch (error) {
    console.error('Error in batch-enriched-data:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
