import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface DiseaseOutbreak {
  id?: string
  farm_id: string
  disease_id: string
  outbreak_date: string
  status?: 'active' | 'contained' | 'resolved'
  affected_animals?: string[]
  suspected_animals?: string[]
  quarantine_area?: string
  notes?: string
  created_by: string
}

export interface AnimalDiseaseRecord {
  id?: string
  animal_id: string
  disease_id: string
  outbreak_id?: string
  diagnosis_date: string
  status?: 'suspected' | 'infected' | 'recovered' | 'deceased'
  symptoms_observed?: string[]
  treatment_plan?: string
  veterinarian_id?: string
  notes?: string
  created_by: string
}

export async function createDiseaseOutbreak(outbreak: DiseaseOutbreak) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('disease_outbreaks')
    .insert(outbreak)
    .select(`
      *,
      disease:diseases_conditions (
        name,
        category,
        is_contagious,
        quarantine_days
      )
    `)
    .single()
  
  if (error) {
    console.error('Error creating disease outbreak:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function getDiseaseOutbreaks(farmId: string, status?: string) {
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('disease_outbreaks')
    .select(`
      *,
      disease:diseases_conditions (
        name,
        category,
        is_contagious,
        symptoms
      ),
      created_by_user:created_by (
        user_metadata
      )
    `)
    .eq('farm_id', farmId)
    .order('outbreak_date', { ascending: false })
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching disease outbreaks:', error)
    return []
  }
  
  return data || []
}

export async function addAnimalToDiseaseOutbreak(
  outbreakId: string, 
  animalId: string, 
  status: 'affected' | 'suspected'
) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get current outbreak data
    const { data: outbreak, error: fetchError } = await supabase
      .from('disease_outbreaks')
      .select('affected_animals, suspected_animals')
      .eq('id', outbreakId)
      .single()
    
    if (fetchError) throw fetchError
    
    // Update appropriate array
    const updates: any = {}
    
    if (status === 'affected') {
      const currentAffected = outbreak.affected_animals || []
      if (!currentAffected.includes(animalId)) {
        updates.affected_animals = [...currentAffected, animalId]
        updates.total_affected = currentAffected.length + 1
      }
    } else {
      const currentSuspected = outbreak.suspected_animals || []
      if (!currentSuspected.includes(animalId)) {
        updates.suspected_animals = [...currentSuspected, animalId]
      }
    }
    
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('disease_outbreaks')
        .update(updates)
        .eq('id', outbreakId)
      
      if (updateError) throw updateError
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error adding animal to outbreak:', error)
    return { success: false, error: error.message }
  }
}

export async function createAnimalDiseaseRecord(record: AnimalDiseaseRecord) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('animal_disease_records')
    .insert(record)
    .select(`
      *,
      disease:diseases_conditions (
        name,
        category
      ),
      animal:animals (
        tag_number,
        name
      )
    `)
    .single()
  
  if (error) {
    console.error('Error creating disease record:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function getAnimalDiseaseHistory(animalId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('animal_disease_records')
    .select(`
      *,
      disease:diseases_conditions (
        name,
        category,
        description
      ),
      veterinarian:veterinarians (
        name,
        practice_name
      )
    `)
    .eq('animal_id', animalId)
    .order('diagnosis_date', { ascending: false })
  
  if (error) {
    console.error('Error fetching disease history:', error)
    return []
  }
  
  return data || []
}

export async function getActiveDiseaseAlerts(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  // Get active outbreaks
  const { data: outbreaks } = await supabase
    .from('disease_outbreaks')
    .select(`
      *,
      disease:diseases_conditions (
        name,
        is_contagious
      )
    `)
    .eq('farm_id', farmId)
    .eq('status', 'active')
  
  // Get overdue health records or suspicious symptoms
  const alerts = []
  
  // Add outbreak alerts
  outbreaks?.forEach(outbreak => {
    alerts.push({
      type: 'outbreak',
      severity: outbreak.disease.is_contagious ? 'high' : 'medium',
      title: `Active ${outbreak.disease.name} outbreak`,
      description: `${outbreak.total_affected || 0} animals affected`,
      date: outbreak.outbreak_date,
      id: outbreak.id
    })
  })
  
  return alerts
}

export async function getAllDiseases() {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('diseases_conditions')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('Error fetching diseases:', error)
    return []
  }
  
  return data || []
}