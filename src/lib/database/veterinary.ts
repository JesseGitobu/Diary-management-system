import { createServerSupabaseClient } from '@/lib/supabase/server'
import { addDays, format } from 'date-fns'

export interface Veterinarian {
  id?: string
  farm_id: string
  created_by: string  // REQUIRED - add this!
  name: string
  clinic_name: string  // REQUIRED (was practice_name)
  license_number: string  // REQUIRED
  specialization?: string  // Optional (was specializations array)
  phone_primary: string  // REQUIRED (was phone)
  phone_emergency?: string
  email: string  // REQUIRED
  address_street: string  // REQUIRED
  address_city: string  // REQUIRED
  address_state: string  // REQUIRED
  address_postal: string  // REQUIRED
  address_country?: string  // Has default
  availability_hours?: string
  emergency_available?: boolean  // (was emergency_contact)
  travel_radius_km?: number
  service_types?: string[]
  rates_consultation?: number
  rates_emergency?: number
  preferred_payment?: string[]
  notes?: string
  rating?: number
  is_primary?: boolean
  is_active?: boolean
}

export interface VeterinaryVisit {
  id?: string
  farm_id: string
  veterinarian_id?: string
  visit_type: 'routine_checkup' | 'vaccination' | 'emergency' | 'consultation' | 'breeding' | 'other'
  visit_purpose: string  // REQUIRED
  scheduled_datetime: string  // REQUIRED (ISO timestamp string)
  duration_hours?: number
  veterinarian_name: string  // REQUIRED
  veterinarian_clinic?: string
  veterinarian_phone?: string
  veterinarian_email?: string
  priority_level?: 'low' | 'medium' | 'high' | 'urgent'
  location_details?: string
  special_instructions?: string
  estimated_cost?: number
  actual_cost?: number
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled'
  preparation_notes?: string
  visit_notes?: string
  follow_up_required?: boolean
  follow_up_date?: string
  send_reminder?: boolean
  reminder_days_before?: number
  created_by?: string
}

export async function createVeterinarian(vet: Veterinarian) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await (supabase
    .from('veterinarians') as any)
    .insert(vet)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating veterinarian:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function getVeterinarians(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('veterinarians')
    .select('*')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .order('name')
  
  if (error) {
    console.error('Error fetching veterinarians:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data as any[]) || []
}

export async function createVeterinaryVisit(visit: VeterinaryVisit) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await (supabase
    .from('veterinary_visits') as any)
    .insert(visit)
    .select(`
      *,
      veterinarian:veterinarians (
        name,
        clinic_name,
        phone_primary
      )
    `)
    .single()
  
  if (error) {
    console.error('Error creating veterinary visit:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function getVeterinaryVisits(farmId: string, limit?: number) {
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('veterinary_visits')
    .select(`
      *,
      veterinarian:veterinarians (
        name,
        clinic_name,
        phone_primary,
        email
      )
    `)
    .eq('farm_id', farmId)
    .order('scheduled_datetime', { ascending: false }) // Fixed sorting column name based on interface
  
  if (limit) {
    query = query.limit(limit)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching veterinary visits:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data as any[]) || []
}

export async function getUpcomingVeterinaryVisits(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const today = new Date().toISOString()
  
  const { data, error } = await supabase
    .from('veterinary_visits')
    .select(`
      *,
      veterinarian:veterinarians (
        name,
        clinic_name,
        phone_primary
      )
    `)
    .eq('farm_id', farmId)
    .gte('scheduled_datetime', today) // Fixed column name based on interface
    .order('scheduled_datetime')
    .limit(10)
  
  if (error) {
    console.error('Error fetching upcoming visits:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data as any[]) || []
}

export async function getFollowUpVisits(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('veterinary_visits')
    .select(`
      *,
      veterinarian:veterinarians (
        name,
        clinic_name
      )
    `)
    .eq('farm_id', farmId)
    .eq('follow_up_required', true)
    .lte('follow_up_date', today)
    .order('follow_up_date')
  
  if (error) {
    console.error('Error fetching follow-up visits:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data as any[]) || []
}

export async function getVeterinaryStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const currentYear = new Date().getFullYear()
  const yearStart = `${currentYear}-01-01`
  
  // Get visit counts by type
  const { data: visitsData } = await supabase
    .from('veterinary_visits')
    .select('visit_type, actual_cost')
    .eq('farm_id', farmId)
    .gte('scheduled_datetime', yearStart) // Fixed column name
  
  // FIXED: Cast to any[]
  const visits = (visitsData as any[]) || []

  // Get upcoming visits count
  const { count: upcomingCount } = await supabase
    .from('veterinary_visits')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .gte('scheduled_datetime', new Date().toISOString()) // Fixed column name
  
  // Get follow-ups needed
  const { count: followUpCount } = await supabase
    .from('veterinary_visits')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .eq('follow_up_required', true)
    .lte('follow_up_date', format(new Date(), 'yyyy-MM-dd'))
  
  // Calculate statistics
  const totalVisits = visits.length || 0
  
  // FIXED: Typed as any to avoid property access error
  const totalCost = visits.reduce((sum, visit) => sum + (visit.actual_cost || 0), 0) || 0
  
  const visitTypes = visits.reduce((acc, visit) => {
    acc[visit.visit_type] = (acc[visit.visit_type] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}
  
  return {
    totalVisits,
    totalCost,
    averageCost: totalVisits > 0 ? totalCost / totalVisits : 0,
    upcomingVisits: upcomingCount || 0,
    followUpsNeeded: followUpCount || 0,
    visitsByType: visitTypes,
  }
}