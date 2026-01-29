// src/app/api/audit-logs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuditLogs, AuditLogFilter } from '@/lib/database/audit-logs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const farmId = searchParams.get('farmId')
    const animalId = searchParams.get('animalId')
    const action = searchParams.get('action')
    const entityType = searchParams.get('entityType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const performedBy = searchParams.get('performedBy')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

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

    const filter: AuditLogFilter = {
      farmId,
      animalId: animalId || undefined,
      action: action || undefined,
      entityType: entityType || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      performedBy: performedBy || undefined,
      limit,
      offset,
    }

    const logs = await getAuditLogs(filter)

    return NextResponse.json({ data: logs })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
