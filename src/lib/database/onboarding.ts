// src/lib/database/onboarding.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { FarmProfileUpdate, FarmUpdate } from '@/lib/supabase/types'

export async function saveOnboardingStep(userId: string, stepData: any) {
  const supabase = await createServerSupabaseClient()

  try {
    // Get current profile
    // FIXED: Cast to any to avoid 'never' type inference
    const { data: profile, error: profileError } = await (supabase
      .from('farm_profiles') as any)
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (profileError) throw profileError
    
    // Prepare profile update object
    const profileUpdate: FarmProfileUpdate = {
      updated_at: new Date().toISOString()
    }
    
    // Handle different step types
    switch (stepData.step || 'unknown') {
      case 'farm-basics':
        // Farm basics data
        if (stepData.farm_name) profileUpdate.farm_name = stepData.farm_name
        if (stepData.location) profileUpdate.location = stepData.location
        if (stepData.herd_size) profileUpdate.herd_size = stepData.herd_size
        
        // Update farm table for farm-specific data
        if (stepData.farm_name || stepData.location || stepData.farm_type) {
          const farmUpdate: FarmUpdate = {}
          
          if (stepData.farm_name) farmUpdate.name = stepData.farm_name
          if (stepData.location) farmUpdate.location = stepData.location
          if (stepData.farm_type) farmUpdate.farm_type = stepData.farm_type
          
          const { error: farmUpdateError } = await (supabase
            .from('farms') as any)
            .update(farmUpdate)
            .eq('id', profile.farm_id ?? '')
          
          if (farmUpdateError) throw farmUpdateError
        }
        break
        
      case 'herd-info':
        // Store herd management features as JSON
        if (stepData.tracking_features) {
          profileUpdate.tracking_features = stepData.tracking_features
        }
        break
        
      case 'tracking-setup':
        // Store tracking preferences and schedule
        if (stepData.tracking_preferences) {
          profileUpdate.tracking_preferences = stepData.tracking_preferences
        }
        if (stepData.preferred_schedule) {
          profileUpdate.preferred_schedule = stepData.preferred_schedule
        }
        if (stepData.reminder_time) {
          profileUpdate.reminder_time = stepData.reminder_time
        }
        if (stepData.enable_reminders !== undefined) {
          profileUpdate.enable_reminders = stepData.enable_reminders
        }
        break
        
      case 'goals':
        // Store goals and objectives
        if (stepData.primary_goal) {
          profileUpdate.primary_goal = stepData.primary_goal
        }
        if (stepData.milk_production_target) {
          profileUpdate.milk_production_target = stepData.milk_production_target
        }
        if (stepData.herd_growth_target) {
          profileUpdate.herd_growth_target = stepData.herd_growth_target
        }
        if (stepData.revenue_target) {
          profileUpdate.revenue_target = stepData.revenue_target
        }
        if (stepData.timeline) {
          profileUpdate.goal_timeline = stepData.timeline
        }
        if (stepData.specific_challenges) {
          profileUpdate.specific_challenges = stepData.specific_challenges
        }
        if (stepData.success_metrics) {
          profileUpdate.success_metrics = stepData.success_metrics
        }
        break
        
      default:
        // Handle legacy data or unknown steps
        // Merge any additional fields that match the profile schema
        Object.keys(stepData).forEach(key => {
          if (
            key !== 'step' &&
            stepData[key] !== undefined &&
            key in profileUpdate
          ) {
            (profileUpdate as any)[key] = stepData[key]
          }
        })
        break
    }
    
    // Update farm profile with the prepared data
    const { error: updateError } = await (supabase
      .from('farm_profiles') as any)
      .update(profileUpdate)
      .eq('user_id', userId)
    
    if (updateError) throw updateError
    
    return { success: true }
  } catch (error) {
    console.error('Error saving onboarding step:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// Updated calculateProgress function to handle all steps
export async function calculateProgress(userId: string) {
  const data = await getOnboardingData(userId)
  if (!data) return 0
  
  let completedSteps = 0
  const totalSteps = 5
  
  // Step 1: Farm basics (farm_name, location, herd_size)
  if (data.farm_name && data.location && data.herd_size) {
    completedSteps++
  }
  
  // Step 2: Herd info (tracking_preferences selected)
  if (
    'tracking_preferences' in data &&
    Array.isArray((data as any).tracking_preferences) &&
    (data as any).tracking_preferences.length > 0
  ) {
    completedSteps++
  }
  
  // Step 3: Tracking setup (preferred_schedule set)
  if ('preferred_schedule' in data && (data as any).preferred_schedule) {
    completedSteps++
  }
  
  // Step 4: Goals (primary_goal selected)
  if (data && 'primary_goal' in data && (data as any).primary_goal) {
    completedSteps++
  }
  
  // Step 5: Review (auto-complete when they reach summary or mark as completed)
  if (data.onboarding_completed || completedSteps === 4) {
    completedSteps = 5
  }
  
  const percentage = Math.round((completedSteps / totalSteps) * 100)
  
  // Update the percentage in database
  const supabase = await createServerSupabaseClient()
  await (supabase
    .from('farm_profiles') as any)
    .update({ completion_percentage: percentage })
    .eq('user_id', userId)
  
  return percentage
}

// Helper function to get onboarding data with farm information
export async function getOnboardingData(userId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // First, try to get existing farm profile
    // FIXED: Cast to any
    const { data, error } = await (supabase
      .from('farm_profiles') as any)
      .select(`
        *,
        farms (
          id,
          name,
          location,
          farm_type
        )
      `)
      .eq('user_id', userId)
      .maybeSingle() // Use maybeSingle instead of single
    
    if (error && error.code !== 'PGRST116') {
      // Only throw if it's not a "no rows" error
      console.error('Error getting onboarding data:', error)
      throw error
    }
    
    if (data) {
      console.log('✅ Found existing onboarding data:', data)
      return data
    }
    
    // 🎯 NEW: No farm profile exists yet, check user role
    console.log('🔍 No farm profile found, checking user role for:', userId)
    
    // FIXED: Cast to any
    const { data: userRoleData, error: roleError } = await (supabase
      .from('user_roles') as any)
      .select('role_type, status, farm_id')
      .eq('user_id', userId)
      .single()
    
    const userRole = userRoleData

    if (roleError) {
      console.error('Error getting user role:', roleError)
      return null
    }
    
    console.log('🔍 User role found:', userRole)
    
    // Return minimal data structure for pending setup users
    if (userRole.role_type === 'farm_owner' && userRole.status === 'pending_setup') {
      return {
        user_id: userId,
        farm_id: userRole.farm_id,
        farm_name: null,
        location: null,
        herd_size: null,
        onboarding_completed: false,
        completion_percentage: 0,
        farms: userRole.farm_id ? {
          id: userRole.farm_id,
          name: null,
          location: null,
          farm_type: null
        } : null
      }
    }
    
    return null
    
  } catch (error) {
    console.error('Exception in getOnboardingData:', error)
    return null
  }
}

// Function to update completion status
export async function updateCompletionStatus(userId: string, completed: boolean) {
  const supabase = await createServerSupabaseClient()
  
  const { error } = await (supabase
    .from('farm_profiles') as any)
    .update({ 
      onboarding_completed: completed,
      completion_percentage: completed ? 100 : 0,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
  
  if (error) {
    console.error('Error updating completion status:', error)
    return false
  }
  
  return true
}