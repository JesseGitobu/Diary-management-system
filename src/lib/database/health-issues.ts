// Health Issues Database Operations
// src/lib/database/health-issues.ts

import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface HealthIssueData {
  farm_id: string
  animal_id: string
  issue_type: 'injury' | 'illness' | 'behavior_change' | 'poor_appetite' | 'lameness' | 'respiratory' | 'reproductive' | 'other'
  issue_type_custom?: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  notes?: string | null
  symptoms?: string[] | null
  alert_veterinarian: boolean
  reported_by: string
  first_observed_at?: string | null
  assigned_veterinarian_id?: string | null

  // Injury fields
  injury_location?: string | null
  injury_wound_type?: string | null
  injury_bleeding?: boolean | null
  injury_swelling?: boolean | null

  // Illness fields
  illness_temperature?: string | null
  illness_onset_hours?: string | null
  illness_other_animals?: boolean | null
  illness_milk_change?: boolean | null
  illness_appetite?: string | null

  // Behavior change fields
  behavior_type?: string | null
  behavior_consistency?: string | null

  // Lameness fields
  lameness_affected_legs?: string | null
  lameness_severity?: string | null
  lameness_swelling?: boolean | null

  // Respiratory fields
  respiratory_cough_type?: string | null
  respiratory_nasal_discharge?: string | null
  respiratory_temperature?: string | null
  respiratory_difficulty?: string | null
  respiratory_duration?: string | null

  // Reproductive fields
  reproductive_cycle_stage?: string | null
  reproductive_discharge?: string | null
  reproductive_breeding_date?: string | null

  // Poor appetite fields
  appetite_level?: string | null
  appetite_food_refused?: string | null
  appetite_water_intake?: string | null
  appetite_duration_hours?: string | null
  appetite_other_symptoms?: string | null

  // Reduced milk fields
  reduced_milk_yield_change?: string | null
  reduced_milk_color?: string | null
  reduced_milk_consistency?: string | null
  reduced_milk_temperature_check?: boolean | null
  reduced_milk_body_temperature?: string | null
  reduced_milk_udder_temperature?: string | null
  reduced_milk_onset_hours?: string | null
  reduced_milk_previous_yield?: string | null
}

export interface HealthIssueUpdateData {
  status?: 'open' | 'in_progress' | 'under_observation' | 'treated' | 'resolved' | 'closed'
  notes?: string | null
  resolution_notes?: string | null
  resolved_by?: string | null
  follow_up_required?: boolean
  follow_up_date?: string | null
  linked_health_record_id?: string | null
  assigned_veterinarian_id?: string | null
  veterinarian_response?: string | null
  veterinarian_recommendation?: string | null
  observation_history?: any[] | null
  last_observed_at?: string | null
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Create a new health issue report
 */
export async function createHealthIssue(data: HealthIssueData) {
  const supabase = await createServerSupabaseClient()

  try {
    // Verify the animal belongs to the farm
    const { data: animal, error: animalError } = await supabase
      .from('animals')
      .select('id, farm_id, tag_number, name')
      .eq('id', data.animal_id)
      .eq('farm_id', data.farm_id)
      .single() as any

    if (animalError || !animal) {
      console.error('Animal verification error:', animalError)
      return { success: false, error: 'Animal not found or access denied' }
    }

    // Prepare issue data
    const issueData = {
      farm_id: data.farm_id,
      animal_id: data.animal_id,
      issue_type: data.issue_type,
      issue_type_custom: data.issue_type === 'other' ? data.issue_type_custom : null,
      severity: data.severity,
      description: data.description,
      notes: data.notes || null,
      symptoms: data.symptoms || null,
      alert_veterinarian: data.alert_veterinarian,
      reported_by: data.reported_by,
      first_observed_at: data.first_observed_at || new Date().toISOString(),
      assigned_veterinarian_id: data.assigned_veterinarian_id || null,
      status: 'open',
      is_urgent: data.severity === 'high' || data.severity === 'critical',
      requires_immediate_attention: data.severity === 'critical',
      veterinarian_notified_at: data.alert_veterinarian ? new Date().toISOString() : null,
      
      // Injury fields
      injury_location: data.injury_location || null,
      injury_wound_type: data.injury_wound_type || null,
      injury_bleeding: data.injury_bleeding || false,
      injury_swelling: data.injury_swelling || false,

      // Illness fields
      illness_temperature: data.illness_temperature || null,
      illness_onset_hours: data.illness_onset_hours || null,
      illness_other_animals: data.illness_other_animals || false,
      illness_milk_change: data.illness_milk_change || false,
      illness_appetite: data.illness_appetite || null,

      // Behavior change fields
      behavior_type: data.behavior_type || null,
      behavior_consistency: data.behavior_consistency || null,

      // Lameness fields
      lameness_affected_legs: data.lameness_affected_legs || null,
      lameness_severity: data.lameness_severity || null,
      lameness_swelling: data.lameness_swelling || false,

      // Respiratory fields
      respiratory_cough_type: data.respiratory_cough_type || null,
      respiratory_nasal_discharge: data.respiratory_nasal_discharge || null,
      respiratory_temperature: data.respiratory_temperature || null,
      respiratory_difficulty: data.respiratory_difficulty || null,
      respiratory_duration: data.respiratory_duration || null,

      // Reproductive fields
      reproductive_cycle_stage: data.reproductive_cycle_stage || null,
      reproductive_discharge: data.reproductive_discharge || null,
      reproductive_breeding_date: data.reproductive_breeding_date || null,

      // Poor appetite fields
      appetite_level: data.appetite_level || null,
      appetite_food_refused: data.appetite_food_refused || null,
      appetite_water_intake: data.appetite_water_intake || null,
      appetite_duration_hours: data.appetite_duration_hours || null,
      appetite_other_symptoms: data.appetite_other_symptoms || null,

      // Reduced milk fields
      reduced_milk_yield_change: data.reduced_milk_yield_change || null,
      reduced_milk_color: data.reduced_milk_color || null,
      reduced_milk_consistency: data.reduced_milk_consistency || null,
      reduced_milk_temperature_check: data.reduced_milk_temperature_check || false,
      reduced_milk_body_temperature: data.reduced_milk_body_temperature || null,
      reduced_milk_udder_temperature: data.reduced_milk_udder_temperature || null,
      reduced_milk_onset_hours: data.reduced_milk_onset_hours || null,
      reduced_milk_previous_yield: data.reduced_milk_previous_yield || null,

      observation_history: [
        {
          timestamp: new Date().toISOString(),
          action: 'issue_reported',
          notes: `Health issue reported: ${data.description}`,
          reporter: data.reported_by
        }
      ]
    }

    // Insert the health issue
    const { data: createdIssue, error: insertError } = await (supabase
      .from('health_issues') as any)
      .insert(issueData)
      .select()
      .single()

    if (insertError) {
      console.error('Health issue creation error:', insertError)
      return { success: false, error: insertError.message }
    }

    return {
      success: true,
      issue: createdIssue,
      message: `Health issue reported for ${(animal as any)?.tag_number || 'animal'}${(animal as any)?.name ? ` (${(animal as any).name})` : ''}`
    }
  } catch (error) {
    console.error('Health issue creation exception:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create health issue'
    }
  }
}

/**
 * Update a health issue
 */
export async function updateHealthIssue(
  issueId: string,
  data: HealthIssueUpdateData,
  farmId: string
) {
  const supabase = await createServerSupabaseClient()

  try {
    // Verify the issue belongs to the farm
    const { data: existingIssue, error: fetchError } = await supabase
      .from('health_issues')
      .select('id, status, resolved_by')
      .eq('id', issueId)
      .eq('farm_id', farmId)
      .single()

    if (fetchError || !existingIssue) {
      console.error('Issue verification error:', fetchError)
      return { success: false, error: 'Health issue not found or access denied' }
    }

    // Prepare update data
    const updateData: any = { ...data }

    // Handle resolution state
    if (data.status === 'resolved') {
      updateData.resolved_at = new Date().toISOString()
      if (!data.resolved_by) {
        // Get current user if not provided
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (!userError && user) {
          updateData.resolved_by = user.id
        }
      }
    }

    // Update observation history if provided
    if (data.observation_history) {
      updateData.observation_history = data.observation_history
    }

    // Perform the update
    const { data: updatedIssue, error: updateError } = await (supabase
      .from('health_issues') as any)
      .update(updateData)
      .eq('id', issueId)
      .eq('farm_id', farmId)
      .select()
      .single()

    if (updateError) {
      console.error('Health issue update error:', updateError)
      return { success: false, error: updateError.message }
    }

    return {
      success: true,
      issue: updatedIssue,
      message: 'Health issue updated successfully'
    }
  } catch (error) {
    console.error('Health issue update exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update health issue'
    }
  }
}

/**
 * Get health issue by ID
 */
export async function getHealthIssue(issueId: string, farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: issue, error } = await supabase
      .from('health_issues')
      .select('*')
      .eq('id', issueId)
      .eq('farm_id', farmId)
      .single() as any

    if (error) {
      console.error('Health issue fetch error:', error)
      return { success: false, error: 'Health issue not found' }
    }

    // Fetch related data separately if needed
    let enrichedIssue = { ...issue }

    if (issue?.animal_id) {
      const { data: animal } = await supabase
        .from('animals')
        .select('id, tag_number, name, breed')
        .eq('id', issue.animal_id)
        .single() as any
      if (animal) enrichedIssue.animal = animal
    }

    return { success: true, issue: enrichedIssue }
  } catch (error) {
    console.error('Health issue fetch exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch health issue'
    }
  }
}

/**
 * Get all health issues for a farm with optional filters
 */
export async function getHealthIssuesForFarm(
  farmId: string,
  filters?: {
    status?: string | string[]
    severity?: string
    animal_id?: string
    alert_veterinarian?: boolean
  }
) {
  const supabase = await createServerSupabaseClient()

  try {
    let query = (supabase
      .from('health_issues')
      .select('*')
      .eq('farm_id', farmId)) as any

    // Apply filters
    if (filters) {
      if (filters.status) {
        // Support both single status string and array of statuses
        if (Array.isArray(filters.status)) {
          if (filters.status.length > 0) {
            query = query.in('status', filters.status)
          }
        } else {
          query = query.eq('status', filters.status)
        }
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity)
      }
      if (filters.animal_id) {
        query = query.eq('animal_id', filters.animal_id)
      }
      if (filters.alert_veterinarian !== undefined) {
        query = query.eq('alert_veterinarian', filters.alert_veterinarian)
      }
    }

    const { data: issues, error } = await query.order('reported_at', { ascending: false })

    if (error) {
      console.error('Health issues fetch error:', error)
      return { success: false, error: 'Failed to fetch health issues', issues: [] }
    }

    // Fetch related animal data for each issue
    const enrichedIssues = await Promise.all(
      (issues || []).map(async (issue: any) => {
        if (issue?.animal_id) {
          const { data: animal } = await supabase
            .from('animals')
            .select('id, tag_number, name, breed')
            .eq('id', issue.animal_id)
            .single() as any
          return animal ? { ...issue, animal } : issue
        }
        return issue
      })
    )

    return { success: true, issues: enrichedIssues || [] }
  } catch (error) {
    console.error('Health issues fetch exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch health issues',
      issues: []
    }
  }
}

/**
 * Get open/urgent health issues for a farm
 */
export async function getUrgentHealthIssues(farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: issues, error } = await (supabase
      .from('health_issues')
      .select('*')
      .eq('farm_id', farmId)
      .eq('requires_immediate_attention', true)
      .in('status', ['open', 'in_progress', 'under_observation'])
      .order('severity', { ascending: false })
      .order('reported_at', { ascending: false })) as any

    if (error) {
      console.error('Urgent issues fetch error:', error)
      return { success: false, error: 'Failed to fetch urgent issues', issues: [] }
    }

    // Fetch related animal data for each issue
    const enrichedIssues = await Promise.all(
      (issues || []).map(async (issue: any) => {
        if (issue?.animal_id) {
          const { data: animal } = await supabase
            .from('animals')
            .select('id, tag_number, name')
            .eq('id', issue.animal_id)
            .single() as any
          return animal ? { ...issue, animal } : issue
        }
        return issue
      })
    )

    return { success: true, issues: enrichedIssues || [] }
  } catch (error) {
    console.error('Urgent issues fetch exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch urgent issues',
      issues: []
    }
  }
}

/**
 * Get health issues for a specific animal (for timeline display)
 * Returns open and recently resolved issues, ordered by most recent first
 */
export async function getHealthIssuesForAnimal(
  animalId: string,
  farmId: string,
  options?: {
    includeResolved?: boolean
    limit?: number
  }
) {
  const supabase = await createServerSupabaseClient()

  try {
    // Build the query
    let query = (supabase
      .from('health_issues')
      .select('*')
      .eq('animal_id', animalId)
      .eq('farm_id', farmId)) as any

    // Include or filter out resolved issues
    if (!options?.includeResolved) {
      // Only fetch open, in_progress, or under_observation issues
      query = query.in('status', ['open', 'in_progress', 'under_observation'])
    }

    // Order by most recent first
    query = query.order('reported_at', { ascending: false })

    // Apply limit if specified
    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data: issues, error } = await query

    if (error) {
      console.error('Health issues for animal fetch error:', error)
      return { success: false, error: 'Failed to fetch health issues', issues: [] }
    }

    return { success: true, issues: issues || [] }
  } catch (error) {
    console.error('Health issues for animal fetch exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch health issues',
      issues: []
    }
  }
}

/**
 * Link a health issue to a health record
 */
export async function linkIssueToHealthRecord(
  issueId: string,
  healthRecordId: string,
  farmId: string
) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: updatedIssue, error } = await (supabase
      .from('health_issues') as any)
      .update({
        linked_health_record_id: healthRecordId,
        status: 'in_progress'
      })
      .eq('id', issueId)
      .eq('farm_id', farmId)
      .select()
      .single()

    if (error) {
      console.error('Link health record error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, issue: updatedIssue }
  } catch (error) {
    console.error('Link health record exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to link health record'
    }
  }
}

/**
 * Get health issues needing veterinarian contact
 */
export async function getVeterinarianAlertIssues(farmId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: issues, error } = await (supabase
      .from('health_issues')
      .select('*')
      .eq('farm_id', farmId)
      .eq('alert_veterinarian', true)
      .in('status', ['open', 'in_progress', 'under_observation'])
      .is('veterinarian_notified_at', null)
      .order('severity', { ascending: false })) as any

    if (error) {
      console.error('Vet alert issues fetch error:', error)
      return { success: false, error: 'Failed to fetch vet alert issues', issues: [] }
    }

    // Fetch related animal data for each issue
    const enrichedIssues = await Promise.all(
      (issues || []).map(async (issue: any) => {
        if (issue?.animal_id) {
          const { data: animal } = await supabase
            .from('animals')
            .select('id, tag_number, name')
            .eq('id', issue.animal_id)
            .single() as any
          return animal ? { ...issue, animal } : issue
        }
        return issue
      })
    )

    return { success: true, issues: enrichedIssues || [] }
  } catch (error) {
    console.error('Vet alert issues fetch exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch vet alert issues',
      issues: []
    }
  }
}

/**
 * Add observation/update to health issue history
 */
export async function addIssueObservation(
  issueId: string,
  farmId: string,
  observation: {
    notes: string
    status?: string
    severity?: string
    timestamp?: string
  }
) {
  const supabase = await createServerSupabaseClient()

  try {
    // Get current issue
    const { data: currentIssue, error: fetchError } = await supabase
      .from('health_issues')
      .select('observation_history')
      .eq('id', issueId)
      .eq('farm_id', farmId)
      .single() as any

    if (fetchError || !currentIssue) {
      return { success: false, error: 'Health issue not found' }
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Add new observation
    const newObservation = {
      timestamp: observation.timestamp || new Date().toISOString(),
      action: 'observation_added',
      notes: observation.notes,
      status: observation.status,
      severity: observation.severity,
      recorded_by: user.id
    }

    const updatedHistory = [...((currentIssue as any)?.observation_history || []), newObservation]

    // Update issue with new observation
    const { data: updatedIssue, error: updateError } = await (supabase
      .from('health_issues') as any)
      .update({
        observation_history: updatedHistory,
        last_observed_at: new Date().toISOString(),
        ...(observation.status && { status: observation.status }),
        ...(observation.severity && { severity: observation.severity })
      })
      .eq('id', issueId)
      .eq('farm_id', farmId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, issue: updatedIssue }
  } catch (error) {
    console.error('Add observation exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add observation'
    }
  }
}
