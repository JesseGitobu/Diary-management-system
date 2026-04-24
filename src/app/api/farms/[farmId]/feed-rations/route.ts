// src/app/api/farms/[farmId]/feed-rations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFeedRations, createFeedRation } from '@/lib/database/feedRations'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const { farmId } = await params
    if (userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rations = await getFeedRations(farmId)
    return NextResponse.json({ success: true, data: rations })
  } catch (error) {
    console.error('Feed rations GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
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

    const { farmId } = await params
    if (userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Ration name is required' }, { status: 400 })
    }
    if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      return NextResponse.json({ error: 'At least one ingredient is required' }, { status: 400 })
    }

    const result = await createFeedRation(farmId, body, user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(
      { success: true, data: result.data, message: 'Feed ration created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Feed rations POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
