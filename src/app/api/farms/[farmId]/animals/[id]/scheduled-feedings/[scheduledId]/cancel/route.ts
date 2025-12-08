// app/api/farms/[farmId]/animals/[id]/scheduled-feedings/[scheduledId]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { cancelScheduledFeeding } from '@/lib/database/scheduledFeedings'

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
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { reason } = await request.json()

    const result = await cancelScheduledFeeding(scheduledId, user.id, reason)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Scheduled feeding cancelled successfully'
    })
    
  } catch (error) {
    console.error('Cancel scheduled feeding API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}