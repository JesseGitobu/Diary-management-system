// api/farms/[farmId]/animals/[id]/feeding-schedules/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFarmFeedingSchedulesForAnimal } from '@/lib/database/animalFeedingRecords'

// GET feeding schedules that affect a specific animal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    // Await params before accessing properties
    const { farmId, id: animalId } = await params

    // Verify farm access
    if (userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied to this farm' }, { status: 403 })
    }
    
    // Get feeding schedules that affect this animal
    const schedulesResult = await getFarmFeedingSchedulesForAnimal(
      farmId,
      animalId
    )
    
    if (!schedulesResult.success) {
      return NextResponse.json({ error: schedulesResult.error }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      schedules: schedulesResult.data,
      total: schedulesResult.data.length 
    })
    
  } catch (error) {
    console.error('Feeding schedules API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}