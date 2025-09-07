
// app/api/farms/[farmId]/animals/[id]/scheduled-feedings/[scheduledId]/complete/route.ts
// Enhanced version to handle late completion with reason

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { completeScheduledFeeding } from '@/lib/database/scheduledFeedings'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string; scheduledId: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { farmId, scheduledId } = await params
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { actualFeedingTime, lateReason } = await request.json()

    const result = await completeScheduledFeeding(
      scheduledId,
      user.id,
      actualFeedingTime,
      lateReason
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      data: result.data,
      message: result.data.wasLate 
        ? `Feeding completed ${result.data.lateByMinutes} minutes late`
        : 'Feeding completed on time'
    })
    
  } catch (error) {
    console.error('Complete scheduled feeding API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}