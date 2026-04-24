// src/lib/database/scheduledFeedings.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { recordFeedTransactionRPC } from './feedInventoryTransactions'

// ─── Types ───────────────────────────────────────────────────────────────────

export type FeedingMode = 'individual' | 'ration' | 'feed-mix-template'
export type FeedingStatus = 'pending' | 'completed' | 'cancelled' | 'overdue' | 'skipped' | 'partial'
export type TargetMode = 'all' | 'by_category' | 'specific'

export interface ScheduledFeedingEntry {
  id: string
  scheduled_feeding_id: string
  feed_type_id: string
  quantity_kg_per_animal: number
  cost_per_kg: number | null
  sort_order: number
  created_at: string
  feed_types?: { id: string; name: string; unit_of_measure: string | null } | null
}

export interface ScheduledFeeding {
  id: string
  farm_id: string
  feeding_mode: FeedingMode
  schedule_name: string | null
  schedule_date_from: string   // YYYY-MM-DD
  schedule_date_to: string     // YYYY-MM-DD
  feeding_time: string         // HH:MM:SS
  time_slot_id: string | null
  slot_name: string | null
  ration_id: string | null
  recipe_id: string | null
  target_mode: TargetMode
  animal_id: string | null
  animal_count: number
  avg_animal_weight_kg: number | null
  status: FeedingStatus
  notes: string | null
  late_by_minutes: number | null
  late_reason: string | null
  created_by: string
  completed_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // joined
  scheduled_feeding_entries?: ScheduledFeedingEntry[]
  scheduled_feeding_categories?: {
    category_id: string
    animal_categories?: { id: string; name: string } | null
  }[]
  scheduled_feeding_animals?: {
    animal_id: string
    animals?: { id: string; tag_number: string; name: string | null } | null
  }[]
  feed_rations?: { id: string; name: string } | null
  feed_mix_recipes?: { id: string; name: string } | null
  feed_time_slots?: { id: string; slot_name: string; scheduled_time: string } | null
}

export interface CreateScheduledFeedingData {
  scheduleName?: string | null
  scheduledDateFrom: string  // YYYY-MM-DD
  scheduledDateTo: string    // YYYY-MM-DD
  scheduledTime: string      // HH:MM
  feedTimeSlotId?: string | null
  slotName?: string | null
  feedingMode: FeedingMode
  rationId?: string | null
  recipeId?: string | null
  entries: {
    feedTypeId: string
    quantityKgPerAnimal: number
    costPerKg?: number | null
    sortOrder?: number
  }[]
  targetMode: TargetMode
  targetCategoryIds?: string[]
  targetAnimalIds?: string[]
  animalCount?: number
  avgAnimalWeightKg?: number | null
  notes?: string | null
}

export interface UpdateScheduledFeedingData {
  scheduleName?: string | null
  scheduledDateFrom?: string
  scheduledDateTo?: string
  scheduledTime?: string
  feedTimeSlotId?: string | null
  slotName?: string | null
  status?: FeedingStatus
  notes?: string | null
  lateByMinutes?: number | null
  lateReason?: string | null
  completedAt?: string | null
  entries?: CreateScheduledFeedingData['entries']
  targetCategoryIds?: string[]
  targetAnimalIds?: string[]
}

export interface ListScheduledFeedingsFilters {
  status?: string          // comma-separated values allowed
  dateFrom?: string
  dateTo?: string
  feedingMode?: FeedingMode
}

// ─── Shared SELECT fragment ───────────────────────────────────────────────────

const FULL_SELECT = `
  *,
  scheduled_feeding_entries (
    id, scheduled_feeding_id, feed_type_id,
    quantity_kg_per_animal, cost_per_kg, sort_order, created_at,
    feed_types ( id, name, unit_of_measure )
  ),
  scheduled_feeding_categories (
    category_id,
    animal_categories ( id, name )
  ),
  scheduled_feeding_animals (
    animal_id,
    animals ( id, tag_number, name )
  ),
  feed_rations ( id, name ),
  feed_mix_recipes ( id, name ),
  feed_time_slots ( id, slot_name, scheduled_time )
`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normaliseTime(hhmm: string): string {
  return hhmm.length === 5 ? `${hhmm}:00` : hhmm
}

// ─── READ ─────────────────────────────────────────────────────────────────────

export async function getScheduledFeedings(
  farmId: string,
  filters: ListScheduledFeedingsFilters = {}
): Promise<ScheduledFeeding[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('scheduled_feedings')
    .select(FULL_SELECT)
    .eq('farm_id', farmId)
    .order('schedule_date_from', { ascending: true })
    .order('feeding_time', { ascending: true })

  if (filters.status) {
    const statuses = filters.status.split(',').map(s => s.trim())
    query = statuses.length === 1
      ? query.eq('status', statuses[0] as FeedingStatus)
      : (query as any).in('status', statuses)
  }
  if (filters.feedingMode) query = query.eq('feeding_mode', filters.feedingMode)
  if (filters.dateFrom)    query = query.gte('schedule_date_from', filters.dateFrom)
  if (filters.dateTo)      query = query.lte('schedule_date_to', filters.dateTo)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch scheduled feedings: ${error.message}`)
  return (data ?? []) as ScheduledFeeding[]
}

export async function getScheduledFeedingById(
  farmId: string,
  id: string
): Promise<ScheduledFeeding | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('scheduled_feedings')
    .select(FULL_SELECT)
    .eq('farm_id', farmId)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch scheduled feeding: ${error.message}`)
  }
  return data as ScheduledFeeding | null
}

export async function getAnimalScheduledFeedings(
  farmId: string,
  animalId: string,
  status?: string
): Promise<ScheduledFeeding[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('scheduled_feedings')
    .select(`${FULL_SELECT}, scheduled_feeding_animals!inner ( animal_id )`)
    .eq('farm_id', farmId)
    .eq('scheduled_feeding_animals.animal_id', animalId)
    .order('schedule_date_from', { ascending: true })
    .order('feeding_time', { ascending: true })

  if (status) {
    const statuses = status.split(',').map(s => s.trim())
    query = statuses.length === 1
      ? query.eq('status', statuses[0] as FeedingStatus)
      : (query as any).in('status', statuses)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching animal scheduled feedings:', error)
    return []
  }
  return (data ?? []) as ScheduledFeeding[]
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createScheduledFeeding(
  farmId: string,
  data: CreateScheduledFeedingData,
  userId: string
): Promise<{ success: boolean; data?: ScheduledFeeding; error?: string }> {
  const supabase = await createServerSupabaseClient()

  if (!data.entries || data.entries.length === 0) {
    return { success: false, error: 'At least one feed entry is required' }
  }

  const { data: header, error: headerError } = await supabase
    .from('scheduled_feedings')
    .insert({
      farm_id:              farmId,
      feeding_mode:         data.feedingMode,
      schedule_name:        data.scheduleName ?? null,
      schedule_date_from:   data.scheduledDateFrom,
      schedule_date_to:     data.scheduledDateTo,
      feeding_time:         normaliseTime(data.scheduledTime),
      // scheduled_time kept for backward compat until NOT NULL is dropped in prod
      scheduled_time:       `${data.scheduledDateFrom}T${normaliseTime(data.scheduledTime)}Z`,
      time_slot_id:         data.feedTimeSlotId ?? null,
      slot_name:            data.slotName ?? null,
      ration_id:            data.rationId ?? null,
      recipe_id:            data.recipeId ?? null,
      target_mode:          data.targetMode,
      animal_count:         data.animalCount ?? 1,
      avg_animal_weight_kg: data.avgAnimalWeightKg ?? null,
      status:               'pending',
      notes:                data.notes ?? null,
      created_by:           userId,
    })
    .select('id')
    .single()

  if (headerError) return { success: false, error: headerError.message }

  // Insert per-feed entries
  const entryRows = data.entries.map((e, idx) => ({
    scheduled_feeding_id:   header.id,
    feed_type_id:           e.feedTypeId,
    quantity_kg_per_animal: e.quantityKgPerAnimal,
    cost_per_kg:            e.costPerKg ?? null,
    sort_order:             e.sortOrder ?? idx,
  }))

  const { error: entryError } = await supabase
    .from('scheduled_feeding_entries')
    .insert(entryRows)

  if (entryError) {
    await supabase.from('scheduled_feedings').delete().eq('id', header.id)
    return { success: false, error: `Failed to save feed entries: ${entryError.message}` }
  }

  // Insert category targets
  if (data.targetMode === 'by_category' && data.targetCategoryIds?.length) {
    const rows = data.targetCategoryIds.map(cid => ({
      scheduled_feeding_id: header.id,
      category_id:          cid,
    }))
    const { error: catError } = await supabase
      .from('scheduled_feeding_categories')
      .insert(rows)
    if (catError) {
      await supabase.from('scheduled_feedings').delete().eq('id', header.id)
      return { success: false, error: `Failed to save category targets: ${catError.message}` }
    }
  }

  // Insert specific animal targets
  if (data.targetMode === 'specific' && data.targetAnimalIds?.length) {
    const rows = data.targetAnimalIds.map(aid => ({
      scheduled_feeding_id: header.id,
      animal_id:            aid,
    }))
    const { error: animalError } = await supabase
      .from('scheduled_feeding_animals')
      .insert(rows)
    if (animalError) {
      await supabase.from('scheduled_feedings').delete().eq('id', header.id)
      return { success: false, error: `Failed to save animal targets: ${animalError.message}` }
    }
  }

  const created = await getScheduledFeedingById(farmId, header.id)
  return { success: true, data: created ?? undefined }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateScheduledFeeding(
  farmId: string,
  id: string,
  data: UpdateScheduledFeedingData,
  userId: string
): Promise<{ success: boolean; data?: ScheduledFeeding; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const patch: Record<string, any> = {}
  if (data.scheduleName !== undefined)    patch.schedule_name      = data.scheduleName
  if (data.scheduledDateFrom !== undefined) patch.schedule_date_from = data.scheduledDateFrom
  if (data.scheduledDateTo !== undefined)   patch.schedule_date_to   = data.scheduledDateTo
  if (data.scheduledTime !== undefined)     patch.feeding_time       = normaliseTime(data.scheduledTime)
  if (data.feedTimeSlotId !== undefined)    patch.time_slot_id       = data.feedTimeSlotId
  if (data.slotName !== undefined)          patch.slot_name          = data.slotName
  if (data.notes !== undefined)             patch.notes              = data.notes
  if (data.lateByMinutes !== undefined)     patch.late_by_minutes    = data.lateByMinutes
  if (data.lateReason !== undefined)        patch.late_reason        = data.lateReason
  if (data.completedAt !== undefined)       patch.completed_at       = data.completedAt

  if (data.status !== undefined) {
    patch.status = data.status
    if (data.status === 'completed') {
      patch.completed_at = patch.completed_at ?? new Date().toISOString()
      patch.completed_by = userId
    }
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from('scheduled_feedings')
      .update(patch)
      .eq('id', id)
      .eq('farm_id', farmId)
    if (error) return { success: false, error: error.message }
  }

  // Replace entries
  if (data.entries !== undefined) {
    if (data.entries.length === 0) {
      return { success: false, error: 'At least one feed entry is required' }
    }
    await supabase.from('scheduled_feeding_entries').delete().eq('scheduled_feeding_id', id)
    const rows = data.entries.map((e, idx) => ({
      scheduled_feeding_id:   id,
      feed_type_id:           e.feedTypeId,
      quantity_kg_per_animal: e.quantityKgPerAnimal,
      cost_per_kg:            e.costPerKg ?? null,
      sort_order:             e.sortOrder ?? idx,
    }))
    const { error } = await supabase.from('scheduled_feeding_entries').insert(rows)
    if (error) return { success: false, error: error.message }
  }

  // Replace category targets
  if (data.targetCategoryIds !== undefined) {
    await supabase.from('scheduled_feeding_categories').delete().eq('scheduled_feeding_id', id)
    if (data.targetCategoryIds.length > 0) {
      const rows = data.targetCategoryIds.map(cid => ({ scheduled_feeding_id: id, category_id: cid }))
      const { error } = await supabase.from('scheduled_feeding_categories').insert(rows)
      if (error) return { success: false, error: error.message }
    }
  }

  // Replace animal targets
  if (data.targetAnimalIds !== undefined) {
    await supabase.from('scheduled_feeding_animals').delete().eq('scheduled_feeding_id', id)
    if (data.targetAnimalIds.length > 0) {
      const rows = data.targetAnimalIds.map(aid => ({ scheduled_feeding_id: id, animal_id: aid }))
      const { error } = await supabase.from('scheduled_feeding_animals').insert(rows)
      if (error) return { success: false, error: error.message }
    }
  }

  const updated = await getScheduledFeedingById(farmId, id)
  return { success: true, data: updated ?? undefined }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteScheduledFeeding(
  farmId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { data: sf, error: fetchError } = await supabase
    .from('scheduled_feedings')
    .select('id, status')
    .eq('id', id)
    .eq('farm_id', farmId)
    .single()

  if (fetchError || !sf) {
    return { success: false, error: 'Scheduled feeding not found or access denied' }
  }
  if ((sf as any).status === 'completed') {
    return { success: false, error: 'Cannot delete a completed scheduled feeding' }
  }

  // Child rows cascade-delete via FK; explicit delete guards against missing cascade.
  await supabase.from('scheduled_feeding_entries').delete().eq('scheduled_feeding_id', id)
  await supabase.from('scheduled_feeding_animals').delete().eq('scheduled_feeding_id', id)
  await supabase.from('scheduled_feeding_categories').delete().eq('scheduled_feeding_id', id)

  const { error } = await supabase
    .from('scheduled_feedings')
    .delete()
    .eq('id', id)
    .eq('farm_id', farmId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── COMPLETE (convert to actual consumption record) ─────────────────────────
// Schema: 1 session header in feed_consumption_records + N rows in feed_consumption_feeds

export async function completeScheduledFeeding(
  farmId: string,
  id: string,
  userId: string,
  actualFeedingTime?: string,
  lateReason?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const sf = await getScheduledFeedingById(farmId, id)
  if (!sf) return { success: false, error: 'Scheduled feeding not found' }
  if (sf.status !== 'pending' && sf.status !== 'overdue') {
    return { success: false, error: 'Scheduled feeding is not pending or overdue' }
  }

  const now = new Date()
  const actualTime = actualFeedingTime ? new Date(actualFeedingTime) : now
  if (actualTime > now) {
    return { success: false, error: 'Actual feeding time cannot be in the future' }
  }

  const scheduledRef = new Date(`${sf.schedule_date_from}T${sf.feeding_time}`)
  const lateByMinutes = Math.max(0, Math.floor((actualTime.getTime() - scheduledRef.getTime()) / 60_000))
  const wasLate = lateByMinutes > 0
  if (wasLate && !lateReason?.trim()) {
    return { success: false, error: 'A late reason is required when feeding after scheduled time' }
  }

  const completionNotes = [
    sf.notes,
    wasLate
      ? `Fed ${lateByMinutes} min late${lateReason ? ` — ${lateReason}` : ''}`
      : 'Completed on time',
  ].filter(Boolean).join('\n')

  const consumptionDate = actualTime.toISOString().split('T')[0]
  const entries: ScheduledFeedingEntry[] = sf.scheduled_feeding_entries ?? []

  // Normalize mode: scheduled feedings store 'feed-mix-template'; consumption records use 'feed-mix-recipe'
  const feedingMode: 'individual' | 'ration' | 'feed-mix-recipe' =
    sf.feeding_mode === 'feed-mix-template' ? 'feed-mix-recipe' : sf.feeding_mode as 'individual' | 'ration'

  const totalQtyKg = parseFloat(
    entries.reduce((s, e) => s + e.quantity_kg_per_animal * sf.animal_count, 0).toFixed(3)
  )

  // ── 1. Create ONE session header ───────────────────────────────────────────
  const { data: sessionRecord, error: sessionError } = await (supabase as any)
    .from('feed_consumption_records')
    .insert({
      farm_id:           sf.farm_id,
      consumption_date:  consumptionDate,
      feeding_time:      actualTime.toISOString(),
      feeding_mode:      feedingMode,
      animal_count:      sf.animal_count,
      ration_id:         sf.ration_id ?? null,
      recipe_id:         sf.recipe_id ?? null,
      notes:             completionNotes || null,
      recorded_by:       'System (from schedule)',
      // Legacy scalar columns kept for backward compat
      feed_type_id:      entries[0]?.feed_type_id ?? null,
      quantity_consumed: totalQtyKg,
    })
    .select()
    .single()

  if (sessionError) {
    return { success: false, error: `Failed to create consumption record: ${sessionError.message}` }
  }

  // ── 2. Insert feed line items into feed_consumption_feeds ──────────────────
  const feedRows = entries.map(e => ({
    consumption_id: sessionRecord.id,
    feed_type_id:   e.feed_type_id,
    quantity_kg:    parseFloat((e.quantity_kg_per_animal * sf.animal_count).toFixed(3)),
  }))

  if (feedRows.length > 0) {
    const { error: feedError } = await (supabase as any)
      .from('feed_consumption_feeds')
      .insert(feedRows)
    if (feedError) {
      return { success: false, error: `Failed to save feed details: ${feedError.message}` }
    }
  }

  // ── 3. Link animals ────────────────────────────────────────────────────────
  const animalIds = sf.scheduled_feeding_animals?.map(a => a.animal_id) ?? []
  if (animalIds.length > 0) {
    const qtyPerAnimal = parseFloat((totalQtyKg / animalIds.length).toFixed(4))
    await (supabase as any)
      .from('feed_consumption_animals')
      .insert(animalIds.map(aid => ({
        consumption_id: sessionRecord.id,
        animal_id:      aid,
        quantity_kg:    qtyPerAnimal,
      })))
  }

  // ── 4. Deduct inventory via RPC (same path as direct consumption) ──────────
  for (const feedRow of feedRows.filter(r => r.quantity_kg > 0)) {
    await recordFeedTransactionRPC({
      farmId:          sf.farm_id,
      feedTypeId:      feedRow.feed_type_id,
      transactionType: 'feeding',
      quantityKg:      -feedRow.quantity_kg,
      notes:           completionNotes || 'Scheduled feeding confirmed',
      transactionDate: consumptionDate,
      createdBy:       userId,
    })
  }

  // ── 5. Mark scheduled feeding completed ───────────────────────────────────
  await supabase
    .from('scheduled_feedings')
    .update({
      status:          'completed',
      completed_at:    now.toISOString(),
      completed_by:    userId,
      late_by_minutes: wasLate ? lateByMinutes : null,
      late_reason:     wasLate ? lateReason ?? null : null,
    })
    .eq('id', id)

  // ── 6. Fetch the full record with all related data ────────────────────────
  const { data: fullRecord, error: fetchError } = await (supabase as any)
    .from('feed_consumption_records')
    .select(`
      *,
      feed_consumption_feeds (
        id,
        feed_type_id,
        quantity_kg,
        percentage_of_mix,
        cost_per_kg,
        notes,
        feed_types ( id, name, category_id )
      ),
      feed_consumption_animals (
        id,
        animal_id,
        quantity_kg,
        animals ( id, tag_number, name )
      )
    `)
    .eq('id', sessionRecord.id)
    .single()

  return {
    success: true,
    data: {
      consumptionRecord: fullRecord ?? sessionRecord,
      lateByMinutes:     wasLate ? lateByMinutes : 0,
      wasLate,
      actualFeedingTime: actualTime.toISOString(),
    },
  }
}

// ─── CANCEL ───────────────────────────────────────────────────────────────────

export async function cancelScheduledFeeding(
  farmId: string,
  id: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('scheduled_feedings')
    .update({
      status: 'cancelled',
      notes:  reason ? `Cancelled: ${reason}` : 'Cancelled',
    })
    .eq('id', id)
    .eq('farm_id', farmId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── MARK OVERDUE ─────────────────────────────────────────────────────────────

export async function updateOverdueScheduledFeedings(farmId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const now = new Date()
  // Mark pending feedings overdue if their computed datetime is > 30 min ago.
  // We compare feeding_time against the current time of day; schedule_date_from
  // against today.  Records spanning multi-day ranges are only overdue once
  // their start date has passed.
  await (supabase as any)
    .from('scheduled_feedings')
    .update({ status: 'overdue' })
    .eq('farm_id', farmId)
    .eq('status', 'pending')
    .lte('schedule_date_from', now.toISOString().split('T')[0])
    .lte('feeding_time', new Date(now.getTime() - 30 * 60_000).toTimeString().slice(0, 8))
}
