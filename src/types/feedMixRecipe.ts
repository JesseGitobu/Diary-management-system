// src/types/feedMixRecipe.ts

export interface FeedMixRecipeIngredient {
  feed_type_id: string
  feed_name?: string
  percentage_of_mix: number  // 0-100
  priority: 'primary' | 'secondary' | 'supplement'  // feeding order
  min_quantity_kg?: number
  max_quantity_kg?: number
  notes?: string
}

export interface NutritionalProfile {
  dry_matter_percent: number         // % of feed that's dry matter
  crude_protein_percent: number      // % protein
  crude_fiber_percent: number        // % fiber
  energy_mcal_per_kg: number        // metabolizable energy
  fat_percent?: number
  ash_percent?: number
  notes?: string
}

export interface FeedMixRecipe {
  id: string
  farm_id: string
  name: string                        // e.g., "Peak Lactation Ration", "Dry Period Mix"
  description?: string
  active: boolean
  
  // Composition
  ingredients: FeedMixRecipeIngredient[]
  
  // Target nutritional profile this mix provides
  target_nutrition: NutritionalProfile
  
  // When to use this recipe - ALL conditions must match
  applicable_conditions: {
    // Production status filters
    production_statuses: ('calf' | 'heifer' | 'lactating' | 'served' | 'dry')[]
    
    // Lactation stage for lactating animals
    lactation_stage?: 'early' | 'peak' | 'late'  // post calving
    days_in_milk_range?: [number, number]        // [min, max]
    
    // Breeding/pregnancy stage
    breeding_statuses?: ('open' | 'served' | 'close_up' | 'fresh')[]
    pregnancy_stage?: 'early' | 'mid' | 'late' | 'close_up'  // weeks
    pregnancy_weeks_range?: [number, number]     // [min, max]
    
    // Age range
    min_age_days?: number
    max_age_days?: number
    
    // Health conditions
    health_statuses?: string[]  // healthy, sick, recovering, etc
    
    // Body condition
    body_condition_below?: number
    body_condition_above?: number
    
    // Custom conditions
    custom_conditions?: string
  }
  
  // Seasonal adjustments
  seasonal: boolean
  applicable_seasons?: ('spring' | 'summer' | 'fall' | 'winter')[]
  
  // Cost and efficiency
  estimated_cost_per_day?: number
  estimated_milk_yield_liters?: number
  notes?: string
  
  // Audit
  created_by: string
  created_at: string
  updated_at: string
  updated_by?: string
}

export interface FeedMixRecommendation {
  id: string
  farm_id: string
  animal_id: string
  
  recipe_id: string
  recipe_name: string
  
  // Why recommended
  trigger_reason: string               // e.g., "Entered peak lactation (day 15)"
  confidence_score: number             // 0-100 
  alternative_recipes?: string[]       // other viable options
  
  // Suggested feeding plan
  suggested_feeds: Array<{
    feed_type_id: string
    feed_name: string
    quantity_kg_per_day: number
    notes?: string
  }>
  
  expected_benefits: string[]
  potential_risks?: string[]
  
  implementation_date?: string
  status: 'pending' | 'accepted' | 'rejected' | 'implemented'
  
  created_at: string
}

export interface AnimalFeedingProfile {
  animal_id: string
  farm_id: string
  
  // Current state snapshot
  production_status: string
  lactation_number: number
  days_in_milk: number
  breeding_status: string
  pregnancy_stage?: string
  pregnancy_weeks?: number
  
  age_days: number
  current_weight_kg: number
  target_weight_kg: number
  body_condition_score: number
  health_status: string
  
  // Goals
  daily_milk_production_target: number
  daily_gain_target_kg?: number
  
  // Current feeding
  active_recipe_id?: string
  last_feeding_time?: string
  total_daily_feed_kg: number
  total_daily_cost: number
  
  // Recent performance
  actual_milk_yield_last_7d?: number
  weight_change_14d?: number
  health_incidents?: Array<{
    date: string
    issue: string
    resolved: boolean
  }>
  
  updated_at: string
}
