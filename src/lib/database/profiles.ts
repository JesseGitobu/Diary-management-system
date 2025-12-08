import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function getProfile(userId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }
  
  return data
}

export async function updateProfile(userId: string, updates: {
  full_name?: string
  avatar_url?: string
}) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await (supabase
    .from('profiles') as any)
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating profile:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function createProfile(userId: string, email: string, fullName?: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await (supabase
    .from('profiles') as any)
    .insert({
      id: userId,
      email,
      full_name: fullName || email,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating profile:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function getAllProfiles() {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching all profiles:', error)
    return []
  }
  
  return data || []
}