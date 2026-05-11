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
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [API] Equipment check-sessions GET called')

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
    const includeCheckedIn = searchParams.get('include_checked_in') === 'true'

    const result = await getCheckSessions(userRole.farm_id, equipmentId, includeCheckedIn)

    if (!result.success) {
      console.error('❌ [API] Error fetching check sessions:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    console.log('✅ [API] Check sessions fetched:', result.data.length)
    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data.length,
    })
  } catch (error) {
    console.error('❌ [API] Check sessions fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    const userRole = await getUserRole(user.id)

    if (!userRole?.farm_id) {
      console.log('❌ [API] User has no farm associated')
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const body = await request.json()
    console.log('🔧 [API] Request body:', body)

    const { type } = body

    if (!type || !['out', 'in'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "out" or "in"' },
        { status: 400 }
      )
    }

    // Handle checkout
    if (type === 'out') {
      const {
        equipment_id,
        assignment_id,
        staff_id,
        purpose,
        location,
        fuel_level_before_pct,
      } = body

      // Validate required fields
      if (!equipment_id) {
        return NextResponse.json({ error: 'equipment_id is required' }, { status: 400 })
      }

      if (!staff_id) {
        return NextResponse.json(
          { error: 'staff_id (worker ID) is required for checked_out_by' },
          { status: 400 }
        )
      }

      if (!purpose) {
        return NextResponse.json({ error: 'purpose is required' }, { status: 400 })
      }

      if (fuel_level_before_pct === undefined || fuel_level_before_pct === null) {
        return NextResponse.json(
          { error: 'fuel_level_before_pct is required' },
          { status: 400 }
        )
      }

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
      const {
        session_id,
        equipment_id,
        fuel_level_after_pct,
        condition_on_return,
        damage_notes,
      } = body

      if (fuel_level_after_pct === undefined || fuel_level_after_pct === null) {
        return NextResponse.json(
          { error: 'fuel_level_after_pct is required' },
          { status: 400 }
        )
      }

      if (!condition_on_return) {
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
        return NextResponse.json(
          {
            error: `Invalid condition: ${normalizedCondition}. Must be: excellent, good, fair, or damaged`,
          },
          { status: 400 }
        )
      }

      let targetSessionId = session_id

      // If session_id is not provided, try to find the open session using equipment_id
      if (!targetSessionId && equipment_id) {
        const supabase = await createServerSupabaseClient()
        const { data: sessions, error: sessionError } = await supabase
          .from('equipment_check_sessions')
          .select('id')
          .eq('equipment_id', equipment_id)
          .eq('farm_id', userRole.farm_id)
          .is('checkin_at', null)
          .order('checkout_at', { ascending: false })
          .limit(1)

        if (!sessionError && sessions && sessions.length > 0) {
          targetSessionId = sessions[0].id
          console.log('🔍 [API] Found open session for equipment:', targetSessionId)
        }
      }

      if (!targetSessionId) {
        return NextResponse.json(
          {
            error:
              'session_id not found. No open checkout session for this equipment',
          },
          { status: 404 }
        )
      }

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
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
