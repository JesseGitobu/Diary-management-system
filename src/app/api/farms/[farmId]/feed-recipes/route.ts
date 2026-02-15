// src/app/api/farms/[farmId]/feed-recipes/route.ts

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/farms/[farmId]/feed-recipes
 * List all feed mix recipes for a farm
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params
    const supabase = await createServerSupabaseClient()

    // Verify farm ownership
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id')
      .eq('id', farmId)
      .single()

    if (farmError || !farm) {
      return NextResponse.json(
        { error: 'Farm not found' },
        { status: 404 }
      )
    }

    // Fetch recipes
    const { data: recipes, error: recipesError } = await supabase
      .from('feed_mix_recipes')
      .select('*')
      .eq('farm_id', farmId)
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (recipesError) throw recipesError

    return NextResponse.json({
      success: true,
      recipes: recipes || [],
    })
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/farms/[farmId]/feed-recipes
 * Create a new feed mix recipe
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ farmId: string }> }) {
  try {
    const { farmId } = await params
    const body = await request.json()
    const supabase = await createServerSupabaseClient()

    // Validate required fields
    if (!body.name || !body.ingredients || !Array.isArray(body.ingredients)) {
      return NextResponse.json(
        { error: 'Missing required fields: name, ingredients' },
        { status: 400 }
      )
    }

    // Verify farm ownership
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id')
      .eq('id', farmId)
      .single()

    if (farmError || !farm) {
      return NextResponse.json(
        { error: 'Farm not found' },
        { status: 404 }
      )
    }

    // Create recipe
    const { data: recipe, error: createError } = await supabase
      .from('feed_mix_recipes')
      .insert({
        farm_id: farmId,
        name: body.name,
        description: body.description,
        ingredients: body.ingredients,
        target_nutrition: body.target_nutrition || {},
        applicable_conditions: body.applicable_conditions || {},
        estimated_cost_per_day: body.estimated_cost_per_day || 0,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .select()
      .single()

    if (createError) throw createError

    return NextResponse.json(
      { success: true, recipe },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating recipe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
