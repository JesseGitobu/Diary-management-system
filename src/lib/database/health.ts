
// Health Records Database Operations
// src/lib/database/health.ts

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { HealthStats } from '@/types/database'

export interface HealthRecordData {
  animal_id: string
  record_date: string
  record_type: 'vaccination' | 'treatment' | 'checkup' | 'injury' | 'illness'
  description: string
  veterinarian?: string | null
  cost?: number
  notes?: string | null
  next_due_date?: string | null
  medication?: string | null
  severity?: 'low' | 'medium' | 'high' | null
  created_by: string
  farm_id: string
}

export async function createHealthRecord(data: HealthRecordData) {
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
    
    // Create the health record
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
        created_by: data.created_by
      })
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
    
    if (recordError) {
      console.error('Error creating health record:', recordError)
      return { success: false, error: recordError.message }
    }
    
    return { success: true, data: record }
  } catch (error) {
    console.error('Error in createHealthRecord:', error)
    return { success: false, error: 'Failed to create health record' }
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
    // First get animals for the farm to ensure we only get records for farm animals
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
        animals (
          id,
          tag_number,
          name,
          breed,
          gender
        )
      `)
      .in('animal_id', animalIds)
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
      animals (
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
        animals (
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
      animals!inner (
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

export async function createFollowUpRecord(data: HealthRecordData & {
  original_record_id: string
  follow_up_status: string
  treatment_effectiveness?: string
  is_resolved: boolean
}) {
  const supabase = await createServerSupabaseClient()

  try {
    // Verify the original record exists and belongs to the farm
    const { data: originalRecord, error: originalError } = await supabase
      .from('animal_health_records')
      .select('id, farm_id, animal_id')
      .eq('id', data.original_record_id)
      .eq('farm_id', data.farm_id)
      .single()
    
    if (originalError || !originalRecord) {
      return { success: false, error: 'Original record not found or access denied' }
    }
    
    // Create the follow-up record
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
        // Follow-up specific fields
        original_record_id: data.original_record_id,
        follow_up_status: data.follow_up_status,
        treatment_effectiveness: data.treatment_effectiveness,
        is_follow_up: true,
        is_resolved: data.is_resolved
      })
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
    
    if (recordError) {
      console.error('Error creating follow-up record:', recordError)
      return { success: false, error: recordError.message }
    }
    
    // Create a follow-up relationship record for tracking
    await supabase
      .from('health_record_follow_ups')
      .insert({
        original_record_id: data.original_record_id,
        follow_up_record_id: record.id,
        status: data.follow_up_status,
        treatment_effectiveness: data.treatment_effectiveness,
        is_resolved: data.is_resolved,
        created_at: new Date().toISOString()
      })
    
    return { success: true, data: record }
  } catch (error) {
    console.error('Error in createFollowUpRecord:', error)
    return { success: false, error: 'Failed to create follow-up record' }
  }
}

export async function getFollowUpRecords(originalRecordId: string, farmId: string) {
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
        ),
        health_record_follow_ups!follow_up_record_id (
          status,
          treatment_effectiveness,
          is_resolved,
          created_at
        )
      `)
      .eq('original_record_id', originalRecordId)
      .eq('farm_id', farmId)
      .eq('is_follow_up', true)
      .order('record_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching follow-up records:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getFollowUpRecords:', error)
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
        animals!inner (
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