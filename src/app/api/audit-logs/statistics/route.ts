// src/app/api/audit-logs/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuditLogStatistics } from '@/lib/database/audit-logs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const farmId = searchParams.get('farmId')
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30

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

    const statistics = await getAuditLogStatistics(farmId, days)
    return NextResponse.json({ data: statistics })
  } catch (error) {
    console.error('Error fetching audit log statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
