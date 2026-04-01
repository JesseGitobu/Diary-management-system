// src/lib/database/veterinary-visits.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface VeterinaryVisit {
  id: string
  farm_id: string
  visit_type: 'routine_checkup' | 'vaccination' | 'emergency' | 'consultation' | 'breeding' | 'other'
  visit_purpose: string
  scheduled_datetime: string
  duration_hours: number
  veterinarian_name: string
  veterinarian_clinic?: string
  veterinarian_phone?: string
  veterinarian_email?: string
  priority_level: 'low' | 'medium' | 'high' | 'urgent'
  location_details?: string
  special_instructions?: string
  estimated_cost?: number
  actual_cost?: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  preparation_notes?: string
  visit_notes?: string
  follow_up_required: boolean
  follow_up_date?: string
  send_reminder: boolean
  reminder_days_before: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface Veterinarian {
  id: string
  farm_id: string
  name: string
  clinic_name?: string
  phone?: string
  email?: string
  address?: string
  specialization?: string
  license_number?: string
  is_primary: boolean
  is_active: boolean
}

export interface VisitFilters {
  status?: string
  visit_type?: string
  veterinarian_name?: string
  upcoming?: boolean
  date_from?: string
  date_to?: string
  priority_level?: string
  limit?: number
  offset?: number
}

// Create a new veterinary visit
export async function createVeterinaryVisit(farmId: string, userId: string, visitData: Partial<VeterinaryVisit>) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Validate required fields
    if (!visitData.visit_type || !visitData.visit_purpose || !visitData.scheduled_datetime || !visitData.veterinarian_name) {
      return { success: false, error: 'Missing required fields' }
    }

    // Validate scheduled datetime is in the future
    const scheduledDate = new Date(visitData.scheduled_datetime)
    if (scheduledDate <= new Date()) {
      return { success: false, error: 'Scheduled date must be in the future' }
    }

    // Create the veterinary visit record
    // FIXED: Cast to any to bypass 'never' type error on insert
    const { data: visit, error: visitError } = await (supabase
      .from('veterinary_visits') as any)
      .insert({
        farm_id: farmId,
        visit_type: visitData.visit_type,
        visit_purpose: visitData.visit_purpose,
        scheduled_datetime: visitData.scheduled_datetime,
        duration_hours: visitData.duration_hours || 2,
        veterinarian_name: visitData.veterinarian_name,
        veterinarian_clinic: visitData.veterinarian_clinic || null,
        veterinarian_phone: visitData.veterinarian_phone || null,
        veterinarian_email: visitData.veterinarian_email || null,
        priority_level: visitData.priority_level || 'medium',
        location_details: visitData.location_details || null,
        special_instructions: visitData.special_instructions || null,
        estimated_cost: visitData.estimated_cost || null,
        preparation_notes: visitData.preparation_notes || null,
        status: 'scheduled',
        send_reminder: visitData.send_reminder !== false,
        reminder_days_before: visitData.reminder_days_before || 1,
        created_by: userId,
      })
      .select()
      .single()

    if (visitError) {
      console.error('Error creating visit:', visitError)
      return { success: false, error: visitError.message }
    }

    return { success: true, data: visit }
  } catch (error) {
    console.error('Error in createVeterinaryVisit:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

// Associate animals with a visit
export async function associateAnimalsWithVisit(visitId: string, animalIds: string[]) {
  const supabase = await createServerSupabaseClient()

  try {
    if (!animalIds || animalIds.length === 0) {
      return { success: true, data: [] }
    }

    const animalAssociations = animalIds.map(animalId => ({
      visit_id: visitId,
      animal_id: animalId
    }))

    // FIXED: Cast to any
    const { data, error } = await (supabase
      .from('visit_animals') as any)
      .insert(animalAssociations)
      .select()

    if (error) {
      console.error('Error associating animals:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in associateAnimalsWithVisit:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get veterinary visits with optional filters
export async function getVeterinaryVisits(farmId: string, filters: VisitFilters = {}) {
  const supabase = await createServerSupabaseClient()

  try {
    let query = supabase
      .from('veterinary_visits')
      .select('*')
      .eq('farm_id', farmId)

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status as 'scheduled' | 'completed' | 'cancelled' | 'rescheduled')
    }

    if (filters.visit_type) {
      query = query.eq('visit_type', filters.visit_type as 'routine_checkup' | 'vaccination' | 'emergency' | 'consultation' | 'breeding' | 'other')
    }

    if (filters.veterinarian_name) {
      query = query.ilike('veterinarian_name', `%${filters.veterinarian_name}%`)
    }

    if (filters.priority_level) {
      query = query.eq('priority_level', filters.priority_level as 'low' | 'medium' | 'high' | 'urgent')
    }

    if (filters.upcoming) {
      query = query.gte('scheduled_datetime', new Date().toISOString())
    }

    if (filters.date_from) {
      query = query.gte('scheduled_datetime', filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte('scheduled_datetime', filters.date_to)
    }

    // Order and pagination
    query = query.order('scheduled_datetime', { ascending: false })

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching veterinary visits:', error)
      return { success: false, error: error.message, data: [] }
    }

    // FIXED: Cast to any[]
    return { success: true, data: (data as any[]) || [] }
  } catch (error) {
    console.error('Error in getVeterinaryVisits:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

// Get upcoming visits
export async function getUpcomingVisits(farmId: string, limit: number = 10) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('veterinary_visits')
      .select('*')
      .eq('farm_id', farmId)
      .eq('status', 'scheduled')
      .gte('scheduled_datetime', new Date().toISOString())
      .order('scheduled_datetime', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching upcoming visits:', error)
      return { success: false, error: error.message, data: [] }
    }

    // Fetch animals for each visit
    const visitsWithAnimals = await Promise.all(
      (data || []).map(async (visit: any) => {
        const { data: animalLinks } = await supabase
          .from('visit_animals')
          .select('animal_id')
          .eq('visit_id', visit.id)

        const animalIds = (animalLinks as any[])?.map(l => l.animal_id) || []
        let animals: any[] = []
        
        if (animalIds.length > 0) {
          const { data: animalDetails } = await supabase
            .from('animals')
            .select('id, name, tag_number')
            .in('id', animalIds)
            .eq('farm_id', farmId)

          animals = (animalDetails as any[]) || []
        }

        return {
          ...visit,
          visit_animals: (animalLinks as any[])?.map((link: any, idx: number) => ({
            animals: animals[idx] || { id: link.animal_id, name: '', tag_number: '' }
          })) || []
        }
      })
    )

    return { success: true, data: visitsWithAnimals }
  } catch (error) {
    console.error('Error in getUpcomingVisits:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

// Get follow-up visits
export async function getFollowUpVisits(farmId: string, limit: number = 10) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('veterinary_visits')
      .select('*')
      .eq('farm_id', farmId)
      .eq('follow_up_required', true)
      .lte('follow_up_date', new Date().toISOString().split('T')[0])
      .order('follow_up_date', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching follow-up visits:', error)
      return { success: false, error: error.message, data: [] }
    }

    // Fetch animals for each visit
    const visitsWithAnimals = await Promise.all(
      (data || []).map(async (visit: any) => {
        const { data: animalLinks } = await supabase
          .from('visit_animals')
          .select('animal_id')
          .eq('visit_id', visit.id)

        const animalIds = (animalLinks as any[])?.map(l => l.animal_id) || []
        let animals: any[] = []
        
        if (animalIds.length > 0) {
          const { data: animalDetails } = await supabase
            .from('animals')
            .select('id, name, tag_number')
            .in('id', animalIds)
            .eq('farm_id', farmId)

          animals = (animalDetails as any[]) || []
        }

        return {
          ...visit,
          visit_animals: (animalLinks as any[])?.map((link: any, idx: number) => ({
            animals: animals[idx] || { id: link.animal_id, name: '', tag_number: '' }
          })) || []
        }
      })
    )

    return { success: true, data: visitsWithAnimals }
  } catch (error) {
    console.error('Error in getFollowUpVisits:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

// Update visit status and details
export async function updateVeterinaryVisit(visitId: string, farmId: string, updateData: Partial<VeterinaryVisit>) {
  const supabase = await createServerSupabaseClient()

  try {
    // Verify the visit belongs to the farm
    const { data: existingVisitData, error: checkError } = await supabase
      .from('veterinary_visits')
      .select('farm_id')
      .eq('id', visitId)
      .single()
    
    // FIXED: Cast to any
    const existingVisit = existingVisitData as any

    if (checkError || !existingVisit) {
      return { success: false, error: 'Visit not found' }
    }

    if (existingVisit.farm_id !== farmId) {
      return { success: false, error: 'Unauthorized access to visit' }
    }

    // Update the visit
    const { data: updatedVisit, error: updateError } = await (supabase
      .from('veterinary_visits') as any)
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', visitId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating visit:', updateError)
      return { success: false, error: updateError.message }
    }

    return { success: true, data: updatedVisit }
  } catch (error) {
    console.error('Error in updateVeterinaryVisit:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Delete a veterinary visit
export async function deleteVeterinaryVisit(visitId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    // Verify the visit belongs to the farm and check status
    const { data: existingVisitData, error: checkError } = await (supabase
      .from('veterinary_visits') as any)
      .select('farm_id, status')
      .eq('id', visitId)
      .single()
    
    // FIXED: Cast to any
    const existingVisit = existingVisitData as any

    if (checkError || !existingVisit) {
      return { success: false, error: 'Visit not found' }
    }

    if (existingVisit.farm_id !== farmId) {
      return { success: false, error: 'Unauthorized access to visit' }
    }

    // Don't allow deletion of completed visits for audit trail
    if (existingVisit.status === 'completed') {
      return { success: false, error: 'Cannot delete completed visits. Please cancel instead.' }
    }

    // Delete the visit (cascading deletes will handle visit_animals)
    const { error: deleteError } = await supabase
      .from('veterinary_visits')
      .delete()
      .eq('id', visitId)

    if (deleteError) {
      console.error('Error deleting visit:', deleteError)
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteVeterinaryVisit:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get or create veterinarian
export async function getOrCreateVeterinarian(farmId: string, vetData: {
  name: string
  clinic_name?: string
  phone?: string
  email?: string
  specialization?: string
}) {
  const supabase = await createServerSupabaseClient()

  try {
    // Check if veterinarian already exists
    const { data: existingData, error: checkError } = await supabase
      .from('veterinarians')
      .select('*')
      .eq('farm_id', farmId)
      .eq('name', vetData.name)
      .single()
    
    const existing = existingData as any

    if (existing && !checkError) {
      // Update existing veterinarian with new information
      const { data: updated, error: updateError } = await (supabase
        .from('veterinarians') as any)
        .update({
          clinic_name: vetData.clinic_name || existing.clinic_name,
          phone: vetData.phone || existing.phone_primary,
          email: vetData.email || existing.email,
          specialization: vetData.specialization || existing.specialization,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating veterinarian:', updateError)
        return { success: false, error: updateError.message, data: existing }
      }

      return { success: true, data: updated, created: false }
    } else {
      // Create new veterinarian
      const { data: created, error: createError } = await (supabase
        .from('veterinarians') as any)
        .insert({
          farm_id: farmId,
          address_city: '',
          address_postal: '',
          address_state: '',
          address_street: '',
          address_country: '',
          clinic_name: vetData.clinic_name || '',
          phone_primary: vetData.phone || '',
          email: vetData.email || '',
          specialization: vetData.specialization || '',
          name: vetData.name,
          is_primary: false,
          is_active: true,
          created_by: farmId,
          license_number: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating veterinarian:', createError)
        return { success: false, error: createError.message }
      }

      return { success: true, data: created, created: true }
    }
  } catch (error) {
    console.error('Error in getOrCreateVeterinarian:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get all veterinarians for a farm
export async function getFarmVeterinarians(farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('veterinarians')
      .select('*')
      .eq('farm_id', farmId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching veterinarians:', error)
      return { success: false, error: error.message, data: [] }
    }

    // FIXED: Cast to any[]
    return { success: true, data: (data as any[]) || [] }
  } catch (error) {
    console.error('Error in getFarmVeterinarians:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] }
  }
}

// Get visit statistics
export async function getVisitStatistics(farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    // Fetch visit data to calculate statistics
    const { data: visits, error } = await supabase
      .from('veterinary_visits')
      .select('*')
      .eq('farm_id', farmId)

    if (error) {
      console.error('Error fetching visits for statistics:', error)
      return { 
        success: false, 
        error: error.message, 
        data: {
          total_visits: 0,
          scheduled_visits: 0,
          completed_visits: 0,
          cancelled_visits: 0,
          upcoming_visits: 0,
          overdue_follow_ups: 0,
          this_month_visits: 0,
          emergency_visits: 0,
          average_cost: 0,
          total_cost: 0
        }
      }
    }

    // Calculate statistics from the data
    const visitList = (visits as any[]) || []
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const stats = {
      total_visits: visitList.length,
      scheduled_visits: visitList.filter(v => v.status === 'scheduled').length,
      completed_visits: visitList.filter(v => v.status === 'completed').length,
      cancelled_visits: visitList.filter(v => v.status === 'cancelled').length,
      upcoming_visits: visitList.filter(v => v.status === 'scheduled' && new Date(v.scheduled_datetime) > now).length,
      overdue_follow_ups: visitList.filter(v => v.follow_up_required && v.follow_up_date && new Date(v.follow_up_date) <= now).length,
      this_month_visits: visitList.filter(v => new Date(v.created_at) >= thisMonth).length,
      emergency_visits: visitList.filter(v => v.priority_level === 'urgent' || v.priority_level === 'high').length,
      average_cost: visitList.length > 0 ? visitList.reduce((sum, v) => sum + (v.actual_cost || 0), 0) / visitList.length : 0,
      total_cost: visitList.reduce((sum, v) => sum + (v.actual_cost || 0), 0)
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error in getVisitStatistics:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        total_visits: 0,
        scheduled_visits: 0,
        completed_visits: 0,
        cancelled_visits: 0,
        upcoming_visits: 0,
        overdue_follow_ups: 0,
        this_month_visits: 0,
        emergency_visits: 0,
        average_cost: 0,
        total_cost: 0
      }
    }
  }
}

// Mark visit as completed and create health records
export async function completeVisit(visitId: string, farmId: string, completionData: {
  actual_cost?: number
  visit_notes?: string
  follow_up_required?: boolean
  follow_up_date?: string
}) {
  try {
    // Update the visit status to completed
    const updateResult = await updateVeterinaryVisit(visitId, farmId, {
      status: 'completed',
      actual_cost: completionData.actual_cost,
      visit_notes: completionData.visit_notes,
      follow_up_required: completionData.follow_up_required || false,
      follow_up_date: completionData.follow_up_date
    })

    if (!updateResult.success) {
      return updateResult
    }

    // The trigger will automatically create health records for involved animals
    return { success: true, data: updateResult.data }
  } catch (error) {
    console.error('Error in completeVisit:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Reschedule a visit
export async function rescheduleVisit(visitId: string, farmId: string, newDateTime: string, reason?: string) {
  try {
    // Validate new datetime is in the future
    const newDate = new Date(newDateTime)
    if (newDate <= new Date()) {
      return { success: false, error: 'New scheduled date must be in the future' }
    }

    const updateResult = await updateVeterinaryVisit(visitId, farmId, {
      scheduled_datetime: newDateTime,
      status: 'rescheduled',
      visit_notes: reason ? `Rescheduled: ${reason}` : 'Visit rescheduled'
    })

    return updateResult
  } catch (error) {
    console.error('Error in rescheduleVisit:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Cancel a visit
export async function cancelVisit(visitId: string, farmId: string, reason?: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const updateData = {
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // FIXED: Cast to any
    const { data, error } = await (supabase
      .from('veterinary_visits') as any)
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