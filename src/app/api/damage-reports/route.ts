import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { createDamageReport, getDamageReportsByFarmId } from '@/lib/database/damage-reports'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/database/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)

    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('📝 [API] Fetching damage reports for farm:', userRole.farm_id)
    console.log('Params - Status:', status, 'Limit:', limit, 'Offset:', offset)

    const result = await getDamageReportsByFarmId(
      userRole.farm_id,
      status as 'open' | 'in_progress' | 'resolved' | 'dismissed' | undefined,
      limit,
      offset
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Transform data to include equipment name at top level
    const transformedData = (result.data || []).map((report: any) => ({
      ...report,
      equipmentName: report.equipment?.name || 'Unknown Equipment',
      asset_id: report.equipment?.asset_id || report.asset_id,
      equipment_id: report.equipment_id, // Keep original field
    }))

    console.log('✅ [API] Damage reports fetched:', transformedData.length || 0)

    return NextResponse.json({
      success: true,
      data: transformedData,
      count: result.count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('❌ [API] Unexpected error fetching damage reports:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      equipmentId,
      farmId,
      description,
      urgency,
      discoveredDate,
      discoveredBy,
      createWorkOrder,
      notes,
      checkSessionId,
    } = body

    // Validation
    if (!equipmentId || !equipmentId.trim()) {
      return NextResponse.json(
        { error: 'Equipment is required' },
        { status: 400 }
      )
    }

    if (!farmId || !farmId.trim()) {
      return NextResponse.json(
        { error: 'Farm ID is required' },
        { status: 400 }
      )
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Damage description is required' },
        { status: 400 }
      )
    }

    if (!urgency || !['low', 'medium', 'high', 'critical'].includes(urgency)) {
      return NextResponse.json(
        { error: 'Valid urgency level is required' },
        { status: 400 }
      )
    }

    if (!discoveredDate) {
      return NextResponse.json(
        { error: 'Date discovered is required' },
        { status: 400 }
      )
    }

    const user = await getCurrentUser()

    if (!user) {
      console.log('❌ [API] No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API] User authenticated:', user.id)

    const userRole = await getUserRole(user.id)
    console.log('🔍 [API] User role retrieved:', userRole)

    if (!userRole?.farm_id) {
      console.log('❌ [API] User has no farm associated')
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    console.log('✅ [API] Farm ID:', userRole.farm_id)
    console.log('✅ [API] User ID for logged_by:', user.id)


    // Create damage report
    const result = await createDamageReport({
      equipment_id: equipmentId,
      farm_id: farmId,
      reported_by: user.id,
      description: description.trim(),
      urgency,
      discovered_at: discoveredDate,
      creates_work_order: createWorkOrder === true,
      check_session_id: checkSessionId || null,
      resolution_notes: notes && notes.trim() ? notes.trim() : null,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    console.log('✅ [API] Damage report created:', result.data?.id)

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    console.error('❌ [API] Unexpected error creating damage report:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
