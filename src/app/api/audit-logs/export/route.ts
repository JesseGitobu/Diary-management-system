// src/app/api/audit-logs/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  exportAuditLogsJSON,
  exportAuditLogsCSV,
  getAnimalAuditHistory,
} from '@/lib/database/audit-logs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const farmId = searchParams.get('farmId')
    const animalId = searchParams.get('animalId')
    const format = searchParams.get('format') || 'json' // 'json' or 'csv'

    if (!farmId || !animalId) {
      return NextResponse.json(
        { error: 'farmId and animalId are required' },
        { status: 400 }
      )
    }

    // Verify user has access to this farm
    const supabase = await createServerSupabaseClient()
    const { data: farmAccess } = await supabase
      .from('farm_users')
      .select('id')
      .eq('farm_id', farmId)
      .single()

    if (!farmAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Verify animal belongs to farm
    const { data: animal } = await supabase
      .from('animals')
      .select('id, tag_number, name')
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single() as { data: { id: string; tag_number: string; name: string } | null }

    if (!animal) {
      return NextResponse.json(
        { error: 'Animal not found' },
        { status: 404 }
      )
    }

    const filename = `${animal.tag_number}_audit_logs_${new Date().toISOString().split('T')[0]}`

    if (format === 'csv') {
      const csv = await exportAuditLogsCSV(farmId, animalId)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })
    }

    // Default to JSON
    const json = await exportAuditLogsJSON(farmId, animalId)
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exporting audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    )
  }
}
