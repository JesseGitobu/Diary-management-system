import { NextRequest, NextResponse } from 'next/server'
import { getProductionSummary } from '@/lib/database/inventory'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const farmId = request.nextUrl.searchParams.get('farmId')
    const recordDate = request.nextUrl.searchParams.get('recordDate')

    if (!farmId || !recordDate) {
      return NextResponse.json(
        { error: 'Missing farmId or recordDate' },
        { status: 400 }
      )
    }

    // Verify user has access to this farm
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get production summary
    const summary = await getProductionSummary(farmId, recordDate)

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching production summary:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch production summary',
        todayProduction: 0,
        cumulativeAvailable: 0,
        totalProduced: 0,
        totalDistributed: 0
      },
      { status: 500 }
    )
  }
}
