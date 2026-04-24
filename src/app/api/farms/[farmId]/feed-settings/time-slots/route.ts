// src/app/api/farms/[farmId]/feed-settings/time-slots/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFeedTimeSlots, createFeedTimeSlot } from '@/lib/database/feedSettings'

async function resolveParams(params: Promise<{ farmId: string }>) {
  return params
}

// GET  /api/farms/[farmId]/feed-settings/time-slots
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await resolveParams(params)
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const slots = await getFeedTimeSlots(farmId)
    return NextResponse.json(slots)
  } catch (error) {
    console.error('GET feed time slots error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/farms/[farmId]/feed-settings/time-slots
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await resolveParams(params)
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
    const { slot_name, scheduled_time, days_of_week, is_active, sort_order, notes } = body

    if (!slot_name?.trim()) {
      return NextResponse.json({ error: 'slot_name is required' }, { status: 400 })
    }
    if (!scheduled_time || !/^\d{2}:\d{2}$/.test(scheduled_time)) {
      return NextResponse.json({ error: 'scheduled_time must be in HH:MM format' }, { status: 400 })
    }
    if (!Array.isArray(days_of_week) || days_of_week.length === 0) {
      return NextResponse.json({ error: 'days_of_week must be a non-empty array of integers 1–7' }, { status: 400 })
    }

    const result = await createFeedTimeSlot(farmId, {
      slot_name,
      scheduled_time,
      days_of_week,
      is_active,
      sort_order,
      notes,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }
    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('POST feed time slot error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
