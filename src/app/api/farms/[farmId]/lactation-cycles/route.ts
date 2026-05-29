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

    // Query ACTIVE lactation_cycle_records table for this farm
    // Only return animals with active lactation cycles (status = 'active')
    const { data: lactationCycles, error: cyclesError } = await supabase
      .from('lactation_cycle_records')
      .select('animal_id, lactation_number, status')
      .eq('farm_id', farmId)
      .eq('status', 'active')

    if (cyclesError) {
      console.error('[LactationCycles] Error fetching lactation_cycle_records:', cyclesError)
      return NextResponse.json({ error: 'Failed to fetch lactation cycles' }, { status: 500 })
    }

    console.log('[LactationCycles] Query lactation_cycle_records table:', {
      farmId,
      found: lactationCycles?.length || 0,
      animalsWithLactation: new Set(lactationCycles?.map((c: any) => c.animal_id) || []).size,
    })

    return NextResponse.json({ 
      data: lactationCycles || [],
      count: lactationCycles?.length || 0,
    })
  } catch (error) {
    console.error('[LactationCycles] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
