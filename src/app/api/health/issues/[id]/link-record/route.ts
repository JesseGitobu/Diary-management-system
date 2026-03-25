// Health Issues Link Record API Route
// src/app/api/health/issues/[id]/link-record/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { linkIssueToHealthRecord } from '@/lib/database/health-issues'

/**
 * POST /api/health/issues/[id]/link-record
 * Link a health issue to a health record
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (await getUserRole(user.id)) as any

    if (!userRole?.farm_id || !['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()

    const { health_record_id } = body

    // Validate required fields
    if (!health_record_id) {
      return NextResponse.json(
        { error: 'Missing required field: health_record_id' },
        { status: 400 }
      )
    }

    // Link the issue to the health record
    const result = await linkIssueToHealthRecord(id, health_record_id, userRole.farm_id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      issue: result.issue,
      message: 'Health issue linked to record successfully'
    })
  } catch (error) {
    console.error('Link health record error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to link health record'
      },
      { status: 500 }
    )
  }
}
