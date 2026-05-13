import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface DamageReport {
  id: string
  equipment_id: string
  farm_id: string
  reported_by: string
  check_session_id: string | null
  description: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  discovered_at: string
  status: 'open' | 'in_progress' | 'resolved'
  resolved_at: string | null
  resolution_notes: string | null
  creates_work_order: boolean
  maintenance_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateDamageReportInput {
  equipment_id: string
  farm_id: string
  reported_by: string
  check_session_id?: string | null
  description: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  discovered_at: string
  creates_work_order?: boolean
  resolution_notes?: string | null
}

export interface DamageReportResult {
  success: boolean
  data?: DamageReport
  error?: string
}

/**
 * Create a new damage report and update equipment condition based on urgency
 */
export async function createDamageReport(input: CreateDamageReportInput): Promise<DamageReportResult> {
  try {
    console.log('📝 [DB] Creating damage report...')
    console.log('Input:', JSON.stringify(input, null, 2))

    const supabase = await createServerSupabaseClient()

    // Start a transaction-like operation
    // First, create the damage report
    const { data: damageReport, error: reportError } = await supabase
      .from('damage_reports')
      .insert([
        {
          equipment_id: input.equipment_id,
          farm_id: input.farm_id,
          reported_by: input.reported_by,
          check_session_id: input.check_session_id || null,
          description: input.description,
          urgency: input.urgency,
          discovered_at: input.discovered_at,
          creates_work_order: input.creates_work_order || false,
          resolution_notes: input.resolution_notes || null,
          status: 'open',
        },
      ])
      .select()
      .single()

    if (reportError) {
      console.error('❌ [DB] Error creating damage report:', reportError)
      console.error('Error code:', reportError.code)
      console.error('Error details:', reportError.details)

      // Handle specific error cases
      if (reportError.code === '23503') {
        return {
          success: false,
          error: 'Invalid equipment_id, farm_id, or reported_by. Please verify all IDs are correct.',
        }
      }

      if (reportError.code === '23502') {
        return {
          success: false,
          error: 'Missing required field. Please ensure all required fields are provided.',
        }
      }

      return {
        success: false,
        error: reportError.message || 'Failed to create damage report',
      }
    }

    console.log('✅ [DB] Damage report created:', damageReport?.id)

    // Update equipment condition based on urgency
    const equipmentUpdate = getEquipmentUpdateByUrgency(input.urgency)
    
    if (equipmentUpdate) {
      const { error: updateError } = await supabase
        .from('equipment')
        .update(equipmentUpdate)
        .eq('id', input.equipment_id)

      if (updateError) {
        console.error('❌ [DB] Warning: Failed to update equipment condition:', updateError)
        // Don't fail the entire operation if equipment update fails
      } else {
        console.log('✅ [DB] Equipment condition updated for urgency:', input.urgency)
      }
    }

    return {
      success: true,
      data: damageReport as DamageReport,
    }
  } catch (error) {
    console.error('❌ [DB] Unexpected error creating damage report:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get damage reports for equipment
 */
export async function getDamageReportsByEquipmentId(
  equipmentId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  success: boolean
  data?: DamageReport[]
  count?: number
  error?: string
}> {
  try {
    console.log('📝 [DB] Fetching damage reports for equipment:', equipmentId)

    const supabase = await createServerSupabaseClient()

    const { data, error, count } = await supabase
      .from('damage_reports')
      .select('*', { count: 'exact' })
      .eq('equipment_id', equipmentId)
      .order('discovered_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ [DB] Error fetching damage reports:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch damage reports',
      }
    }

    console.log('✅ [DB] Damage reports fetched:', data?.length || 0)
    return {
      success: true,
      data: data as DamageReport[],
      count: count ?? undefined,
    }
  } catch (error) {
    console.error('❌ [DB] Unexpected error fetching damage reports:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get damage reports for farm
 */
export async function getDamageReportsByFarmId(
  farmId: string,
  status?: 'open' | 'in_progress' | 'resolved' | 'dismissed',
  limit: number = 50,
  offset: number = 0
): Promise<{
  success: boolean
  data?: any[]
  count?: number
  error?: string
}> {
  try {
    console.log('📝 [DB] Fetching damage reports for farm:', farmId)

    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('damage_reports')
      .select(`
        id,
        farm_id,
        equipment_id,
        reported_by,
        check_session_id,
        description,
        urgency,
        discovered_at,
        status,
        resolved_at,
        resolution_notes,
        creates_work_order,
        maintenance_id,
        created_at,
        updated_at,
        equipment:equipment_id(id, name, asset_id)
      `, { count: 'exact' })
      .eq('farm_id', farmId)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query
      .order('discovered_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ [DB] Error fetching damage reports:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch damage reports',
      }
    }

    console.log('✅ [DB] Damage reports fetched:', data?.length || 0)
    return {
      success: true,
      data: data as any[],
      count: count ?? undefined,
    }
  } catch (error) {
    console.error('❌ [DB] Unexpected error fetching damage reports:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update damage report status
 */
export async function updateDamageReportStatus(
  id: string,
  status: 'open' | 'in_progress' | 'resolved',
  resolutionNotes?: string
): Promise<DamageReportResult> {
  try {
    console.log('📝 [DB] Updating damage report status:', id, 'to', status)

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('damage_reports')
      .update({
        status,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        resolution_notes: resolutionNotes || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ [DB] Error updating damage report:', error)
      return {
        success: false,
        error: error.message || 'Failed to update damage report',
      }
    }

    console.log('✅ [DB] Damage report updated:', data?.id)
    return {
      success: true,
      data: data as DamageReport,
    }
  } catch (error) {
    console.error('❌ [DB] Unexpected error updating damage report:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Determine equipment updates based on damage urgency
 * Updates both condition and status based on severity
 */
function getEquipmentUpdateByUrgency(
  urgency: 'low' | 'medium' | 'high' | 'critical'
): {
  condition?: 'fair' | 'poor' | 'excellent' | 'good'
  status?: 'operational' | 'maintenance_due' | 'in_maintenance' | 'broken'
} | null {
  switch (urgency) {
    case 'low':
      // Low: Monitor only, no status change
      return null

    case 'medium':
      // Medium: Schedule repair soon - downgrade condition to fair, mark as maintenance due
      return {
        condition: 'fair',
        status: 'maintenance_due',
      }

    case 'high':
      // High: Repair within 48h - downgrade condition to poor, mark as in maintenance
      return {
        condition: 'poor',
        status: 'in_maintenance',
      }

    case 'critical':
      // Critical: Take out of service - mark as broken/damaged
      return {
        condition: 'poor',
        status: 'broken',
      }

    default:
      return null
  }
}

/**
 * Delete a damage report
 */
export async function deleteDamageReport(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📝 [DB] Deleting damage report:', id)

    const supabase = await createServerSupabaseClient()

    const { error } = await supabase.from('damage_reports').delete().eq('id', id)

    if (error) {
      console.error('❌ [DB] Error deleting damage report:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete damage report',
      }
    }

    console.log('✅ [DB] Damage report deleted:', id)
    return {
      success: true,
    }
  } catch (error) {
    console.error('❌ [DB] Unexpected error deleting damage report:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
