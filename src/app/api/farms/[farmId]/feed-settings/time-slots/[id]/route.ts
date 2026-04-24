// src/app/api/farms/[farmId]/feed-settings/time-slots/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { updateFeedTimeSlot, deleteFeedTimeSlot } from '@/lib/database/feedSettings'

// PUT  /api/farms/[farmId]/feed-settings/time-slots/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string }> }
) {
  try {
    const { farmId, id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()

    if (body.scheduled_time !== undefined && !/^\d{2}:\d{2}$/.test(body.scheduled_time)) {
      return NextResponse.json({ error: 'scheduled_time must be in HH:MM format' }, { status: 400 })
    }
    if (body.days_of_week !== undefined && (!Array.isArray(body.days_of_week) || body.days_of_week.length === 0)) {
      return NextResponse.json({ error: 'days_of_week must be a non-empty array of integers 1–7' }, { status: 400 })
    }

    const result = await updateFeedTimeSlot(farmId, id, body)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }
    return NextResponse.json(result.data)
  } catch (error) {
    console.error('PUT feed time slot error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/farms/[farmId]/feed-settings/time-slots/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string }> }
) {
  try {
    const { farmId, id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const result = await deleteFeedTimeSlot(farmId, id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE feed time slot error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
