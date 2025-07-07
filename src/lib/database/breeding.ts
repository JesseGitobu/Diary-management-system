import { createServerSupabaseClient } from '@/lib/supabase/server'
import { BreedingRecord, PregnancyRecord, CalvingRecord, PregnancyRecordInsert } from '@/types/database'

export async function getAnimalBreedingHistory(animalId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('breeding_records')
    .select(`
      *,
      pregnancy_records (
        *,
        calving_records (*)
      )
    `)
    .eq('animal_id', animalId)
    .order('breeding_date', { ascending: false })
  
  if (error) {
    console.error('Error fetching breeding history:', error)
    return []
  }
  
  return data || []
}

export async function createBreedingRecord(farmId: string, breedingData: Omit<BreedingRecord, 'id' | 'farm_id' | 'created_at' | 'updated_at'>) {
  const supabase = await createServerSupabaseClient()
  
  // Clean the data to handle empty UUID fields
  const cleanedData = {
    ...breedingData,
    farm_id: farmId,
    // Convert empty strings to null for UUID fields
    sire_id: breedingData.sire_id === '' ? null : breedingData.sire_id,
    // Convert empty strings to null for optional string fields if they exist
    sire_name: breedingData.sire_name === '' ? null : breedingData.sire_name,
    sire_breed: breedingData.sire_breed === '' ? null : breedingData.sire_breed,
    sire_registration_number: breedingData.sire_registration_number === '' ? null : breedingData.sire_registration_number,
    technician_name: breedingData.technician_name === '' ? null : breedingData.technician_name,
    notes: breedingData.notes === '' ? null : breedingData.notes,
    // Handle numeric fields
    cost: breedingData.cost === undefined || breedingData.cost === 0 ? null : breedingData.cost,
    success_rate: breedingData.success_rate === undefined || breedingData.success_rate === 0 ? null : breedingData.success_rate,
  }
  
  const { data, error } = await supabase
    .from('breeding_records')
    .insert(cleanedData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating breeding record:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function updatePregnancyStatus(
  breedingRecordId: string, 
  animalId: string,
  farmId: string,
  pregnancyData: Partial<Omit<PregnancyRecord, 'id' | 'breeding_record_id' | 'animal_id' | 'farm_id' | 'created_at' | 'updated_at'>>
) {
  const supabase = await createServerSupabaseClient()
  
  // Check if pregnancy record exists
  const { data: existing } = await supabase
    .from('pregnancy_records')
    .select('id')
    .eq('breeding_record_id', breedingRecordId)
    .single()
  
  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('pregnancy_records')
      .update(pregnancyData)
      .eq('id', existing.id)
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } else {
    // Create new pregnancy record with required fields
    const newPregnancyRecord: PregnancyRecordInsert = {
      breeding_record_id: breedingRecordId,
      animal_id: animalId,
      farm_id: farmId,
      ...pregnancyData,
      pregnancy_status: pregnancyData.pregnancy_status ?? 'suspected',
    }
    
    const { data, error } = await supabase
      .from('pregnancy_records')
      .insert(newPregnancyRecord)
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  }
}

export async function recordCalving(calvingData: Omit<CalvingRecord, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Start transaction
    const { data: calvingRecord, error: calvingError } = await supabase
      .from('calving_records')
      .insert(calvingData)
      .select()
      .single()
    
    if (calvingError) throw calvingError
    
    // Update pregnancy status to completed
    const { error: pregnancyError } = await supabase
      .from('pregnancy_records')
      .update({ 
        pregnancy_status: 'completed',
        actual_calving_date: calvingData.calving_date 
      })
      .eq('id', calvingData.pregnancy_record_id)
    
    if (pregnancyError) throw pregnancyError
    
    return { success: true, data: calvingRecord }
  } catch (error) {
    console.error('Error recording calving:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getBreedingCalendar(farmId: string, startDate: string, endDate: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('breeding_calendar')
    .select(`
      *,
      animals (
        tag_number,
        name
      )
    `)
    .eq('farm_id', farmId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true })
  
  if (error) {
    console.error('Error fetching breeding calendar:', error)
    return []
  }
  
  return data || []
}

export async function getBreedingStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get breeding statistics
    const { count: totalBreedings } = await supabase
      .from('breeding_records')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
    
    const { count: currentPregnant } = await supabase
      .from('pregnancy_records')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('pregnancy_status', 'confirmed')
    
    const { count: expectedCalvings } = await supabase
      .from('pregnancy_records')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('pregnancy_status', 'confirmed')
      .gte('expected_calving_date', new Date().toISOString().split('T')[0])
      .lte('expected_calving_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    
    // Calculate conception rate (pregnancies confirmed / total breedings)
    const { data: conceptionData } = await supabase
      .from('breeding_records')
      .select(`
        id,
        pregnancy_records!inner (pregnancy_status)
      `)
      .eq('farm_id', farmId)
    
    const confirmedPregnancies = conceptionData?.filter(
      b => b.pregnancy_records[0]?.pregnancy_status === 'confirmed'
    ).length || 0
    
    const totalBreedingsNumber = totalBreedings ?? 0
    const conceptionRate = totalBreedingsNumber > 0 ? (confirmedPregnancies / totalBreedingsNumber) * 100 : 0
    
    return {
      totalBreedings: totalBreedings || 0,
      currentPregnant: currentPregnant || 0,
      expectedCalvingsThisMonth: expectedCalvings || 0,
      conceptionRate: Math.round(conceptionRate),
    }
  } catch (error) {
    console.error('Error getting breeding stats:', error)
    return {
      totalBreedings: 0,
      currentPregnant: 0,
      expectedCalvingsThisMonth: 0,
      conceptionRate: 0,
    }
  }
}

export async function getAnimalsForBreeding(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  // Get female animals that are:
  // 1. Active
  // 2. Of breeding age (usually 15+ months)
  // 3. Not currently pregnant
  // 4. Not recently calved (unless past voluntary waiting period)
  
  const { data, error } = await supabase
    .from('animals')
    .select(`
      *,
      pregnancy_records!left (
        pregnancy_status,
        expected_calving_date
      )
    `)
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .eq('gender', 'female')
  
  if (error) {
    console.error('Error fetching animals for breeding:', error)
    return []
  }
  
  // Filter out currently pregnant animals
  const breedableAnimals = data?.filter(animal => {
    const hasActivePregnancy = animal.pregnancy_records?.some(
      (p: any) => ['suspected', 'confirmed'].includes(p.pregnancy_status)
    )
    return !hasActivePregnancy
  }) || []
  
  return breedableAnimals
}