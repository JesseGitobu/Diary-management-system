
// Health Records Database Operations
// src/lib/database/health.ts

import { createServerSupabaseClient } from '@/lib/supabase/server'

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
      return { success: false, error: 'Animal not found or access denied' }
    }
    
    // Create the health record
    const { data: record, error: recordError } = await supabase
      .from('animal_health_records')
      .insert({
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
      .eq('animals.farm_id', farmId)
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
  
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)
  
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
    .eq('animals.farm_id', farmId)
    .not('next_due_date', 'is', null)
    .lte('next_due_date', futureDate.toISOString().split('T')[0])
    .gte('next_due_date', new Date().toISOString().split('T')[0])
    .order('next_due_date', { ascending: true })
  
  if (error) {
    console.error('Error fetching upcoming health tasks:', error)
    return []
  }
  
  return data || []
}

export async function getHealthStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get total health records
    const { count: totalRecords } = await supabase
      .from('animal_health_records')
      .select('*', { count: 'exact', head: true })
      .eq('animals.farm_id', farmId)
    
    // Get records by type
    const { data: recordsByType } = await supabase
      .from('animal_health_records')
      .select('record_type, animals!inner(farm_id)')
      .eq('animals.farm_id', farmId)
    
    // Get upcoming tasks
    const upcomingTasks = await getUpcomingHealthTasks(farmId, 30)
    
    // Calculate stats
    const typeStats = recordsByType?.reduce((acc, record) => {
      acc[record.record_type] = (acc[record.record_type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    return {
      totalRecords: totalRecords || 0,
      upcomingTasks: upcomingTasks.length,
      recordsByType: typeStats,
      overdueCount: upcomingTasks.filter(task => 
        new Date(task.next_due_date!) < new Date()
      ).length
    }
  } catch (error) {
    console.error('Error getting health stats:', error)
    return {
      totalRecords: 0,
      upcomingTasks: 0,
      recordsByType: {},
      overdueCount: 0
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
        practice_name,
        phone,
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