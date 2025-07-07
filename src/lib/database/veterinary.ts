import { createServerSupabaseClient } from '@/lib/supabase/server'
import { addDays, format } from 'date-fns'

export interface Veterinarian {
  id?: string
  farm_id: string
  name: string
  practice_name?: string
  phone?: string
  email?: string
  license_number?: string
  specializations?: string[]
  emergency_contact?: boolean
  is_active?: boolean
}

export interface VeterinaryVisit {
  id?: string
  farm_id: string
  veterinarian_id?: string
  visit_date: string
  visit_type: 'routine' | 'emergency' | 'vaccination' | 'treatment' | 'consultation'
  purpose?: string
  animals_treated?: string[]
  total_cost?: number
  invoice_number?: string
  notes?: string
  follow_up_required?: boolean
  follow_up_date?: string
  created_by: string
}

export async function createVeterinarian(vet: Veterinarian) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('veterinarians')
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
  
  return data || []
}

export async function createVeterinaryVisit(visit: VeterinaryVisit) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('veterinary_visits')
    .insert(visit)
    .select(`
      *,
      veterinarian:veterinarians (
        name,
        practice_name,
        phone
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
        practice_name,
        phone,
        email
      ),
      created_by_user:created_by (
        user_metadata
      )
    `)
    .eq('farm_id', farmId)
    .order('visit_date', { ascending: false })
  
  if (limit) {
    query = query.limit(limit)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching veterinary visits:', error)
    return []
  }
  
  return data || []
}

export async function getUpcomingVeterinaryVisits(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const today = format(new Date(), 'yyyy-MM-dd')
  
  const { data, error } = await supabase
    .from('veterinary_visits')
    .select(`
      *,
      veterinarian:veterinarians (
        name,
        practice_name,
        phone
      )
    `)
    .eq('farm_id', farmId)
    .gte('visit_date', today)
    .order('visit_date')
    .limit(10)
  
  if (error) {
    console.error('Error fetching upcoming visits:', error)
    return []
  }
  
  return data || []
}

export async function getFollowUpVisits(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const today = format(new Date(), 'yyyy-MM-dd')
  
  const { data, error } = await supabase
    .from('veterinary_visits')
    .select(`
      *,
      veterinarian:veterinarians (
        name,
        practice_name
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
  
  return data || []
}

export async function getVeterinaryStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const currentYear = new Date().getFullYear()
  const yearStart = `${currentYear}-01-01`
  
  // Get visit counts by type
  const { data: visits } = await supabase
    .from('veterinary_visits')
    .select('visit_type, total_cost')
    .eq('farm_id', farmId)
    .gte('visit_date', yearStart)
  
  // Get upcoming visits count
  const { count: upcomingCount } = await supabase
    .from('veterinary_visits')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .gte('visit_date', format(new Date(), 'yyyy-MM-dd'))
  
  // Get follow-ups needed
  const { count: followUpCount } = await supabase
    .from('veterinary_visits')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .eq('follow_up_required', true)
    .lte('follow_up_date', format(new Date(), 'yyyy-MM-dd'))
  
  // Calculate statistics
  const totalVisits = visits?.length || 0
  const totalCost = visits?.reduce((sum, visit) => sum + (visit.total_cost || 0), 0) || 0
  
  const visitTypes = visits?.reduce((acc, visit) => {
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