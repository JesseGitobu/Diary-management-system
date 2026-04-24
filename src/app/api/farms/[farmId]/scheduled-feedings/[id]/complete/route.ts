// src/app/api/farms/[farmId]/scheduled-feedings/[id]/complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { completeScheduledFeeding } from '@/lib/database/scheduledFeedings'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { farmId, id } = await params
    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { actualFeedingTime, lateReason } = body

    if (actualFeedingTime) {
      const t = new Date(actualFeedingTime)
      if (isNaN(t.getTime())) {
        return NextResponse.json({ error: 'Invalid actual feeding time format' }, { status: 400 })
      }
      if (t > new Date()) {
        return NextResponse.json({ error: 'Actual feeding time cannot be in the future' }, { status: 400 })
      }
    }

    const result = await completeScheduledFeeding(farmId, id, user.id, actualFeedingTime, lateReason?.trim())

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Complete scheduled feeding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
