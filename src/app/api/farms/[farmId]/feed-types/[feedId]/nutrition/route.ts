// src/app/api/farms/[farmId]/feed-types/[feedId]/nutrition/route.ts

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{
    farmId: string
    feedId: string
  }>
}

/**
 * PATCH /api/farms/[farmId]/feed-types/[feedId]/nutrition
 * Update nutritional data for a feed type
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { farmId, feedId } = await params
    const body = await request.json()
    const supabase = await createServerSupabaseClient()

    // Verify farm ownership and feed exists
    const { data: feedType, error: feedError } = await supabase
      .from('feed_types')
      .select('*')
      .eq('id', feedId)
      .eq('farm_id', farmId)
      .single() as { data: { nutritional_info?: Record<string, unknown> } | null; error: any }

    if (feedError || !feedType) {
      return NextResponse.json(
        { error: 'Feed type not found' },
        { status: 404 }
      )
    }

    // Merge new nutrition data with existing
    const existingNutritionInfo = feedType.nutritional_info || {}
    const updatedNutritionInfo = {
      ...existingNutritionInfo,
      ...body,
      // Clean up undefined values
    }

    // Remove undefined values
    Object.keys(updatedNutritionInfo).forEach(
      key => updatedNutritionInfo[key] === undefined && delete updatedNutritionInfo[key]
    )

    // Update feed type with new nutritional data
    const { data: updatedFeed, error: updateError } = await (supabase
      .from('feed_types') as any)
      .update({
        nutritional_info: updatedNutritionInfo,
        updated_at: new Date().toISOString()
      })
      .eq('id', feedId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      feed: updatedFeed
    })
  } catch (error) {
    console.error('Error updating feed nutrition data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
