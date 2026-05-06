// API endpoint: /api/farms/[farmId]/animals/[id]/category-recommendations
// Purpose: Return categories the animal could be transferred to, ranked by fit.
//
// GET response:
//   recommendations: Array<{ category, score, reasons[] }>
//   current_assignment: { category_id, category_name } | null

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function daysBetween(dateStr: string): number {
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  )
}

function scoreCategory(animal: any, category: any, ageDays: number | null): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Production status match (most important criterion)
  const targetStatuses: string[] = category.production_statuses?.length
    ? category.production_statuses
    : category.production_status
      ? [category.production_status]
      : []

  if (targetStatuses.length > 0) {
    if (targetStatuses.includes(animal.production_status)) {
      score += 40
      reasons.push(`Production status matches (${animal.production_status})`)
    } else {
      // Hard fail — production status is required to match
      return { score: 0, reasons: [] }
    }
  }

  // Gender match
  if (category.gender && category.gender !== 'any') {
    if (animal.gender === category.gender) {
      score += 20
      reasons.push(`Gender matches (${animal.gender})`)
    } else {
      return { score: 0, reasons: [] }
    }
  }

  // Age range match
  if (ageDays !== null) {
    const minOk = !category.min_age_days || ageDays >= category.min_age_days
    const maxOk = !category.max_age_days || ageDays <= category.max_age_days
    if (minOk && maxOk) {
      if (category.min_age_days || category.max_age_days) {
        score += 15
        reasons.push(`Age within category range (${ageDays} days)`)
      }
    } else {
      return { score: 0, reasons: [] }
    }
  }

  // Characteristic range checks (partial bonus scoring)
  const chars = category.characteristics || {}

  if (chars.dim_range && animal.days_in_milk != null) {
    const { min, max } = chars.dim_range
    if ((!min || animal.days_in_milk >= min) && (!max || animal.days_in_milk <= max)) {
      score += 10
      reasons.push(`Days in milk (${animal.days_in_milk}) within range`)
    }
  }

  if (chars.milk_yield_range && animal.current_daily_production != null) {
    const { min, max } = chars.milk_yield_range
    if ((!min || animal.current_daily_production >= min) && (!max || animal.current_daily_production <= max)) {
      score += 10
      reasons.push(`Milk yield (${animal.current_daily_production} L) within range`)
    }
  }

  // Bonus: no extra criteria defined (broad category — always a decent fallback)
  const hasCriteria = targetStatuses.length > 0 ||
    category.gender !== 'any' ||
    category.min_age_days ||
    category.max_age_days ||
    Object.keys(chars).some(k => !['lactating', 'pregnant', 'breeding_male', 'growth_phase'].includes(k))

  if (!hasCriteria) {
    score += 5
    reasons.push('Broad category — accepts any qualifying animal')
  }

  return { score, reasons }
}

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ farmId: string; id: string }> }
) {
  try {
    const params = await props.params
    const { farmId, id } = params
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userFarm } = await supabase
      .from('user_roles')
      .select('id')
      .eq('farm_id', farmId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!userFarm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch the animal
    const { data: animal } = await supabase
      .from('animals')
      .select('id, tag_number, name, gender, birth_date, production_status, status')
      .eq('id', id)
      .eq('farm_id', farmId)
      .maybeSingle()

    if (!animal) return NextResponse.json({ error: 'Animal not found' }, { status: 404 })

    const ageDays = (animal as any).birth_date ? daysBetween((animal as any).birth_date) : null

    // Enrich with lactation data
    const { data: lactRec } = await supabase
      .from('lactation_cycle_records')
      .select('days_in_milk, current_average_production')
      .eq('animal_id', id)
      .is('actual_end_date', null)
      .maybeSingle()

    const enrichedAnimal = {
      ...(animal as any),
      age_days: ageDays,
      days_in_milk: (lactRec as any)?.days_in_milk ?? null,
      current_daily_production: (lactRec as any)?.current_average_production ?? null
    }

    // Find the animal's current active assignment
    const { data: currentAssignment } = await (supabase as any)
      .from('animal_category_assignments')
      .select('category_id, animal_categories(name)')
      .eq('animal_id', id)
      .is('removed_at', null)
      .maybeSingle()

    const currentCategoryId = currentAssignment?.category_id ?? null

    // Fetch all active categories for this farm, excluding the current one
    const query = supabase
      .from('animal_categories')
      .select('*')
      .eq('farm_id', farmId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    const { data: categories } = await query

    // Score each candidate category
    const recommendations = (categories || [])
      .filter((cat: any) => cat.id !== currentCategoryId)
      .map((cat: any) => {
        const { score, reasons } = scoreCategory(enrichedAnimal, cat, ageDays)
        return { category: cat, score, reasons }
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)

    return NextResponse.json({
      success: true,
      data: {
        animal: enrichedAnimal,
        current_assignment: currentAssignment
          ? {
              category_id: currentAssignment.category_id,
              category_name: currentAssignment.animal_categories?.name ?? 'Unknown'
            }
          : null,
        recommendations
      }
    })
  } catch (error) {
    console.error('Category recommendations error:', error)
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}
