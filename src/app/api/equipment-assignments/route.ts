// src/app/api/equipment-assignments/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createEquipmentAssignment, getEquipmentAssignments } from '@/lib/database/equipment-assignments'

/**
 * Normalize role value to match database enum
 * Converts display formats like "Farm Worker" to "farm_worker"
 */
function normalizeRole(role: string): string | null {
  if (!role || typeof role !== 'string') return null

  const normalized = role
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^\w]/g, '') // Remove special characters

  const validRoles = ['driver', 'technician', 'farm_worker', 'supervisor']
  return validRoles.includes(normalized) ? normalized : null
}

/**
 * GET /api/equipment-assignments
 * Fetch equipment assignments for a farm with equipment details
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API] Equipment assignments GET called')

    const user = await getCurrentUser()

    if (!user) {
      console.log('❌ [API] No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)

    if (!userRole?.farm_id) {
      console.log('❌ [API] User has no farm associated')
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') === 'true'

    const supabase = await createServerSupabaseClient()

    // Build query with equipment join
    let query = supabase
      .from('equipment_assignments')
      .select(`
        id,
        equipment_id,
        staff_id,
        farm_id,
        role,
        certification_required,
        date_out,
        expected_return,
        actual_return,
        assigned_by,
        notes,
        created_at,
        updated_at,
        equipment:equipment_id(id, name, asset_id),
        worker:staff_id(id, name)
      `)
      .eq('farm_id', userRole.farm_id)

    if (activeOnly) {
      query = query.is('actual_return', null)
    }

    query = query.order('date_out', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('❌ [API] Error fetching assignments:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('✅ [API] Equipment assignments fetched:', data?.length || 0)
    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    })
  } catch (error) {
    console.error('❌ [API] Equipment assignments fetch error:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/equipment-assignments
 * Create a new equipment assignment
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API] Equipment assignment POST called')

    const user = await getCurrentUser()

    if (!user) {
      console.log('❌ [API] No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)

    if (!userRole?.farm_id) {
      console.log('❌ [API] User has no farm associated')
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const body = await request.json()
    console.log('🔧 [API] Request body:', body)

    const { equipment_id, staff_id, role, certification_required, date_out, expected_return, notes } = body

    // Validate required fields
    if (!equipment_id || !staff_id || !role || !date_out) {
      return NextResponse.json(
        {
          error: 'Missing required fields: equipment_id, staff_id, role, date_out',
        },
        { status: 400 }
      )
    }

    // Normalize role to lowercase with underscores
    const normalizedRole = normalizeRole(role)
    if (!normalizedRole) {
      return NextResponse.json(
        {
          error: 'Invalid role. Must be one of: driver, technician, farm_worker, supervisor',
        },
        { status: 400 }
      )
    }

    // Validate date_out is a valid ISO 8601 timestamp
    const dateOutTimestamp = new Date(date_out)
    if (isNaN(dateOutTimestamp.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date_out format. Expected ISO 8601 timestamp' },
        { status: 400 }
      )
    }

    // Validate expected_return if provided
    let expectedReturnTimestamp = null
    if (expected_return) {
      expectedReturnTimestamp = new Date(expected_return)
      if (isNaN(expectedReturnTimestamp.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expected_return format. Expected ISO 8601 timestamp' },
          { status: 400 }
        )
      }

      // Ensure expected_return is after date_out
      if (expectedReturnTimestamp <= dateOutTimestamp) {
        return NextResponse.json(
          { error: 'Expected return time must be after assignment time' },
          { status: 400 }
        )
      }
    }

    // Check if current user is a worker in the database
    const supabase = await createServerSupabaseClient()
    const { data: workerRecord } = await supabase
      .from('workers')
      .select('id')
      .eq('id', user.id)
      .single()

    // Only set assigned_by if user exists as a worker, otherwise null
    const assignedBy = workerRecord?.id || null

    // Create the assignment with current user as assigned_by (if they're a worker)
    const result = await createEquipmentAssignment({
      equipment_id,
      staff_id,
      farm_id: userRole.farm_id,
      role: normalizedRole as any,
      certification_required: certification_required || null,
      date_out,
      expected_return: expected_return || null,
      assigned_by: assignedBy,
      notes: notes || null,
    })

    if (result.error) {
      console.log('❌ [API] Assignment creation failed:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    console.log('✅ [API] Equipment assignment created:', result.assignment?.id)
    return NextResponse.json({
      success: true,
      assignment: result.assignment,
      message: 'Equipment assigned successfully',
    })
  } catch (error) {
    console.error('❌ [API] Equipment assignment error:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
