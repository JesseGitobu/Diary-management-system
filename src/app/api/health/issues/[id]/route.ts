// Health Issues [ID] API Route
// src/app/api/health/issues/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import {
  updateHealthIssue,
  getHealthIssue,
  addIssueObservation,
  linkIssueToHealthRecord,
  HealthIssueUpdateData
} from '@/lib/database/health-issues'

/**
 * GET /api/health/issues/[id]
 * Get a specific health issue
 */
export async function GET(
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

    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const result = await getHealthIssue(id, userRole.farm_id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      issue: result.issue
    })
  } catch (error) {
    console.error('Health issue fetch error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch health issue'
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/health/issues/[id]
 * Update a health issue
 */
export async function PATCH(
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

    const {
      status,
      notes,
      resolution_notes,
      resolved_by,
      follow_up_required,
      follow_up_date,
      linked_health_record_id,
      assigned_veterinarian_id,
      veterinarian_response,
      veterinarian_recommendation,
      observation_history,
      last_observed_at,
      severity
    } = body

    // Validate status if provided
    const validStatuses = ['open', 'in_progress', 'under_observation', 'treated', 'resolved', 'closed']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Validate severity if provided
    const validSeverities = ['low', 'medium', 'high', 'critical']
    if (severity && !validSeverities.includes(severity)) {
      return NextResponse.json(
        {
          error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: HealthIssueUpdateData = {}

    if (status) updateData.status = status
    if (notes) updateData.notes = notes
    if (resolution_notes) updateData.resolution_notes = resolution_notes
    if (resolved_by) updateData.resolved_by = resolved_by
    if (follow_up_required !== undefined) updateData.follow_up_required = follow_up_required
    if (follow_up_date) updateData.follow_up_date = follow_up_date
    if (linked_health_record_id) updateData.linked_health_record_id = linked_health_record_id
    if (assigned_veterinarian_id) updateData.assigned_veterinarian_id = assigned_veterinarian_id
    if (veterinarian_response) updateData.veterinarian_response = veterinarian_response
    if (veterinarian_recommendation) updateData.veterinarian_recommendation = veterinarian_recommendation
    if (observation_history) updateData.observation_history = observation_history
    if (last_observed_at) updateData.last_observed_at = last_observed_at
    if (severity) updateData.severity = severity

    // Update the health issue
    const result = await updateHealthIssue(id, updateData, userRole.farm_id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      issue: result.issue,
      message: result.message
    })
  } catch (error) {
    console.error('Health issue update error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update health issue'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/health/issues/[id]
 * Delete a health issue (only for farm owners)
 */
export async function DELETE(
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

    if (!userRole?.farm_id || userRole.role_type !== 'farm_owner') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // Verify the issue exists and belongs to the farm
    const { data: existingIssue, error: fetchError } = await supabase
      .from('health_issues')
      .select('id')
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()

    if (fetchError || !existingIssue) {
      return NextResponse.json({ error: 'Health issue not found' }, { status: 404 })
    }

    // Delete the issue
    const { error: deleteError } = await supabase
      .from('health_issues')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Health issue delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Health issue deleted successfully'
    })
  } catch (error) {
    console.error('Health issue delete error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete health issue'
      },
      { status: 500 }
    )
  }
}
