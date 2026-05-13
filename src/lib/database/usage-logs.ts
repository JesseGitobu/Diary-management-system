import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface UsageLog {
  id: string
  equipment_id: string
  check_session_id: string | null
  farm_id: string
  logged_by: string
  log_date: string
  hours_this_session: number | null
  odometer_reading_after: number | null
  fuel_consumed_litres: number | null
  task_reference: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateUsageLogInput {
  equipment_id: string
  check_session_id?: string | null
  farm_id: string
  logged_by: string
  log_date: string
  hours_this_session?: number | null
  odometer_reading_after?: number | null
  fuel_consumed_litres?: number | null
  task_reference?: string | null
  notes?: string | null
}

export interface UsageLogResult {
  success: boolean
  data?: UsageLog
  error?: string
}

/**
 * Create a new equipment usage log
 */
export async function createUsageLog(input: CreateUsageLogInput): Promise<UsageLogResult> {
  try {
    console.log('📝 [DB] Creating usage log...')
    console.log('Input:', JSON.stringify(input, null, 2))

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('usage_logs')
      .insert([
        {
          equipment_id: input.equipment_id,
          check_session_id: input.check_session_id || null,
          farm_id: input.farm_id,
          logged_by: input.logged_by,
          log_date: input.log_date,
          hours_this_session: input.hours_this_session || null,
          odometer_reading_after: input.odometer_reading_after || null,
          fuel_consumed_litres: input.fuel_consumed_litres || null,
          task_reference: input.task_reference || null,
          notes: input.notes || null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('❌ [DB] Error creating usage log:', error)
      console.error('Error code:', error.code)
      console.error('Error details:', error.details)

      // Handle specific error cases
      if (error.code === '23503') {
        // Foreign key violation
        return {
          success: false,
          error: 'Invalid equipment_id, check_session_id, or user. Please verify all IDs are correct.',
        }
      }

      if (error.code === '23502') {
        // Not null violation
        return {
          success: false,
          error: 'Missing required field. Please ensure all required fields are provided.',
        }
      }

      if (error.code === '23514') {
        // Check constraint violation
        return {
          success: false,
          error: 'Invalid value for numeric field. Please ensure values are positive numbers.',
        }
      }

      return {
        success: false,
        error: error.message || 'Failed to create usage log',
      }
    }

    console.log('✅ [DB] Usage log created:', data?.id)
    return {
      success: true,
      data: data as UsageLog,
    }
  } catch (error) {
    console.error('❌ [DB] Unexpected error creating usage log:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get a usage log by ID
 */
export async function getUsageLogById(id: string): Promise<UsageLogResult> {
  try {
    console.log('📝 [DB] Fetching usage log by ID:', id)

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('usage_logs')
      .select(
        `
        id,
        equipment_id,
        check_session_id,
        farm_id,
        logged_by,
        log_date,
        hours_this_session,
        odometer_reading_after,
        fuel_consumed_litres,
        task_reference,
        notes,
        created_at,
        updated_at,
        equipment:equipment_id (id, name)
        `
      )
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ [DB] Error fetching usage log:', error)
      return {
        success: false,
        error: error.message || 'Usage log not found',
      }
    }

    console.log('✅ [DB] Usage log fetched:', data?.id)
    return {
      success: true,
      data: data as UsageLog,
    }
  } catch (error) {
    console.error('❌ [DB] Unexpected error fetching usage log:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get usage logs by equipment ID
 */
export async function getUsageLogsByEquipmentId(
  equipmentId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  success: boolean
  data?: UsageLog[]
  count?: number
  error?: string
}> {
  try {
    console.log('📝 [DB] Fetching usage logs by equipment ID:', equipmentId)

    const supabase = await createServerSupabaseClient()

    const { data, error, count } = await supabase
      .from('usage_logs')
      .select(
        `
        id,
        equipment_id,
        check_session_id,
        farm_id,
        logged_by,
        log_date,
        hours_this_session,
        odometer_reading_after,
        fuel_consumed_litres,
        task_reference,
        notes,
        created_at,
        updated_at,
        equipment:equipment_id (id, name)
        `,
        { count: 'exact' }
      )
      .eq('equipment_id', equipmentId)
      .order('log_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ [DB] Error fetching usage logs:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch usage logs',
      }
    }

    console.log('✅ [DB] Usage logs fetched:', data?.length || 0)
    return {
      success: true,
      data: data as UsageLog[],
      count: count ?? undefined,
    }
  } catch (error) {
    console.error('❌ [DB] Unexpected error fetching usage logs:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update a usage log
 */
export async function updateUsageLog(
  id: string,
  updates: Partial<CreateUsageLogInput>
): Promise<UsageLogResult> {
  try {
    console.log('📝 [DB] Updating usage log:', id)
    console.log('Updates:', JSON.stringify(updates, null, 2))

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('usage_logs')
      .update({
        equipment_id: updates.equipment_id,
        check_session_id: updates.check_session_id,
        log_date: updates.log_date,
        hours_this_session: updates.hours_this_session || null,
        odometer_reading_after: updates.odometer_reading_after || null,
        fuel_consumed_litres: updates.fuel_consumed_litres || null,
        task_reference: updates.task_reference || null,
        notes: updates.notes || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ [DB] Error updating usage log:', error)
      return {
        success: false,
        error: error.message || 'Failed to update usage log',
      }
    }

    console.log('✅ [DB] Usage log updated:', data?.id)
    return {
      success: true,
      data: data as UsageLog,
    }
  } catch (error) {
    console.error('❌ [DB] Unexpected error updating usage log:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete a usage log
 */
export async function deleteUsageLog(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📝 [DB] Deleting usage log:', id)

    const supabase = await createServerSupabaseClient()

    const { error } = await supabase.from('usage_logs').delete().eq('id', id)

    if (error) {
      console.error('❌ [DB] Error deleting usage log:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete usage log',
      }
    }

    console.log('✅ [DB] Usage log deleted:', id)
    return {
      success: true,
    }
  } catch (error) {
    console.error('❌ [DB] Unexpected error deleting usage log:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get equipment odometer history from usage logs
 */
export async function getEquipmentOdometerHistory(
  equipmentId: string,
  limit: number = 20
): Promise<{
  success: boolean
  data?: Array<{ date: string; odometer: number }>
  error?: string
}> {
  try {
    console.log('📝 [DB] Fetching odometer history for equipment:', equipmentId)

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('usage_logs')
      .select('log_date, odometer_reading_after')
      .eq('equipment_id', equipmentId)
      .not('odometer_reading_after', 'is', null)
      .order('log_date', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ [DB] Error fetching odometer history:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch odometer history',
      }
    }

    const history = (data || []).map((log: any) => ({
      date: log.log_date,
      odometer: log.odometer_reading_after,
    }))

    console.log('✅ [DB] Odometer history fetched:', history.length, 'records')
    return {
      success: true,
      data: history,
    }
  } catch (error) {
    console.error('❌ [DB] Unexpected error fetching odometer history:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get equipment fuel consumption history
 */
export async function getEquipmentFuelHistory(equipmentId: string, limit: number = 20): Promise<{
  success: boolean
  data?: Array<{ date: string; fuelConsumed: number }>
  error?: string
}> {
  try {
    console.log('📝 [DB] Fetching fuel history for equipment:', equipmentId)

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('usage_logs')
      .select('log_date, fuel_consumed_litres')
      .eq('equipment_id', equipmentId)
      .not('fuel_consumed_litres', 'is', null)
      .order('log_date', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ [DB] Error fetching fuel history:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch fuel history',
      }
    }

    const history = (data || []).map((log: any) => ({
      date: log.log_date,
      fuelConsumed: log.fuel_consumed_litres,
    }))

    console.log('✅ [DB] Fuel history fetched:', history.length, 'records')
    return {
      success: true,
      data: history,
    }
  } catch (error) {
    console.error('❌ [DB] Unexpected error fetching fuel history:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
