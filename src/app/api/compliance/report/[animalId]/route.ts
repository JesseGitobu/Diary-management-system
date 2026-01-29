// src/app/api/compliance/report/[animalId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  generateComplianceReport,
  exportComplianceJSON,
  exportComplianceCSV,
} from '@/lib/database/compliance-reports'

interface RouteParams {
  params: Promise<{
    animalId: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { animalId } = await params
    const searchParams = request.nextUrl.searchParams
    const farmId = searchParams.get('farmId')
    const format = searchParams.get('format') || 'json' // 'json', 'csv', 'html'

    if (!farmId) {
      return NextResponse.json(
        { error: 'farmId is required' },
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

    const filename = `${animal.tag_number}_compliance_report_${new Date().toISOString().split('T')[0]}`

    if (format === 'csv') {
      const csv = await exportComplianceCSV(farmId, animalId)
      if (!csv) {
        return NextResponse.json(
          { error: 'Failed to generate report' },
          { status: 500 }
        )
      }
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })
    }

    if (format === 'json') {
      const json = await exportComplianceJSON(farmId, animalId)
      if (!json) {
        return NextResponse.json(
          { error: 'Failed to generate report' },
          { status: 500 }
        )
      }
      return new NextResponse(json, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      })
    }

    // Default: return structured report data
    const report = await generateComplianceReport(farmId, animalId)
    if (!report) {
      return NextResponse.json(
        { error: 'Failed to generate report' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: report })
  } catch (error) {
    console.error('Error generating compliance report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
