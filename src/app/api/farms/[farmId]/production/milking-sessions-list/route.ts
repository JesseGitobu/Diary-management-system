import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  const { farmId } = await params

  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any

    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // Query the milking_sessions table directly for all sessions for this farm
    // This is the authoritative source - NOT farm_production_settings.milking_sessions
    const { data: allMilkingSessions, error: sessionsError } = await supabase
      .from('milking_sessions')
      .select('id, session_name')
      .eq('farm_id', farmId)

    if (sessionsError) {
      console.error('[MilkingSessions] Error fetching milking_sessions:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch milking sessions' }, { status: 500 })
    }

    console.log('[MilkingSessions] Query milking_sessions table:', {
      farmId,
      found: allMilkingSessions?.length || 0,
      sessions: allMilkingSessions?.map((s: any) => ({ id: s.id, name: s.session_name }))
    })

    // Build sessions from table data
    let sessions: Array<{ id: string; name: string }> = (allMilkingSessions || []).map((row: any) => ({
      id: row.id,
      name: row.session_name || 'Unknown Session',
    }))

    // Fallback to defaults if no sessions found
    if (sessions.length === 0) {
      console.log('[MilkingSessions] No sessions found, using defaults')
      sessions = [
        { id: 'morning', name: 'Morning' },
        { id: 'afternoon', name: 'Afternoon' },
        { id: 'evening', name: 'Evening' },
      ]
    }

    console.log(`[MilkingSessions] Returning sessions:`, {
      totalReturned: sessions.length,
      sessionIds: sessions.map(s => s.id)
    })

    return NextResponse.json({
      success: true,
      data: sessions,
    })

  } catch (error) {
    console.error('Get milking sessions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
