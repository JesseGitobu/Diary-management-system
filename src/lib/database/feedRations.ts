// src/lib/database/feedRations.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FeedRationType {
  id: string
  name: string
  description: string | null
  target_stage: string | null
  sort_order: number
  created_at: string
}

export interface FeedIngredientSession {
  id: string
  ingredient_id: string
  time_slot_id: string | null
  quantity_kg: number
  sort_order: number
  created_at: string
  // joined
  feed_time_slots?: {
    id: string
    slot_name: string
    scheduled_time: string
  } | null
}

export interface FeedRationIngredient {
  id: string
  ration_id: string
  feed_type_id: string | null
  tmr_recipe_id: string | null
  quantity_kg_per_day: number
  percentage: number | null
  sort_order: number
  notes: string | null
  created_at: string
  // joined
  feed_types?: {
    id: string
    name: string
    unit_of_measure: string | null
  } | null
  feed_mix_recipes?: {
    id: string
    name: string
    total_yield: number
    unit_of_measure: string | null
  } | null
  feed_ingredient_sessions?: FeedIngredientSession[]
}

export interface FeedRationAssignment {
  id: string
  farm_id: string
  ration_id: string
  assignment_type: 'animal' | 'group'
  animal_id: string | null
  animal_category_id: string | null
  start_date: string
  end_date: string | null
  is_active: boolean
  notes: string | null
  created_by: string | null
  created_at: string
  // joined
  animals?: {
    id: string
    tag_number: string
    name: string | null
  } | null
  animal_categories?: {
    id: string
    name: string
  } | null
}

export interface FeedRationSession {
  id: string
  ration_id: string
  time_slot_id: string | null
  custom_slot_name: string | null
  custom_time: string | null       // HH:MM format
  quantity_percent: number | null
  sort_order: number
  notes: string | null
  created_at: string
  // joined
  feed_time_slots?: {
    id: string
    slot_name: string
    scheduled_time: string
    days_of_week: number[]
    is_active: boolean
  } | null
}

export interface FeedRation {
  id: string
  farm_id: string
  ration_type_id: string | null
  name: string
  description: string | null
  total_daily_kg: number | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  // joined
  feed_ration_types?: FeedRationType | null
  feed_ration_ingredients?: FeedRationIngredient[]
  feed_ration_assignments?: FeedRationAssignment[]
  feed_ration_sessions?: FeedRationSession[]
  ingredient_count?: number
  assignment_count?: number
  session_count?: number
}

export interface SessionInput {
  time_slot_id?: string | null
  custom_slot_name?: string | null
  custom_time?: string | null
  quantity_percent?: number | null
  sort_order?: number
  notes?: string | null
}

export interface IngredientSessionInput {
  time_slot_id: string
  quantity_kg: number
}

export interface IngredientInput {
  feed_type_id?: string | null
  tmr_recipe_id?: string | null
  quantity_kg_per_day: number
  percentage?: number | null
  sort_order?: number
  notes?: string | null
  sessions?: IngredientSessionInput[]
}

export interface CreateFeedRationData {
  ration_type_id?: string | null
  name: string
  description?: string | null
  total_daily_kg?: number | null
  is_active?: boolean
  start_date?: string | null
  end_date?: string | null
  notes?: string | null
  ingredients: IngredientInput[]
  sessions?: SessionInput[]
}

export interface UpdateFeedRationData {
  ration_type_id?: string | null
  name?: string
  description?: string | null
  total_daily_kg?: number | null
  is_active?: boolean
  start_date?: string | null
  end_date?: string | null
  notes?: string | null
  ingredients?: IngredientInput[]
  sessions?: SessionInput[]
}

export interface CreateAssignmentData {
  assignment_type: 'animal' | 'group'
  animal_id?: string | null
  animal_category_id?: string | null
  start_date?: string
  end_date?: string | null
  notes?: string | null
}

// ─── System-wide Ration Types ────────────────────────────────────────────────

export async function getFeedRationTypes(): Promise<FeedRationType[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('feed_ration_types')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to fetch ration types: ${error.message}`)
  return data ?? []
}

// ─── Feed Rations CRUD ───────────────────────────────────────────────────────

export async function getFeedRations(farmId: string): Promise<FeedRation[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('feed_rations')
    .select(`
      *,
      feed_ration_types ( id, name, description, target_stage, sort_order ),
      feed_ration_ingredients (
        id, ration_id, feed_type_id, tmr_recipe_id, quantity_kg_per_day, percentage, sort_order, notes, created_at,
        feed_types ( id, name, unit_of_measure ),
        feed_mix_recipes ( id, name, total_yield, unit_of_measure, ingredients, target_animals, start_date, end_date ),
        feed_ingredient_sessions ( id, ingredient_id, time_slot_id, quantity_kg, sort_order, created_at, feed_time_slots ( id, slot_name, scheduled_time ) )
      ),
      feed_ration_assignments (
        id, farm_id, ration_id, assignment_type, animal_id, animal_category_id,
        start_date, end_date, is_active, notes, created_by, created_at,
        animals ( id, tag_number, name ),
        animal_categories ( id, name )
      ),
      feed_ration_sessions (
        id, ration_id, time_slot_id, custom_slot_name, custom_time,
        quantity_percent, sort_order, notes, created_at,
        feed_time_slots ( id, slot_name, scheduled_time, days_of_week, is_active )
      )
    `)
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch feed rations: ${error.message}`)
  return (data ?? []).map((r: any) => ({
    ...r,
    ingredient_count: r.feed_ration_ingredients?.length ?? 0,
    assignment_count: r.feed_ration_assignments?.length ?? 0,
    session_count: r.feed_ration_sessions?.length ?? 0,
  })) as FeedRation[]
}

export async function getFeedRationById(
  farmId: string,
  rationId: string
): Promise<FeedRation | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('feed_rations')
    .select(`
      *,
      feed_ration_types ( id, name, description, target_stage, sort_order ),
      feed_ration_ingredients (
        id, ration_id, feed_type_id, tmr_recipe_id, quantity_kg_per_day, percentage, sort_order, notes, created_at,
        feed_types ( id, name, unit_of_measure ),
        feed_mix_recipes ( id, name, total_yield, unit_of_measure, ingredients, target_animals, start_date, end_date ),
        feed_ingredient_sessions ( id, ingredient_id, time_slot_id, quantity_kg, sort_order, created_at, feed_time_slots ( id, slot_name, scheduled_time ) )
      ),
      feed_ration_assignments (
        id, farm_id, ration_id, assignment_type, animal_id, animal_category_id,
        start_date, end_date, is_active, notes, created_by, created_at,
        animals ( id, tag_number, name ),
        animal_categories ( id, name )
      ),
      feed_ration_sessions (
        id, ration_id, time_slot_id, custom_slot_name, custom_time,
        quantity_percent, sort_order, notes, created_at,
        feed_time_slots ( id, slot_name, scheduled_time, days_of_week, is_active )
      )
    `)
    .eq('farm_id', farmId)
    .eq('id', rationId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch ration: ${error.message}`)
  }
  return data
    ? ({
        ...(data as any),
        ingredient_count: (data as any).feed_ration_ingredients?.length ?? 0,
        assignment_count: (data as any).feed_ration_assignments?.length ?? 0,
        session_count: (data as any).feed_ration_sessions?.length ?? 0,
      } as FeedRation)
    : null
}

export async function createFeedRation(
  farmId: string,
  data: CreateFeedRationData,
  userId: string
): Promise<{ success: boolean; data?: FeedRation; error?: string }> {
  const supabase = await createServerSupabaseClient()

  // Validate ingredients
  if (!data.ingredients || data.ingredients.length === 0) {
    return { success: false, error: 'At least one ingredient is required' }
  }

  // 2. Date Inheritance Logic
  let finalStartDate = data.start_date;
  let finalEndDate = data.end_date;

  // If dates are missing, check if any ingredients are TMR recipes that have dates
  const tmrIds = data.ingredients
    .filter(ing => ing.tmr_recipe_id)
    .map(ing => ing.tmr_recipe_id)
    .filter(id => id != null) as string[];

  if (tmrIds.length > 0 && (!finalStartDate || !finalEndDate)) {
    const { data: tmrRecipes } = await supabase
      .from('feed_mix_recipes')
      .select('start_date, end_date')
      .in('id', tmrIds);

    if (tmrRecipes && tmrRecipes.length > 0) {
      // Use dates from the first TMR recipe found if current field is empty
      if (!finalStartDate) finalStartDate = tmrRecipes[0].start_date;
      if (!finalEndDate) finalEndDate = tmrRecipes[0].end_date;
    }
  }


  // Insert ration header
  const { data: ration, error: rationError } = await supabase
    .from('feed_rations')
    .insert({
      farm_id: farmId,
      ration_type_id: data.ration_type_id ?? null,
      name: data.name.trim(),
      description: data.description?.trim() ?? null,
      total_daily_kg: data.total_daily_kg ?? null,
      is_active: data.is_active ?? true,
      start_date: finalStartDate ?? null,
      end_date: finalEndDate ?? null,
      notes: data.notes?.trim() ?? null,
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single()

  if (rationError) {
    if (rationError.code === '23505') {
      return { success: false, error: 'A ration with this name already exists for this farm' }
    }
    return { success: false, error: rationError.message }
  }

  // Insert ingredients
  const ingredientRows = data.ingredients.map((ing, index) => ({
    ration_id: ration.id,
    feed_type_id: ing.feed_type_id ?? null,
    tmr_recipe_id: ing.tmr_recipe_id ?? null,
    quantity_kg_per_day: ing.quantity_kg_per_day,
    percentage: ing.percentage ?? null,
    sort_order: ing.sort_order ?? index,
    notes: ing.notes?.trim() ?? null,
  }))

  const { data: insertedIngredients, error: ingredientError } = await (supabase as any)
    .from('feed_ration_ingredients')
    .insert(ingredientRows)
    .select('id, sort_order')

  if (ingredientError) {
    // Rollback: delete the ration header we just created
    await supabase.from('feed_rations').delete().eq('id', ration.id)
    return { success: false, error: ingredientError.message }
  }

  // Insert per-ingredient sessions
  const sessionRows: any[] = []
  for (const ing of data.ingredients) {
    if (!ing.sessions?.length) continue
    const insertedIng = (insertedIngredients as any[])?.find(
      (r: any) => r.sort_order === (ing.sort_order ?? data.ingredients.indexOf(ing))
    )
    if (!insertedIng) continue
    for (const s of ing.sessions) {
      sessionRows.push({
        ingredient_id: insertedIng.id,
        time_slot_id: s.time_slot_id,
        quantity_kg: s.quantity_kg,
        sort_order: ing.sessions!.indexOf(s),
      })
    }
  }

  if (sessionRows.length > 0) {
    const { error: ingSessionError } = await (supabase as any)
      .from('feed_ingredient_sessions')
      .insert(sessionRows)
    if (ingSessionError) {
      await supabase.from('feed_rations').delete().eq('id', ration.id)
      return { success: false, error: `Failed to save ingredient sessions: ${ingSessionError.message}` }
    }
  }

  // Insert ration-level sessions (optional — no sessions is valid)
  if (data.sessions && data.sessions.length > 0) {
    const sessions = data.sessions.map((s, index) => ({
      ration_id: ration.id,
      time_slot_id: s.time_slot_id ?? null,
      custom_slot_name: s.custom_slot_name?.trim() ?? null,
      custom_time: s.custom_time ?? null,
      quantity_percent: s.quantity_percent ?? null,
      sort_order: s.sort_order ?? index,
      notes: s.notes?.trim() ?? null,
    }))

    const { error: sessionError } = await (supabase as any)
      .from('feed_ration_sessions')
      .insert(sessions)

    if (sessionError) {
      await supabase.from('feed_rations').delete().eq('id', ration.id)
      return { success: false, error: `Failed to save feeding sessions: ${sessionError.message}` }
    }
  }

  // Return the full ration
  const created = await getFeedRationById(farmId, ration.id)
  return { success: true, data: created ?? undefined }
}

export async function updateFeedRation(
  farmId: string,
  rationId: string,
  data: UpdateFeedRationData,
  userId: string
): Promise<{ success: boolean; data?: FeedRation; error?: string }> {
  const supabase = await createServerSupabaseClient()

  // Update header fields
  const updatePayload: Record<string, any> = { updated_by: userId }
  if (data.name !== undefined)           updatePayload.name           = data.name.trim()
  if (data.description !== undefined)    updatePayload.description    = data.description?.trim() ?? null
  if (data.ration_type_id !== undefined) updatePayload.ration_type_id = data.ration_type_id
  if (data.total_daily_kg !== undefined) updatePayload.total_daily_kg = data.total_daily_kg
  if (data.is_active !== undefined)      updatePayload.is_active      = data.is_active
  if (data.start_date !== undefined)     updatePayload.start_date     = data.start_date ?? null
  if (data.end_date !== undefined)       updatePayload.end_date       = data.end_date ?? null
  if (data.notes !== undefined)          updatePayload.notes          = data.notes?.trim() ?? null

  const { error: updateError } = await supabase
    .from('feed_rations')
    .update(updatePayload)
    .eq('id', rationId)
    .eq('farm_id', farmId)

  if (updateError) {
    if (updateError.code === '23505') {
      return { success: false, error: 'A ration with this name already exists for this farm' }
    }
    return { success: false, error: updateError.message }
  }

  // Replace ingredients if provided
  if (data.ingredients !== undefined) {
    if (data.ingredients.length === 0) {
      return { success: false, error: 'At least one ingredient is required' }
    }

    // Delete existing ingredients and re-insert (simpler than diffing)
    const { error: deleteError } = await supabase
      .from('feed_ration_ingredients')
      .delete()
      .eq('ration_id', rationId)

    if (deleteError) return { success: false, error: deleteError.message }

    const ingredientRows = data.ingredients.map((ing, index) => ({
      ration_id: rationId,
      feed_type_id: ing.feed_type_id ?? null,
      tmr_recipe_id: ing.tmr_recipe_id ?? null,
      quantity_kg_per_day: ing.quantity_kg_per_day,
      percentage: ing.percentage ?? null,
      sort_order: ing.sort_order ?? index,
      notes: ing.notes?.trim() ?? null,
    }))

    const { data: insertedIngredients, error: insertError } = await (supabase as any)
      .from('feed_ration_ingredients')
      .insert(ingredientRows)
      .select('id, sort_order')

    if (insertError) return { success: false, error: insertError.message }

    // Insert per-ingredient sessions
    const sessionRows: any[] = []
    for (const ing of data.ingredients) {
      if (!ing.sessions?.length) continue
      const insertedIng = (insertedIngredients as any[])?.find(
        (r: any) => r.sort_order === (ing.sort_order ?? data.ingredients!.indexOf(ing))
      )
      if (!insertedIng) continue
      for (const s of ing.sessions) {
        sessionRows.push({
          ingredient_id: insertedIng.id,
          time_slot_id: s.time_slot_id,
          quantity_kg: s.quantity_kg,
          sort_order: ing.sessions!.indexOf(s),
        })
      }
    }

    if (sessionRows.length > 0) {
      const { error: ingSessionError } = await (supabase as any)
        .from('feed_ingredient_sessions')
        .insert(sessionRows)
      if (ingSessionError) return { success: false, error: `Failed to save ingredient sessions: ${ingSessionError.message}` }
    }
  }

  // Replace sessions if provided (undefined = no change, [] = clear all)
  if (data.sessions !== undefined) {
    const { error: deleteSessionError } = await (supabase as any)
      .from('feed_ration_sessions')
      .delete()
      .eq('ration_id', rationId)

    if (deleteSessionError) return { success: false, error: deleteSessionError.message }

    if (data.sessions.length > 0) {
      const sessions = data.sessions.map((s, index) => ({
        ration_id: rationId,
        time_slot_id: s.time_slot_id ?? null,
        custom_slot_name: s.custom_slot_name?.trim() ?? null,
        custom_time: s.custom_time ?? null,
        quantity_percent: s.quantity_percent ?? null,
        sort_order: s.sort_order ?? index,
        notes: s.notes?.trim() ?? null,
      }))

      const { error: insertSessionError } = await (supabase as any)
        .from('feed_ration_sessions')
        .insert(sessions)

      if (insertSessionError) return { success: false, error: insertSessionError.message }
    }
  }

  const updated = await getFeedRationById(farmId, rationId)
  return { success: true, data: updated ?? undefined }
}

export async function deleteFeedRation(
  farmId: string,
  rationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  // Assignments and ingredients will cascade-delete via FK constraints
  const { error } = await supabase
    .from('feed_rations')
    .delete()
    .eq('id', rationId)
    .eq('farm_id', farmId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ─── Assignments ─────────────────────────────────────────────────────────────

export async function getRationAssignments(
  farmId: string,
  rationId: string
): Promise<FeedRationAssignment[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('feed_ration_assignments')
    .select(`
      *,
      animals ( id, tag_number, name ),
      animal_categories ( id, name )
    `)
    .eq('farm_id', farmId)
    .eq('ration_id', rationId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch assignments: ${error.message}`)
  return (data ?? []) as FeedRationAssignment[]
}

export async function createRationAssignment(
  farmId: string,
  rationId: string,
  data: CreateAssignmentData,
  userId: string
): Promise<{ success: boolean; data?: FeedRationAssignment; error?: string }> {
  const supabase = await createServerSupabaseClient()

  // Validate target based on assignment_type
  if (data.assignment_type === 'animal' && !data.animal_id) {
    return { success: false, error: 'animal_id is required for animal assignments' }
  }
  if (data.assignment_type === 'group' && !data.animal_category_id) {
    return { success: false, error: 'animal_category_id is required for group assignments' }
  }

  const { data: assignment, error } = await supabase
    .from('feed_ration_assignments')
    .insert({
      farm_id: farmId,
      ration_id: rationId,
      assignment_type: data.assignment_type,
      animal_id: data.assignment_type === 'animal' ? data.animal_id : null,
      animal_category_id: data.assignment_type === 'group' ? data.animal_category_id : null,
      start_date: data.start_date ?? new Date().toISOString().split('T')[0],
      end_date: data.end_date ?? null,
      notes: data.notes?.trim() ?? null,
      created_by: userId,
    })
    .select(`
      *,
      animals ( id, tag_number, name ),
      animal_categories ( id, name )
    `)
    .single()

  if (error) {
    if (error.code === '23505') {
      const target = data.assignment_type === 'animal' ? 'animal' : 'group'
      return { success: false, error: `This ration is already assigned to this ${target}` }
    }
    return { success: false, error: error.message }
  }

  return { success: true, data: assignment as FeedRationAssignment }
}

export async function deleteRationAssignment(
  farmId: string,
  assignmentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('feed_ration_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('farm_id', farmId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateRationAssignment(
  farmId: string,
  assignmentId: string,
  data: { end_date?: string | null; is_active?: boolean; notes?: string | null }
): Promise<{ success: boolean; data?: FeedRationAssignment; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: updated, error } = await supabase
    .from('feed_ration_assignments')
    .update(data)
    .eq('id', assignmentId)
    .eq('farm_id', farmId)
    .select(`
      *,
      animals ( id, tag_number, name ),
      animal_categories ( id, name )
    `)
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: updated as FeedRationAssignment }
}
