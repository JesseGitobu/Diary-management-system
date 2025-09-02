// api/farms/[farmId]/animals/[id]/feeding-records/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  getAnimalFeedingRecords,
  getAnimalFeedingStats
} from '@/lib/database/animalFeedingRecords'

// GET feeding records for a specific animal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    // Await params before accessing properties
    const { farmId, id: animalId } = await params

    // Verify farm access
    if (userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied to this farm' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeStats = searchParams.get('include_stats') === 'true'
    
    // Get feeding records
    const recordsResult = await getAnimalFeedingRecords(
      farmId,
      animalId,
      limit
    )
    
    if (!recordsResult.success) {
      return NextResponse.json({ error: recordsResult.error }, { status: 500 })
    }

    let stats = null
    if (includeStats) {
      const statsResult = await getAnimalFeedingStats(
        farmId,
        animalId,
        30 // Last 30 days
      )
      
      if (statsResult.success) {
        stats = statsResult.data
      }
    }

    return NextResponse.json({ 
      success: true,
      records: recordsResult.data,
      stats: stats,
      total: recordsResult.data.length 
    })
    
  } catch (error) {
    console.error('Feeding records API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}