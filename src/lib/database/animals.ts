import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'

type Animal = Database['public']['Tables']['animals']['Row']
type AnimalInsert = Database['public']['Tables']['animals']['Insert']

export async function getFarmAnimals(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('animals')
    .select('*')
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching animals:', error)
    return []
  }
  
  return data || []
}

export async function getAnimalById(animalId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('animals')
    .select('*')
    .eq('id', animalId)
    .single()
  
  if (error) {
    console.error('Error fetching animal:', error)
    return null
  }
  
  return data
}

export async function createAnimal(farmId: string, animalData: Omit<AnimalInsert, 'farm_id'>) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('animals')
    .insert({
      ...animalData,
      farm_id: farmId,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating animal:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function updateAnimal(animalId: string, animalData: Partial<AnimalInsert>) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('animals')
    .update(animalData)
    .eq('id', animalId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating animal:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function getAnimalStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  // Get total animals
  const { count: totalAnimals } = await supabase
    .from('animals')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .eq('status', 'active')
  
  // Get animals by gender
  const { data: genderStats } = await supabase
    .from('animals')
    .select('gender')
    .eq('farm_id', farmId)
    .eq('status', 'active')
  
  const femaleCount = genderStats?.filter(a => a.gender === 'female').length || 0
  const maleCount = genderStats?.filter(a => a.gender === 'male').length || 0
  
  return {
    total: totalAnimals || 0,
    female: femaleCount,
    male: maleCount,
  }
}