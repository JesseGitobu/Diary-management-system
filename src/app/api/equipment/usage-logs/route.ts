import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createUsageLog, getUsageLogById } from '@/lib/database/usage-logs'

/**
 * POST /api/equipment/usage-logs
 * Create a new equipment usage log
 *
 * Body:
 * {
 *   equipment_id: string (uuid, required)
 *   check_session_id?: string (uuid, optional)
 *   log_date: string (date, required) - YYYY-MM-DD format
 *   hours_this_session?: number (optional) - 0 to 999.9
 *   odometer_reading_after?: number (optional) - must be positive
 *   fuel_consumed_litres?: number (optional) - must be positive
 *   task_reference?: string (optional) - max 255 chars
 *   notes?: string (optional) - max 5000 chars
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API] Equipment usage-logs POST called')

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

    const body = await request.json()
    console.log('📦 [API] Request body received:', JSON.stringify(body, null, 2))

    const {
      equipment_id,
      check_session_id,
      log_date,
      hours_this_session,
      odometer_reading_after,
      fuel_consumed_litres,
      task_reference,
      notes,
    } = body

    console.log('🔍 [API] Parsed payload:', {
      equipment_id,
      check_session_id,
      log_date,
      hours_this_session,
      odometer_reading_after,
      fuel_consumed_litres,
      task_reference,
      notes,
    })

    // Validate required fields
    if (!equipment_id) {
      console.log('❌ [API] Missing equipment_id')
      return NextResponse.json({ error: 'equipment_id is required' }, { status: 400 })
    }

    if (!log_date) {
      console.log('❌ [API] Missing log_date')
      return NextResponse.json({ error: 'log_date is required' }, { status: 400 })
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(log_date)) {
      console.log('❌ [API] Invalid date format:', log_date)
      return NextResponse.json({ error: 'log_date must be in YYYY-MM-DD format' }, { status: 400 })
    }

    // Validate date is not in the future
    const logDate = new Date(log_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (logDate > today) {
      console.log('❌ [API] Log date is in the future')
      return NextResponse.json({ error: 'log_date cannot be in the future' }, { status: 400 })
    }

    console.log('✅ [API] Date validation passed')

    // Validate optional numeric fields
    if (hours_this_session !== null && hours_this_session !== undefined) {
      const hours = parseFloat(hours_this_session)
      if (isNaN(hours) || hours < 0) {
        console.log('❌ [API] Invalid hours_this_session:', hours_this_session)
        return NextResponse.json({ error: 'hours_this_session must be a positive number' }, { status: 400 })
      }
      if (hours > 999.9) {
        console.log('❌ [API] hours_this_session exceeds maximum:', hours)
        return NextResponse.json({ error: 'hours_this_session cannot exceed 999.9' }, { status: 400 })
      }
    }

    if (fuel_consumed_litres !== null && fuel_consumed_litres !== undefined) {
      const fuel = parseFloat(fuel_consumed_litres)
      if (isNaN(fuel) || fuel < 0) {
        console.log('❌ [API] Invalid fuel_consumed_litres:', fuel_consumed_litres)
        return NextResponse.json({ error: 'fuel_consumed_litres must be a positive number' }, { status: 400 })
      }
    }

    if (odometer_reading_after !== null && odometer_reading_after !== undefined) {
      const odometer = parseFloat(odometer_reading_after)
      if (isNaN(odometer) || odometer < 0) {
        console.log('❌ [API] Invalid odometer_reading_after:', odometer_reading_after)
        return NextResponse.json({ error: 'odometer_reading_after must be a positive number' }, { status: 400 })
      }
    }

    console.log('✅ [API] All numeric validations passed')

    // Validate string field lengths
    if (task_reference && task_reference.length > 255) {
      console.log('❌ [API] task_reference exceeds 255 characters')
      return NextResponse.json({ error: 'task_reference cannot exceed 255 characters' }, { status: 400 })
    }

    if (notes && notes.length > 5000) {
      console.log('❌ [API] notes exceeds 5000 characters')
      return NextResponse.json({ error: 'notes cannot exceed 5000 characters' }, { status: 400 })
    }

    console.log('✅ [API] String field validations passed')

    // Create usage log
    const result = await createUsageLog({
      equipment_id,
      check_session_id: check_session_id || null,
      farm_id: userRole.farm_id,
      logged_by: user.id,
      log_date,
      hours_this_session: hours_this_session ? parseFloat(hours_this_session) : null,
      odometer_reading_after: odometer_reading_after ? parseFloat(odometer_reading_after) : null,
      fuel_consumed_litres: fuel_consumed_litres ? parseFloat(fuel_consumed_litres) : null,
      task_reference: task_reference?.trim() || null,
      notes: notes?.trim() || null,
    })

    if (!result.success) {
      console.error('❌ [API] Error creating usage log:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    console.log('✅ [API] Usage log created:', result.data?.id)
    return NextResponse.json({
      success: true,
      message: 'Usage log created successfully',
      data: result.data,
    })
  } catch (error) {
    console.error('❌ [API] Usage log creation error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}

/**
 * GET /api/equipment/usage-logs
 * Fetch usage logs for a farm
 * Query params:
 *   - equipment_id: Filter by equipment (optional)
 *   - check_session_id: Filter by check session (optional)
 *   - limit: Number of logs to return (default: 50, max: 500)
 *   - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API] Equipment usage-logs GET called')

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

    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get('equipment_id') || undefined
    const checkSessionId = searchParams.get('check_session_id') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('📋 [API] Query params:', { equipmentId, checkSessionId, limit, offset })

    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('usage_logs')
      .select(
        `
        id,
        equipment_id,
        check_session_id,
        farm_id,
        logged_by,
        log_date,
        hours_this_session,
        odometer_reading_after,
        fuel_consumed_litres,
        task_reference,
        notes,
        created_at,
        updated_at,
        equipment:equipment_id (id, name)
        `,
        { count: 'exact' }
      )
      .eq('farm_id', userRole.farm_id)

    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId)
      console.log('✅ [API] Equipment filter applied:', equipmentId)
    }

    if (checkSessionId) {
      query = query.eq('check_session_id', checkSessionId)
      console.log('✅ [API] Check session filter applied:', checkSessionId)
    }

    query = query.order('log_date', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('❌ [API] Supabase error:', error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 400 })
    }

    console.log('✅ [API] Query executed successfully')
    console.log('📊 [API] Usage logs found:', data?.length || 0, '/ Total:', count)

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('❌ [API] Usage logs fetch error:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
