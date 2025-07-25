// src/lib/database/outbreaks.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function getFarmOutbreaks(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('disease_outbreaks')
    .select(`
      *,
      affected_animals_count:affected_animals->0
    `)
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching outbreaks:', error)
    return []
  }
  
  return data || []
}

export async function getActiveOutbreaks(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('disease_outbreaks')
    .select('*')
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching active outbreaks:', error)
    return []
  }
  
  return data || []
}

export async function resolveOutbreak(outbreakId: string, resolvedDate: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('disease_outbreaks')
    .update({ 
      status: 'resolved', 
      resolved_date: resolvedDate 
    })
    .eq('id', outbreakId)
    .select()
    .single()
  
  if (error) {
    console.error('Error resolving outbreak:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}