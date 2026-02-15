// src/app/api/farms/[farmId]/feed-recommendations/route.ts

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getApplicableRecipes, getAnimalFeedingProfile } from '@/lib/database/feedMixRecipes'

interface RouteParams {
  params: Promise<{
    farmId: string
  }>
}

/**
 * GET /api/farms/[farmId]/feed-recommendations
 * Get feed recommendations for an animal
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { farmId } = await params
    const supabase = await createServerSupabaseClient()
    
    // Get query params
    const searchParams = request.nextUrl.searchParams
    const animalId = searchParams.get('animalId')

    if (!animalId) {
      return NextResponse.json(
        { error: 'animalId parameter required' },
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

    // Get animal's current feeding profile
    const profileResult = await getAnimalFeedingProfile(farmId, animalId)
    if (!profileResult.success || !profileResult.data) {
      return NextResponse.json(
        { error: 'Animal not found' },
        { status: 404 }
      )
    }

    const animalProfile = profileResult.data

    // Get applicable recipes
    const recipesResult = await getApplicableRecipes(farmId, animalProfile)
    if (!recipesResult.success) {
      throw new Error('Failed to get applicable recipes')
    }

    const applicableRecipes = recipesResult.data || []

    // Build recommendations from applicable recipes
    const recommendations = applicableRecipes.map((recipe: any) => {
      const confidence = calculateConfidence(recipe, animalProfile)
      const benefits = getExpectedBenefits(recipe, animalProfile)
      const risks = getPotentialRisks(recipe, animalProfile)

      return {
        id: `rec-${recipe.id}-${Date.now()}`,
        animal_id: animalId,
        farm_id: farmId,
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        trigger_reason: getTriggerReason(animalProfile),
        confidence_score: confidence,
        suggested_feeds: recipe.ingredients.map((ing: any) => ({
          feed_type_id: ing.feed_type_id,
          feed_name: ing.feed_name,
          quantity_kg_per_day: calculateQuantity(ing, animalProfile),
          notes: ing.notes,
        })),
        expected_benefits: benefits,
        potential_risks: risks,
        alternative_recipes: [],
        status: 'pending',
        created_at: new Date().toISOString(),
      }
    })

    // Sort by confidence score (highest first)
    recommendations.sort((a, b) => b.confidence_score - a.confidence_score)

    return NextResponse.json({
      success: true,
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      animalProfile,
    })
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/farms/[farmId]/feed-recommendations/[recommendationId]
 * Update recommendation status
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { farmId } = await params
    const url = new URL(request.url)
    const recId = url.pathname.split('/').pop()
    const body = await request.json()
    const supabase = await createServerSupabaseClient()

    // If status is 'accepted', we should create a feeding plan
    if (body.status === 'accepted') {
      // Store acceptance in recommendations table (if exists) or create a log
      const { error: logError } = await supabase
        .from('feed_recommendation_logs')
        .insert([
          {
            farm_id: farmId,
            recommendation_id: recId,
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          },
        ] as any)
        .select()
        .single()

      if (logError) {
        console.warn('Could not log recommendation acceptance (table may not exist):', logError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Recommendation updated',
    })
  } catch (error) {
    console.error('Error updating recommendation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Helper: Calculate confidence score based on how well recipe matches animal profile
 */
function calculateConfidence(recipe: any, profile: any): number {
  let confidence = 50 // Base confidence

  const cond = recipe.applicable_conditions

  // Check exact matches
  if (cond.production_statuses?.includes(profile.production_status)) {
    confidence += 15
  }

  if (cond.lactation_stage === getLactationStage(profile.days_in_milk)) {
    confidence += 15
  }

  if (profile.pregnancy_weeks !== undefined) {
    const stage = getPregnancyStage(profile.pregnancy_weeks)
    if (cond.pregnancy_stage === stage) {
      confidence += 10
    }
  }

  if (cond.health_statuses?.includes(profile.health_status)) {
    confidence += 10
  }

  // Partial matches
  if (cond.breeding_statuses?.includes(profile.breeding_status)) {
    confidence += 5
  }

  return Math.min(95, confidence)
}

/**
 * Helper: Get trigger reason for recommendation
 */
function getTriggerReason(profile: any): string {
  const { production_status, days_in_milk, pregnancy_weeks, health_status } = profile

  if (production_status === 'lactating' && days_in_milk === 1) {
    return 'Fresh cow - Just calved'
  } else if (production_status === 'lactating' && days_in_milk <= 60) {
    return `Early lactation (day ${days_in_milk})`
  } else if (production_status === 'lactating' && days_in_milk <= 150) {
    return `Peak lactation (day ${days_in_milk})`
  } else if (production_status === 'served' && pregnancy_weeks && pregnancy_weeks < 24) {
    return `Early pregnancy (week ${pregnancy_weeks})`
  } else if (production_status === 'served' && pregnancy_weeks && pregnancy_weeks >= 35) {
    return `Close-up period (week ${pregnancy_weeks})`
  }

  if (health_status === 'sick') {
    return 'Health issue - Therapeutic adjustment'
  }

  return 'Regular feeding optimization'
}

/**
 * Helper: Get expected benefits from recipe for this animal
 */
function getExpectedBenefits(recipe: any, profile: any): string[] {
  const benefits: string[] = []

  if (profile.production_status === 'lactating') {
    if (recipe.target_nutrition.crude_protein_percent >= 16) {
      benefits.push('High protein supports milk production')
    }
    if (recipe.target_nutrition.energy_mcal_per_kg >= 10) {
      benefits.push('High energy supports lactation performance')
    }
  }

  if (profile.production_status === 'served') {
    benefits.push('Supports pregnancy development')
    benefits.push('Prepares for next lactation')
  }

  if (recipe.estimated_cost_per_day < 15) {
    benefits.push('Cost-efficient nutrition')
  }

  return benefits.length > 0 ? benefits : ['Optimized nutrition plan']
}

/**
 * Helper: Get potential risks from recipe
 */
function getPotentialRisks(recipe: any, profile: any): string[] {
  const risks: string[] = []

  if (profile.production_status === 'lactating' && profile.days_in_milk <= 10) {
    if (recipe.target_nutrition.dry_matter_percent < 35) {
      risks.push('May cause SARA in fresh cows')
    }
  }

  if (profile.body_condition_score < 2.5 && recipe.estimated_cost_per_day > 20) {
    risks.push('High cost for thin animal recovery')
  }

  return risks
}

/**
 * Helper: Determine lactation stage
 */
function getLactationStage(daysInMilk: number): string {
  if (daysInMilk <= 60) return 'early'
  if (daysInMilk <= 150) return 'peak'
  return 'late'
}

/**
 * Helper: Determine pregnancy stage
 */
function getPregnancyStage(pregnancyWeeks: number): string {
  if (pregnancyWeeks < 24) return 'early'
  if (pregnancyWeeks < 35) return 'mid'
  if (pregnancyWeeks < 40) return 'late'
  return 'close_up'
}

/**
 * Helper: Calculate feed quantity for ingredient
 */
function calculateQuantity(ingredient: any, profile: any): number {
  // Base from percentage of mix and estimated daily intake
  let estimatedDailyIntake = 20 // kg default

  if (profile.production_status === 'lactating') {
    estimatedDailyIntake = 18 + (profile.daily_milk_production_target * 0.3)
  } else if (profile.production_status === 'dry') {
    estimatedDailyIntake = 12
  }

  return (estimatedDailyIntake * ingredient.percentage_of_mix) / 100
}
