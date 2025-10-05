
// Health Records Database Operations
// src/lib/database/health.ts

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { HealthStats } from '@/types/database'

export interface HealthRecordData {
  animal_id: string
  record_date: string
  record_type: 'vaccination' | 'treatment' | 'checkup' | 'injury' | 'illness' | 'reproductive' | 'deworming'
  description: string
  veterinarian?: string | null
  cost?: number
  notes?: string | null
  next_due_date?: string | null
  medication?: string | null
  severity?: 'low' | 'medium' | 'high' | null
  created_by: string
  farm_id: string
  original_health_status?: string | null
  requires_record_type_selection?: boolean
  available_record_types?: string[]
  root_checkup_id?: string | null
  
  // General checkup fields
  body_condition_score?: number | null
  weight?: number | null
  temperature?: number | null
  pulse?: number | null
  respiration?: number | null
  physical_exam_notes?: string | null
  
  // Vaccination fields
  vaccine_name?: string | null
  vaccine_batch_number?: string | null
  vaccine_dose?: string | null
  route_of_administration?: string | null
  administered_by?: string | null
  
  // Treatment fields
  diagnosis?: string | null
  medication_name?: string | null
  medication_dosage?: string | null
  medication_duration?: string | null
  treatment_route?: string | null
  withdrawal_period?: string | null
  response_notes?: string | null
  treating_personnel?: string | null
  
  // Injury fields
  injury_cause?: string | null
  injury_type?: string | null
  treatment_given?: string | null
  follow_up_required?: boolean
  
  // Illness fields
  illness_diagnosis?: string | null
  illness_severity?: 'mild' | 'moderate' | 'severe' | null
  lab_test_results?: string | null
  treatment_plan?: string | null
  recovery_outcome?: string | null
  
  // Reproductive health fields
  reproductive_type?: string | null
  sire_id?: string | null
  pregnancy_result?: 'yes' | 'no' | 'pending' | null
  calving_outcome?: string | null
  complications?: string | null
  
  // Deworming fields
  product_used?: string | null
  deworming_dose?: string | null
  next_deworming_date?: string | null
  deworming_administered_by?: string | null
}

export async function createHealthRecord(data: HealthRecordData & { 
  is_auto_generated?: boolean 
  completion_status?: string 
}) {
  const supabase = await createServerSupabaseClient()

  try {
    // Verify the animal belongs to the farm
    const { data: animal, error: animalError } = await supabase
      .from('animals')
      .select('id, farm_id')
      .eq('id', data.animal_id)
      .eq('farm_id', data.farm_id)
      .single()
    
    if (animalError || !animal) {
      console.error('Animal verification error:', animalError)
      return { success: false, error: 'Animal not found or access denied' }
    }
    
    // Create the health record with ALL comprehensive fields
    const { data: record, error: recordError } = await supabase
      .from('animal_health_records')
      .insert({
        farm_id: data.farm_id,
        animal_id: data.animal_id,
        record_date: data.record_date,
        record_type: data.record_type,
        description: data.description,
        veterinarian: data.veterinarian,
        cost: data.cost,
        notes: data.notes,
        next_due_date: data.next_due_date,
        medication: data.medication,
        severity: data.severity,
        created_by: data.created_by,
        is_auto_generated: data.is_auto_generated || false,
        completion_status: data.completion_status || 'pending',
        original_health_status: data.original_health_status,
        requires_record_type_selection: data.requires_record_type_selection,
        available_record_types: data.available_record_types,
        root_checkup_id: data.root_checkup_id || null,
        
        // General checkup fields
        body_condition_score: data.body_condition_score,
        weight: data.weight,
        temperature: data.temperature,
        pulse: data.pulse,
        respiration: data.respiration,
        physical_exam_notes: data.physical_exam_notes,
        
        // Vaccination fields
        vaccine_name: data.vaccine_name,
        vaccine_batch_number: data.vaccine_batch_number,
        vaccine_dose: data.vaccine_dose,
        route_of_administration: data.route_of_administration,
        administered_by: data.administered_by,
        
        // Treatment fields
        diagnosis: data.diagnosis,
        medication_name: data.medication_name,
        medication_dosage: data.medication_dosage,
        medication_duration: data.medication_duration,
        treatment_route: data.treatment_route,
        withdrawal_period: data.withdrawal_period,
        response_notes: data.response_notes,
        treating_personnel: data.treating_personnel,
        
        // Injury fields
        injury_cause: data.injury_cause,
        injury_type: data.injury_type,
        treatment_given: data.treatment_given,
        follow_up_required: data.follow_up_required,
        
        // Illness fields
        illness_diagnosis: data.illness_diagnosis,
        illness_severity: data.illness_severity,
        lab_test_results: data.lab_test_results,
        treatment_plan: data.treatment_plan,
        recovery_outcome: data.recovery_outcome,
        
        // Reproductive health fields
        reproductive_type: data.reproductive_type,
        sire_id: data.sire_id,
        pregnancy_result: data.pregnancy_result,
        calving_outcome: data.calving_outcome,
        complications: data.complications,
        
        // Deworming fields
        product_used: data.product_used,
        deworming_dose: data.deworming_dose,
        next_deworming_date: data.next_deworming_date,
        deworming_administered_by: data.deworming_administered_by
      })
      .select(`
        *,
        animals!animal_health_records_animal_id_fkey (
          id,
          tag_number,
          name,
          breed
        )
      `)
      .single()
    
    if (recordError) {
      console.error('Error creating health record:', recordError)
      return { success: false, error: recordError.message }
    }

    // Update the health attention tracking table
    if (data.is_auto_generated) {
      await supabase
        .from('animals_requiring_health_attention')
        .update({
          health_record_id: record.id,
          health_record_created: true,
          health_record_completed: false
        })
        .eq('animal_id', data.animal_id)
        .eq('farm_id', data.farm_id)
    }
    
    return { success: true, data: record }
  } catch (error) {
    console.error('Error in createHealthRecord:', error)
    return { success: false, error: 'Failed to create health record' }
  }
}

// Add this function to your health.ts file
export async function markHealthAttentionCompleted(animalId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .from('animals_requiring_health_attention')
      .update({
        health_record_completed: true,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('animal_id', animalId)
      .eq('farm_id', farmId)
      .select()
      .single()
    
    if (error) {
      console.error('Error marking health attention completed:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('Error in markHealthAttentionCompleted:', error)
    return { success: false, error: 'Failed to mark health attention as completed' }
  }
}

export async function getAnimalHealthRecords(
  farmId: string, 
  options: {
    animalId?: string
    recordType?: string
    limit?: number
  } = {}
) {
  const supabase = await createServerSupabaseClient()

  try {
    // Get farm animals first to ensure we only get records for farm animals
    const { data: farmAnimals, error: animalError } = await supabase
      .from('animals')
      .select('id')
      .eq('farm_id', farmId)
      .eq('status', 'active')

    if (animalError) {
      console.error('Error fetching farm animals:', animalError)
      return []
    }

    const animalIds = (farmAnimals || []).map(animal => animal.id)
    
    if (animalIds.length === 0) {
      return []
    }

    let query = supabase
      .from('animal_health_records')
      .select(`
        *,
        animals!animal_health_records_animal_id_fkey (
          id,
          tag_number,
          name,
          breed,
          gender
        )
      `)
      .in('animal_id', animalIds)
      .eq('is_follow_up', false) // ADD THIS LINE - Only get original records
      .order('record_date', { ascending: false })
    
    if (options.animalId) {
      query = query.eq('animal_id', options.animalId)
    }
    
    if (options.recordType) {
      query = query.eq('record_type', options.recordType)
    }
    
    if (options.limit) {
      query = query.limit(options.limit)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching health records:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getAnimalHealthRecords:', error)
    return []
  }
}

export async function getHealthRecordById(recordId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('animal_health_records')
    .select(`
      *,
      animals!animal_health_records_animal_id_fkey (
        id,
        tag_number,
        name,
        breed,
        gender,
        farm_id
      )
    `)
    .eq('id', recordId)
    .eq('animals.farm_id', farmId)
    .single()
  
  if (error) {
    console.error('Error fetching health record:', error)
    return null
  }
  
  return data
}

export async function updateHealthRecord(
  recordId: string, 
  farmId: string, 
  updates: Partial<HealthRecordData>
) {
  const supabase = await createServerSupabaseClient()

  try {
    // Verify the record belongs to the farm
    const existingRecord = await getHealthRecordById(recordId, farmId)
    
    if (!existingRecord) {
      return { success: false, error: 'Health record not found or access denied' }
    }
    
    const { data, error } = await supabase
      .from('animal_health_records')
      .update(updates)
      .eq('id', recordId)
      .select(`
        *,
        animals (
          id,
          tag_number,
          name,
          breed
        )
      `)
      .single()
    
    if (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('Error updating health record:', error)
    return { success: false, error: 'Failed to update health record' }
  }
}

export async function deleteHealthRecord(recordId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Verify the record belongs to the farm
    const existingRecord = await getHealthRecordById(recordId, farmId)
    
    if (!existingRecord) {
      return { success: false, error: 'Health record not found or access denied' }
    }
    
    const { error } = await supabase
      .from('animal_health_records')
      .delete()
      .eq('id', recordId)
    
    if (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting health record:', error)
    return { success: false, error: 'Failed to delete health record' }
  }
}

export async function getUpcomingHealthTasks(farmId: string, days: number = 30) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)
    
    // First get animals for the farm
    const { data: farmAnimals, error: animalError } = await supabase
      .from('animals')
      .select('id')
      .eq('farm_id', farmId)
      .eq('status', 'active')

    if (animalError) {
      console.error('Error fetching farm animals for tasks:', animalError)
      return []
    }

    const animalIds = (farmAnimals || []).map(animal => animal.id)
    
    if (animalIds.length === 0) {
      return []
    }

    const { data, error } = await supabase
      .from('animal_health_records')
      .select(`
        *,
        animals!animal_health_records_animal_id_fkey (
          id,
          tag_number,
          name,
          breed
        )
      `)
      .in('animal_id', animalIds)
      .not('next_due_date', 'is', null)
      .lte('next_due_date', futureDate.toISOString().split('T')[0])
      .gte('next_due_date', new Date().toISOString().split('T')[0])
      .order('next_due_date', { ascending: true })
    
    if (error) {
      console.error('Error fetching upcoming health tasks:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getUpcomingHealthTasks:', error)
    return []
  }
}

export async function getHealthStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get farm animals first
    const { data: farmAnimals, error: animalError } = await supabase
      .from('animals')
      .select('id')
      .eq('farm_id', farmId)
      .eq('status', 'active')

    if (animalError) {
      console.error('Error fetching farm animals for stats:', animalError)
    }

    const animalIds = (farmAnimals || []).map(animal => animal.id)
    
    // Get total health records for farm animals
    const { count: totalRecords } = await supabase
      .from('animal_health_records')
      .select('*', { count: 'exact', head: true })
      .in('animal_id', animalIds)

    // Get veterinarians registered
    const { count: totalVeterinarians } = await supabase
      .from('veterinarians')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)

    // Get protocols records
    const { count: totalProtocols } = await supabase
      .from('health_protocols')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)

    // Get outbreaks reported
    const { count: totalOutbreaks } = await supabase
      .from('disease_outbreaks')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)

    // Get vaccinations administered
    const { count: totalVaccinations } = await supabase
      .from('vaccinations')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
    
    // Get upcoming tasks
    const upcomingTasks = await getUpcomingHealthTasks(farmId, 30)
    
    return {
      totalHealthRecords: totalRecords || 0,
      veterinariansRegistered: totalVeterinarians || 0,
      protocolsRecorded: totalProtocols || 0,
      outbreaksReported: totalOutbreaks || 0,
      vaccinationsAdministered: totalVaccinations || 0,
      upcomingTasks: upcomingTasks.length,
      // Additional stats for enhanced features (will be 0 until migration runs)
      incompleteRecords: 0,
      autoGeneratedRecords: 0,
      overdueFollowUps: 0,
      resolvedIssues: 0,
      animalsNeedingAttention: 0
    }
  } catch (error) {
    console.error('Error getting health stats:', error)
    return {
      totalHealthRecords: 0,
      veterinariansRegistered: 0,
      protocolsRecorded: 0,
      outbreaksReported: 0,
      vaccinationsAdministered: 0,
      upcomingTasks: 0,
      incompleteRecords: 0,
      autoGeneratedRecords: 0,
      overdueFollowUps: 0,
      resolvedIssues: 0,
      animalsNeedingAttention: 0
    }
  }
}


export async function getHealthRecordsByAnimal(animalId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('animal_health_records')
    .select(`
      *,
      animals!animal_health_records_animal_id_fkey (
        id,
        tag_number,
        name,
        breed,
        farm_id
      )
    `)
    .eq('animal_id', animalId)
    .eq('animals.farm_id', farmId)
    .order('record_date', { ascending: false })
  
  if (error) {
    console.error('Error fetching animal health records:', error)
    return []
  }
  
  return data || []
}


export async function createVeterinaryVisit(farmId: string, visitData: any) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Create the visit
    const { data: visit, error: visitError } = await supabase
      .from('veterinary_visits')
      .insert({
        farm_id: farmId,
        visit_type: visitData.visit_type,
        visit_purpose: visitData.visit_purpose,
        scheduled_datetime: visitData.scheduled_datetime,
        duration_hours: visitData.duration_hours,
        veterinarian_name: visitData.veterinarian_name,
        veterinarian_clinic: visitData.veterinarian_clinic,
        veterinarian_phone: visitData.veterinarian_phone,
        veterinarian_email: visitData.veterinarian_email,
        priority_level: visitData.priority_level,
        location_details: visitData.location_details,
        special_instructions: visitData.special_instructions,
        estimated_cost: visitData.estimated_cost,
        preparation_notes: visitData.preparation_notes,
        send_reminder: visitData.send_reminder,
        reminder_days_before: visitData.reminder_days_before,
      })
      .select()
      .single()

    if (visitError) throw visitError

    // Associate animals if specified
    if (visitData.animals_involved && visitData.animals_involved.length > 0) {
      const animalAssociations = visitData.animals_involved.map((animalId: string) => ({
        visit_id: visit.id,
        animal_id: animalId
      }))

      const { error: animalsError } = await supabase
        .from('visit_animals')
        .insert(animalAssociations)

      if (animalsError) throw animalsError
    }

    return { success: true, data: visit }
  } catch (error) {
    console.error('Error creating veterinary visit:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getVeterinaryVisits(farmId: string, options: {
  status?: string | null
  upcoming?: boolean
  limit?: number
} = {}) {
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('veterinary_visits')
    .select(`
      *,
      visit_animals (
        animal_id,
        animals (
          id,
          name,
          tag_number
        )
      ),
      veterinarians (
        id,
        name,
        clinic_name,
        phone_primary,
        email
      )
    `)
    .eq('farm_id', farmId)

  // Apply filters
  if (options.status) {
    query = query.eq('status', options.status)
  }

  if (options.upcoming) {
    query = query.gte('scheduled_datetime', new Date().toISOString())
  }

  // Order and limit
  query = query
    .order('scheduled_datetime', { ascending: false })
    .limit(options.limit || 50)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching veterinary visits:', error)
    return []
  }

  return data || []
}

export async function getUpcomingVisits(farmId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('veterinary_visits')
    .select(`
      *,
      visit_animals (
        animals (
          name,
          tag_number
        )
      )
    `)
    .eq('farm_id', farmId)
    .eq('status', 'scheduled')
    .gte('scheduled_datetime', new Date().toISOString())
    .order('scheduled_datetime', { ascending: true })
    .limit(10)

  if (error) {
    console.error('Error fetching upcoming visits:', error)
    return []
  }

  return data || []
}

export async function getFollowUpVisits(farmId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('veterinary_visits')
    .select(`
      *,
      visit_animals (
        animals (
          name,
          tag_number
        )
      )
    `)
    .eq('farm_id', farmId)
    .eq('follow_up_required', true)
    .lte('follow_up_date', new Date().toISOString())
    .order('follow_up_date', { ascending: true })
    .limit(10)

  if (error) {
    console.error('Error fetching follow-up visits:', error)
    return []
  }

  return data || []
}

export async function createVaccination(farmId: string, vaccinationData: any) {
  const supabase = await createServerSupabaseClient()
  
  try {
    console.log('Creating vaccination for farm:', farmId)
    console.log('Raw vaccination data:', vaccinationData)
    
    // Clean and validate data before insertion
    const cleanedData = {
      farm_id: farmId,
      vaccine_name: vaccinationData.vaccine_name?.trim(),
      vaccine_type: vaccinationData.vaccine_type,
      manufacturer: vaccinationData.manufacturer?.trim() || null,
      batch_number: vaccinationData.batch_number?.trim() || null,
      vaccination_date: vaccinationData.vaccination_date || null,
      next_due_date: vaccinationData.next_due_date?.trim() || null,
      route_of_administration: vaccinationData.route_of_administration,
      dosage: vaccinationData.dosage?.trim(),
      vaccination_site: vaccinationData.vaccination_site?.trim() || null,
      veterinarian: vaccinationData.veterinarian?.trim() || null,
      cost_per_dose: vaccinationData.cost_per_dose || null,
      total_cost: vaccinationData.total_cost || null,
      side_effects: vaccinationData.side_effects?.trim() || null,
      notes: vaccinationData.notes?.trim() || null,
      create_reminder: vaccinationData.create_reminder ?? true,
    }
    
    // Validate required fields
    if (!cleanedData.vaccine_name) {
      throw new Error('Vaccine name is required')
    }
    if (!cleanedData.vaccination_date) {
      throw new Error('Vaccination date is required')
    }
    if (!cleanedData.dosage) {
      throw new Error('Dosage is required')
    }
    
    // Validate date formats
    if (cleanedData.vaccination_date && isNaN(Date.parse(cleanedData.vaccination_date))) {
      throw new Error('Invalid vaccination date format')
    }
    if (cleanedData.next_due_date && isNaN(Date.parse(cleanedData.next_due_date))) {
      throw new Error('Invalid next due date format')
    }
    
    console.log('Cleaned vaccination data:', cleanedData)
    
    // Create vaccination record
    const { data: vaccination, error: vaccinationError } = await supabase
      .from('vaccinations')
      .insert(cleanedData)
      .select()
      .single()

    if (vaccinationError) {
      console.error('Error creating vaccination:', vaccinationError)
      throw vaccinationError
    }

    console.log('Vaccination created successfully:', vaccination.id)

    // Associate with animals if any are selected
    if (vaccinationData.selected_animals && vaccinationData.selected_animals.length > 0) {
      console.log('Associating with animals:', vaccinationData.selected_animals)
      
      const animalAssociations = vaccinationData.selected_animals.map((animalId: string) => ({
        vaccination_id: vaccination.id,
        animal_id: animalId
      }))

      const { error: animalsError } = await supabase
        .from('vaccination_animals')
        .insert(animalAssociations)

      if (animalsError) {
        console.error('Error associating animals:', animalsError)
        // Clean up the vaccination record if animal association fails
        await supabase.from('vaccinations').delete().eq('id', vaccination.id)
        throw animalsError
      }
      
      console.log('Animals associated successfully')
    }

    return { success: true, data: vaccination }
  } catch (error) {
    console.error('Error in createVaccination:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}



export async function getVaccinations(farmId: string, filters: {
  limit?: number
  offset?: number
  animalId?: string
  vaccineType?: string
  startDate?: string
  endDate?: string
} = {}) {
  const supabase = await createServerSupabaseClient()
  
  try {
    let query = supabase
      .from('vaccinations')
      .select(`
        *,
        vaccination_animals (
          animal_id,
          animals (
            id,
            name,
            tag_number
          )
        )
      `)
      .eq('farm_id', farmId)
      .order('vaccination_date', { ascending: false })

    // Apply filters
    if (filters.vaccineType) {
      query = query.eq('vaccine_type', filters.vaccineType)
    }

    if (filters.startDate) {
      query = query.gte('vaccination_date', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('vaccination_date', filters.endDate)
    }

    // For animal-specific filter, we need a different approach
    if (filters.animalId) {
      const { data: animalVaccinations } = await supabase
        .from('vaccination_animals')
        .select('vaccination_id')
        .eq('animal_id', filters.animalId)

      const vaccinationIds = animalVaccinations?.map(v => v.vaccination_id) || []
      
      if (vaccinationIds.length > 0) {
        query = query.in('id', vaccinationIds)
      } else {
        // No vaccinations for this animal
        return { success: true, data: [], total: 0 }
      }
    }

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching vaccinations:', error)
      throw error
    }

    return { success: true, data: data || [], total: count || 0 }
  } catch (error) {
    console.error('Error in getVaccinations:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error), data: [], total: 0 }
  }
}

export async function getVaccinationById(vaccinationId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('vaccinations')
    .select(`
      *,
      vaccination_animals (
        animal_id,
        animals (
          id,
          name,
          tag_number,
          breed,
          gender
        )
      )
    `)
    .eq('id', vaccinationId)
    .eq('farm_id', farmId)
    .single()

  if (error) {
    console.error('Error fetching vaccination:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }

  return { success: true, data }
}

export async function updateVaccination(vaccinationId: string, farmId: string, updateData: any) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('vaccinations')
      .update(updateData)
      .eq('id', vaccinationId)
      .eq('farm_id', farmId)
      .select()
      .single()

    if (error) {
      console.error('Error updating vaccination:', error)
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in updateVaccination:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function deleteVaccination(vaccinationId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    // Delete associated animal records first (CASCADE should handle this, but being explicit)
    await supabase
      .from('vaccination_animals')
      .delete()
      .eq('vaccination_id', vaccinationId)

    // Delete the vaccination record
    const { error } = await supabase
      .from('vaccinations')
      .delete()
      .eq('id', vaccinationId)
      .eq('farm_id', farmId)

    if (error) {
      console.error('Error deleting vaccination:', error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteVaccination:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}


export async function scheduleVisitReminder(visitId: string, daysBefore: number) {
  // This is a placeholder for reminder scheduling
  // In a production app, you might use a job queue or scheduled functions
  console.log(`Reminder scheduled for visit ${visitId}, ${daysBefore} days before`)
  
  // You could implement this with:
  // 1. Database triggers
  // 2. Scheduled functions (like Supabase Edge Functions with cron)
  // 3. External services like AWS EventBridge or Google Cloud Scheduler
  // 4. Background job processors like Bull/BullMQ
}



// Similar functions for outbreaks and protocols...
// Additional Database Operations for Follow-up functionality
// Add these functions to your existing src/lib/database/health.ts

export async function createFollowUpRecord(
  originalRecordId: string,
  farmId: string,
  followUpData: {
    record_date: string
    status: 'improving' | 'stable' | 'worsening' | 'recovered' | 'requires_attention'
    description: string
    veterinarian?: string
    cost?: number
    notes?: string
    next_followup_date?: string
    medication_changes?: string
    treatment_effectiveness?: 'very_effective' | 'effective' | 'somewhat_effective' | 'not_effective'
    resolved?: boolean
    
    // Allow all comprehensive fields in follow-ups too
    body_condition_score?: number
    weight?: number
    temperature?: number
    pulse?: number
    respiration?: number
    physical_exam_notes?: string
    vaccine_name?: string
    vaccine_batch_number?: string
    vaccine_dose?: string
    route_of_administration?: string
    administered_by?: string
    diagnosis?: string
    medication_name?: string
    medication_dosage?: string
    medication_duration?: string
    treatment_route?: string
    withdrawal_period?: string
    response_notes?: string
    treating_personnel?: string
    injury_cause?: string
    injury_type?: string
    treatment_given?: string
    follow_up_required?: boolean
    illness_diagnosis?: string
    illness_severity?: 'mild' | 'moderate' | 'severe'
    lab_test_results?: string
    treatment_plan?: string
    recovery_outcome?: string
    reproductive_type?: string
    sire_id?: string
    pregnancy_result?: 'yes' | 'no' | 'pending'
    calving_outcome?: string
    complications?: string
    product_used?: string
    deworming_dose?: string
    next_deworming_date?: string
    deworming_administered_by?: string
  },
  userId: string
) {
  const supabase = await createServerSupabaseClient()

  try {
    // First verify the original record exists and belongs to the farm
    const { data: originalRecord, error: originalError } = await supabase
      .from('animal_health_records')
      .select('id, farm_id, animal_id')
      .eq('id', originalRecordId)
      .eq('farm_id', farmId)
      .single()
    
    if (originalError || !originalRecord) {
      return { success: false, error: 'Original record not found or access denied' }
    }
    
    // Create the follow-up record with comprehensive fields
    const { data: record, error: recordError } = await supabase
      .from('animal_health_records')
      .insert({
        farm_id: farmId,
        animal_id: originalRecord.animal_id,
        record_date: followUpData.record_date,
        record_type: 'treatment', // Follow-ups are typically treatments/checkups
        description: followUpData.description,
        veterinarian: followUpData.veterinarian || null,
        cost: followUpData.cost || 0,
        notes: followUpData.notes || null,
        next_due_date: followUpData.next_followup_date || null,
        medication: followUpData.medication_changes || null,
        treatment: followUpData.medication_changes || null,
        created_by: userId,
        is_follow_up: true,
        is_resolved: followUpData.resolved || false,
        resolved_date: followUpData.resolved ? followUpData.record_date : null,
        
        // Include comprehensive fields
        body_condition_score: followUpData.body_condition_score,
        weight: followUpData.weight,
        temperature: followUpData.temperature,
        pulse: followUpData.pulse,
        respiration: followUpData.respiration,
        physical_exam_notes: followUpData.physical_exam_notes,
        vaccine_name: followUpData.vaccine_name,
        vaccine_batch_number: followUpData.vaccine_batch_number,
        vaccine_dose: followUpData.vaccine_dose,
        route_of_administration: followUpData.route_of_administration,
        administered_by: followUpData.administered_by,
        diagnosis: followUpData.diagnosis,
        medication_name: followUpData.medication_name,
        medication_dosage: followUpData.medication_dosage,
        medication_duration: followUpData.medication_duration,
        treatment_route: followUpData.treatment_route,
        withdrawal_period: followUpData.withdrawal_period,
        response_notes: followUpData.response_notes,
        treating_personnel: followUpData.treating_personnel,
        injury_cause: followUpData.injury_cause,
        injury_type: followUpData.injury_type,
        treatment_given: followUpData.treatment_given,
        follow_up_required: followUpData.follow_up_required,
        illness_diagnosis: followUpData.illness_diagnosis,
        illness_severity: followUpData.illness_severity,
        lab_test_results: followUpData.lab_test_results,
        treatment_plan: followUpData.treatment_plan,
        recovery_outcome: followUpData.recovery_outcome,
        reproductive_type: followUpData.reproductive_type,
        sire_id: followUpData.sire_id,
        pregnancy_result: followUpData.pregnancy_result,
        calving_outcome: followUpData.calving_outcome,
        complications: followUpData.complications,
        product_used: followUpData.product_used,
        deworming_dose: followUpData.deworming_dose,
        next_deworming_date: followUpData.next_deworming_date,
        deworming_administered_by: followUpData.deworming_administered_by
      })
      .select(`
        *,
        animals!animal_health_records_animal_id_fkey (
          id,
          tag_number,
          name,
          breed
        )
      `)
      .single()
    
    if (recordError) {
      console.error('Error creating follow-up record:', recordError)
      return { success: false, error: recordError.message }
    }
    
    // Create the relationship in the junction table
    const { error: relationError } = await supabase
      .from('health_record_follow_ups')
      .insert({
        original_record_id: originalRecordId,
        follow_up_record_id: record.id,
        status: followUpData.status,
        treatment_effectiveness: followUpData.treatment_effectiveness || null,
        is_resolved: followUpData.resolved || false
      })
    
    if (relationError) {
      console.error('Error creating follow-up relationship:', relationError)
      // Clean up the follow-up record if relationship creation fails
      await supabase
        .from('animal_health_records')
        .delete()
        .eq('id', record.id)
      
      return { success: false, error: 'Failed to create follow-up relationship' }
    }
    
    // If this follow-up marks the record as resolved, update the original record
    if (followUpData.resolved) {
      await supabase
        .from('animal_health_records')
        .update({
          is_resolved: true,
          resolved_date: followUpData.record_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalRecordId)
        .eq('farm_id', farmId)
    }
    
    // If there's a next follow-up date, update the original record's next_due_date
    if (followUpData.next_followup_date && !followUpData.resolved) {
      await supabase
        .from('animal_health_records')
        .update({
          next_due_date: followUpData.next_followup_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalRecordId)
        .eq('farm_id', farmId)
    }
    
    // Return the follow-up with additional metadata
    const enrichedFollowUp = {
      ...record,
      follow_up_status: followUpData.status,
      treatment_effectiveness: followUpData.treatment_effectiveness || null,
      is_resolved: followUpData.resolved || false
    }
    
    return { success: true, data: enrichedFollowUp }
  } catch (error) {
    console.error('Error in createFollowUpRecord:', error)
    return { success: false, error: 'Failed to create follow-up record' }
  }
}

export async function deleteHealthRecordWithFollowUps(recordId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Verify the record belongs to the farm
    const existingRecord = await getHealthRecordById(recordId, farmId)
    
    if (!existingRecord) {
      return { success: false, error: 'Health record not found or access denied' }
    }
    
    // Get all follow-up records to delete them as well
    const { data: followUpRelations } = await supabase
      .from('health_record_follow_ups')
      .select('follow_up_record_id')
      .eq('original_record_id', recordId)
    
    const followUpIds = followUpRelations?.map(rel => rel.follow_up_record_id) || []
    
    // Delete follow-up relationships first
    await supabase
      .from('health_record_follow_ups')
      .delete()
      .eq('original_record_id', recordId)
    
    // Delete follow-up records
    if (followUpIds.length > 0) {
      await supabase
        .from('animal_health_records')
        .delete()
        .in('id', followUpIds)
    }
    
    // Delete the original record
    const { error } = await supabase
      .from('animal_health_records')
      .delete()
      .eq('id', recordId)
      .eq('farm_id', farmId)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting health record with follow-ups:', error)
    return { success: false, error: 'Failed to delete health record' }
  }
}

export async function getUnresolvedHealthRecords(farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    // Get farm animals first
    const { data: farmAnimals, error: animalError } = await supabase
      .from('animals')
      .select('id')
      .eq('farm_id', farmId)
      .eq('status', 'active')

    if (animalError) {
      console.error('Error fetching farm animals:', animalError)
      return []
    }

    const animalIds = (farmAnimals || []).map(animal => animal.id)
    
    if (animalIds.length === 0) {
      return []
    }

    const { data, error } = await supabase
      .from('animal_health_records')
      .select(`
        *,
        animals!animal_health_records_animal_id_fkey (
          id,
          tag_number,
          name,
          breed
        )
      `)
      .in('animal_id', animalIds)
      .in('record_type', ['illness', 'injury', 'treatment'])
      .eq('is_follow_up', false) // Only original records, not follow-ups
      .or('is_resolved.is.null,is_resolved.eq.false')
      .order('record_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching unresolved health records:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getUnresolvedHealthRecords:', error)
    return []
  }
}

export async function getHealthStatsWithFollowUps(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get basic stats
    const basicStats = await getHealthStats(farmId)
    
    // Get farm animals first
    const { data: farmAnimals, error: animalError } = await supabase
      .from('animals')
      .select('id')
      .eq('farm_id', farmId)
      .eq('status', 'active')

    if (animalError) {
      console.error('Error fetching farm animals for stats:', animalError)
    }

    const animalIds = (farmAnimals || []).map(animal => animal.id)
    
    // Get additional follow-up stats
    const { data: followUpData } = await supabase
      .from('animal_health_records')
      .select('id, is_resolved, is_follow_up, record_type')
      .in('animal_id', animalIds)
    
    // Get follow-up relationships count
    const { count: totalFollowUpRelations } = await supabase
      .from('health_record_follow_ups')
      .select('*', { count: 'exact', head: true })
      .in('original_record_id', 
        followUpData?.filter(r => !r.is_follow_up).map(r => r.id) || []
      )
    
    const followUpStats = {
      totalFollowUps: totalFollowUpRelations || 0,
      unresolvedIssues: followUpData?.filter(r => 
        ['illness', 'injury', 'treatment'].includes(r.record_type) && 
        !r.is_follow_up &&
        !r.is_resolved
      ).length || 0,
      resolvedIssues: followUpData?.filter(r => 
        !r.is_follow_up && r.is_resolved
      ).length || 0,
      recordsWithFollowUps: followUpData?.filter(r => !r.is_follow_up).length || 0
    }
    
    return {
      ...basicStats,
      ...followUpStats
    }
  } catch (error) {
    console.error('Error in getHealthStatsWithFollowUps:', error)
    return {
      ...(await getHealthStats(farmId)),
      totalFollowUps: 0,
      unresolvedIssues: 0,
      resolvedIssues: 0,
      recordsWithFollowUps: 0
    }
  }
}

export async function getFollowUpRecords(originalRecordId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    // Get follow-up relationships first
    const { data: followUpRelations, error: relationsError } = await supabase
      .from('health_record_follow_ups')
      .select(`
        follow_up_record_id,
        status,
        treatment_effectiveness,
        is_resolved,
        created_at,
        updated_at
      `)
      .eq('original_record_id', originalRecordId)
      .order('created_at', { ascending: false }) // Most recent first

    if (relationsError) {
      console.error('Error fetching follow-up relations:', relationsError)
      return []
    }

    if (!followUpRelations || followUpRelations.length === 0) {
      return []
    }

    // Get the actual health records for the follow-ups
    const followUpIds = followUpRelations.map(rel => rel.follow_up_record_id)
    
    const { data: followUpRecords, error: recordsError } = await supabase
      .from('animal_health_records')
      .select('*')
      .in('id', followUpIds)
      .eq('farm_id', farmId)
      .order('record_date', { ascending: false }) // Most recent first

    if (recordsError) {
      console.error('Error fetching follow-up records:', recordsError)
      return []
    }

    // Combine the follow-up data with the relation data
    // This is the KEY FIX - match the structure expected by HealthRecordCard
    const enrichedFollowUps = (followUpRecords || []).map(record => {
      const relation = followUpRelations.find(rel => rel.follow_up_record_id === record.id)
      return {
        id: record.id,
        record_date: record.record_date,
        description: record.description,
        veterinarian: record.veterinarian,
        cost: record.cost,
        notes: record.notes,
        medication: record.medication,
        follow_up_status: relation?.status || 'stable',
        treatment_effectiveness: relation?.treatment_effectiveness,
        is_resolved: relation?.is_resolved || false,
        created_at: record.created_at,
        next_followup_date: record.next_due_date
      }
    })

    return enrichedFollowUps
  } catch (error) {
    console.error('Error in getFollowUpRecords:', error)
    return []
  }
}

export async function getHealthRecordsWithFollowUps(
  farmId: string, 
  options: {
    animalId?: string
    recordType?: string
    limit?: number
  } = {}
) {
  const supabase = await createServerSupabaseClient()

  try {
    // Get farm animals first to ensure we only get records for farm animals
    const { data: farmAnimals, error: animalError } = await supabase
      .from('animals')
      .select('id')
      .eq('farm_id', farmId)
      .eq('status', 'active')

    if (animalError) {
      console.error('Error fetching farm animals:', animalError)
      return []
    }

    const animalIds = (farmAnimals || []).map(animal => animal.id)
    
    if (animalIds.length === 0) {
      return []
    }

    let query = supabase
      .from('animal_health_records')
      .select(`
        *,
        animals!animal_health_records_animal_id_fkey (
          id,
          tag_number,
          name,
          breed,
          gender
        )
      `)
      .in('animal_id', animalIds)
      .eq('is_follow_up', false) // Only get original records, not follow-ups
      .order('record_date', { ascending: false })
    
    if (options.animalId) {
      query = query.eq('animal_id', options.animalId)
    }
    
    if (options.recordType) {
      query = query.eq('record_type', options.recordType)
    }
    
    if (options.limit) {
      query = query.limit(options.limit)
    }
    
    const { data: records, error } = await query
    
    if (error) {
      console.error('Error fetching health records:', error)
      return []
    }
    
    if (!records || records.length === 0) {
      return []
    }

    // For each record, get its follow-ups (if needed)
    // This part stays the same as the existing implementation
    return records
  } catch (error) {
    console.error('Error in getHealthRecordsWithFollowUps:', error)
    return []
  }
}

export async function getUnresolvedHealthIssues(farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('animal_health_records')
      .select(`
        *,
        animals (
          id,
          tag_number,
          name,
          breed
        )
      `)
      .eq('farm_id', farmId)
      .in('record_type', ['illness', 'injury', 'treatment'])
      .or('is_resolved.is.null,is_resolved.eq.false')
      .order('record_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching unresolved health issues:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getUnresolvedHealthIssues:', error)
    return []
  }
}

export async function markHealthIssueResolved(recordId: string, farmId: string, resolvedDate: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('animal_health_records')
      .update({
        is_resolved: true,
        resolved_date: resolvedDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .eq('farm_id', farmId)
      .select()
      .single()
    
    if (error) {
      console.error('Error marking health issue resolved:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('Error in markHealthIssueResolved:', error)
    return { success: false, error: 'Failed to mark health issue as resolved' }
  }
}

export async function getHealthRecordStats(farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    // Get basic stats
    const basicStats = await getHealthStats(farmId)
    
    // Get additional follow-up stats
    const { data: followUpData } = await supabase
      .from('animal_health_records')
      .select('id, is_resolved, is_follow_up, record_type')
      .eq('farm_id', farmId)
    
    const followUpStats = {
      totalFollowUps: followUpData?.filter(r => r.is_follow_up).length || 0,
      unresolvedIssues: followUpData?.filter(r => 
        ['illness', 'injury', 'treatment'].includes(r.record_type) && 
        !r.is_resolved
      ).length || 0,
      resolvedIssues: followUpData?.filter(r => r.is_resolved).length || 0
    }
    
    return {
      ...basicStats,
      ...followUpStats
    }
  } catch (error) {
    console.error('Error in getHealthRecordStats:', error)
    return {
      ...await getHealthStats(farmId),
      totalFollowUps: 0,
      unresolvedIssues: 0,
      resolvedIssues: 0
    }
  }
}

// Add these functions to your src/lib/database/health.ts file

export async function getVeterinaryVisitById(visitId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('veterinary_visits')
      .select(`
        *,
        visit_animals (
          animal_id,
          animals (
            id,
            name,
            tag_number,
            breed,
            gender
          )
        ),
        veterinarians (
          id,
          name,
          clinic_name,
          phone_primary,
          email
        )
      `)
      .eq('id', visitId)
      .eq('farm_id', farmId)
      .single()

    if (error) {
      console.error('Error fetching veterinary visit:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in getVeterinaryVisitById:', error)
    return { success: false, error: 'Failed to fetch veterinary visit' }
  }
}

export async function updateVeterinaryVisit(visitId: string, farmId: string, updateData: any) {
  const supabase = await createServerSupabaseClient()

  try {
    // First verify the visit belongs to this farm
    const existingVisit = await getVeterinaryVisitById(visitId, farmId)
    
    if (!existingVisit.success) {
      return { success: false, error: 'Veterinary visit not found or access denied' }
    }

    // Clean the update data to remove any fields that shouldn't be updated
    const allowedFields = [
      'visit_type',
      'visit_purpose', 
      'scheduled_datetime',
      'duration_hours',
      'veterinarian_name',
      'veterinarian_clinic',
      'veterinarian_phone',
      'veterinarian_email',
      'priority_level',
      'location_details',
      'special_instructions',
      'estimated_cost',
      'preparation_notes',
      'send_reminder',
      'reminder_days_before',
      'status',
      'completion_notes',
      'actual_cost',
      'services_performed',
      'follow_up_required',
      'follow_up_date',
      'notes'
    ]

    const cleanedData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key]
        return obj
      }, {} as any)

    // Add updated timestamp
    cleanedData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('veterinary_visits')
      .update(cleanedData)
      .eq('id', visitId)
      .eq('farm_id', farmId)
      .select(`
        *,
        visit_animals (
          animal_id,
          animals (
            id,
            name,
            tag_number
          )
        )
      `)
      .single()

    if (error) {
      console.error('Error updating veterinary visit:', error)
      throw error
    }

    // Update animal associations if provided
    if (updateData.animals_involved) {
      // Remove existing associations
      await supabase
        .from('visit_animals')
        .delete()
        .eq('visit_id', visitId)

      // Add new associations
      if (updateData.animals_involved.length > 0) {
        const animalAssociations = updateData.animals_involved.map((animalId: string) => ({
          visit_id: visitId,
          animal_id: animalId
        }))

        const { error: animalsError } = await supabase
          .from('visit_animals')
          .insert(animalAssociations)

        if (animalsError) {
          console.error('Error updating visit animals:', animalsError)
          // Continue anyway, don't fail the whole update
        }
      }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in updateVeterinaryVisit:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function deleteVeterinaryVisit(visitId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    // First verify the visit belongs to this farm
    const existingVisit = await getVeterinaryVisitById(visitId, farmId)
    
    if (!existingVisit.success) {
      return { success: false, error: 'Veterinary visit not found or access denied' }
    }

    // Delete animal associations first (should cascade, but being explicit)
    await supabase
      .from('visit_animals')
      .delete()
      .eq('visit_id', visitId)

    // Delete the visit
    const { error } = await supabase
      .from('veterinary_visits')
      .delete()
      .eq('id', visitId)
      .eq('farm_id', farmId)

    if (error) {
      console.error('Error deleting veterinary visit:', error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteVeterinaryVisit:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function markVisitCompleted(visitId: string, farmId: string, completionData: {
  completion_notes?: string
  actual_cost?: number
  services_performed?: string[]
  follow_up_required?: boolean
  follow_up_date?: string
  completed_by?: string
}) {
  const supabase = await createServerSupabaseClient()

  try {
    const updateData = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      ...completionData,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('veterinary_visits')
      .update(updateData)
      .eq('id', visitId)
      .eq('farm_id', farmId)
      .select()
      .single()

    if (error) {
      console.error('Error marking visit completed:', error)
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in markVisitCompleted:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function cancelVisit(visitId: string, farmId: string, reason?: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const updateData = {
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('veterinary_visits')
      .update(updateData)
      .eq('id', visitId)
      .eq('farm_id', farmId)
      .select()
      .single()

    if (error) {
      console.error('Error cancelling visit:', error)
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in cancelVisit:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// Add these functions to your src/lib/database/health.ts

// Create automatic health record for concerning health statuses
export async function createAutoHealthRecord(
  farmId: string,
  animalId: string,
  healthStatus: string,
  animal: any,
  userId: string
) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const recordData = {
      farm_id: farmId,
      animal_id: animalId,
      record_date: new Date().toISOString().split('T')[0],
      record_type: getRecordTypeFromHealthStatus(healthStatus),
      description: generateHealthDescription(healthStatus, animal),
      severity: getSeverityFromHealthStatus(healthStatus),
      created_by: userId,
      // Mark as auto-generated for tracking
      notes: 'Auto-generated health record - please complete details',
      is_auto_generated: true
    }
    
    const { data, error } = await supabase
      .from('animal_health_records')
      .insert(recordData)
      .select(`
        *,
        animals (
          id,
          tag_number,
          name,
          breed
        )
      `)
      .single()
    
    if (error) {
      console.error('Error creating auto health record:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('Error in createAutoHealthRecord:', error)
    return { success: false, error: 'Failed to create automatic health record' }
  }
}

// Helper functions for health record generation
function getRecordTypeFromHealthStatus(healthStatus: string): string {
  switch (healthStatus) {
    case 'sick':
      return 'illness'
    case 'requires_attention':
      return 'checkup'
    case 'quarantined':
      return 'illness'
    default:
      return 'checkup'
  }
}

function getSeverityFromHealthStatus(healthStatus: string): string {
  switch (healthStatus) {
    case 'sick':
      return 'medium'
    case 'requires_attention':
      return 'low'
    case 'quarantined':
      return 'high'
    default:
      return 'low'
  }
}

function generateHealthDescription(healthStatus: string, animal: any): string {
  const animalName = animal.name || `Animal ${animal.tag_number}`
  
  switch (healthStatus) {
    case 'sick':
      return `${animalName} registered with sick status - requires medical evaluation and treatment`
    case 'requires_attention':
      return `${animalName} requires health attention - needs assessment and monitoring`
    case 'quarantined':
      return `${animalName} placed in quarantine - potential health concern requiring isolation`
    default:
      return `Health status assessment needed for ${animalName}`
  }
}

// Get incomplete health records for notifications
export async function getIncompleteHealthRecords(farmId: string, limit: number = 10) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .from('animal_health_records')
      .select(`
        id,
        animal_id,
        record_date,
        record_type,
        description,
        severity,
        created_at,
        veterinarian,
        symptoms,
        medication,
        cost,
        notes,
        is_auto_generated,
        animals!animal_health_records_animal_id_fkey (
          id,
          tag_number,
          name,
          breed,
          farm_id,
          status
        )
      `)
      .eq('animals.farm_id', farmId)
      .eq('animals.status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit * 2) // Get more records to filter from
    
    if (error) {
      console.error('Error fetching incomplete health records:', error)
      return []
    }
    
    // Filter for records that appear incomplete
    const incompleteRecords = (data || []).filter(record => {
      // Auto-generated records are always considered incomplete
      if (record.is_auto_generated) {
        return true
      }
      
      // Consider a record incomplete if it has minimal information
      const hasMinimalInfo = !record.veterinarian && 
                            !record.symptoms && 
                            !record.medication && 
                            !record.cost &&
                            (!record.notes || record.notes.length < 50 || 
                             record.notes === 'Auto-generated health record - please complete details')
      
      // Check if description suggests auto-generation
      const isAutoGenerated = record.description && (
        record.description.includes('registered with') ||
        record.description.includes('requires medical evaluation') ||
        record.description.includes('needs assessment') ||
        record.description.includes('potential health concern')
      )
      
      return hasMinimalInfo || isAutoGenerated
    })
    
    return incompleteRecords.slice(0, limit)
  } catch (error) {
    console.error('Error in getIncompleteHealthRecords:', error)
    return []
  }
}

// Check if an animal needs immediate health attention
export async function checkAnimalHealthStatus(animalId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get the animal's current health status
    const { data: animal, error: animalError } = await supabase
      .from('animals')
      .select('id, health_status, tag_number, name')
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single()
    
    if (animalError || !animal) {
      return { needsAttention: false, reason: null }
    }
    
    // Check for concerning health statuses
    const concerningStatuses = ['sick', 'requires_attention', 'quarantined']
    
    if (animal.health_status && concerningStatuses.includes(animal.health_status)) {
      // Check if there's already a recent health record
      const { data: recentRecords } = await supabase
        .from('animal_health_records')
        .select('id, record_date')
        .eq('animal_id', animalId)
        .eq('farm_id', farmId)
        .gte('record_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('record_date', { ascending: false })
        .limit(1)
      
      const hasRecentRecord = recentRecords && recentRecords.length > 0
      
      return {
        needsAttention: true,
        reason: animal.health_status,
        hasRecentRecord,
        animal
      }
    }
    
    return { needsAttention: false, reason: null }
  } catch (error) {
    console.error('Error checking animal health status:', error)
    return { needsAttention: false, reason: null }
  }
}

// Update health record with complete information
export async function completeHealthRecord(
  recordId: string,
  farmId: string,
  completionData: {
    symptoms?: string
    veterinarian?: string
    medication?: string
    cost?: number
    next_due_date?: string
    notes?: string
    severity?: string
    treatment?: string
    
    // Include comprehensive fields
    body_condition_score?: number
    weight?: number
    temperature?: number
    pulse?: number
    respiration?: number
    physical_exam_notes?: string
    vaccine_name?: string
    vaccine_batch_number?: string
    vaccine_dose?: string
    route_of_administration?: string
    administered_by?: string
    diagnosis?: string
    medication_name?: string
    medication_dosage?: string
    medication_duration?: string
    treatment_route?: string
    withdrawal_period?: string
    response_notes?: string
    treating_personnel?: string
    injury_cause?: string
    injury_type?: string
    treatment_given?: string
    follow_up_required?: boolean
    illness_diagnosis?: string
    illness_severity?: 'mild' | 'moderate' | 'severe'
    lab_test_results?: string
    treatment_plan?: string
    recovery_outcome?: string
    reproductive_type?: string
    sire_id?: string
    pregnancy_result?: 'yes' | 'no' | 'pending'
    calving_outcome?: string
    complications?: string
    product_used?: string
    deworming_dose?: string
    next_deworming_date?: string
    deworming_administered_by?: string
  }
) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Mark as completed and update with provided data
    const updateData = {
      ...completionData,
      is_auto_generated: false, // No longer auto-generated once completed
      updated_at: new Date().toISOString()
    }
    
    // Remove null/undefined values
    Object.keys(updateData).forEach(key => {
      const k = key as keyof typeof updateData;
      if (updateData[k] === null || updateData[k] === undefined || updateData[k] === '') {
        delete updateData[k]
      }
    })
    
    const { data, error } = await supabase
      .from('animal_health_records')
      .update(updateData)
      .eq('id', recordId)
      .eq('farm_id', farmId)
      .select(`
        *,
        animals (
          id,
          tag_number,
          name,
          breed
        )
      `)
      .single()
    
    if (error) {
      console.error('Error completing health record:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('Error in completeHealthRecord:', error)
    return { success: false, error: 'Failed to complete health record' }
  }
}

// Get health alerts and notifications
export async function getHealthAlerts(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const alerts = []
    
    // Get incomplete records
    const incompleteRecords = await getIncompleteHealthRecords(farmId, 5)
    if (incompleteRecords.length > 0) {
      alerts.push({
        type: 'incomplete_records',
        priority: 'medium',
        count: incompleteRecords.length,
        message: `${incompleteRecords.length} health record${incompleteRecords.length > 1 ? 's' : ''} need completion`,
        records: incompleteRecords
      })
    }
    
    // Get overdue follow-ups
    const { data: overdueRecords } = await supabase
      .from('animal_health_records')
      .select(`
        id,
        next_due_date,
        record_type,
        animals!inner (
          id,
          tag_number,
          name,
          farm_id,
          status
        )
      `)
      .eq('animals.farm_id', farmId)
      .eq('animals.status', 'active')
      .not('next_due_date', 'is', null)
      .lt('next_due_date', new Date().toISOString().split('T')[0])
    
    if (overdueRecords && overdueRecords.length > 0) {
      alerts.push({
        type: 'overdue_followups',
        priority: 'high',
        count: overdueRecords.length,
        message: `${overdueRecords.length} health follow-up${overdueRecords.length > 1 ? 's' : ''} overdue`,
        records: overdueRecords
      })
    }
    
    // Get animals with concerning health status but no recent records
    const { data: concerningAnimals } = await supabase
      .from('animals')
      .select('id, tag_number, name, health_status')
      .eq('farm_id', farmId)
      .eq('status', 'active')
      .in('health_status', ['sick', 'requires_attention', 'quarantined'])
    
    if (concerningAnimals && concerningAnimals.length > 0) {
      // Check which ones don't have recent records
      const animalsNeedingRecords = []
      
      for (const animal of concerningAnimals) {
        const { data: recentRecords } = await supabase
          .from('animal_health_records')
          .select('id')
          .eq('animal_id', animal.id)
          .gte('record_date', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .limit(1)
        
        if (!recentRecords || recentRecords.length === 0) {
          animalsNeedingRecords.push(animal)
        }
      }
      
      if (animalsNeedingRecords.length > 0) {
        alerts.push({
          type: 'missing_records',
          priority: 'medium',
          count: animalsNeedingRecords.length,
          message: `${animalsNeedingRecords.length} animal${animalsNeedingRecords.length > 1 ? 's' : ''} with health concerns need documentation`,
          animals: animalsNeedingRecords
        })
      }
    }
    
    return alerts
  } catch (error) {
    console.error('Error getting health alerts:', error)
    return []
  }
}

export async function updateAnimalHealthStatus(animalId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Call the database function to recalculate health status
    const { data, error } = await supabase
      .rpc('determine_animal_health_status', { animal_id_param: animalId })
    
    if (error) {
      console.error('Error determining health status:', error)
      return { success: false, error: error.message }
    }
    
    const newHealthStatus = data
    
    // Update the animal's health status
    const { data: updatedAnimal, error: updateError } = await supabase
      .from('animals')
      .update({ 
        health_status: newHealthStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .select('id, health_status, tag_number, name')
      .single()
    
    if (updateError) {
      console.error('Error updating animal health status:', updateError)
      return { success: false, error: updateError.message }
    }
    
    return { 
      success: true, 
      data: {
        animalId,
        oldStatus: null, // Could track this if needed
        newStatus: newHealthStatus,
        animal: updatedAnimal
      }
    }
  } catch (error) {
    console.error('Error in updateAnimalHealthStatus:', error)
    return { success: false, error: 'Failed to update animal health status' }
  }
}
export async function createHealthRecordWithStatusUpdate(data: HealthRecordData & { 
  is_auto_generated?: boolean 
  completion_status?: string 
}) {
  const supabase = await createServerSupabaseClient()

  try {
    // Create the health record (existing logic)
    const result = await createHealthRecord(data)
    
    if (!result.success) {
      return result
    }
    
    // Update animal health status if this is a concerning record type
    const concerningTypes = ['illness', 'injury', 'treatment']
    if (concerningTypes.includes(data.record_type)) {
      const statusResult = await updateAnimalHealthStatus(data.animal_id, data.farm_id)
      
      if (statusResult.success) {
        return {
          ...result,
          animalHealthStatusUpdated: true,
          newHealthStatus: statusResult.data?.newStatus,
          updatedAnimal: statusResult.data?.animal
        }
      }
    }
    
    return result
  } catch (error) {
    console.error('Error in createHealthRecordWithStatusUpdate:', error)
    return { success: false, error: 'Failed to create health record with status update' }
  }
}

// Enhanced follow-up creation with status update
export async function createFollowUpRecordWithStatusUpdate(
  originalRecordId: string,
  farmId: string,
  followUpData: {
    record_date: string
    status: 'improving' | 'stable' | 'worsening' | 'recovered' | 'requires_attention'
    description: string
    veterinarian?: string
    cost?: number
    notes?: string
    next_followup_date?: string
    medication_changes?: string
    treatment_effectiveness?: 'very_effective' | 'effective' | 'somewhat_effective' | 'not_effective'
    resolved?: boolean
  },
  userId: string
) {
  const supabase = await createServerSupabaseClient()

  try {
    // Get the original record details
    const { data: originalRecord } = await supabase
      .from('animal_health_records')
      .select('animal_id, record_type, root_checkup_id, original_record_id')
      .eq('id', originalRecordId)
      .eq('farm_id', farmId)
      .single()
    
    if (!originalRecord) {
      return { success: false, error: 'Original record not found' }
    }
    
    // Create the follow-up record with proper linkage
    const result = await createFollowUpRecord(
      originalRecordId,
      farmId,
      followUpData,
      userId
    )
    
    if (!result.success) {
      return result
    }
    
    // Track which records get resolved
    const resolvedRecords: string[] = []
    
    // If marking as resolved, cascade the resolution
    if (followUpData.resolved) {
      // 1. Mark the immediate parent record as resolved
      await supabase
        .from('animal_health_records')
        .update({
          is_resolved: true,
          resolved_date: followUpData.record_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalRecordId)
        .eq('farm_id', farmId)
      
      resolvedRecords.push(originalRecordId)
      
      // 2. If there's a root checkup, resolve it too
      if (originalRecord.root_checkup_id) {
        await supabase
          .from('animal_health_records')
          .update({
            is_resolved: true,
            resolved_date: followUpData.record_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', originalRecord.root_checkup_id)
          .eq('farm_id', farmId)
        
        resolvedRecords.push(originalRecord.root_checkup_id)
      }
      
      // 3. Check if the original record is itself a follow-up (nested case)
      if (originalRecord.original_record_id) {
        await supabase
          .from('animal_health_records')
          .update({
            is_resolved: true,
            resolved_date: followUpData.record_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', originalRecord.original_record_id)
          .eq('farm_id', farmId)
        
        resolvedRecords.push(originalRecord.original_record_id)
      }
    }
    
    // Update animal health status
    const statusResult = await updateAnimalHealthStatus(originalRecord.animal_id, farmId)
    
    return {
      ...result,
      animalHealthStatusUpdated: statusResult.success,
      newHealthStatus: statusResult.data?.newStatus,
      updatedAnimal: statusResult.data?.animal,
      cascadedResolution: followUpData.resolved && resolvedRecords.length > 1,
      resolvedRecords: resolvedRecords.length > 0 ? resolvedRecords : undefined
    }
  } catch (error) {
    console.error('Error in createFollowUpRecordWithStatusUpdate:', error)
    return { success: false, error: 'Failed to create follow-up record with status update' }
  }
}

// Function to recalculate health status for all animals in a farm
export async function recalculateAllAnimalHealthStatuses(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .rpc('recalculate_farm_animal_health_status', { farm_id_param: farmId })
    
    if (error) {
      console.error('Error recalculating health statuses:', error)
      return { success: false, error: error.message }
    }
    
    return { 
      success: true, 
      data: { updatedAnimalsCount: data }
    }
  } catch (error) {
    console.error('Error in recalculateAllAnimalHealthStatuses:', error)
    return { success: false, error: 'Failed to recalculate health statuses' }
  }
}

// Function to get animal health status history
export async function getAnimalHealthStatusHistory(animalId: string, farmId: string, limit = 10) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Verify animal belongs to farm
    const { data: animal } = await supabase
      .from('animals')
      .select('id')
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single()
    
    if (!animal) {
      return { success: false, error: 'Animal not found or access denied' }
    }
    
    const { data, error } = await supabase
      .from('animal_health_status_log')
      .select('*')
      .eq('animal_id', animalId)
      .order('changed_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching health status history:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getAnimalHealthStatusHistory:', error)
    return { success: false, error: 'Failed to get health status history' }
  }
}
export async function completeHealthRecordWithStatusUpdate(
  recordId: string,
  farmId: string,
  completionData: {
    symptoms?: string
    veterinarian?: string
    medication?: string
    cost?: number
    next_due_date?: string
    notes?: string
    severity?: string
    treatment?: string
  }
) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get the original record to check if it affects health status
    const { data: originalRecord } = await supabase
      .from('animal_health_records')
      .select('animal_id, record_type')
      .eq('id', recordId)
      .eq('farm_id', farmId)
      .single()
    
    if (!originalRecord) {
      return { success: false, error: 'Health record not found' }
    }
    
    // Complete the record (existing logic)
    const result = await completeHealthRecord(recordId, farmId, completionData)
    
    if (!result.success) {
      return result
    }
    
    // Update health status if this is a concerning record type
    const concerningTypes = ['illness', 'injury', 'treatment']
    if (concerningTypes.includes(originalRecord.record_type)) {
      const statusResult = await updateAnimalHealthStatus(originalRecord.animal_id, farmId)
      
      if (statusResult.success) {
        return {
          ...result,
          animalHealthStatusUpdated: true,
          newHealthStatus: statusResult.data?.newStatus,
          updatedAnimal: statusResult.data?.animal
        }
      }
    }
    
    return result
  } catch (error) {
    console.error('Error in completeHealthRecordWithStatusUpdate:', error)
    return { success: false, error: 'Failed to complete health record with status update' }
  }
}