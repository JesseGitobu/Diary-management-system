// src/lib/database/compliance-reports.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Animal } from '@/types/database'
import { AuditLog } from '@/lib/database/audit-logs'

export interface ComplianceReport {
  reportId: string
  generatedAt: string
  generatedBy: string
  farm: {
    id: string
    name: string
  }
  animal: {
    id: string
    tagNumber: string
    name: string
    breed: string
    gender: string
    birthDate: string
    currentStatus: string
  }
  auditSummary: {
    totalEvents: number
    lastUpdated: string
    createdDate: string
    lastStatusChange: string
  }
  healthHistory: {
    lastHealthCheckDate: string
    healthStatus: string
    recordsCount: number
  }
  productionHistory: {
    currentDailyProduction: number
    daysInMilk: number
    lactationNumber: number
    recordsCount: number
  }
  breedingHistory: {
    serviceCount: number
    expectedCalvingDate: string | null
    motherId: string | null
    fatherId: string | null
  }
  auditTrail: AuditLog[]
  compliance: {
    isComplete: boolean
    missingRecords: string[]
    warnings: string[]
    lastVerified: string
  }
}

export interface ComplianceExport {
  format: 'pdf' | 'json' | 'csv'
  reportType: 'full' | 'summary' | 'audit-trail'
  includeHealth: boolean
  includeProduction: boolean
  includeBreeding: boolean
  dateRange?: {
    start: string
    end: string
  }
}

/**
 * Generate comprehensive compliance report for an animal
 */
export async function generateComplianceReport(
  farmId: string,
  animalId: string
): Promise<ComplianceReport | null> {
  const supabase = await createServerSupabaseClient()

  try {
    // Get animal details
    const { data: animal } = await (supabase
      .from('animals') as any)
      .select('*')
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single()

    if (!animal) return null

    // Get farm details
    const { data: farmRaw } = await supabase
      .from('farms')
      .select('id, name')
      .eq('id', farmId)
      .single()

    const farm: { id: string; name: string } | null = farmRaw as { id: string; name: string } | null

    // Get audit logs
    const { data: auditLogsRaw } = await supabase
      .from('animal_audit_logs_with_user')
      .select('*')
      .eq('farm_id', farmId)
      .eq('animal_id', animalId)
      .order('created_at', { ascending: true })

    const auditLogs: AuditLog[] = (auditLogsRaw || []) as AuditLog[]

    // Get health records
    const { data: healthRecordsRaw } = await supabase
      .from('animal_health_records')
      .select('*')
      .eq('animal_id', animalId)
      .order('created_at', { ascending: false })
      .limit(1)
    const healthRecords = (healthRecordsRaw || []) as any[]

    // Get production records
    const { data: productionRecords } = await supabase
      .from('animal_production_records')
      .select('*')
      .eq('animal_id', animalId)
      .order('created_at', { ascending: false })
      .limit(1)

    // Determine compliance issues
    const missingRecords: string[] = []
    const warnings: string[] = []

    if (!animal.breed) missingRecords.push('Breed information')
    if (!animal.birth_date && animal.animal_source === 'purchased_animal' && !animal.purchase_date) {
      missingRecords.push('Birth or purchase date')
    }

    const lastAudit = auditLogs?.[auditLogs.length - 1]
    const lastAuditDate = lastAudit ? new Date(lastAudit.created_at) : null
    const daysSinceLastAudit = lastAuditDate
      ? Math.floor((Date.now() - lastAuditDate.getTime()) / (1000 * 60 * 60 * 24))
      : null

    if (!healthRecords || daysSinceLastAudit! > 30) {
      warnings.push('Health check overdue (>30 days)')
    }

    if (animal.status === 'active' && !productionRecords && animal.production_status === 'lactating') {
      warnings.push('Missing production records for lactating animal')
    }

    return {
      reportId: `REP-${animalId.slice(0, 8)}-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      generatedBy: 'System Report Generator',
      farm: {
        id: farm?.id || '',
        name: farm?.name || 'Unknown Farm',
      },
      animal: {
        id: animal.id,
        tagNumber: animal.tag_number,
        name: animal.name || 'Unknown',
        breed: animal.breed || 'Unknown',
        gender: animal.gender,
        birthDate: animal.birth_date || animal.purchase_date || 'Unknown',
        currentStatus: animal.status,
      },
      auditSummary: {
        totalEvents: auditLogs?.length || 0,
        lastUpdated: lastAudit?.created_at || 'Never',
        createdDate: animal.created_at,
        lastStatusChange: auditLogs
          ?.find((log) => log.action === 'status_change')
          ?.created_at || 'Never',
      },
      healthHistory: {
        lastHealthCheckDate: healthRecords?.[0]?.created_at || 'No records',
        healthStatus: animal.health_status || 'Unknown',
        recordsCount: 0, // Will need to count from query
      },
      productionHistory: {
        currentDailyProduction: animal.current_daily_production || 0,
        daysInMilk: animal.days_in_milk || 0,
        lactationNumber: animal.lactation_number || 0,
        recordsCount: 0,
      },
      breedingHistory: {
        serviceCount: 0,
        expectedCalvingDate: animal.expected_calving_date,
        motherId: animal.mother_id,
        fatherId: animal.father_id,
      },
      auditTrail: (auditLogs || []) as AuditLog[],
      compliance: {
        isComplete: missingRecords.length === 0 && warnings.length === 0,
        missingRecords,
        warnings,
        lastVerified: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('Error generating compliance report:', error)
    return null
  }
}

/**
 * Generate PDF export of compliance report
 */
export async function generateCompliancePDF(
  farmId: string,
  animalId: string
): Promise<Buffer | null> {
  try {
    const report = await generateComplianceReport(farmId, animalId)
    if (!report) return null

    // Note: This is a template for PDF generation
    // In production, use a library like pdfkit or puppeteer
    const htmlContent = generateReportHTML(report)

    // Return HTML as base64 (client-side rendering)
    // In production, convert to PDF using server-side library
    return Buffer.from(htmlContent, 'utf-8')
  } catch (error) {
    console.error('Error generating PDF:', error)
    return null
  }
}

/**
 * Generate HTML representation of compliance report
 */
function generateReportHTML(report: ComplianceReport): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Compliance Report - ${report.animal.tagNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #2c3e50; color: white; padding: 20px; margin-bottom: 20px; }
    .section { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; }
    .section-title { background: #ecf0f1; font-weight: bold; padding: 10px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f8f9fa; font-weight: bold; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 5px 0; }
    .success { background: #d4edda; border-left: 4px solid #28a745; padding: 10px; margin: 5px 0; }
    .error { background: #f8d7da; border-left: 4px solid #dc3545; padding: 10px; margin: 5px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Animal Compliance Report</h1>
    <p>Report ID: ${report.reportId}</p>
    <p>Generated: ${new Date(report.generatedAt).toLocaleString()}</p>
  </div>

  <div class="section">
    <div class="section-title">Animal Information</div>
    <table>
      <tr><th>Field</th><th>Value</th></tr>
      <tr><td>Tag Number</td><td>${report.animal.tagNumber}</td></tr>
      <tr><td>Name</td><td>${report.animal.name}</td></tr>
      <tr><td>Breed</td><td>${report.animal.breed}</td></tr>
      <tr><td>Gender</td><td>${report.animal.gender}</td></tr>
      <tr><td>Birth Date</td><td>${report.animal.birthDate}</td></tr>
      <tr><td>Current Status</td><td>${report.animal.currentStatus}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Farm Information</div>
    <p><strong>Farm Name:</strong> ${report.farm.name}</p>
  </div>

  <div class="section">
    <div class="section-title">Audit Summary</div>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Total Audit Events</td><td>${report.auditSummary.totalEvents}</td></tr>
      <tr><td>Last Updated</td><td>${report.auditSummary.lastUpdated}</td></tr>
      <tr><td>Created Date</td><td>${report.auditSummary.createdDate}</td></tr>
      <tr><td>Last Status Change</td><td>${report.auditSummary.lastStatusChange}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Health & Production</div>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Health Status</td><td>${report.healthHistory.healthStatus}</td></tr>
      <tr><td>Last Health Check</td><td>${report.healthHistory.lastHealthCheckDate}</td></tr>
      <tr><td>Current Daily Production</td><td>${report.productionHistory.currentDailyProduction} L</td></tr>
      <tr><td>Days in Milk</td><td>${report.productionHistory.daysInMilk}</td></tr>
      <tr><td>Lactation Number</td><td>${report.productionHistory.lactationNumber}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Compliance Status</div>
    ${
      report.compliance.isComplete
        ? '<div class="success">✓ All compliance requirements met</div>'
        : '<div class="error">✗ Compliance issues detected</div>'
    }
    
    ${
      report.compliance.missingRecords.length > 0
        ? `
        <h4>Missing Records:</h4>
        ${report.compliance.missingRecords.map((record) => `<div class="error">• ${record}</div>`).join('')}
        `
        : ''
    }
    
    ${
      report.compliance.warnings.length > 0
        ? `
        <h4>Warnings:</h4>
        ${report.compliance.warnings.map((warning) => `<div class="warning">⚠ ${warning}</div>`).join('')}
        `
        : ''
    }
  </div>

  <div class="footer">
    <p>This report was generated automatically by the Dairy Farm Management System.</p>
    <p>Last verified: ${report.compliance.lastVerified}</p>
  </div>
</body>
</html>
  `
}

/**
 * Export compliance report to JSON
 */
export async function exportComplianceJSON(
  farmId: string,
  animalId: string
): Promise<string | null> {
  try {
    const report = await generateComplianceReport(farmId, animalId)
    if (!report) return null
    return JSON.stringify(report, null, 2)
  } catch (error) {
    console.error('Error exporting compliance report:', error)
    return null
  }
}

/**
 * Export compliance report to CSV
 */
export async function exportComplianceCSV(
  farmId: string,
  animalId: string
): Promise<string | null> {
  try {
    const report = await generateComplianceReport(farmId, animalId)
    if (!report) return null

    const rows: string[] = []

    // Animal Info
    rows.push('ANIMAL INFORMATION')
    rows.push(`Tag Number,${report.animal.tagNumber}`)
    rows.push(`Name,${report.animal.name}`)
    rows.push(`Breed,${report.animal.breed}`)
    rows.push(`Gender,${report.animal.gender}`)
    rows.push(`Status,${report.animal.currentStatus}`)
    rows.push('')

    // Audit Summary
    rows.push('AUDIT SUMMARY')
    rows.push(`Total Events,${report.auditSummary.totalEvents}`)
    rows.push(`Last Updated,${report.auditSummary.lastUpdated}`)
    rows.push(`Created Date,${report.auditSummary.createdDate}`)
    rows.push('')

    // Production Data
    rows.push('PRODUCTION INFORMATION')
    rows.push(`Current Daily Production,${report.productionHistory.currentDailyProduction}`)
    rows.push(`Days in Milk,${report.productionHistory.daysInMilk}`)
    rows.push(`Lactation Number,${report.productionHistory.lactationNumber}`)
    rows.push('')

    // Compliance
    rows.push('COMPLIANCE STATUS')
    rows.push(`Complete,${report.compliance.isComplete ? 'Yes' : 'No'}`)
    if (report.compliance.missingRecords.length > 0) {
      rows.push(`Missing Records,"${report.compliance.missingRecords.join('; ')}"`)
    }
    if (report.compliance.warnings.length > 0) {
      rows.push(`Warnings,"${report.compliance.warnings.join('; ')}"`)
    }

    return rows.join('\n')
  } catch (error) {
    console.error('Error exporting compliance to CSV:', error)
    return null
  }
}
