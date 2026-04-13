// src/lib/database/dry-off.ts

import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface CreateDryOffRecordInput {
  farm_id: string
  animal_id: string
  dry_off_date: string               // YYYY-MM-DD
  dry_off_reason: DryOffReason
  last_milk_yield?: number | null    // litres/day
  lactation_number?: number | null
  days_in_milk?: number | null
  service_record_id?: string | null
  expected_calving_date?: string | null
  expected_dry_period_days?: number  // default 60
  dry_cow_therapy?: boolean
  treatment_notes?: string | null
  notes?: string | null
  recorded_by: string
}

export type DryOffReason =
  | 'end_of_lactation'
  | 'low_production'
  | 'health_issue'
  | 'pregnancy'
  | 'involuntary'
  | 'other'

export interface DryOffRecord {
  id: string
  farm_id: string
  animal_id: string
  dry_off_date: string
  dry_off_reason: DryOffReason
  last_milk_yield: number | null
  lactation_number: number | null
  days_in_milk: number | null
  service_record_id: string | null
  expected_calving_date: string | null
  expected_dry_period_days: number
  dry_cow_therapy: boolean
  treatment_notes: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
  updated_at: string
  // joined
  animals?: { tag_number: string; name: string | null }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createDryOffRecord(
  input: CreateDryOffRecordInput
): Promise<{ success: boolean; data?: DryOffRecord; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await (supabase as any)
      .from('dry_off_records')
      .insert({
        farm_id: input.farm_id,
        animal_id: input.animal_id,
        dry_off_date: input.dry_off_date,
        dry_off_reason: input.dry_off_reason,
        last_milk_yield: input.last_milk_yield ?? null,
        lactation_number: input.lactation_number ?? null,
        days_in_milk: input.days_in_milk ?? null,
        service_record_id: input.service_record_id ?? null,
        expected_calving_date: input.expected_calving_date ?? null,
        expected_dry_period_days: input.expected_dry_period_days ?? 60,
        dry_cow_therapy: input.dry_cow_therapy ?? false,
        treatment_notes: input.treatment_notes ?? null,
        notes: input.notes ?? null,
        recorded_by: input.recorded_by,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ [dry-off] Failed to create dry_off_record:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err: any) {
    console.error('❌ [dry-off] Unexpected error:', err)
    return { success: false, error: err.message || 'Unexpected error' }
  }
}

// ─── Fetch for an animal ──────────────────────────────────────────────────────

export async function getDryOffRecordsByAnimal(
  animalId: string,
  farmId: string
): Promise<DryOffRecord[]> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await (supabase as any)
      .from('dry_off_records')
      .select('*')
      .eq('animal_id', animalId)
      .eq('farm_id', farmId)
      .order('dry_off_date', { ascending: false })

    if (error) {
      console.error('❌ [dry-off] Failed to fetch records:', error.message)
      return []
    }

    return data ?? []
  } catch {
    return []
  }
}

// ─── Fetch latest confirmed service_record for pregnancy context ──────────────

export async function getLatestServiceRecord(
  animalId: string,
  farmId: string
): Promise<{ id: string; expected_calving_date: string | null } | null> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await (supabase as any)
      .from('service_records')
      .select('id, expected_calving_date')
      .eq('animal_id', animalId)
      .eq('farm_id', farmId)
      .order('service_date', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

// ─── Fetch current lactation context ─────────────────────────────────────────

export interface LactationContext {
  id: string
  lactation_number: number | null
  days_in_milk: number | null
  last_milk_yield: number | null   // current_average_production from lactation record
}

export async function getCurrentLactationContext(
  animalId: string
): Promise<LactationContext | null> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await (supabase as any)
      .from('lactation_cycle_records')
      .select('id, lactation_number, days_in_milk, current_average_production')
      .eq('animal_id', animalId)
      .eq('status', 'active')
      .order('lactation_number', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      lactation_number: data.lactation_number,
      days_in_milk: data.days_in_milk ?? null,
      last_milk_yield: data.current_average_production ?? null,
    }
  } catch {
    return null
  }
}

// ─── Mapping from dry_off_records reason → lactation_cycle_records enum ──────
// lactation_cycle_records.dry_off_reason uses: voluntary | disease | pregnancy | age | other

export function mapToLactationDryOffReason(
  reason: DryOffReason
): 'voluntary' | 'disease' | 'pregnancy' | 'age' | 'other' {
  switch (reason) {
    case 'end_of_lactation': return 'voluntary'
    case 'low_production':   return 'voluntary'
    case 'health_issue':     return 'disease'
    case 'pregnancy':        return 'pregnancy'
    case 'involuntary':      return 'other'
    case 'other':            return 'other'
  }
}

// ─── Close active lactation cycle on dry-off ─────────────────────────────────

export async function closeLactationCycle(
  lactationRecordId: string,
  dryOffDate: string,
  reason: DryOffReason
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()
    const mapped = mapToLactationDryOffReason(reason)

    const { error } = await (supabase as any)
      .from('lactation_cycle_records')
      .update({
        actual_end_date: dryOffDate,
        dry_off_reason: mapped,
        status: 'completed',
      })
      .eq('id', lactationRecordId)

    if (error) {
      console.warn('⚠️ [dry-off] Failed to close lactation cycle:', error.message)
    }
  } catch (err: any) {
    console.warn('⚠️ [dry-off] Error closing lactation cycle:', err.message)
  }
}
