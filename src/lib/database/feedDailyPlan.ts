// src/lib/database/feedDailyPlan.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlanIngredient {
  feed_type_id: string
  feed_name: string
  qty_per_animal_kg: number
  qty_group_total_kg: number
  is_tmr: boolean
}

export interface PlanSession {
  session_id: string | null
  slot_name: string
  scheduled_time: string | null
  quantity_pct_of_day: number
  ingredients: PlanIngredient[]
}

export interface FeedRationDailyPlan {
  id: string
  farm_id: string
  ration_id: string
  assignment_id: string
  plan_date: string
  animal_count: number
  sessions: PlanSession[]
  total_kg_per_animal: number | null
  total_kg_all_animals: number | null
  estimated_cost_kes: number | null
  is_completed: boolean
  completed_at: string | null
  generated_at: string
  generated_by: string | null
}

export interface GeneratePlanInput {
  farm_id: string
  ration_id: string
  assignment_id: string
  plan_date: string
  animal_count: number
  sessions: PlanSession[]
  total_kg_per_animal?: number
  total_kg_all_animals?: number
  estimated_cost_kes?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build plan sessions from a ration's sessions and ingredient data.
 * Used to pre-compute the JSONB blob stored in feed_ration_daily_plans.
 */
export function buildPlanSessions(
  rationSessions: Array<{
    id: string
    slot_name: string
    feed_time_slots?: { slot_time: string } | null
    quantity_pct_of_day: number
    ingredients: Array<{ feed_type_id: string; feed_name: string; percentage_of_session: number; is_tmr: boolean }>
  }>,
  dailyKgPerAnimal: number,
  animalCount: number
): PlanSession[] {
  return rationSessions.map(session => {
    const sessionKgPerAnimal = (dailyKgPerAnimal * session.quantity_pct_of_day) / 100

    const ingredients: PlanIngredient[] = session.ingredients.map(ing => {
      const ingKgPerAnimal = (sessionKgPerAnimal * ing.percentage_of_session) / 100
      return {
        feed_type_id: ing.feed_type_id,
        feed_name: ing.feed_name,
        qty_per_animal_kg: Math.round(ingKgPerAnimal * 1000) / 1000,
        qty_group_total_kg: Math.round(ingKgPerAnimal * animalCount * 1000) / 1000,
        is_tmr: ing.is_tmr ?? false,
      }
    })

    return {
      session_id: session.id,
      slot_name: session.slot_name,
      scheduled_time: session.feed_time_slots?.slot_time ?? null,
      quantity_pct_of_day: session.quantity_pct_of_day,
      ingredients,
    }
  })
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function getDailyPlan(
  farmId: string,
  assignmentId: string,
  planDate: string
): Promise<FeedRationDailyPlan | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await (supabase as any)
      .from('feed_ration_daily_plans')
      .select('*')
      .eq('farm_id', farmId)
      .eq('assignment_id', assignmentId)
      .eq('plan_date', planDate)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
    return data ?? null
  } catch (err) {
    console.error('getDailyPlan error:', err)
    return null
  }
}

export async function getDailyPlansForFarm(
  farmId: string,
  planDate: string
): Promise<FeedRationDailyPlan[]> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await (supabase as any)
      .from('feed_ration_daily_plans')
      .select('*')
      .eq('farm_id', farmId)
      .eq('plan_date', planDate)
      .order('generated_at')

    if (error) throw error
    return data ?? []
  } catch (err) {
    console.error('getDailyPlansForFarm error:', err)
    return []
  }
}

export async function upsertDailyPlan(
  input: GeneratePlanInput,
  userId: string
): Promise<{ success: boolean; data?: FeedRationDailyPlan; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await (supabase as any)
      .from('feed_ration_daily_plans')
      .upsert(
        {
          farm_id: input.farm_id,
          ration_id: input.ration_id,
          assignment_id: input.assignment_id,
          plan_date: input.plan_date,
          animal_count: input.animal_count,
          sessions: input.sessions,
          total_kg_per_animal: input.total_kg_per_animal ?? null,
          total_kg_all_animals: input.total_kg_all_animals ?? null,
          estimated_cost_kes: input.estimated_cost_kes ?? null,
          generated_at: new Date().toISOString(),
          generated_by: userId,
          is_completed: false,
        },
        { onConflict: 'assignment_id,plan_date' }
      )
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('upsertDailyPlan error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function markPlanCompleted(
  farmId: string,
  planId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await (supabase as any)
      .from('feed_ration_daily_plans')
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq('farm_id', farmId)
      .eq('id', planId)

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('markPlanCompleted error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getIncompletePlans(
  farmId: string,
  asOf?: string
): Promise<FeedRationDailyPlan[]> {
  try {
    const supabase = await createServerSupabaseClient()
    const date = asOf ?? new Date().toISOString().split('T')[0]

    const { data, error } = await (supabase as any)
      .from('feed_ration_daily_plans')
      .select('*')
      .eq('farm_id', farmId)
      .eq('is_completed', false)
      .lte('plan_date', date)
      .order('plan_date')

    if (error) throw error
    return data ?? []
  } catch (err) {
    console.error('getIncompletePlans error:', err)
    return []
  }
}
