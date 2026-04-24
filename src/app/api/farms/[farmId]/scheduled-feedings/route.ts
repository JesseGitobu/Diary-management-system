// src/app/api/farms/[farmId]/scheduled-feedings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getScheduledFeedings,
  createScheduledFeeding,
  type CreateScheduledFeedingData,
  type FeedingMode,
  type TargetMode,
} from '@/lib/database/scheduledFeedings'

type RouteContext = { params: Promise<{ farmId: string }> }

// ─── GET /api/farms/[farmId]/scheduled-feedings ───────────────────────────────
// Query params:
//   status    — comma-separated status values (default: pending,overdue)
//   dateFrom  — YYYY-MM-DD lower bound on schedule_date_from
//   dateTo    — YYYY-MM-DD upper bound on schedule_date_to
//   mode      — feeding_mode filter

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { farmId } = await params
    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const sp = new URL(request.url).searchParams
    const data = await getScheduledFeedings(farmId, {
      status:      sp.get('status') ?? 'pending,overdue',
      dateFrom:    sp.get('dateFrom') ?? undefined,
      dateTo:      sp.get('dateTo') ?? undefined,
      feedingMode: (sp.get('mode') as FeedingMode) ?? undefined,
    })

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('GET scheduled-feedings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/farms/[farmId]/scheduled-feedings ──────────────────────────────
// Body (matches handleScheduleSubmit payload):
//   scheduleName, scheduledDateFrom, scheduledDateTo, feedingMode,
//   rationId, recipeId, entries, targetMode, targetCategoryIds,
//   targetAnimalIds, notes, scheduledTime, feedTimeSlotId, slotName

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { farmId } = await params
    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const {
      scheduleName,
      scheduledDateFrom,
      scheduledDateTo,
      feedingMode,
      rationId,
      recipeId,
      entries,
      targetMode = 'all',
      targetCategoryIds = [],
      targetAnimalIds = [],
      notes,
      scheduledTime,
      feedTimeSlotId,
      slotName,
    } = body

    // ── Basic validation ───────────────────────────────────────────────────
    if (!scheduledDateFrom || !scheduledDateTo) {
      return NextResponse.json(
        { error: 'scheduledDateFrom and scheduledDateTo are required' },
        { status: 400 }
      )
    }
    if (scheduledDateFrom > scheduledDateTo) {
      return NextResponse.json(
        { error: 'scheduledDateFrom must not be after scheduledDateTo' },
        { status: 400 }
      )
    }
    if (!scheduledTime) {
      return NextResponse.json({ error: 'scheduledTime (HH:MM) is required' }, { status: 400 })
    }
    if (!entries || (entries as any[]).length === 0) {
      return NextResponse.json({ error: 'At least one feed entry is required' }, { status: 400 })
    }

    // ── Resolve animal count from target ───────────────────────────────────
    const supabase = await createServerSupabaseClient()
    let resolvedAnimalIds: string[] = []

    if (targetMode === 'specific') {
      resolvedAnimalIds = (targetAnimalIds as string[])
    } else if (targetMode === 'by_category') {
      const ids = targetCategoryIds as string[]
      if (ids.length > 0) {
        // Categories are in animal_category_assignments, not a column on animals
        const { data: assignments } = await supabase
          .from('animal_category_assignments')
          .select('animal_id')
          .eq('farm_id', farmId)
          .in('category_id', ids)
        const assignedIds = (assignments ?? []).map((a: any) => a.animal_id)
        if (assignedIds.length > 0) {
          const { data: activeAnimals } = await supabase
            .from('animals')
            .select('id')
            .eq('farm_id', farmId)
            .eq('status', 'active')
            .in('id', assignedIds)
          resolvedAnimalIds = (activeAnimals ?? []).map((a: any) => a.id)
        }
      }
    } else {
      const { data: all } = await supabase
        .from('animals')
        .select('id')
        .eq('farm_id', farmId)
        .eq('status', 'active')
      resolvedAnimalIds = (all ?? []).map((a: any) => a.id)
    }

    if (resolvedAnimalIds.length === 0) {
      return NextResponse.json(
        { error: 'No active animals match the selected target' },
        { status: 400 }
      )
    }

    const payload: CreateScheduledFeedingData = {
      scheduleName:      scheduleName ?? null,
      scheduledDateFrom,
      scheduledDateTo,
      scheduledTime,
      feedTimeSlotId:    feedTimeSlotId ?? null,
      slotName:          slotName ?? null,
      feedingMode:       (feedingMode as FeedingMode) ?? 'individual',
      rationId:          rationId ?? null,
      recipeId:          recipeId ?? null,
      entries:           (entries as any[]).map((e: any, idx: number) => ({
        feedTypeId:           e.feedTypeId,
        quantityKgPerAnimal:  Number(e.quantityKgPerAnimal),
        costPerKg:            e.costPerKg ?? null,
        sortOrder:            e.sortOrder ?? idx,
      })),
      targetMode:         targetMode as TargetMode,
      targetCategoryIds:  targetMode === 'by_category' ? (targetCategoryIds as string[]) : [],
      targetAnimalIds:    targetMode === 'specific'    ? resolvedAnimalIds : [],
      animalCount:        resolvedAnimalIds.length,
      notes:              notes ?? null,
    }

    const result = await createScheduledFeeding(farmId, payload, user.id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success:     true,
      data:        result.data,
      animalCount: resolvedAnimalIds.length,
      feedCount:   (entries as any[]).length,
    }, { status: 201 })
  } catch (err) {
    console.error('POST scheduled-feedings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
