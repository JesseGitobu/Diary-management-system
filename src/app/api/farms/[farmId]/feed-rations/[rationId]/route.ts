// src/app/api/farms/[farmId]/feed-rations/[rationId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import {
  getFeedRationById,
  updateFeedRation,
  deleteFeedRation,
} from '@/lib/database/feedRations'

type RouteContext = { params: Promise<{ farmId: string; rationId: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const { farmId, rationId } = await params
    if (userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ration = await getFeedRationById(farmId, rationId)
    if (!ration) return NextResponse.json({ error: 'Ration not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: ration })
  } catch (error) {
    console.error('Feed ration GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { farmId, rationId } = await params
    if (userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const result = await updateFeedRation(farmId, rationId, body, user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Feed ration updated successfully',
    })
  } catch (error) {
    console.error('Feed ration PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { farmId, rationId } = await params
    if (userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await deleteFeedRation(farmId, rationId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Feed ration deleted successfully' })
  } catch (error) {
    console.error('Feed ration DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
