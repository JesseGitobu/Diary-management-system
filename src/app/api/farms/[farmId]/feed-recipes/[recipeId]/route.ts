// src/app/api/farms/[farmId]/feed-recipes/[recipeId]/route.ts

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PUT /api/farms/[farmId]/feed-recipes/[recipeId]
 * Update a feed mix recipe
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; recipeId: string }> }
) {
  try {
    const { farmId, recipeId } = await params

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const supabase = await createServerSupabaseClient()

    // Verify farm and recipe ownership
    const { data: recipe, error: fetchError } = await supabase
      .from('feed_mix_recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('farm_id', farmId)
      .single()

    if (fetchError || !recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    // Update recipe (let Supabase handle updated_at via trigger)
    const { data: updatedRecipe, error: updateError } = await (supabase
      .from('feed_mix_recipes') as any)
      .update({
        name: body.name || (recipe as any).name,
        description: body.description !== undefined ? body.description : (recipe as any).description,
        ingredients: body.ingredients || (recipe as any).ingredients,
        target_nutrition: body.target_nutrition || (recipe as any).target_nutrition,
        applicable_conditions: body.applicable_conditions || (recipe as any).applicable_conditions,
        is_seasonal: body.is_seasonal !== undefined ? body.is_seasonal : (recipe as any).is_seasonal,
        applicable_seasons: body.applicable_seasons || (recipe as any).applicable_seasons,
        estimated_cost_per_day: body.estimated_cost_per_day ?? (recipe as any).estimated_cost_per_day,
        estimated_milk_yield_liters: body.estimated_milk_yield_liters ?? (recipe as any).estimated_milk_yield_liters,
        // Don't manually set updated_at - let trigger handle it
      })
      .eq('id', recipeId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      recipe: updatedRecipe,
    })
  } catch (error) {
    console.error('Error updating recipe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/farms/[farmId]/feed-recipes/[recipeId]
 * Delete (soft delete) a feed mix recipe
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; recipeId: string }> }
) {
  try {
    const { farmId, recipeId } = await params

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Verify farm and recipe ownership
    const { data: recipe, error: fetchError } = await supabase
      .from('feed_mix_recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('farm_id', farmId)
      .single()

    if (fetchError || !recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    // Soft delete
    const { error: deleteError } = await (supabase
      .from('feed_mix_recipes') as any)
      .update({ active: false })
      .eq('id', recipeId)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: 'Recipe deleted',
    })
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
