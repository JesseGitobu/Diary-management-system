// app/api/feed/consumption/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { deleteFeedConsumption, updateFeedConsumption, getFeedConsumptionById } from '@/lib/database/feed'

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
    }

    // Only farm owners and managers can delete consumption records
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to delete consumption records' 
      }, { status: 403 })
    }

    const recordId = params.id
    const result = await deleteFeedConsumption(userRole.farm_id, recordId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      message: result.message || 'Consumption record deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/feed/consumption/[id]:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
    }

    // Only farm owners and managers can edit consumption records
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to edit consumption records' 
      }, { status: 403 })
    }

    const body = await request.json()
    const recordId = params.id

    const feedingMode: string = body.mode ?? body.feedingMode ?? 'individual'
    const isMultiFeedMode = feedingMode === 'feed-mix-recipe' || feedingMode === 'ration'

    // For multi-feed modes (recipe/ration), entries drive the feed line items
    // For individual mode, support both flat fields and entries[0]
    const firstEntry = body.entries?.[0]
    const feedTypeId = isMultiFeedMode ? (firstEntry?.feedTypeId ?? null) : (body.feedTypeId ?? firstEntry?.feedTypeId)
    const quantityKg = isMultiFeedMode ? (firstEntry?.quantityKg ?? null) : (body.quantityKg ?? firstEntry?.quantityKg)
    const animalIds: string[] = body.animalIds?.length
      ? body.animalIds
      : (firstEntry?.animalIds ?? [])
    const feedingTime  = body.feedingTime
    const notes        = body.notes ?? null
    const animalCount  = body.animalCount ?? (isMultiFeedMode ? null : animalIds.length) ?? null
    const appetiteScore        = body.appetiteScore        ?? null
    const approximateWasteKg   = body.approximateWasteKg   ?? null
    const observations         = body.observations         ?? null
    const feedTimeSlotId       = body.feedTimeSlotId       ?? null
    const slotName             = body.slotName             ?? null
    const sessionPercentage    = body.sessionPercentage    ?? null
    const entries              = body.entries              ?? null

    // Validate required fields
    if (!isMultiFeedMode && !feedTypeId) {
      return NextResponse.json({ error: 'Feed type is required' }, { status: 400 })
    }

    if (!isMultiFeedMode && (!quantityKg || quantityKg <= 0)) {
      return NextResponse.json({ error: 'Valid quantity is required' }, { status: 400 })
    }

    if (isMultiFeedMode && (!entries || !Array.isArray(entries) || entries.length === 0)) {
      return NextResponse.json({ error: 'Feed entries are required for recipe/ration mode' }, { status: 400 })
    }

    if (!feedingTime) {
      return NextResponse.json({ error: 'Feeding time is required' }, { status: 400 })
    }

    const updateData = {
      feedTypeId: feedTypeId ?? undefined,
      quantityKg: quantityKg != null ? parseFloat(quantityKg) : undefined,
      animalIds: feedingMode === 'individual' ? animalIds : [],
      animalCount,
      feedingTime,
      notes,
      feedingMode,
      appetiteScore,
      approximateWasteKg,
      observations,
      feedTimeSlotId,
      slotName,
      sessionPercentage,
      entries: entries ?? undefined,
    }

    const result = await updateFeedConsumption(userRole.farm_id, recordId, updateData)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Consumption record updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/feed/consumption/[id]:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
    }

    const recordId = params.id
    const record = await getFeedConsumptionById(userRole.farm_id, recordId)

    if (!record) {
      return NextResponse.json({ error: 'Consumption record not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: record
    })

  } catch (error) {
    console.error('Error in GET /api/feed/consumption/[id]:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}