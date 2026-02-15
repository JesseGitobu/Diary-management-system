// src/lib/database/feedMixRecipes.ts

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { FeedMixRecipe, FeedMixRecommendation, AnimalFeedingProfile } from '@/types/feedMixRecipe'

/**
 * Get all feed mix recipes for a farm
 */
export async function getFarmFeedMixRecipes(farmId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('feed_mix_recipes')
      .select('*')
      .eq('farm_id', farmId)
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching feed mix recipes:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Create a new feed mix recipe
 */
export async function createFeedMixRecipe(recipe: Omit<FeedMixRecipe, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await (supabase
      .from('feed_mix_recipes') as any)
      .insert({
        ...recipe,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error creating feed mix recipe:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Update an existing feed mix recipe
 */
export async function updateFeedMixRecipe(recipeId: string, updates: Partial<FeedMixRecipe>) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await (supabase
      .from('feed_mix_recipes') as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipeId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating feed mix recipe:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Find applicable feed mix recipes for an animal based on current conditions
 */
export async function getApplicableRecipes(
  farmId: string,
  animalProfile: AnimalFeedingProfile
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Fetch all active recipes
    const { data: recipes, error: recipesError } = await supabase
      .from('feed_mix_recipes')
      .select('*')
      .eq('farm_id', farmId)
      .eq('active', true)

    if (recipesError) throw recipesError

    // Filter recipes based on animal profile conditions
    const applicableRecipes = (recipes as FeedMixRecipe[] || []).filter(recipe => {
      const conditions = recipe.applicable_conditions

      // Check production status
      if (conditions.production_statuses && 
          !conditions.production_statuses.includes(animalProfile.production_status as 'served' | 'lactating' | 'dry' | 'heifer' | 'calf')) {
        return false
      }

      // Check lactation stage
      if (conditions.lactation_stage && animalProfile.production_status === 'lactating') {
        const stage = getLactationStage(animalProfile.days_in_milk)
        if (stage !== conditions.lactation_stage) return false
      }

      // Check days in milk range
      if (conditions.days_in_milk_range) {
        const [min, max] = conditions.days_in_milk_range
        if (animalProfile.days_in_milk < min || animalProfile.days_in_milk > max) {
          return false
        }
      }

      // Check breeding status
      if (conditions.breeding_statuses && 
          !conditions.breeding_statuses.includes(animalProfile.breeding_status as 'served' | 'open' | 'close_up' | 'fresh')) {
        return false
      }

      // Check pregnancy stage
      if (conditions.pregnancy_stage && animalProfile.pregnancy_stage) {
        if (animalProfile.pregnancy_stage !== conditions.pregnancy_stage) return false
      }

      // Check pregnancy weeks range
      if (conditions.pregnancy_weeks_range && animalProfile.pregnancy_weeks !== undefined) {
        const [min, max] = conditions.pregnancy_weeks_range
        if (animalProfile.pregnancy_weeks < min || animalProfile.pregnancy_weeks > max) {
          return false
        }
      }

      // Check age range
      if (conditions.min_age_days && animalProfile.age_days < conditions.min_age_days) {
        return false
      }
      if (conditions.max_age_days && animalProfile.age_days > conditions.max_age_days) {
        return false
      }

      // Check health status
      if (conditions.health_statuses && 
          !conditions.health_statuses.includes(animalProfile.health_status)) {
        return false
      }

      // Check body condition
      if (conditions.body_condition_below && 
          animalProfile.body_condition_score >= conditions.body_condition_below) {
        return false
      }
      if (conditions.body_condition_above && 
          animalProfile.body_condition_score <= conditions.body_condition_above) {
        return false
      }

      return true
    })

    return { success: true, data: applicableRecipes }
  } catch (error) {
    console.error('Error finding applicable recipes:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Calculate lactation stage based on days in milk
 */
function getLactationStage(daysInMilk: number): 'early' | 'peak' | 'late' {
  if (daysInMilk <= 60) return 'early'
  if (daysInMilk <= 150) return 'peak'
  return 'late'
}

/**
 * Get animal's current feeding profile for recommendation engine
 */
export async function getAnimalFeedingProfile(
  farmId: string,
  animalId: string
): Promise<{ success: boolean; data?: AnimalFeedingProfile; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()

    // Fetch animal data
    const { data: animal, error: animalError } = await supabase
      .from('animals')
      .select('*')
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single() as any

    if (animalError) throw animalError
    if (!animal) return { success: false, error: 'Animal not found' }

    // Get last breeding event to determine pregnancy
    const { data: lastEvent } = await (supabase
      .from('breeding_events')
      .select('*')
      .eq('animal_id', animalId)
      .order('event_date', { ascending: false })
      .limit(1)
      .single() as any)

    let pregnancyWeeks = 0
    let pregnancyStage: string | undefined
    if (animal.production_status === 'served' && animal.expected_calving_date) {
      const calvingDate = new Date(animal.expected_calving_date)
      const today = new Date()
      const daysRemaining = Math.floor((calvingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      pregnancyWeeks = Math.floor(daysRemaining / 7)
      
      // Estimate current pregnancy weeks (280 day gestation)
      const eventDate = lastEvent ? new Date(lastEvent.event_date) : new Date(animal.service_date || today)
      const daysSinceService = Math.floor((today.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
      pregnancyWeeks = Math.floor(daysSinceService / 7)
      
      if (pregnancyWeeks < 24) pregnancyStage = 'early'
      else if (pregnancyWeeks < 35) pregnancyStage = 'mid'
      else if (pregnancyWeeks < 40) pregnancyStage = 'late'
      else pregnancyStage = 'close_up'
    }

    // Calculate age in days
    const birthDate = animal.birth_date ? new Date(animal.birth_date) : new Date()
    const ageDays = Math.floor((new Date().getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24))

    return {
      success: true,
      data: {
        animal_id: animalId,
        farm_id: farmId,
        production_status: animal.production_status || 'unknown',
        lactation_number: animal.lactation_number || 0,
        days_in_milk: animal.days_in_milk || 0,
        breeding_status: determineBreedingStatus(animal.production_status),
        pregnancy_stage: pregnancyStage,
        pregnancy_weeks: pregnancyWeeks,
        age_days: ageDays,
        current_weight_kg: animal.weight || 0,
        target_weight_kg: animal.target_weight || 550,
        body_condition_score: animal.body_condition_score || 3,
        health_status: animal.health_status || 'healthy',
        daily_milk_production_target: 20,  // Default, would be animal-specific
        total_daily_feed_kg: 0,
        total_daily_cost: 0,
        updated_at: new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('Error getting animal feeding profile:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Helper: Determine breeding status from production status
 */
function determineBreedingStatus(productionStatus: string): string {
  switch (productionStatus) {
    case 'served':
      return 'served'
    case 'lactating':
      return 'open'
    case 'dry':
      return 'open'
    default:
      return 'open'
  }
}

/**
 * Create a feed recommendation for an animal
 */
export async function createFeedRecommendation(
  recommendation: Omit<FeedMixRecommendation, 'id' | 'created_at'>
) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await (supabase
      .from('feed_mix_recommendations') as any)
      .insert({
        ...recommendation,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error creating feed recommendation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Calculate estimated daily nutritional needs based on animal profile
 */
export function calculateNutritionalNeeds(profile: AnimalFeedingProfile) {
  const { production_status, days_in_milk, pregnancy_weeks, age_days, current_weight_kg, daily_milk_production_target } = profile

  // Base metabolic requirement (maintenance) = 0.04 * weight^0.75
  const maintenanceKcal = 0.04 * Math.pow(current_weight_kg, 0.75) * 1000 * 4.184 // Convert to MJ

  let additionalNeeds = 0

  // Lactation needs
  if (production_status === 'lactating' && days_in_milk > 0) {
    // Extra 3 MJ per liter of milk
    const lactationFactor = getLactationFactor(days_in_milk)
    additionalNeeds += daily_milk_production_target * 3 * lactationFactor
  }

  // Growth needs (for heifers)
  if (age_days < 730) {  // Less than 2 years
    const dailyGainTarget = 0.7  // kg/day target gain
    additionalNeeds += dailyGainTarget * 6  // ~6 MJ per kg body gain
  }

  // Pregnancy needs
  if (production_status === 'served' && pregnancy_weeks) {
    if (pregnancy_weeks < 24) {
      additionalNeeds += 0  // First 6 months minimal additional
    } else if (pregnancy_weeks < 35) {
      additionalNeeds += 2  // MJ per day
    } else {
      additionalNeeds += 4  // MJ per day in close-up
    }
  }

  const totalEnergyMJ = maintenanceKcal + additionalNeeds

  // Protein requirement
  let proteinKg = 0.058 * current_weight_kg  // Base maintenance

  if (production_status === 'lactating') {
    const lactationFactor = getLactationFactor(days_in_milk)
    proteinKg += daily_milk_production_target * 0.032 * lactationFactor  // 3.2% protein per liter
  }

  if (age_days < 730) {
    proteinKg += 0.08  // Additional for growth
  }

  // Dry matter intake (% of body weight)
  let dmiPercent = 2.8  // Base for lactating cows
  if (production_status === 'dry') dmiPercent = 1.8
  if (production_status === 'heifer') dmiPercent = 2.5

  const dryMatterKg = (current_weight_kg * dmiPercent) / 100

  return {
    daily_dry_matter_kg: dryMatterKg,
    daily_protein_kg: proteinKg,
    daily_energy_mj: totalEnergyMJ,
    daily_milk_production_target
  }
}

/**
 * Get lactation factor for energy/protein adjustments
 */
function getLactationFactor(daysInMilk: number): number {
  if (daysInMilk <= 60) return 1.2      // Early lactation - 20% higher
  if (daysInMilk <= 150) return 1.0     // Peak - normal
  if (daysInMilk <= 250) return 0.85    // Late - 15% lower
  return 0.7                             // End - 30% lower
}
