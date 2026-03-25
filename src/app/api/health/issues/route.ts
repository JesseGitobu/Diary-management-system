// Health Issues API Route
// src/app/api/health/issues/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import {
  createHealthIssue,
  getHealthIssuesForFarm,
  getUrgentHealthIssues,
  getVeterinarianAlertIssues,
  HealthIssueData
} from '@/lib/database/health-issues'

/**
 * POST /api/health/issues
 * Create a new health issue report
 */
export async function POST(request: NextRequest) {
  try {
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
      animal_id,
      issue_type,
      issue_type_custom,
      severity,
      description,
      notes,
      symptoms,
      alert_veterinarian,
      first_observed_at,
      assigned_veterinarian_id
    } = body

    // Validate required fields
    if (!animal_id || !issue_type || !severity || !description) {
      return NextResponse.json(
        {
          error: 'Missing required fields: animal_id, issue_type, severity, description'
        },
        { status: 400 }
      )
    }

    // Validate issue type
    const validIssueTypes = [
      'injury',
      'illness',
      'behavior_change',
      'poor_appetite',
      'lameness',
      'respiratory',
      'reproductive',
      'other'
    ]
    if (!validIssueTypes.includes(issue_type)) {
      return NextResponse.json(
        {
          error: `Invalid issue type. Must be one of: ${validIssueTypes.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical']
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        {
          error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Validate custom issue type
    if (issue_type === 'other' && !issue_type_custom) {
      return NextResponse.json(
        {
          error: 'issue_type_custom is required when issue_type is "other"'
        },
        { status: 400 }
      )
    }

    // Prepare issue data
    const issueData: HealthIssueData = {
      farm_id: userRole.farm_id,
      animal_id,
      issue_type,
      issue_type_custom: issue_type === 'other' ? issue_type_custom : null,
      severity,
      description,
      notes: notes || null,
      symptoms: Array.isArray(symptoms) ? symptoms : null,
      alert_veterinarian: alert_veterinarian === true,
      reported_by: user.id,
      first_observed_at: first_observed_at || null,
      assigned_veterinarian_id: assigned_veterinarian_id || null
    }

    // Create the health issue
    const result = await createHealthIssue(issueData)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // If veterinarian should be alerted, trigger notification (in production)
    if (alert_veterinarian && result.issue) {
      // TODO: Send veterinarian notification/email
      // TODO: Create activity log entry
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/veterinarian-alert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SERVICE_ROLE_SECRET || ''}`
          },
          body: JSON.stringify({
            farm_id: userRole.farm_id,
            issue_id: result.issue.id,
            animal_id,
            severity,
            description
          })
        }).catch(err => console.error('Failed to send vet alert:', err))
      } catch (err) {
        console.error('Notification error:', err)
        // Don't fail the API call if notification fails
      }
    }

    return NextResponse.json(
      {
        success: true,
        issue: result.issue,
        message: result.message
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Health issue creation error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create health issue'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/health/issues
 * Get health issues for the current farm with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (await getUserRole(user.id)) as any

    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse query parameters for filters
    const searchParams = request.nextUrl.searchParams
    // Support multiple status values: can pass as ?status=open&status=in_progress or as comma-separated string
    const statusParam = searchParams.get('status')
    const allStatuses = searchParams.getAll('status')
    const status = allStatuses.length > 0 ? allStatuses : (statusParam?.split(',').filter(Boolean) || [])
    
    const severity = searchParams.get('severity')
    const animal_id = searchParams.get('animal_id')
    const alert_veterinarian = searchParams.get('alert_veterinarian')
    const urgent = searchParams.get('urgent')
    const veterinarian_alert = searchParams.get('veterinarian_alert')

    console.log('🔍 Health issues GET request:', {
      farm_id: userRole.farm_id,
      status,
      severity,
      animal_id,
      urgent,
      veterinarian_alert
    })

    let result

    // Get urgent issues if requested
    if (urgent === 'true') {
      result = await getUrgentHealthIssues(userRole.farm_id)
    }
    // Get veterinarian alert issues if requested
    else if (veterinarian_alert === 'true') {
      result = await getVeterinarianAlertIssues(userRole.farm_id)
    }
    // Get filtered issues
    else {
      const filters: any = {}
      if (status && status.length > 0) filters.status = status
      if (severity) filters.severity = severity
      if (animal_id) filters.animal_id = animal_id
      if (alert_veterinarian) filters.alert_veterinarian = alert_veterinarian === 'true'

      result = await getHealthIssuesForFarm(userRole.farm_id, filters)
      console.log('🔍 Health issues result:', { success: result.success, count: result.issues?.length || 0 })
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, issues: [] },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      issues: result.issues,
      count: result.issues?.length || 0
    })
  } catch (error) {
    console.error('Health issues fetch error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch health issues',
        issues: []
      },
      { status: 500 }
    )
  }
}
