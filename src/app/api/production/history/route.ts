// src/app/api/production/history/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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
    const farmId = searchParams.get('farmId')
    const animalId = searchParams.get('animalId')
    const currentDate = searchParams.get('date')
    const currentSession = searchParams.get('session')
    
    // Verify farmId exists and matches user's farm
    if (!farmId) {
      return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 })
    }

    // Verify user's farm access
    if (farmId !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    if (!animalId || !currentDate || !currentSession) {
      return NextResponse.json({ 
        error: 'Missing required parameters: animalId, date, session' 
      }, { status: 400 })
    }
    
    const sessionName = searchParams.get('session_name')

    const supabase = await createServerSupabaseClient()

    // Get yesterday's date
    const currentDateObj = new Date(currentDate)
    const yesterdayObj = new Date(currentDateObj)
    yesterdayObj.setDate(yesterdayObj.getDate() - 1)
    const yesterdayDate = yesterdayObj.toISOString().split('T')[0]

    // Fetch yesterday's total volume for this animal
    const { data: yesterdayRecords } = await supabase
      .from('production_records')
      .select('milk_volume')
      .eq('farm_id', farmId)
      .eq('animal_id', animalId)
      .eq('record_date', yesterdayDate)

    const typedYesterdayRecords = yesterdayRecords as any
    const yesterdayTotal = typedYesterdayRecords && typedYesterdayRecords.length > 0
      ? typedYesterdayRecords.reduce((sum: number, r: any) => sum + (r.milk_volume || 0), 0)
      : null

    // Fetch previous session volume (today's earlier sessions).
    // The current session hasn't been created in milking_sessions yet, so no UUID to exclude —
    // any today record belongs to an earlier session.
    const { data: previousSessionRecords, error: prevError } = await supabase
      .from('production_records')
      .select('milk_volume, milking_session_id')
      .eq('farm_id', farmId)
      .eq('animal_id', animalId)
      .eq('record_date', currentDate)
      .not('milking_session_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (prevError) {
      console.error('[ProductionHistory] Error fetching previous session:', prevError)
    }

    let typedPreviousSessionRecords = previousSessionRecords as any
    let previousSessionVolume: number | null = null
    let previousSessionId: string | null = null

    // If no previous session today, get last session from yesterday
    if (!typedPreviousSessionRecords || typedPreviousSessionRecords.length === 0) {
      const { data: yesterdayLastSessionRecords, error: yesterdayError } = await supabase
        .from('production_records')
        .select('milk_volume, milking_session_id')
        .eq('farm_id', farmId)
        .eq('animal_id', animalId)
        .eq('record_date', yesterdayDate)
        .not('milking_session_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)

      if (yesterdayError) {
        console.error('[ProductionHistory] Error fetching yesterday last session:', yesterdayError)
      }

      typedPreviousSessionRecords = yesterdayLastSessionRecords as any
    }

    previousSessionVolume = typedPreviousSessionRecords && typedPreviousSessionRecords.length > 0
      ? typedPreviousSessionRecords[0].milk_volume
      : null
    previousSessionId = typedPreviousSessionRecords && typedPreviousSessionRecords.length > 0
      ? typedPreviousSessionRecords[0].milking_session_id
      : null

    // Fetch same session yesterday's volume.
    // Resolve yesterday's milking_session UUID by session_name to avoid UUID type errors.
    let sameTimeYesterdayVolume: number | null = null
    let sameTimeYesterdaySessionId: string | null = null

    if (sessionName) {
      const { data: yesterdaySession } = await (supabase as any)
        .from('milking_sessions')
        .select('id')
        .eq('farm_id', farmId)
        .eq('session_name', sessionName)
        .gte('session_start', `${yesterdayDate}T00:00:00`)
        .lte('session_start', `${yesterdayDate}T23:59:59`)
        .limit(1)

      const yesterdaySessionUUID: string | null =
        yesterdaySession && yesterdaySession.length > 0 ? yesterdaySession[0].id : null

      if (yesterdaySessionUUID) {
        const { data: sameTimeYesterdayRecords } = await supabase
          .from('production_records')
          .select('milk_volume, milking_session_id')
          .eq('farm_id', farmId)
          .eq('animal_id', animalId)
          .eq('record_date', yesterdayDate)
          .eq('milking_session_id', yesterdaySessionUUID)
          .limit(1)

        const typed = sameTimeYesterdayRecords as any
        sameTimeYesterdayVolume = typed && typed.length > 0 ? typed[0].milk_volume : null
        sameTimeYesterdaySessionId = typed && typed.length > 0 ? typed[0].milking_session_id : null
      }
    }
    
    return NextResponse.json({
      yesterdayTotal,
      previousSessionVolume,
      previousSessionId,
      previousSessionIsFromYesterday: typedPreviousSessionRecords && typedPreviousSessionRecords.length > 0 
        ? !previousSessionRecords || previousSessionRecords.length === 0
        : false,
      sameTimeYesterdayVolume,
      sameTimeYesterdaySessionId,
    })
    
  } catch (error) {
    console.error('Production history API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
