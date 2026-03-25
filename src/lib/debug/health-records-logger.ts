// Debug Logger for Health Records Data Flow
// Tracks data from API request through database insertion
// src/lib/debug/health-records-logger.ts

interface DataFlowLog {
  timestamp?: string
  operationId: string
  stage: 'api-request' | 'validation' | 'data-prep' | 'db-insert' | 'db-update' | 'relationship' | 'response'
  table?: string
  operation?: 'INSERT' | 'UPDATE' | 'SELECT'
  columns?: Record<string, any>
  values?: Record<string, any>
  rowsAffected?: number
  error?: string
  message: string
}

const DEBUG_ENABLED = process.env.DEBUG_HEALTH_RECORDS === 'true' || false

/**
 * Generate unique operation ID for tracking data through entire flow
 */
export function generateOperationId(): string {
  return `HER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

/**
 * Log data flow with structured format
 */
export function logDataFlow(log: DataFlowLog) {
  if (!DEBUG_ENABLED) return

  const timestamp = new Date().toISOString()
  const logEntry = {
    ...log,
    timestamp,
  }

  // Color coding for different stages
  const stageColors: Record<string, string> = {
    'api-request': '📨',
    'validation': '✓',
    'data-prep': '🔧',
    'db-insert': '➕',
    'db-update': '🔄',
    'relationship': '🔗',
    'response': '📤',
  }

  const icon = stageColors[log.stage] || '📝'
  const divider = '─'.repeat(100)

  console.log(`\n${divider}`)
  console.log(
    `${icon} [${log.stage.toUpperCase()}] ${log.operationId} | ${timestamp}`
  )
  console.log(`Message: ${log.message}`)

  if (log.table && log.operation) {
    console.log(`Database: ${log.operation} → ${log.table}`)
  }

  if (log.columns && Object.keys(log.columns).length > 0) {
    console.log(`\nColumns being set:`)
    Object.entries(log.columns).forEach(([col, val]) => {
      const displayVal =
        val === null
          ? '(null)'
          : typeof val === 'string'
            ? `"${val}"`
            : typeof val === 'object'
              ? JSON.stringify(val)
              : val
      console.log(`  • ${col}: ${displayVal}`)
    })
  }

  if (log.values && Object.keys(log.values).length > 0) {
    console.log(`\nData values:`)
    Object.entries(log.values).forEach(([key, val]) => {
      const displayVal =
        val === null
          ? '(null)'
          : typeof val === 'string'
            ? `"${val}"`
            : typeof val === 'object'
              ? JSON.stringify(val).substring(0, 50) + '...'
              : val
      if (val !== null && val !== undefined && val !== '') {
        console.log(`  • ${key}: ${displayVal}`)
      }
    })
  }

  if (log.rowsAffected !== undefined) {
    console.log(`Rows affected: ${log.rowsAffected}`)
  }

  if (log.error) {
    console.error(`❌ ERROR: ${log.error}`)
  }

  console.log(divider)
}

/**
 * Log API request parameters
 */
export function logApiRequest(
  operationId: string,
  body: Record<string, any>,
  userId: string,
  farmId: string
) {
  if (!DEBUG_ENABLED) return

  const excludedFields = ['password', 'token', 'secret']
  const filteredBody = Object.fromEntries(
    Object.entries(body).filter(
      ([key]) => !excludedFields.some((excluded) => key.includes(excluded))
    )
  )

  logDataFlow({
    operationId,
    stage: 'api-request',
    message: `Incoming API request received`,
    values: {
      userId,
      farmId,
      recordType: body.record_type,
      animalId: body.animal_id,
      recordDate: body.record_date,
      isFollowUp: body.is_follow_up,
      ...filteredBody,
    },
  } as DataFlowLog)
}

/**
 * Log field validation results
 */
export function logValidation(
  operationId: string,
  requiredFields: Record<string, any>,
  validationPassed: boolean,
  errors?: string[]
) {
  if (!DEBUG_ENABLED) return

  logDataFlow({
    operationId,
    stage: 'validation',
    message: validationPassed
      ? 'All required fields validated successfully'
      : 'Validation failed',
    values: requiredFields,
    error: errors ? errors.join('; ') : undefined,
  } as DataFlowLog)
}

/**
 * Log data preparation (before INSERT)
 */
export function logDataPreparation(
  operationId: string,
  tableName: string,
  recordData: Record<string, any>
) {
  if (!DEBUG_ENABLED) return

  // Count non-null columns
  const populatedColumns = Object.fromEntries(
    Object.entries(recordData).filter(([_, val]) => val !== null)
  )

  logDataFlow({
    operationId,
    stage: 'data-prep',
    table: tableName,
    operation: 'INSERT',
    message: `Preparing data for insertion (${Object.keys(populatedColumns).length} columns populated)`,
    columns: recordData,
  } as DataFlowLog)
}

/**
 * Log database INSERT operation
 */
export function logDatabaseInsert(
  operationId: string,
  tableName: string,
  recordId: string,
  insertedData: Record<string, any>,
  error?: string
) {
  if (!DEBUG_ENABLED) return

  logDataFlow({
    operationId,
    stage: 'db-insert',
    table: tableName,
    operation: 'INSERT',
    message: error
      ? `INSERT into ${tableName} failed`
      : `Successfully inserted into ${tableName} with ID: ${recordId}`,
    values: insertedData,
    rowsAffected: error ? 0 : 1,
    error,
  } as DataFlowLog)
}

/**
 * Log database UPDATE operation
 */
export function logDatabaseUpdate(
  operationId: string,
  tableName: string,
  whereClause: Record<string, any>,
  updateData: Record<string, any>,
  rowsAffected?: number,
  error?: string
) {
  if (!DEBUG_ENABLED) return

  logDataFlow({
    operationId,
    stage: 'db-update',
    table: tableName,
    operation: 'UPDATE',
    message: error
      ? `UPDATE ${tableName} failed`
      : `Successfully updated ${tableName} (${rowsAffected} rows)`,
    columns: updateData,
    values: whereClause,
    rowsAffected,
    error,
  } as DataFlowLog)
}

/**
 * Log relationship creation (junction tables)
 */
export function logRelationshipCreation(
  operationId: string,
  tableName: string,
  relationship: Record<string, any>,
  recordId: string,
  error?: string
) {
  if (!DEBUG_ENABLED) return

  logDataFlow({
    operationId,
    stage: 'relationship',
    table: tableName,
    operation: 'INSERT',
    message: error
      ? `Failed to create relationship in ${tableName}`
      : `Created relationship in ${tableName} with ID: ${recordId}`,
    values: relationship,
    error,
  } as DataFlowLog)
}

/**
 * Log cascading updates (when follow-ups resolve parents)
 */
export function logCascadingUpdate(
  operationId: string,
  cascadeInfo: {
    originalRecordId: string
    rootCheckupId?: string
    parentId?: string
    allResolvedIds: string[]
    statusFields: Record<string, any>
  },
  error?: string
) {
  if (!DEBUG_ENABLED) return

  logDataFlow({
    operationId,
    stage: 'db-update',
    table: 'animal_health_records',
    operation: 'UPDATE',
    message: error
      ? `Cascading update failed`
      : `Cascading resolution triggered for ${cascadeInfo.allResolvedIds.length} records`,
    values: {
      originalRecordId: cascadeInfo.originalRecordId,
      rootCheckupId: cascadeInfo.rootCheckupId,
      parentId: cascadeInfo.parentId,
      resolvedIds: cascadeInfo.allResolvedIds,
      statusChanger: cascadeInfo.statusFields,
    },
    error,
  } as DataFlowLog)
}

/**
 * Log status update cascade
 */
export function logStatusUpdate(
  operationId: string,
  animalId: string,
  oldStatus: string | null,
  newStatus: string,
  error?: string
) {
  if (!DEBUG_ENABLED) return

  logDataFlow({
    operationId,
    stage: 'db-update',
    table: 'animals',
    operation: 'UPDATE',
    message: error
      ? `Health status update for animal failed`
      : `Animal health status updated: ${oldStatus} → ${newStatus}`,
    values: {
      animalId,
      oldStatus: oldStatus || '(none)',
      newStatus,
    },
    error,
  } as DataFlowLog)
}

/**
 * Log status audit log creation
 */
export function logStatusAuditLog(
  operationId: string,
  auditLogId: string,
  auditData: Record<string, any>,
  error?: string
) {
  if (!DEBUG_ENABLED) return

  logDataFlow({
    operationId,
    stage: 'db-insert',
    table: 'animal_health_status_log',
    operation: 'INSERT',
    message: error
      ? `Failed to create audit log`
      : `Audit log created with ID: ${auditLogId}`,
    values: auditData,
    error,
  } as DataFlowLog)
}

/**
 * Log final response
 */
export function logFinalResponse(
  operationId: string,
  success: boolean,
  data: any,
  error?: string
) {
  if (!DEBUG_ENABLED) return

  logDataFlow({
    operationId,
    stage: 'response',
    message: success
      ? `API response sent successfully`
      : `API response sent with error`,
    values: success
      ? {
          recordId: data?.id,
          recordType: data?.record_type,
          animalId: data?.animal_id,
          statusUpdated: data?.animalHealthStatusUpdated,
        }
      : { error },
    error,
  } as DataFlowLog)
}

/**
 * Helper to check if debug is enabled
 */
export function isDebugEnabled(): boolean {
  return DEBUG_ENABLED
}

/**
 * Instructions for enabling debug mode
 */
export function debugInstructions(): string {
  return `
╔════════════════════════════════════════════════════════════╗
║           HEALTH RECORDS DEBUG MODE INSTRUCTIONS           ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║ To enable debug logging for health records:               ║
║                                                            ║
║ 1. Add to .env.local:                                      ║
║    DEBUG_HEALTH_RECORDS=true                              ║
║                                                            ║
║ 2. Restart development server                             ║
║                                                            ║
║ 3. All health record API calls will log detailed data      ║
║    flow from API → Database                               ║
║                                                            ║
║ Debug output shows:                                       ║
║  • Operation ID (unique per request)                      ║
║  • Timestamps for each stage                              ║
║  • Table names and column values                          ║
║  • Cascading updates and relationships                    ║
║  • Errors with full context                               ║
║                                                            ║
║ Disable by setting DEBUG_HEALTH_RECORDS=false             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `
}
