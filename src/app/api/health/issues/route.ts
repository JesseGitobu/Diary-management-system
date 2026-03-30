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

    const validSeverities = ['low', 'medium', 'high', 'critical']

    // Support both single issue (legacy) and multiple issues formats
    const isMultipleIssuesFormat = Array.isArray(body.issues)

    if (isMultipleIssuesFormat) {
      // Handle multiple issues
      const issues = body.issues as any[]

      if (!Array.isArray(issues) || issues.length === 0) {
        return NextResponse.json(
          { error: 'issues must be a non-empty array' },
          { status: 400 }
        )
      }

      // Validate all issues before creating
      for (const issue of issues) {
        if (!issue.animal_id || !issue.issue_type || !issue.severity || !issue.description) {
          return NextResponse.json(
            {
              error: 'All issues must have: animal_id, issue_type, severity, description'
            },
            { status: 400 }
          )
        }

        if (!validIssueTypes.includes(issue.issue_type)) {
          return NextResponse.json(
            {
              error: `Invalid issue type "${issue.issue_type}". Must be one of: ${validIssueTypes.join(', ')}`
            },
            { status: 400 }
          )
        }

        if (!validSeverities.includes(issue.severity)) {
          return NextResponse.json(
            {
              error: `Invalid severity "${issue.severity}". Must be one of: ${validSeverities.join(', ')}`
            },
            { status: 400 }
          )
        }

        if (issue.issue_type === 'other' && !issue.issue_type_custom) {
          return NextResponse.json(
            {
              error: 'issue_type_custom is required when issue_type is "other"'
            },
            { status: 400 }
          )
        }
      }

      // Create all issues
      const createdIssues = []
      const failedIssues = []

      for (const issueInput of issues) {
        try {
          const issueData: HealthIssueData = {
            farm_id: userRole.farm_id,
            animal_id: issueInput.animal_id,
            issue_type: issueInput.issue_type,
            issue_type_custom: issueInput.issue_type === 'other' ? issueInput.issue_type_custom : null,
            severity: issueInput.severity,
            description: issueInput.description,
            notes: issueInput.notes || null,
            symptoms: Array.isArray(issueInput.symptoms) ? issueInput.symptoms : null,
            alert_veterinarian: issueInput.alert_veterinarian === true,
            reported_by: user.id,
            first_observed_at: issueInput.first_observed_at || null,
            assigned_veterinarian_id: issueInput.assigned_veterinarian_id || null,
            // Injury fields
            injury_location: issueInput.injury_location || null,
            injury_wound_type: issueInput.injury_wound_type || null,
            injury_bleeding: issueInput.injury_bleeding || false,
            injury_swelling: issueInput.injury_swelling || false,
            // Illness fields
            illness_temperature: issueInput.illness_temperature || null,
            illness_onset_hours: issueInput.illness_onset_hours || null,
            illness_other_animals: issueInput.illness_other_animals || false,
            illness_milk_change: issueInput.illness_milk_change || false,
            illness_appetite: issueInput.illness_appetite || null,
            // Behavior change fields
            behavior_type: issueInput.behavior_type || null,
            behavior_consistency: issueInput.behavior_consistency || null,
            // Lameness fields
            lameness_affected_legs: issueInput.lameness_affected_legs || null,
            lameness_severity: issueInput.lameness_severity || null,
            lameness_swelling: issueInput.lameness_swelling || false,
            // Respiratory fields
            respiratory_cough_type: issueInput.respiratory_cough_type || null,
            respiratory_nasal_discharge: issueInput.respiratory_nasal_discharge || null,
            respiratory_temperature: issueInput.respiratory_temperature || null,
            respiratory_difficulty: issueInput.respiratory_difficulty || null,
            respiratory_duration: issueInput.respiratory_duration || null,
            // Reproductive fields
            reproductive_cycle_stage: issueInput.reproductive_cycle_stage || null,
            reproductive_discharge: issueInput.reproductive_discharge || null,
            reproductive_breeding_date: issueInput.reproductive_breeding_date || null,
            // Poor appetite fields
            appetite_level: issueInput.appetite_level || null,
            appetite_food_refused: issueInput.appetite_food_refused || null,
            appetite_water_intake: issueInput.appetite_water_intake || null,
            appetite_duration_hours: issueInput.appetite_duration_hours || null,
            appetite_other_symptoms: issueInput.appetite_other_symptoms || null,
            // Reduced milk fields
            reduced_milk_yield_change: issueInput.reduced_milk_yield_change || null,
            reduced_milk_color: issueInput.reduced_milk_color || null,
            reduced_milk_consistency: issueInput.reduced_milk_consistency || null,
            reduced_milk_temperature_check: issueInput.reduced_milk_temperature_check || false,
            reduced_milk_body_temperature: issueInput.reduced_milk_body_temperature || null,
            reduced_milk_udder_temperature: issueInput.reduced_milk_udder_temperature || null,
            reduced_milk_onset_hours: issueInput.reduced_milk_onset_hours || null,
            reduced_milk_previous_yield: issueInput.reduced_milk_previous_yield || null
          }

          const result = await createHealthIssue(issueData)

          if (result.success && result.issue) {
            createdIssues.push(result.issue)

            // If veterinarian should be alerted, trigger notification
            if (issueInput.alert_veterinarian) {
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
                    animal_id: issueInput.animal_id,
                    severity: issueInput.severity,
                    description: issueInput.description
                  })
                }).catch(err => console.error('Failed to send vet alert:', err))
              } catch (err) {
                console.error('Notification error:', err)
              }
            }
          } else {
            failedIssues.push({
              animal_id: issueInput.animal_id,
              error: result.error
            })
          }
        } catch (err) {
          failedIssues.push({
            animal_id: issueInput.animal_id,
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      }

      return NextResponse.json(
        {
          success: failedIssues.length === 0,
          issues: createdIssues,
          failed: failedIssues.length > 0 ? failedIssues : undefined,
          message: `Created ${createdIssues.length} health ${createdIssues.length === 1 ? 'issue' : 'issues'}${failedIssues.length > 0 ? ` (${failedIssues.length} failed)` : ''}`
        },
        { status: createdIssues.length > 0 ? 201 : 400 }
      )
    } else {
      // Handle single issue (legacy format)
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
        assigned_veterinarian_id,
        // Injury fields
        injury_location,
        injury_wound_type,
        injury_bleeding,
        injury_swelling,
        // Illness fields
        illness_temperature,
        illness_onset_hours,
        illness_other_animals,
        illness_milk_change,
        illness_appetite,
        // Behavior change fields
        behavior_type,
        behavior_consistency,
        // Lameness fields
        lameness_affected_legs,
        lameness_severity,
        lameness_swelling,
        // Respiratory fields
        respiratory_cough_type,
        respiratory_nasal_discharge,
        respiratory_temperature,
        respiratory_difficulty,
        respiratory_duration,
        // Reproductive fields
        reproductive_cycle_stage,
        reproductive_discharge,
        reproductive_breeding_date,
        // Poor appetite fields
        appetite_level,
        appetite_food_refused,
        appetite_water_intake,
        appetite_duration_hours,
        appetite_other_symptoms,
        // Reduced milk fields
        reduced_milk_yield_change,
        reduced_milk_color,
        reduced_milk_consistency,
        reduced_milk_temperature_check,
        reduced_milk_body_temperature,
        reduced_milk_udder_temperature,
        reduced_milk_onset_hours,
        reduced_milk_previous_yield
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

      if (!validIssueTypes.includes(issue_type)) {
        return NextResponse.json(
          {
            error: `Invalid issue type. Must be one of: ${validIssueTypes.join(', ')}`
          },
          { status: 400 }
        )
      }

      if (!validSeverities.includes(severity)) {
        return NextResponse.json(
          {
            error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
          },
          { status: 400 }
        )
      }

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
        assigned_veterinarian_id: assigned_veterinarian_id || null,
        // Injury fields
        injury_location: injury_location || null,
        injury_wound_type: injury_wound_type || null,
        injury_bleeding: injury_bleeding || false,
        injury_swelling: injury_swelling || false,
        // Illness fields
        illness_temperature: illness_temperature || null,
        illness_onset_hours: illness_onset_hours || null,
        illness_other_animals: illness_other_animals || false,
        illness_milk_change: illness_milk_change || false,
        illness_appetite: illness_appetite || null,
        // Behavior change fields
        behavior_type: behavior_type || null,
        behavior_consistency: behavior_consistency || null,
        // Lameness fields
        lameness_affected_legs: lameness_affected_legs || null,
        lameness_severity: lameness_severity || null,
        lameness_swelling: lameness_swelling || false,
        // Respiratory fields
        respiratory_cough_type: respiratory_cough_type || null,
        respiratory_nasal_discharge: respiratory_nasal_discharge || null,
        respiratory_temperature: respiratory_temperature || null,
        respiratory_difficulty: respiratory_difficulty || null,
        respiratory_duration: respiratory_duration || null,
        // Reproductive fields
        reproductive_cycle_stage: reproductive_cycle_stage || null,
        reproductive_discharge: reproductive_discharge || null,
        reproductive_breeding_date: reproductive_breeding_date || null,
        // Poor appetite fields
        appetite_level: appetite_level || null,
        appetite_food_refused: appetite_food_refused || null,
        appetite_water_intake: appetite_water_intake || null,
        appetite_duration_hours: appetite_duration_hours || null,
        appetite_other_symptoms: appetite_other_symptoms || null,
        // Reduced milk fields
        reduced_milk_yield_change: reduced_milk_yield_change || null,
        reduced_milk_color: reduced_milk_color || null,
        reduced_milk_consistency: reduced_milk_consistency || null,
        reduced_milk_temperature_check: reduced_milk_temperature_check || false,
        reduced_milk_body_temperature: reduced_milk_body_temperature || null,
        reduced_milk_udder_temperature: reduced_milk_udder_temperature || null,
        reduced_milk_onset_hours: reduced_milk_onset_hours || null,
        reduced_milk_previous_yield: reduced_milk_previous_yield || null
      }

      // Create the health issue
      const result = await createHealthIssue(issueData)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      // If veterinarian should be alerted, trigger notification
      if (alert_veterinarian && result.issue) {
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
    }
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
