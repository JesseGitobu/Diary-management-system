// src/lib/database/audit-logs.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface AuditLog {
  id: string
  farm_id: string
  animal_id: string
  action: string
  entity_type: string
  entity_id: string | null
  performed_by: string | null
  performed_by_email: string | null
  performed_by_name: string | null
  user_role: string | null
  changes: {
    before: Record<string, any>
    after: Record<string, any>
  } | null
  changed_fields: string[] | null
  reason: string | null
  notes: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AuditLogFilter {
  farmId: string
  animalId?: string
  action?: string
  entityType?: string
  startDate?: string
  endDate?: string
  performedBy?: string
  limit?: number
  offset?: number
}

/**
 * Get audit logs for a farm with optional filtering
 */
export async function getAuditLogs(filter: AuditLogFilter): Promise<AuditLog[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('animal_audit_logs_with_user')
    .select('*')
    .eq('farm_id', filter.farmId)
    .order('created_at', { ascending: false })

  if (filter.animalId) {
    query = query.eq('animal_id', filter.animalId)
  }

  if (filter.action) {
    query = query.eq('action', filter.action)
  }

  if (filter.entityType) {
    query = query.eq('entity_type', filter.entityType)
  }

  if (filter.performedBy) {
    query = query.eq('performed_by', filter.performedBy)
  }

  if (filter.startDate) {
    query = query.gte('created_at', filter.startDate)
  }

  if (filter.endDate) {
    query = query.lte('created_at', filter.endDate)
  }

  const limit = filter.limit || 50
  const offset = filter.offset || 0

  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching audit logs:', error)
    return []
  }

  return (data || []) as AuditLog[]
}

/**
 * Get audit logs for a specific animal
 */
export async function getAnimalAuditHistory(
  farmId: string,
  animalId: string,
  limit: number = 100
): Promise<AuditLog[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('animal_audit_logs_with_user')
    .select('*')
    .eq('farm_id', farmId)
    .eq('animal_id', animalId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching animal audit history:', error)
    return []
  }

  return (data || []) as AuditLog[]
}

/**
 * Get audit logs for a specific action type
 */
export async function getAuditLogsByAction(
  farmId: string,
  action: string,
  limit: number = 50
): Promise<AuditLog[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('animal_audit_logs_with_user')
    .select('*')
    .eq('farm_id', farmId)
    .eq('action', action)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching audit logs by action:', error)
    return []
  }

  return (data || []) as AuditLog[]
}

/**
 * Get audit logs for a date range
 */
export async function getAuditLogsByDateRange(
  farmId: string,
  startDate: string,
  endDate: string,
  limit: number = 100
): Promise<AuditLog[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('animal_audit_logs_with_user')
    .select('*')
    .eq('farm_id', farmId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching audit logs by date range:', error)
    return []
  }

  return (data || []) as AuditLog[]
}

/**
 * Get summary statistics for audit logs
 */
export async function getAuditLogStatistics(
  farmId: string,
  days: number = 30
): Promise<{
  totalChanges: number
  byAction: Record<string, number>
  byAnimal: Record<string, number>
  recentActivity: AuditLog[]
}> {
  const supabase = await createServerSupabaseClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get all logs in the date range
  const { data, error } = await supabase
    .from('animal_audit_logs_with_user')
    .select('*')
    .eq('farm_id', farmId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching audit log statistics:', error)
    return {
      totalChanges: 0,
      byAction: {},
      byAnimal: {},
      recentActivity: [],
    }
  }

  const logs = (data || []) as AuditLog[]
  const byAction: Record<string, number> = {}
  const byAnimal: Record<string, number> = {}

  logs.forEach((log) => {
    byAction[log.action] = (byAction[log.action] || 0) + 1
    byAnimal[log.animal_id] = (byAnimal[log.animal_id] || 0) + 1
  })

  return {
    totalChanges: logs.length,
    byAction,
    byAnimal,
    recentActivity: logs.slice(0, 10),
  }
}

/**
 * Log a manual animal event
 */
export async function logAnimalEvent(
  farmId: string,
  animalId: string,
  action: string,
  options?: {
    reason?: string
    notes?: string
    changes?: Record<string, any>
  }
): Promise<string | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.rpc('log_animal_event', {
    p_farm_id: farmId,
    p_animal_id: animalId,
    p_action: action,
    p_reason: options?.reason || null,
    p_notes: options?.notes || null,
    p_changes: options?.changes ? JSON.stringify(options.changes) : null,
  } as any)

  if (error) {
    console.error('Error logging animal event:', error)
    return null
  }

  return data
}

/**
 * Get animal timeline view - grouped by date with related context
 */
export async function getAnimalTimeline(
  farmId: string,
  animalId: string
): Promise<Array<{
  date: string
  events: AuditLog[]
}>> {
  const logs = await getAnimalAuditHistory(farmId, animalId, 500)

  // Group logs by date
  const grouped: Record<string, AuditLog[]> = {}

  logs.forEach((log) => {
    const date = new Date(log.created_at).toISOString().split('T')[0]
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(log)
  })

  // Convert to sorted array
  return Object.entries(grouped)
    .map(([date, events]) => ({ date, events }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * Export audit logs to JSON
 */
export async function exportAuditLogsJSON(
  farmId: string,
  animalId: string
): Promise<string> {
  const logs = await getAnimalAuditHistory(farmId, animalId, 1000)
  return JSON.stringify(logs, null, 2)
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogsCSV(
  farmId: string,
  animalId: string
): Promise<string> {
  const logs = await getAnimalAuditHistory(farmId, animalId, 1000)

  const headers = [
    'Date',
    'Time',
    'Action',
    'Changed Fields',
    'Reason',
    'Notes',
    'Performed By',
    'User Role',
  ]

  const rows = logs.map((log) => [
    new Date(log.created_at).toLocaleDateString(),
    new Date(log.created_at).toLocaleTimeString(),
    log.action,
    (log.changed_fields || []).join('; '),
    log.reason || '',
    log.notes || '',
    log.performed_by_name || 'System',
    log.user_role || 'N/A',
  ])

  const csv = [headers, ...rows].map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')

  return csv
}
