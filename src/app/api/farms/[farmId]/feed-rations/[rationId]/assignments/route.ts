// src/app/api/farms/[farmId]/feed-rations/[rationId]/assignments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getRationAssignments, createRationAssignment } from '@/lib/database/feedRations'

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

    const assignments = await getRationAssignments(farmId, rationId)
    return NextResponse.json({ success: true, data: assignments })
  } catch (error) {
    console.error('Ration assignments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
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

    if (!body.assignment_type || !['animal', 'group'].includes(body.assignment_type)) {
      return NextResponse.json(
        { error: 'assignment_type must be "animal" or "group"' },
        { status: 400 }
      )
    }

    const result = await createRationAssignment(farmId, rationId, body, user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(
      { success: true, data: result.data, message: 'Ration assigned successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Ration assignments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
