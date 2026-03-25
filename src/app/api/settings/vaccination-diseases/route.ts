// src/app/api/settings/vaccination-diseases/route.ts
// API endpoints for managing farm vaccination diseases
// Implements complete CRUD operations with proper authentication and authorization

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import {
  getVaccinationDiseases,
  getVaccinationDiseaseStats,
  createVaccinationDisease,
  updateVaccinationDisease,
  deleteVaccinationDisease,
  bulkUpdateVaccinationDiseaseStatus,
  VaccinationDiseaseInput
} from '@/lib/database/vaccination-settings'

/**
 * GET /api/settings/vaccination-diseases
 * Retrieve vaccination diseases for a farm
 * Query params: farmId (required)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Extract farm ID from query parameters
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')
    const action = searchParams.get('action')

    if (!farmId) {
      return NextResponse.json(
        { error: 'Missing required parameter: farmId' },
        { status: 400 }
      )
    }

    // Verify user has access to this farm
    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json(
        { error: 'You do not have access to this farm' },
        { status: 403 }
      )
    }

    // Handle different actions
    if (action === 'stats') {
      // Get vaccination disease statistics
      const result = await getVaccinationDiseaseStats(farmId)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }
      return NextResponse.json({
        success: true,
        stats: result.stats
      })
    }

    // Get all vaccination diseases for the farm
    const result = await getVaccinationDiseases(farmId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data.length
    })

  } catch (error) {
    console.error('Error in GET /api/settings/vaccination-diseases:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/vaccination-diseases
 * Create a new vaccination disease
 * Body: { farmId, diseaseData }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { farmId, diseaseData } = body

    if (!farmId || !diseaseData) {
      return NextResponse.json(
        { error: 'Missing required fields: farmId and diseaseData' },
        { status: 400 }
      )
    }

    // Verify user has access to this farm
    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json(
        { error: 'You do not have access to this farm' },
        { status: 403 }
      )
    }

    // Check user has permission to create settings
    const allowedRoles = ['farm_owner', 'farm_manager', 'veterinarian']
    if (!allowedRoles.includes(userRole.role_type)) {
      return NextResponse.json(
        { error: 'You do not have permission to create vaccination diseases' },
        { status: 403 }
      )
    }

    // Create the vaccination disease
    const result = await createVaccinationDisease(
      farmId,
      diseaseData as VaccinationDiseaseInput,
      user.id
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        data: result.data
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error in POST /api/settings/vaccination-diseases:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/vaccination-diseases
 * Update vaccination disease(s)
 * Body: { farmId, diseaseId, diseaseData } or { farmId, action, diseaseIds, isActive }
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { farmId, diseaseId, diseaseData, action, diseaseIds, isActive } = body

    if (!farmId) {
      return NextResponse.json(
        { error: 'Missing required field: farmId' },
        { status: 400 }
      )
    }

    // Verify user has access to this farm
    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json(
        { error: 'You do not have access to this farm' },
        { status: 403 }
      )
    }

    // Check user has permission to update settings
    const allowedRoles = ['farm_owner', 'farm_manager', 'veterinarian']
    if (!allowedRoles.includes(userRole.role_type)) {
      return NextResponse.json(
        { error: 'You do not have permission to update vaccination diseases' },
        { status: 403 }
      )
    }

    // Handle bulk update
    if (action === 'bulkUpdateStatus' && diseaseIds && typeof isActive === 'boolean') {
      const result = await bulkUpdateVaccinationDiseaseStatus(farmId, diseaseIds, isActive)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: result.message
      })
    }

    // Handle single update
    if (!diseaseId || !diseaseData) {
      return NextResponse.json(
        { error: 'Missing required field: diseaseId or diseaseData' },
        { status: 400 }
      )
    }

    const result = await updateVaccinationDisease(
      farmId,
      diseaseId,
      diseaseData as Partial<VaccinationDiseaseInput>
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data
    })

  } catch (error) {
    console.error('Error in PUT /api/settings/vaccination-diseases:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/vaccination-diseases/[diseaseId]
 * Dynamic route handler for disease-specific deletion
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Parse request body or URL parameters
    const body = await request.json().catch(() => ({}))
    const { farmId, diseaseId, hardDelete } = body

    if (!farmId || !diseaseId) {
      return NextResponse.json(
        { error: 'Missing required fields: farmId and diseaseId' },
        { status: 400 }
      )
    }

    // Verify user has access to this farm
    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json(
        { error: 'You do not have access to this farm' },
        { status: 403 }
      )
    }

    // Check user has permission to delete settings
    const allowedRoles = hardDelete 
      ? ['farm_owner'] 
      : ['farm_owner', 'farm_manager', 'veterinarian']
    
    if (!allowedRoles.includes(userRole.role_type)) {
      return NextResponse.json(
        { error: 'You do not have permission to delete vaccination diseases' },
        { status: 403 }
      )
    }

    // Delete the vaccination disease
    const result = await deleteVaccinationDisease(
      farmId,
      diseaseId,
      hardDelete === true
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message
    })

  } catch (error) {
    console.error('Error in DELETE /api/settings/vaccination-diseases:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
