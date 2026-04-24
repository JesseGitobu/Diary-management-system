// src/app/api/farms/[farmId]/feed-rations/[rationId]/daily-plan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getDailyPlan,
  getDailyPlansForFarm,
  upsertDailyPlan,
  buildPlanSessions,
  GeneratePlanInput,
} from '@/lib/database/feedDailyPlan'

type Params = { params: Promise<{ farmId: string; rationId: string }> }

/**
 * GET  ?assignment_id=&date=YYYY-MM-DD
 * Returns the pre-computed daily plan for a specific assignment+date,
 * or all farm plans for a given date when no assignment_id is provided.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { farmId } = await params
  const { searchParams } = new URL(req.url)
  const assignmentId = searchParams.get('assignment_id')
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (assignmentId) {
    const plan = await getDailyPlan(farmId, assignmentId, date)
    return NextResponse.json({ plan })
  }

  const plans = await getDailyPlansForFarm(farmId, date)
  return NextResponse.json({ plans })
}

/**
 * POST  — Generate (or regenerate) a daily plan.
 *
 * Body: { assignment_id, plan_date?, animal_count? }
 *
 * The endpoint loads the ration's sessions from the DB, computes the
 * per-session × per-ingredient breakdown, and upserts the plan row.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { farmId, rationId } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { assignment_id, plan_date, animal_count, daily_kg_per_animal, estimated_cost_kes } = body

  if (!assignment_id) {
    return NextResponse.json({ error: 'assignment_id is required' }, { status: 400 })
  }

  // Load ration with sessions and ingredients
  const { data: ration, error: rationError } = await (supabase as any)
    .from('feed_rations')
    .select(`
      id,
      feed_ration_sessions (
        id,
        slot_name,
        quantity_pct_of_day,
        feed_time_slots ( slot_time ),
        feed_ration_session_ingredients (
          feed_type_id,
          percentage_of_session,
          is_tmr,
          feed_types ( name )
        )
      )
    `)
    .eq('id', rationId)
    .eq('farm_id', farmId)
    .single()

  if (rationError || !ration) {
    return NextResponse.json({ error: 'Ration not found' }, { status: 404 })
  }

  const sessions = (ration.feed_ration_sessions ?? []).map((s: any) => ({
    ...s,
    ingredients: (s.feed_ration_session_ingredients ?? []).map((i: any) => ({
      feed_type_id: i.feed_type_id,
      feed_name: i.feed_types?.name ?? '',
      percentage_of_session: i.percentage_of_session,
      is_tmr: i.is_tmr ?? false,
    })),
  }))

  const kgPerAnimal = daily_kg_per_animal ?? 0
  const count = animal_count ?? 1

  const planSessions = buildPlanSessions(sessions, kgPerAnimal, count)

  const totalPerAnimal = planSessions.reduce(
    (sum, s) => sum + s.ingredients.reduce((is, i) => is + i.qty_per_animal_kg, 0),
    0
  )

  const input: GeneratePlanInput = {
    farm_id: farmId,
    ration_id: rationId,
    assignment_id,
    plan_date: plan_date ?? new Date().toISOString().split('T')[0],
    animal_count: count,
    sessions: planSessions,
    total_kg_per_animal: Math.round(totalPerAnimal * 1000) / 1000,
    total_kg_all_animals: Math.round(totalPerAnimal * count * 1000) / 1000,
    estimated_cost_kes: estimated_cost_kes ?? undefined,
  }

  const result = await upsertDailyPlan(input, user.id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ plan: result.data }, { status: 201 })
}
