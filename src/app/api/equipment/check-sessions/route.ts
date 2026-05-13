import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import {
  createCheckOutSession,
  completeCheckInSession,
  getCheckSessions,
  getCheckSessionById,
} from '@/lib/database/equipment-check-sessions'

/**
 * GET /api/equipment/check-sessions
 * Fetch equipment check sessions for a farm
 * Query params:
 *   - equipment_id: Filter by equipment
 *   - include_checked_in: Include completed check-ins (default: false)
 *   - include_completed: Include completed check-ins (alternative param, default: false)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API] Equipment check-sessions GET called')

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

    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get('equipment_id') || undefined
    const includeCheckedIn = searchParams.get('include_checked_in') === 'true' || searchParams.get('include_completed') === 'true'

    console.log('📋 [API] Query params:', { equipmentId, includeCheckedIn })

    // Create Supabase client to fetch with joins
    const supabase = await createServerSupabaseClient()

    console.log('🔄 [API] Building query...')

    let query = supabase
      .from('equipment_check_sessions')
      .select(`
        id,
        equipment_id,
        assignment_id,
        farm_id,
        checked_out_by,
        checkout_at,
        checkin_at,
        purpose,
        location_used,
        fuel_level_before_pct,
        fuel_level_after_pct,
        condition_on_return,
        damage_notes,
        created_at,
        updated_at,
        equipment:equipment_id (id, name),
        worker:checked_out_by (id, name)
      `)
      .eq('farm_id', userRole.farm_id)

    console.log('✅ [API] Farm filter applied')

    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId)
      console.log('✅ [API] Equipment filter applied:', equipmentId)
    }

    // Only include completed sessions if requested
    if (includeCheckedIn) {
      query = query.not('checkin_at', 'is', null)
      console.log('✅ [API] Completed sessions filter applied (checkin_at IS NOT NULL)')
    } else {
      // Default: only show open sessions
      query = query.is('checkin_at', null)
      console.log('✅ [API] Open sessions filter applied (checkin_at IS NULL)')
    }

    query = query.order('checkout_at', { ascending: false })
    console.log('✅ [API] Ordering by checkout_at DESC')

    const { data, error } = await query

    if (error) {
      console.error('❌ [API] Supabase error:', error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 400 })
    }

    console.log('✅ [API] Query executed successfully')
    console.log('📊 [API] Sessions found:', data?.length || 0)

    if (data && data.length > 0) {
      console.log('📋 [API] Sample session:', JSON.stringify(data[0], null, 2))
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    })
  } catch (error) {
    console.error('❌ [API] Check sessions fetch error:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}

/**
 * POST /api/equipment/check-sessions
 * Create a new check session (checkout) or complete an existing one (checkin)
 *
 * For checkout (type: 'out'):
 * {
 *   type: 'out',
 *   equipment_id: string,
 *   assignment_id: string,
 *   staff_id: string,  // Worker ID - required for checked_out_by FK
 *   purpose: string,
 *   location?: string,
 *   fuel_level_before_pct: number
 * }
 *
 * For checkin (type: 'in'):
 * {
 *   type: 'in',
 *   session_id?: string,
 *   equipment_id?: string,
 *   fuel_level_after_pct: number,
 *   condition_on_return: 'excellent' | 'good' | 'fair' | 'damaged',
 *   damage_notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API] Equipment check-sessions POST called')

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

    const body = await request.json()
    console.log('📦 [API] Request body received:', JSON.stringify(body, null, 2))

    const { type } = body

    if (!type || !['out', 'in'].includes(type)) {
      console.log('❌ [API] Invalid type:', type)
      return NextResponse.json(
        { error: 'Invalid type. Must be "out" or "in"' },
        { status: 400 }
      )
    }

    console.log('✅ [API] Type validated:', type)

    // Handle checkout
    if (type === 'out') {
      console.log('🔵 [API] Processing CHECKOUT request')

      const {
        equipment_id,
        assignment_id,
        staff_id,
        purpose,
        location,
        fuel_level_before_pct,
      } = body

      console.log('🔍 [API] Checkout params:', {
        equipment_id,
        assignment_id,
        staff_id,
        purpose,
        location,
        fuel_level_before_pct,
      })

      // Validate required fields
      if (!equipment_id) {
        console.log('❌ [API] Missing equipment_id')
        return NextResponse.json({ error: 'equipment_id is required' }, { status: 400 })
      }

      if (!staff_id) {
        console.log('❌ [API] Missing staff_id')
        return NextResponse.json(
          { error: 'staff_id (worker ID) is required for checked_out_by' },
          { status: 400 }
        )
      }

      if (!purpose) {
        console.log('❌ [API] Missing purpose')
        return NextResponse.json({ error: 'purpose is required' }, { status: 400 })
      }

      if (fuel_level_before_pct === undefined || fuel_level_before_pct === null) {
        console.log('❌ [API] Missing fuel_level_before_pct')
        return NextResponse.json(
          { error: 'fuel_level_before_pct is required' },
          { status: 400 }
        )
      }

      console.log('✅ [API] All checkout validations passed')

      const result = await createCheckOutSession(userRole.farm_id, staff_id, {
        equipment_id,
        assignment_id: assignment_id || null,
        purpose,
        location_used: location || null,
        fuel_level_before_pct: Number(fuel_level_before_pct),
      })

      if (!result.success) {
        console.error('❌ [API] Error creating check-out session:', result.error)
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      console.log('✅ [API] Check-out session created:', result.data?.id)
      return NextResponse.json({
        success: true,
        message: 'Equipment checked out successfully',
        data: result.data,
      })
    }

    // Handle checkin
    if (type === 'in') {
      console.log('🟢 [API] Processing CHECK-IN request')

      const {
        session_id,
        equipment_id,
        fuel_level_after_pct,
        condition_on_return,
        damage_notes,
      } = body

      console.log('🔍 [API] Checkin params:', {
        session_id,
        equipment_id,
        fuel_level_after_pct,
        condition_on_return,
        damage_notes,
      })

      if (fuel_level_after_pct === undefined || fuel_level_after_pct === null) {
        console.log('❌ [API] Missing fuel_level_after_pct')
        return NextResponse.json(
          { error: 'fuel_level_after_pct is required' },
          { status: 400 }
        )
      }

      if (!condition_on_return) {
        console.log('❌ [API] Missing condition_on_return')
        return NextResponse.json(
          {
            error:
              'condition_on_return is required. Must be: excellent, good, fair, or damaged',
          },
          { status: 400 }
        )
      }

      // Normalize condition value
      const normalizedCondition = condition_on_return.toLowerCase()
      if (!['excellent', 'good', 'fair', 'damaged'].includes(normalizedCondition)) {
        console.log('❌ [API] Invalid condition:', normalizedCondition)
        return NextResponse.json(
          {
            error: `Invalid condition: ${normalizedCondition}. Must be: excellent, good, fair, or damaged`,
          },
          { status: 400 }
        )
      }

      console.log('✅ [API] Condition validated:', normalizedCondition)

      let targetSessionId = session_id

      // If session_id is not provided, try to find the open session using equipment_id
      if (!targetSessionId && equipment_id) {
        console.log('🔍 [API] Looking for open session for equipment:', equipment_id)

        const supabase = await createServerSupabaseClient()
        const { data: sessions, error: sessionError } = await supabase
          .from('equipment_check_sessions')
          .select('id')
          .eq('equipment_id', equipment_id)
          .eq('farm_id', userRole.farm_id)
          .is('checkin_at', null)
          .order('checkout_at', { ascending: false })
          .limit(1)

        if (sessionError) {
          console.error('❌ [API] Error finding open session:', sessionError)
        }

        if (!sessionError && sessions && sessions.length > 0) {
          targetSessionId = sessions[0].id
          console.log('✅ [API] Found open session:', targetSessionId)
        } else {
          console.log('❌ [API] No open session found for equipment:', equipment_id)
        }
      }

      if (!targetSessionId) {
        console.log('❌ [API] No target session ID found')
        return NextResponse.json(
          {
            error:
              'session_id not found. No open checkout session for this equipment',
          },
          { status: 404 }
        )
      }

      console.log('✅ [API] Target session ID confirmed:', targetSessionId)

      const result = await completeCheckInSession(targetSessionId, {
        fuel_level_after_pct: Number(fuel_level_after_pct),
        condition_on_return: normalizedCondition as 'excellent' | 'good' | 'fair' | 'damaged',
        damage_notes: damage_notes || null,
      })

      if (!result.success) {
        console.error('❌ [API] Error completing check-in session:', result.error)
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      console.log('✅ [API] Check-in session completed:', result.data?.id)
      return NextResponse.json({
        success: true,
        message: 'Equipment checked in successfully',
        data: result.data,
      })
    }
  } catch (error) {
    console.error('❌ [API] Check sessions POST error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
