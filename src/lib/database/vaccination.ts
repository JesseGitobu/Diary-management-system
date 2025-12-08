import { createServerSupabaseClient } from '@/lib/supabase/server'
import { addDays, format } from 'date-fns'

export interface VaccinationProtocol {
  id?: string
  farm_id: string
  name: string
  description?: string
  vaccine_name: string
  frequency_days: number
  age_at_first_dose_days?: number
  booster_schedule?: string[]
  is_active?: boolean
  created_by: string
}

export interface VaccinationSchedule {
  id?: string
  animal_id: string
  protocol_id: string
  scheduled_date: string
  status?: 'pending' | 'completed' | 'overdue' | 'skipped'
  actual_date?: string
  notes?: string
  administered_by?: string
}

export async function createVaccinationProtocol(protocol: VaccinationProtocol) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await (supabase
    .from('vaccination_protocols') as any)
    .insert(protocol)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating vaccination protocol:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function getVaccinationProtocols(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('vaccination_protocols')
    .select('*')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .order('name')
  
  if (error) {
    console.error('Error fetching vaccination protocols:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data as any[]) || []
}

export async function generateVaccinationSchedule(animalId: string, protocolId: string, birthDate?: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get protocol details
    const { data: protocolData, error: protocolError } = await supabase
      .from('vaccination_protocols')
      .select('*')
      .eq('id', protocolId)
      .single()
    
    if (protocolError) throw protocolError
    
    // FIXED: Cast to any to access properties like age_at_first_dose_days
    const protocol = protocolData as any

    const schedules: Omit<VaccinationSchedule, 'id'>[] = []
    
    // Calculate first vaccination date
    let firstVaccinationDate: Date
    
    if (birthDate && protocol.age_at_first_dose_days) {
      // Schedule based on age
      firstVaccinationDate = addDays(new Date(birthDate), protocol.age_at_first_dose_days)
    } else {
      // Schedule for next week if no birth date
      firstVaccinationDate = addDays(new Date(), 7)
    }
    
    // Create initial vaccination schedule
    schedules.push({
      animal_id: animalId,
      protocol_id: protocolId,
      scheduled_date: format(firstVaccinationDate, 'yyyy-MM-dd'),
      status: 'pending'
    })
    
    // Create booster schedules
    if (protocol.booster_schedule?.length) {
      protocol.booster_schedule.forEach((boosterInterval: string) => {
        const boosterDays = parseInt(boosterInterval)
        const boosterDate = addDays(firstVaccinationDate, boosterDays)
        
        schedules.push({
          animal_id: animalId,
          protocol_id: protocolId,
          scheduled_date: format(boosterDate, 'yyyy-MM-dd'),
          status: 'pending'
        })
      })
    }
    
    // Insert all schedules
    // FIXED: Cast to any for insert
    const { data, error } = await (supabase
      .from('vaccination_schedules') as any)
      .insert(schedules)
      .select()
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error) {
    console.error('Error generating vaccination schedule:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' }
  }
}

export async function getVaccinationSchedules(farmId: string, status?: string) {
  const supabase = await createServerSupabaseClient()
  
  // Get animals for the farm first
  const { data: animals } = await supabase
    .from('animals')
    .select('id')
    .eq('farm_id', farmId)
    
  const animalIds = (animals as any[])?.map(row => row.id) || []

  if (animalIds.length === 0) return []

  let query = supabase
    .from('vaccination_schedules')
    .select(`
      *,
      animal:animals (
        id,
        tag_number,
        name
      ),
      protocol:vaccination_protocols (
        name,
        vaccine_name
      ),
      administered_by_user:administered_by (
        user_metadata
      )
    `)
    .in('animal_id', animalIds)
    .order('scheduled_date')
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching vaccination schedules:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data as any[]) || []
}

export async function completeVaccination(scheduleId: string, data: {
  actual_date: string
  notes?: string
  administered_by: string
}) {
  const supabase = await createServerSupabaseClient()
  
  // FIXED: Cast to any for update
  const { error } = await (supabase
    .from('vaccination_schedules') as any)
    .update({
      status: 'completed',
      actual_date: data.actual_date,
      notes: data.notes,
      administered_by: data.administered_by
    })
    .eq('id', scheduleId)
  
  if (error) {
    console.error('Error completing vaccination:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

export async function getOverdueVaccinations(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const today = format(new Date(), 'yyyy-MM-dd')
  
  const { data: animals } = await supabase
    .from('animals')
    .select('id')
    .eq('farm_id', farmId)
    
  const animalIds = (animals as any[])?.map(row => row.id) || []

  if (animalIds.length === 0) return []

  const { data: overdueData, error } = await supabase
    .from('vaccination_schedules')
    .select(`
      *,
      animal:animals (
        id,
        tag_number,
        name
      ),
      protocol:vaccination_protocols (
        name,
        vaccine_name
      )
    `)
    .in('animal_id', animalIds)
    .eq('status', 'pending')
    .lt('scheduled_date', today)
  
  if (error) {
    console.error('Error fetching overdue vaccinations:', error)
    return []
  }

  // FIXED: Cast to any[]
  const data = (overdueData as any[]) || []
  
  // Update status to overdue
  if (data.length) {
    // FIXED: Cast to any for update
    await (supabase
      .from('vaccination_schedules') as any)
      .update({ status: 'overdue' })
      .in('id', data.map(v => v.id))
  }
  
  return data
}