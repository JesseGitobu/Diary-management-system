// src/app/api/farms/[farmId]/feed-recipes/[recipeId]/route.ts

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ farmId: string; recipeId: string }> }

/**
 * PUT /api/farms/[farmId]/feed-recipes/[recipeId]
 * Update a TMR recipe
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { farmId, recipeId } = await params
    const body = await request.json()
    const supabase = await createServerSupabaseClient()

    // Verify ownership
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('feed_mix_recipes')
      .select('id')
      .eq('id', recipeId)
      .eq('farm_id', farmId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    // Accept 'name' (new) or 'recipe_name' (legacy) — map to DB column 'name'
    const recipeName = body.name ?? body.recipe_name
    if (recipeName !== undefined)                       updatePayload.name                       = recipeName
    if (body.description !== undefined)                 updatePayload.description                = body.description ?? null
    if (body.total_yield !== undefined)                 updatePayload.total_yield                = body.total_yield
    if (body.unit_of_measure !== undefined)             updatePayload.unit_of_measure            = body.unit_of_measure
    if (body.target_animals !== undefined)              updatePayload.target_animals             = body.target_animals ?? null
    if (body.start_date !== undefined)                  updatePayload.start_date                 = body.start_date ?? null
    if (body.end_date !== undefined)                    updatePayload.end_date                   = body.end_date ?? null
    if (body.ingredients !== undefined)                 updatePayload.ingredients                = body.ingredients
    // Accept 'target_nutrition' (new) or 'nutritional_target' (legacy) — map to DB column 'target_nutrition'
    const nutrition = body.target_nutrition ?? body.nutritional_target
    if (nutrition !== undefined)                        updatePayload.target_nutrition           = nutrition ?? null
    if (body.cost_per_unit !== undefined)               updatePayload.cost_per_unit              = body.cost_per_unit ?? null
    if (body.notes !== undefined)                       updatePayload.notes                      = body.notes ?? null
    if (body.active !== undefined)                      updatePayload.active                     = body.active
    if (body.is_seasonal !== undefined)                 updatePayload.is_seasonal                = body.is_seasonal
    if (body.applicable_seasons !== undefined)          updatePayload.applicable_seasons         = body.applicable_seasons ?? null
    if (body.applicable_conditions !== undefined)       updatePayload.applicable_conditions      = body.applicable_conditions ?? null
    if (body.estimated_cost_per_day !== undefined)      updatePayload.estimated_cost_per_day     = body.estimated_cost_per_day ?? null
    if (body.estimated_milk_yield_liters !== undefined) updatePayload.estimated_milk_yield_liters = body.estimated_milk_yield_liters ?? null

    const { data: updated, error: updateError } = await (supabase as any)
      .from('feed_mix_recipes')
      .update(updatePayload)
      .eq('id', recipeId)
      .eq('farm_id', farmId)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'A TMR recipe with this name already exists' }, { status: 409 })
      }
      throw updateError
    }

    return NextResponse.json({ success: true, recipe: updated })
  } catch (error) {
    console.error('Error updating TMR recipe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/farms/[farmId]/feed-recipes/[recipeId]
 * Delete a TMR recipe
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { farmId, recipeId } = await params
    const supabase = await createServerSupabaseClient()

    const { error: deleteError } = await (supabase as any)
      .from('feed_mix_recipes')
      .delete()
      .eq('id', recipeId)
      .eq('farm_id', farmId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true, message: 'TMR recipe deleted' })
  } catch (error) {
    console.error('Error deleting TMR recipe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
