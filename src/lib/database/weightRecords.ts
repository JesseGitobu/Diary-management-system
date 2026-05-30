// lib/database/weightRecords.ts
//
// All DB operations for animal_weight_records + animal_weight_status.
// Every function returns { data, error } so callers decide how to respond.

import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WeightRecordRow {
  id: string
  farm_id: string
  animal_id: string
  weight_date: string            // ISO date string 'YYYY-MM-DD'
  weight_kg: number
  weight_unit: 'kg' | 'lbs'
  measurement_purpose: string | null
  method: 'scale' | 'tape_measure' | 'visual_estimate' | null
  body_condition_score: number | null
  measured_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WeightStatusRow {
  id: string
  farm_id: string
  tag_number: string
  name: string | null
  production_status: string | null
  gender: string | null
  weight: number | null
  last_weight_date: string | null
  body_condition_score: number | null
  previous_weight: number | null
  days_since_weight: number | null
  trend: 'gaining' | 'losing' | 'stable' | 'unknown'
  change_kg: number | null
  requires_weight_update: boolean
  next_due_date: string | null
}

export interface CreateWeightRecordInput {
  animal_id: string
  farm_id: string
  weight_kg: number
  weight_date: string
  weight_unit?: 'kg' | 'lbs'
  measurement_purpose?: string
  method?: 'scale' | 'tape_measure' | 'visual_estimate'
  body_condition_score?: number | null
  measured_by?: string
  notes?: string
}

export interface UpdateWeightRecordInput {
  weight_kg?: number
  weight_date?: string
  weight_unit?: 'kg' | 'lbs'
  measurement_purpose?: string
  method?: 'scale' | 'tape_measure' | 'visual_estimate'
  body_condition_score?: number | null
  measured_by?: string
  notes?: string
}

export interface WeightRecordFilters {
  animal_id?: string
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function db<T = unknown>(result: { data: T | null; error: any }) {
  return result
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * List weight records for a farm, with optional filters.
 * Returns records newest-first with a joined animal tag + name.
 */
export async function listWeightRecords(
  farmId: string,
  filters: WeightRecordFilters = {}
) {
  const supabase = await createServerSupabaseClient()
  const { animal_id, from_date, to_date, limit = 50, offset = 0 } = filters

  let query = (supabase as any)
    .from('animal_weight_records')
    .select(`
      id,
      farm_id,
      animal_id,
      weight_date,
      weight_kg,
      weight_unit,
      measurement_purpose,
      method,
      body_condition_score,
      measured_by,
      notes,
      created_at,
      updated_at,
      animals (
        tag_number,
        name,
        production_status,
        gender
      )
    `)
    .eq('farm_id', farmId)
    .order('weight_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (animal_id) query = query.eq('animal_id', animal_id)
  if (from_date) query = query.gte('weight_date', from_date)
  if (to_date)   query = query.lte('weight_date', to_date)

  return db<(WeightRecordRow & { animals: { tag_number: string; name: string | null; production_status: string | null; gender: string | null } | null })[]>(await query)
}

/**
 * Fetch a single weight record by ID, verified against farm_id.
 */
export async function getWeightRecord(id: string, farmId: string) {
  const supabase = await createServerSupabaseClient()

  return db<WeightRecordRow & { animals: { tag_number: string; name: string | null } | null }>(
    await (supabase as any)
      .from('animal_weight_records')
      .select(`
        *,
        animals ( tag_number, name )
      `)
      .eq('id', id)
      .eq('farm_id', farmId)
      .single()
  )
}

/**
 * Fetch weight status summary for all animals on a farm.
 * Optionally filter to only those requiring an update.
 */
export async function listWeightStatus(
  farmId: string,
  options: { requiresUpdate?: boolean; animalId?: string } = {}
) {
  const supabase = await createServerSupabaseClient()

  let query = (supabase as any)
    .from('animal_weight_status')
    .select('*')
    .eq('farm_id', farmId)
    .order('days_since_weight', { ascending: false })

  if (options.requiresUpdate) query = query.eq('requires_weight_update', true)
  if (options.animalId)       query = query.eq('id', options.animalId)

  return db<WeightStatusRow[]>(await query)
}

/**
 * Fetch the full weight history for a single animal.
 */
export async function getAnimalWeightHistory(animalId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()

  return db<WeightRecordRow[]>(
    await (supabase as any)
      .from('animal_weight_records')
      .select('*')
      .eq('animal_id', animalId)
      .eq('farm_id', farmId)
      .order('weight_date', { ascending: false })
  )
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Create a new weight record after validating animal ownership.
 */
export async function createWeightRecord(input: CreateWeightRecordInput) {
  const supabase = await createServerSupabaseClient()

  // Verify the animal belongs to this farm
  const { data: animal, error: animalError } = await (supabase as any)
    .from('animals')
    .select('id, farm_id')
    .eq('id', input.animal_id)
    .eq('farm_id', input.farm_id)
    .single()

  if (animalError || !animal) {
    return {
      data: null,
      error: { message: 'Animal not found or does not belong to this farm', code: 'NOT_FOUND' }
    }
  }

  return db<WeightRecordRow>(
    await (supabase as any)
      .from('animal_weight_records')
      .insert({
        animal_id:            input.animal_id,
        farm_id:              input.farm_id,
        weight_kg:            input.weight_kg,
        weight_date:          input.weight_date,
        weight_unit:          input.weight_unit ?? 'kg',
        measurement_purpose:  input.measurement_purpose ?? 'routine',
        method:               input.method ?? 'scale',
        body_condition_score: input.body_condition_score ?? null,
        measured_by:          input.measured_by ?? null,
        notes:                input.notes ?? null,
      })
      .select()
      .single()
  )
}

/**
 * Update an existing weight record, verified against farm_id.
 */
export async function updateWeightRecord(
  id: string,
  farmId: string,
  input: UpdateWeightRecordInput
) {
  const supabase = await createServerSupabaseClient()

  // Verify ownership before updating
  const { data: existing, error: fetchError } = await (supabase as any)
    .from('animal_weight_records')
    .select('id, farm_id')
    .eq('id', id)
    .eq('farm_id', farmId)
    .single()

  if (fetchError || !existing) {
    return {
      data: null,
      error: { message: 'Weight record not found', code: 'NOT_FOUND' }
    }
  }

  // Only include keys that were explicitly provided
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const allowed: (keyof UpdateWeightRecordInput)[] = [
    'weight_kg', 'weight_date', 'weight_unit', 'measurement_purpose',
    'method', 'body_condition_score', 'measured_by', 'notes'
  ]
  for (const key of allowed) {
    if (input[key] !== undefined) patch[key] = input[key]
  }

  return db<WeightRecordRow>(
    await (supabase as any)
      .from('animal_weight_records')
      .update(patch)
      .eq('id', id)
      .eq('farm_id', farmId)
      .select()
      .single()
  )
}

/**
 * Delete a weight record, verified against farm_id.
 */
export async function deleteWeightRecord(id: string, farmId: string) {
  const supabase = await createServerSupabaseClient()

  // Verify ownership
  const { data: existing, error: fetchError } = await (supabase as any)
    .from('animal_weight_records')
    .select('id, farm_id')
    .eq('id', id)
    .eq('farm_id', farmId)
    .single()

  if (fetchError || !existing) {
    return {
      data: null,
      error: { message: 'Weight record not found', code: 'NOT_FOUND' }
    }
  }

  const { error } = await (supabase as any)
    .from('animal_weight_records')
    .delete()
    .eq('id', id)
    .eq('farm_id', farmId)

  return { data: error ? null : { id }, error }
}