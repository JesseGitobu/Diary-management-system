import { createServerSupabaseClient } from '@/lib/supabase/server'
import { FarmProfileUpdate, FarmUpdate } from '@/lib/supabase/types'

export async function getOnboardingData(userId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('farm_profiles')
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
    .single()
  
  if (error) {
    console.error('Error getting onboarding data:', error)
    return null
  }
  
  return data
}

export async function saveOnboardingStep(userId: string, stepData: any) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get current profile to find farm_id
    const { data: profile, error: profileError } = await supabase
      .from('farm_profiles')
      .select('farm_id')
      .eq('user_id', userId)
      .single()
    
    if (profileError) {
      console.error('Error getting farm profile:', profileError)
      throw profileError
    }

    if (!profile.farm_id) {
      throw new Error('No farm associated with user')
    }
    
    // Separate farm data from profile data
    const farmData: FarmUpdate = {}
    const profileData: FarmProfileUpdate = {}
    
    // Map fields to correct tables
    if (stepData.farm_name) {
      farmData.name = stepData.farm_name
      profileData.farm_name = stepData.farm_name
    }
    
    if (stepData.location) {
      farmData.location = stepData.location
      profileData.location = stepData.location
    }
    
    if (stepData.farm_type) {
      farmData.farm_type = stepData.farm_type
      // Don't add farm_type to profileData - it doesn't exist in farm_profiles
    }
    
    if (stepData.herd_size) {
      profileData.herd_size = stepData.herd_size
    }
    
    // Add any other profile-specific fields
    // if (stepData.tracking_features) {
    //   // We can store this as JSON in a notes field or create a separate table later
    //   profileData.notes = JSON.stringify({ tracking_features: stepData.tracking_features })
    // }
    
    // Update farm table if we have farm data
    if (Object.keys(farmData).length > 0) {
      farmData.updated_at = new Date().toISOString()
      
      const { error: farmUpdateError } = await supabase
        .from('farms')
        .update(farmData)
        .eq('id', profile.farm_id)
      
      if (farmUpdateError) {
        console.error('Error updating farm:', farmUpdateError)
        throw farmUpdateError
      }
    }
    
    // Update farm profile if we have profile data
    if (Object.keys(profileData).length > 0) {
      profileData.updated_at = new Date().toISOString()
      
      const { error: profileUpdateError } = await supabase
        .from('farm_profiles')
        .update(profileData)
        .eq('user_id', userId)
      
      if (profileUpdateError) {
        console.error('Error updating farm profile:', profileUpdateError)
        throw profileUpdateError
      }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error saving onboarding step:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}

export async function updateCompletionStatus(userId: string, completed: boolean) {
  const supabase = await createServerSupabaseClient()
  
  const { error } = await supabase
    .from('farm_profiles')
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

export async function calculateProgress(userId: string) {
  const data = await getOnboardingData(userId)
  if (!data) return 0
  
  let completedSteps = 0
  const totalSteps = 4 // Reduced to 4 since we simplified the flow
  
  // Step 1: Farm basics (farm name and location)
  if (data.farm_name && data.location) completedSteps++
  
  // Step 2: Farm type
  if (data.farms?.farm_type) completedSteps++
  
  // Step 3: Herd size
  if (data.herd_size && data.herd_size > 0) completedSteps++
  
  // Step 4: Tracking features (if notes contain tracking_features)
  // if (data.notes) {
  //   try {
  //     const parsedNotes = JSON.parse(data.notes)
  //     if (parsedNotes.tracking_features && parsedNotes.tracking_features.length > 0) {
  //       completedSteps++
  //     }
  //   } catch {
  //     // If notes is not JSON, that's ok
  //   }
  // }
  
  const percentage = Math.round((completedSteps / totalSteps) * 100)
  
  // Update the percentage in database
  const supabase = await createServerSupabaseClient()
  await supabase
    .from('farm_profiles')
    .update({ completion_percentage: percentage })
    .eq('user_id', userId)
  
  return percentage
}