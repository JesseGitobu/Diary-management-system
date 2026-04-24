// src/lib/database/feedSettings.ts
// Server-only — never import this file from a client component.
// Shared types and constants live in feedSettingsConstants.ts.
import { createServerSupabaseClient } from '@/lib/supabase/server'
export {
  DAYS_OF_WEEK,
  ALERT_TYPE_META,
  type FeedTimeSlot,
  type FeedAlertSetting,
  type FeedFrequencyDefault,
} from '@/lib/database/feedSettingsConstants'
import { ALERT_TYPE_META } from '@/lib/database/feedSettingsConstants'
import type { FeedTimeSlot, FeedAlertSetting, FeedFrequencyDefault } from '@/lib/database/feedSettingsConstants'

// ─── Input-only interfaces (no server dependencies) ──────────────────────────

export interface CreateFeedTimeSlotData {
  slot_name: string
  scheduled_time: string
  days_of_week: number[]
  is_active?: boolean
  sort_order?: number
  notes?: string | null
}

export interface UpdateFeedTimeSlotData {
  slot_name?: string
  scheduled_time?: string
  days_of_week?: number[]
  is_active?: boolean
  sort_order?: number
  notes?: string | null
}

export interface UpsertFeedAlertData {
  alert_type: string
  threshold_value: number
  is_enabled: boolean
  notes?: string | null
}

export interface CreateFeedFrequencyDefaultData {
  animal_category_id: string
  feedings_per_day: number
  default_quantity_kg_per_feeding: number
  waste_factor_percent?: number
  notes?: string | null
}

export interface UpdateFeedFrequencyDefaultData {
  feedings_per_day?: number
  default_quantity_kg_per_feeding?: number
  waste_factor_percent?: number
  notes?: string | null
}

// ─── Feed Time Slots ──────────────────────────────────────────────────────────

export async function getFeedTimeSlots(farmId: string): Promise<FeedTimeSlot[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('feed_time_slots')
    .select('*')
    .eq('farm_id', farmId)
    .order('sort_order', { ascending: true })
    .order('scheduled_time', { ascending: true })

  if (error) throw new Error(`Failed to fetch feed time slots: ${error.message}`)
  return data ?? []
}

export async function createFeedTimeSlot(
  farmId: string,
  data: CreateFeedTimeSlotData
): Promise<{ success: boolean; data?: FeedTimeSlot; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { data: created, error } = await supabase
    .from('feed_time_slots')
    .insert({
      farm_id: farmId,
      slot_name: data.slot_name.trim(),
      scheduled_time: data.scheduled_time,
      days_of_week: data.days_of_week,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order ?? 0,
      notes: data.notes?.trim() ?? null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `A time slot named "${data.slot_name}" already exists` }
    }
    return { success: false, error: error.message }
  }
  return { success: true, data: created }
}

export async function updateFeedTimeSlot(
  farmId: string,
  slotId: string,
  data: UpdateFeedTimeSlotData
): Promise<{ success: boolean; data?: FeedTimeSlot; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const payload: Record<string, any> = {}
  if (data.slot_name !== undefined) payload.slot_name = data.slot_name.trim()
  if (data.scheduled_time !== undefined) payload.scheduled_time = data.scheduled_time
  if (data.days_of_week !== undefined) payload.days_of_week = data.days_of_week
  if (data.is_active !== undefined) payload.is_active = data.is_active
  if (data.sort_order !== undefined) payload.sort_order = data.sort_order
  if (data.notes !== undefined) payload.notes = data.notes?.trim() ?? null

  const { data: updated, error } = await supabase
    .from('feed_time_slots')
    .update(payload)
    .eq('id', slotId)
    .eq('farm_id', farmId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `A time slot with this name already exists` }
    }
    return { success: false, error: error.message }
  }
  return { success: true, data: updated }
}

export async function deleteFeedTimeSlot(
  farmId: string,
  slotId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('feed_time_slots')
    .delete()
    .eq('id', slotId)
    .eq('farm_id', farmId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Feed Alert Settings ──────────────────────────────────────────────────────

export async function getFeedAlertSettings(farmId: string): Promise<FeedAlertSetting[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('feed_alert_settings')
    .select('*')
    .eq('farm_id', farmId)
    .order('alert_type', { ascending: true })

  if (error) throw new Error(`Failed to fetch alert settings: ${error.message}`)

  // Return in a fixed display order
  const ORDER = Object.keys(ALERT_TYPE_META)
  const sorted = (data ?? []).sort(
    (a, b) => ORDER.indexOf(a.alert_type) - ORDER.indexOf(b.alert_type)
  )
  return sorted as FeedAlertSetting[]
}

export async function upsertFeedAlertSetting(
  farmId: string,
  data: UpsertFeedAlertData
): Promise<{ success: boolean; data?: FeedAlertSetting; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const meta = ALERT_TYPE_META[data.alert_type]
  if (!meta) {
    return { success: false, error: `Unknown alert type: ${data.alert_type}` }
  }

  const { data: upserted, error } = await supabase
    .from('feed_alert_settings')
    .upsert(
      {
        farm_id: farmId,
        alert_type: data.alert_type,
        threshold_value: data.threshold_value,
        threshold_unit: meta.unit,
        is_enabled: data.is_enabled,
        notes: data.notes?.trim() ?? null,
      },
      { onConflict: 'farm_id,alert_type' }
    )
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: upserted as FeedAlertSetting }
}

// Upsert all 5 alert types in one call (used on settings save)
export async function upsertAllFeedAlertSettings(
  farmId: string,
  settings: UpsertFeedAlertData[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const rows = settings.map(s => {
    const meta = ALERT_TYPE_META[s.alert_type]
    return {
      farm_id: farmId,
      alert_type: s.alert_type,
      threshold_value: s.threshold_value,
      threshold_unit: meta?.unit ?? 'kg',
      is_enabled: s.is_enabled,
      notes: s.notes?.trim() ?? null,
    }
  })

  const { error } = await supabase
    .from('feed_alert_settings')
    .upsert(rows, { onConflict: 'farm_id,alert_type' })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Feed Frequency Defaults ──────────────────────────────────────────────────

export async function getFeedFrequencyDefaults(farmId: string): Promise<FeedFrequencyDefault[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('feed_frequency_defaults')
    .select(`
      *,
      animal_categories ( id, name )
    `)
    .eq('farm_id', farmId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch frequency defaults: ${error.message}`)
  return data ?? []
}

export async function createFeedFrequencyDefault(
  farmId: string,
  data: CreateFeedFrequencyDefaultData
): Promise<{ success: boolean; data?: FeedFrequencyDefault; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { data: created, error } = await supabase
    .from('feed_frequency_defaults')
    .insert({
      farm_id: farmId,
      animal_category_id: data.animal_category_id,
      feedings_per_day: data.feedings_per_day,
      default_quantity_kg_per_feeding: data.default_quantity_kg_per_feeding,
      waste_factor_percent: data.waste_factor_percent ?? 5,
      notes: data.notes?.trim() ?? null,
    })
    .select(`*, animal_categories ( id, name )`)
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'A default for this animal category already exists' }
    }
    return { success: false, error: error.message }
  }
  return { success: true, data: created }
}

export async function updateFeedFrequencyDefault(
  farmId: string,
  defaultId: string,
  data: UpdateFeedFrequencyDefaultData
): Promise<{ success: boolean; data?: FeedFrequencyDefault; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const payload: Record<string, any> = {}
  if (data.feedings_per_day !== undefined)                payload.feedings_per_day = data.feedings_per_day
  if (data.default_quantity_kg_per_feeding !== undefined) payload.default_quantity_kg_per_feeding = data.default_quantity_kg_per_feeding
  if (data.waste_factor_percent !== undefined)            payload.waste_factor_percent = data.waste_factor_percent
  if (data.notes !== undefined)                           payload.notes = data.notes?.trim() ?? null

  const { data: updated, error } = await supabase
    .from('feed_frequency_defaults')
    .update(payload)
    .eq('id', defaultId)
    .eq('farm_id', farmId)
    .select(`*, animal_categories ( id, name )`)
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: updated }
}

export async function deleteFeedFrequencyDefault(
  farmId: string,
  defaultId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('feed_frequency_defaults')
    .delete()
    .eq('id', defaultId)
    .eq('farm_id', farmId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Bulk loader (page entry point) ──────────────────────────────────────────

export async function getAllFeedSettings(farmId: string) {
  const [timeSlots, alertSettings, frequencyDefaults] = await Promise.all([
    getFeedTimeSlots(farmId),
    getFeedAlertSettings(farmId),
    getFeedFrequencyDefaults(farmId),
  ])
  return { timeSlots, alertSettings, frequencyDefaults }
}
