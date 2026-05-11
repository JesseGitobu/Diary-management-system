import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Create a new equipment check-out session
 * Note: checked_out_by must be a worker ID (from workers table), not an auth user ID
 */
export async function createCheckOutSession(
  farmId: string,
  workerId: string,
  data: {
    equipment_id: string
    assignment_id?: string | null
    purpose: string
    location_used?: string | null
    fuel_level_before_pct: number
  }
) {
  const supabase = await createServerSupabaseClient()

  try {
    console.log('📋 Creating check-out session:', {
      farmId,
      workerId,
      equipmentId: data.equipment_id,
      assignmentId: data.assignment_id,
    })

    // Validate fuel level
    const fuelBefore = Number(data.fuel_level_before_pct)
    if (isNaN(fuelBefore) || fuelBefore < 0 || fuelBefore > 100) {
      return {
        success: false,
        error: 'Fuel level before must be a number between 0 and 100',
      }
    }

    // Insert new check session
    const { data: session, error } = await supabase
      .from('equipment_check_sessions')
      .insert({
        equipment_id: data.equipment_id,
        assignment_id: data.assignment_id || null,
        farm_id: farmId,
        checked_out_by: workerId,
        checkout_at: new Date().toISOString(),
        purpose: data.purpose,
        location_used: data.location_used || null,
        fuel_level_before_pct: fuelBefore,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating check-out session:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Check-out session created:', session.id)
    return { success: true, data: session }
  } catch (err) {
    console.error('❌ Exception creating check-out session:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Complete an equipment check-in session
 */
export async function completeCheckInSession(
  sessionId: string,
  data: {
    fuel_level_after_pct: number
    condition_on_return: 'excellent' | 'good' | 'fair' | 'damaged'
    damage_notes?: string | null
  }
) {
  const supabase = await createServerSupabaseClient()

  try {
    console.log('📋 Completing check-in session:', { sessionId })

    // Validate fuel level
    const fuelAfter = Number(data.fuel_level_after_pct)
    if (isNaN(fuelAfter) || fuelAfter < 0 || fuelAfter > 100) {
      return {
        success: false,
        error: 'Fuel level after must be a number between 0 and 100',
      }
    }

    // Validate condition
    const validConditions = ['excellent', 'good', 'fair', 'damaged']
    if (!validConditions.includes(data.condition_on_return)) {
      return {
        success: false,
        error: `Condition must be one of: ${validConditions.join(', ')}`,
      }
    }

    // Update check session with check-in information
    const { data: session, error } = await supabase
      .from('equipment_check_sessions')
      .update({
        checkin_at: new Date().toISOString(),
        fuel_level_after_pct: fuelAfter,
        condition_on_return: data.condition_on_return,
        damage_notes: data.damage_notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error completing check-in session:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Check-in session completed:', session.id)
    return { success: true, data: session }
  } catch (err) {
    console.error('❌ Exception completing check-in session:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Get check-out sessions for an equipment
 */
export async function getCheckSessions(
  farmId: string,
  equipmentId?: string,
  includeCheckedIn: boolean = false
) {
  const supabase = await createServerSupabaseClient()

  try {
    let query = supabase
      .from('equipment_check_sessions')
      .select(`
        *,
        equipment:equipment_id(id, name, asset_id),
        assignment:assignment_id(id, staff_id, role),
        worker:checked_out_by(id, name)
      `)
      .eq('farm_id', farmId)

    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId)
    }

    if (!includeCheckedIn) {
      query = query.is('checkin_at', null)
    }

    query = query.order('checkout_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('❌ Error fetching check sessions:', error)
      return { success: false, error: error.message, data: [] }
    }

    console.log('✅ Check sessions fetched:', data?.length || 0)
    return { success: true, data: data || [] }
  } catch (err) {
    console.error('❌ Exception fetching check sessions:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      data: [],
    }
  }
}

/**
 * Get a single check session by ID
 */
export async function getCheckSessionById(sessionId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('equipment_check_sessions')
      .select(`
        *,
        equipment:equipment_id(id, name, asset_id),
        assignment:assignment_id(id, staff_id, role),
        worker:checked_out_by(id, name)
      `)
      .eq('id', sessionId)
      .single()

    if (error) {
      console.error('❌ Error fetching check session:', error)
      return { success: false, error: error.message, data: null }
    }

    console.log('✅ Check session fetched:', data.id)
    return { success: true, data }
  } catch (err) {
    console.error('❌ Exception fetching check session:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      data: null,
    }
  }
}
