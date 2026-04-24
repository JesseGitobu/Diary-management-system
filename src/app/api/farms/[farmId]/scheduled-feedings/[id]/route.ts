// src/app/api/farms/[farmId]/scheduled-feedings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import {
  getScheduledFeedingById,
  updateScheduledFeeding,
  deleteScheduledFeeding,
  completeScheduledFeeding,
  cancelScheduledFeeding,
  type UpdateScheduledFeedingData,
  type FeedingStatus,
} from '@/lib/database/scheduledFeedings'

type RouteContext = { params: Promise<{ farmId: string; id: string }> }

// ─── GET /api/farms/[farmId]/scheduled-feedings/[id] ─────────────────────────

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { farmId, id } = await params
    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const sf = await getScheduledFeedingById(farmId, id)
    if (!sf) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: sf })
  } catch (err) {
    console.error('GET scheduled-feeding [id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH /api/farms/[farmId]/scheduled-feedings/[id] ───────────────────────
// Handles general edits AND status transitions.
//
// Status transitions via body.action:
//   "complete"  — convert to consumption records
//   "cancel"    — mark as cancelled
//
// Without body.action, standard field edits apply.

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { farmId, id } = await params
    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    // ── Status-transition shortcuts ────────────────────────────────────────
    if (action === 'complete') {
      const result = await completeScheduledFeeding(
        farmId,
        id,
        user.id,
        body.actualFeedingTime,
        body.lateReason
      )
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, data: result.data })
    }

    if (action === 'cancel') {
      const result = await cancelScheduledFeeding(farmId, id, body.reason)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true })
    }

    // ── General field update ───────────────────────────────────────────────
    const patch: UpdateScheduledFeedingData = {}

    if (body.scheduleName        !== undefined) patch.scheduleName        = body.scheduleName
    if (body.scheduledDateFrom   !== undefined) patch.scheduledDateFrom   = body.scheduledDateFrom
    if (body.scheduledDateTo     !== undefined) patch.scheduledDateTo     = body.scheduledDateTo
    if (body.scheduledTime       !== undefined) patch.scheduledTime       = body.scheduledTime
    if (body.feedTimeSlotId      !== undefined) patch.feedTimeSlotId      = body.feedTimeSlotId
    if (body.slotName            !== undefined) patch.slotName            = body.slotName
    if (body.status              !== undefined) patch.status              = body.status as FeedingStatus
    if (body.notes               !== undefined) patch.notes               = body.notes
    if (body.lateByMinutes       !== undefined) patch.lateByMinutes       = body.lateByMinutes
    if (body.lateReason          !== undefined) patch.lateReason          = body.lateReason
    if (body.entries             !== undefined) patch.entries             = body.entries
    if (body.targetCategoryIds   !== undefined) patch.targetCategoryIds   = body.targetCategoryIds
    if (body.targetAnimalIds     !== undefined) patch.targetAnimalIds     = body.targetAnimalIds

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Prevent editing completed feedings (except marking late reason)
    const current = await getScheduledFeedingById(farmId, id)
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (current.status === 'completed') {
      const allowedWhenComplete = new Set(['lateReason', 'lateByMinutes', 'notes'])
      const hasDisallowed = Object.keys(patch).some(k => !allowedWhenComplete.has(k))
      if (hasDisallowed) {
        return NextResponse.json(
          { error: 'Completed feedings can only have notes and late details updated' },
          { status: 400 }
        )
      }
    }

    const result = await updateScheduledFeeding(farmId, id, patch, user.id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (err) {
    console.error('PATCH scheduled-feeding [id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/farms/[farmId]/scheduled-feedings/[id] ──────────────────────

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { farmId, id } = await params
    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const result = await deleteScheduledFeeding(farmId, id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE scheduled-feeding [id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
