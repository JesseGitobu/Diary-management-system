// src/app/api/farms/[farmId]/feed-rations/[rationId]/assignments/[assignmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { deleteRationAssignment, updateRationAssignment } from '@/lib/database/feedRations'

type RouteContext = {
  params: Promise<{ farmId: string; rationId: string; assignmentId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
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

    const { farmId, assignmentId } = await params
    if (userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const result = await updateRationAssignment(farmId, assignmentId, {
      end_date: body.end_date,
      is_active: body.is_active,
      notes: body.notes,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Assignment updated successfully',
    })
  } catch (error) {
    console.error('Assignment PATCH error:', error)
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

    const { farmId, assignmentId } = await params
    if (userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await deleteRationAssignment(farmId, assignmentId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Assignment removed successfully' })
  } catch (error) {
    console.error('Assignment DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
