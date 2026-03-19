import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, context: any) {
  const { params } = context
  const farmId = (await params).farmId

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

    // Fetch configured milking sessions from farm_production_settings
    const { data: settings, error: settingsError } = await supabase
      .from('farm_production_settings')
      .select('milking_sessions')
      .eq('farm_id', farmId)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching settings:', settingsError)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Parse configured sessions from JSONB
    let configuredSessions: Array<{ id: string; name: string }> = []
    const settingsData = settings as any
    if (settingsData?.milking_sessions && Array.isArray(settingsData.milking_sessions)) {
      configuredSessions = settingsData.milking_sessions.map((session: any) => ({
        id: session.id || session,
        name: session.name || (typeof session === 'string' ? session : session.id),
      }))
    }

    // Fetch milking sessions from production_records
    const { data: records, error: recordsError } = await supabase
      .from('production_records')
      .select('milking_session_id')
      .eq('farm_id', farmId)
      .not('milking_session_id', 'is', null)

    if (recordsError) {
      console.error('Error fetching records:', recordsError)
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
    }

    // Collect unique session IDs from records
    const sessionIdsFromRecords = new Set<string>()
    records?.forEach((record: any) => {
      if (record.milking_session_id) {
        sessionIdsFromRecords.add(record.milking_session_id)
      }
    })

    // Build final sessions list: configured sessions are the primary source
    const allSessions = new Map<string, { id: string; name: string }>()
    
    // Add configured sessions
    configuredSessions.forEach(session => {
      allSessions.set(session.id, session)
    })

    // Convert map to array and sort by configured order
    const sessions = Array.from(allSessions.values())

    // Provide fallback if no sessions are configured
    if (sessions.length === 0) {
      sessions.push(
        { id: 'morning', name: 'Morning' },
        { id: 'afternoon', name: 'Afternoon' },
        { id: 'evening', name: 'Evening' }
      )
    }

    console.log(`[MilkingSessions] Returning ${sessions.length} sessions`)

    return NextResponse.json({
      success: true,
      data: sessions,
    })

  } catch (error) {
    console.error('Get milking sessions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
