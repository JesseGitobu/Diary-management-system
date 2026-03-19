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
    
    // Fetch previous session volume (today's earlier sessions)
    const { data: previousSessionRecords } = await supabase
      .from('production_records')
      .select('milk_volume')
      .eq('farm_id', farmId)
      .eq('animal_id', animalId)
      .eq('record_date', currentDate)
      .neq('milking_session_id', currentSession)
      .order('created_at', { ascending: false })
      .limit(1)
    
    const typedPreviousSessionRecords = previousSessionRecords as any
    const previousSessionVolume = typedPreviousSessionRecords && typedPreviousSessionRecords.length > 0
      ? typedPreviousSessionRecords[0].milk_volume
      : null
    
    // Fetch same session yesterday's volume
    const { data: sameTimeYesterdayRecords } = await supabase
      .from('production_records')
      .select('milk_volume')
      .eq('farm_id', farmId)
      .eq('animal_id', animalId)
      .eq('record_date', yesterdayDate)
      .eq('milking_session_id', currentSession)
      .limit(1)
    
    const typedSameTimeYesterdayRecords = sameTimeYesterdayRecords as any
    const sameTimeYesterdayVolume = typedSameTimeYesterdayRecords && typedSameTimeYesterdayRecords.length > 0
      ? typedSameTimeYesterdayRecords[0].milk_volume
      : null
    
    return NextResponse.json({
      yesterdayTotal,
      previousSessionVolume,
      sameTimeYesterdayVolume,
    })
    
  } catch (error) {
    console.error('Production history API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
