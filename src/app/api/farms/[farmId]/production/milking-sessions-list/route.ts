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

    // Fetch distinct milking_session UUIDs used in production_records for this farm
    const { data: records, error: recordsError } = await supabase
      .from('production_records')
      .select('milking_session_id')
      .eq('farm_id', farmId)
      .not('milking_session_id', 'is', null)

    if (recordsError) {
      console.error('Error fetching records:', recordsError)
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
    }

    const uniqueSessionUuids = [...new Set(
      (records || []).map((r: any) => r.milking_session_id).filter(Boolean)
    )]

    // Resolve UUIDs → session_name from the milking_sessions table
    let resolvedSessions: Array<{ id: string; name: string }> = []
    if (uniqueSessionUuids.length > 0) {
      const { data: milkingRows } = await supabase
        .from('milking_sessions')
        .select('id, session_name')
        .in('id', uniqueSessionUuids)

      if (milkingRows) {
        resolvedSessions = (milkingRows as any[]).map(row => ({
          id: row.id,
          name: row.session_name || 'Unknown Session',
        }))
      }
    }

    // Build final sessions list: UUID-resolved rows take priority; fall back to config or defaults
    const sessions: Array<{ id: string; name: string }> = resolvedSessions.length > 0
      ? resolvedSessions
      : configuredSessions.length > 0
        ? configuredSessions
        : [
            { id: 'morning', name: 'Morning' },
            { id: 'afternoon', name: 'Afternoon' },
            { id: 'evening', name: 'Evening' },
          ]

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
