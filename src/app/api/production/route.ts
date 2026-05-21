// src/app/api/production/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createProductionRecord, getProductionRecords } from '@/lib/database/production'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Resolves or creates a milking_sessions row for today's session name.
 * Protected by unique index on (farm_id, session_name, session_start).
 * If concurrent requests attempt to create the same session, the unique index
 * will prevent duplicates at the database level.
 * 
 * This is necessary because production_records.milking_session_id is a UUID FK
 * to the milking_sessions table — not the config-level session ID (e.g. '1','2','3').
 */
async function resolveOrCreateMilkingSession(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  farmId: string,
  recordDate: string,
  sessionName: string,
  recordedBy: string
): Promise<string> {
  const sessionStart = `${recordDate}T00:00:00`

  // First, try to find existing session for this farm/name/date
  const { data: existing, error: lookupError } = await (supabase as any)
    .from('milking_sessions')
    .select('id')
    .eq('farm_id', farmId)
    .eq('session_name', sessionName)
    .eq('session_start', sessionStart)
    .limit(1)

  if (lookupError) {
    throw new Error('Failed to look up milking session')
  }

  if (existing && existing.length > 0) {
    return existing[0].id
  }

  // None found — attempt to create one
  const { data: created, error: createError } = await (supabase as any)
    .from('milking_sessions')
    .insert({
      farm_id: farmId,
      session_name: sessionName,
      session_start: sessionStart,
      milking_type: 'routine',
      recorded_by: recordedBy,
    })
    .select('id')
    .single()

  // If we hit unique constraint violation, query again for the existing session
  // This handles the race condition where another request created it between our lookup and insert
  if (createError) {
    if (createError.code === '23505') {
      // Unique constraint violation — another request won the race
      const { data: retryExisting, error: retryError } = await (supabase as any)
        .from('milking_sessions')
        .select('id')
        .eq('farm_id', farmId)
        .eq('session_name', sessionName)
        .eq('session_start', sessionStart)
        .limit(1)

      if (retryError || !retryExisting || retryExisting.length === 0) {
        throw new Error('Unique constraint prevented session creation, but session not found on retry')
      }

      return retryExisting[0].id
    }

    throw new Error(`Failed to create milking session: ${createError.message}`)
  }

  if (!created) {
    throw new Error('Failed to create milking session: unknown error')
  }

  return created.id
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any

    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { farm_id, session_name, ...productionData } = body

    if (farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate required fields
    if (!productionData.animal_id) {
      return NextResponse.json({ error: 'animal_id is required' }, { status: 400 })
    }
    if (!productionData.record_date) {
      return NextResponse.json({ error: 'record_date is required' }, { status: 400 })
    }
    if (productionData.milk_volume === undefined || productionData.milk_volume === null) {
      return NextResponse.json({ error: 'milk_volume is required' }, { status: 400 })
    }
    if (!productionData.milk_safety_status) {
      return NextResponse.json({ error: 'milk_safety_status is required' }, { status: 400 })
    }

    const validSafetyStatuses = ['safe', 'unsafe_health', 'unsafe_colostrum']
    if (!validSafetyStatuses.includes(productionData.milk_safety_status)) {
      return NextResponse.json({
        error: `milk_safety_status must be one of: ${validSafetyStatuses.join(', ')}`,
      }, { status: 400 })
    }

    if (productionData.mastitis_result) {
      const validMastitisResults = ['negative', 'mild', 'severe']
      if (!validMastitisResults.includes(productionData.mastitis_result)) {
        return NextResponse.json({
          error: `mastitis_result must be one of: ${validMastitisResults.join(', ')}`,
        }, { status: 400 })
      }
    }

    const supabase = await createServerSupabaseClient()

    // Resolve or create a proper milking_sessions row (UUID FK requirement)
    const resolvedSessionName = session_name || 'Session'

    let milkingSessionId: string
    try {
      milkingSessionId = await resolveOrCreateMilkingSession(
        supabase,
        userRole.farm_id,
        productionData.record_date,
        resolvedSessionName,
        user.id
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Session resolution failed'
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const { data: settingsData } = await supabase
      .from('farm_production_settings')
      .select('require_mastitis_test')
      .eq('farm_id', userRole.farm_id)
      .single() as any

    const settings = (settingsData as any) || {}

    if (settings.require_mastitis_test && !productionData.mastitis_test_performed) {
      return NextResponse.json({
        error: 'Mastitis test is required for this farm. Please perform and record the mastitis test before saving this record.',
      }, { status: 400 })
    }

    const recordData = {
      animal_id: productionData.animal_id,
      record_date: productionData.record_date,
      milk_volume: Number(productionData.milk_volume),
      milking_session_id: milkingSessionId,          // ✅ now a real UUID
      milk_safety_status: productionData.milk_safety_status,
      temperature: productionData.temperature ? Number(productionData.temperature) : null,
      mastitis_test_performed: productionData.mastitis_test_performed ?? false,
      mastitis_result: productionData.mastitis_result || null,
      affected_quarters: Array.isArray(productionData.affected_quarters)
        ? productionData.affected_quarters
        : null,
      fat_content: productionData.fat_content ? Number(productionData.fat_content) : null,
      protein_content: productionData.protein_content ? Number(productionData.protein_content) : null,
      somatic_cell_count: productionData.somatic_cell_count ? Number(productionData.somatic_cell_count) : null,
      lactose_content: productionData.lactose_content ? Number(productionData.lactose_content) : null,
      ph_level: productionData.ph_level ? Number(productionData.ph_level) : null,
      notes: productionData.notes || null,
      recording_type: productionData.recording_type || 'individual',
      milking_group_id: productionData.milking_group_id || null,
      recorded_by: user.id,
    }

    const result = await createProductionRecord(userRole.farm_id, recordData)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Production record created successfully',
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any

    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const animalId    = searchParams.get('animal_id')
    const startDate   = searchParams.get('start_date')
    const endDate     = searchParams.get('end_date')
    const sessionName = searchParams.get('session_name')   // ✅ use name, not UUID

    // If a session name is given, find the matching milking_sessions UUIDs for the date range
    let sessionUUIDs: string[] | undefined
    if (sessionName && startDate) {
      const supabase = await createServerSupabaseClient()
      const dayStart = `${startDate}T00:00:00`
      const dayEnd   = `${endDate || startDate}T23:59:59`

      const { data: sessions, error: sessErr } = await (supabase as any)
        .from('milking_sessions')
        .select('id')
        .eq('farm_id', userRole.farm_id)
        .eq('session_name', sessionName)
        .gte('session_start', dayStart)
        .lte('session_start', dayEnd)

      if (sessErr) {
        // Session lookup failed - continue with no filter
      } else {
        sessionUUIDs = (sessions ?? []).map((s: any) => s.id)
      }
    }

    const records = await getProductionRecords(
      userRole.farm_id,
      animalId || undefined,
      startDate || undefined,
      endDate || undefined,
      sessionUUIDs
    )

    return NextResponse.json({ success: true, data: records })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
