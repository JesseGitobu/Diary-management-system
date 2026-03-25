// Health Issues Observations API Route
// src/app/api/health/issues/[id]/observations/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { addIssueObservation } from '@/lib/database/health-issues'

/**
 * POST /api/health/issues/[id]/observations
 * Add an observation/update to a health issue
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

    const { notes, status, severity, timestamp } = body

    // Validate required fields
    if (!notes) {
      return NextResponse.json(
        { error: 'Missing required field: notes' },
        { status: 400 }
      )
    }

    // Validate status if provided
    const validStatuses = ['open', 'in_progress', 'under_observation', 'treated', 'resolved', 'closed']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate severity if provided
    const validSeverities = ['low', 'medium', 'high', 'critical']
    if (severity && !validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` },
        { status: 400 }
      )
    }

    // Add observation
    const result = await addIssueObservation(id, userRole.farm_id, {
      notes,
      status: status || undefined,
      severity: severity || undefined,
      timestamp: timestamp || undefined
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      issue: result.issue,
      message: 'Observation added successfully'
    })
  } catch (error) {
    console.error('Add observation error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to add observation'
      },
      { status: 500 }
    )
  }
}
