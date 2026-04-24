// src/app/api/farms/[farmId]/feed-settings/frequency-defaults/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { updateFeedFrequencyDefault, deleteFeedFrequencyDefault } from '@/lib/database/feedSettings'

// PUT  /api/farms/[farmId]/feed-settings/frequency-defaults/[id]
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

    if (body.feedings_per_day !== undefined && (body.feedings_per_day < 1 || body.feedings_per_day > 12)) {
      return NextResponse.json({ error: 'feedings_per_day must be between 1 and 12' }, { status: 400 })
    }
    if (body.default_quantity_kg_per_feeding !== undefined && body.default_quantity_kg_per_feeding <= 0) {
      return NextResponse.json({ error: 'default_quantity_kg_per_feeding must be greater than 0' }, { status: 400 })
    }
    if (body.waste_factor_percent !== undefined && (body.waste_factor_percent < 0 || body.waste_factor_percent > 50)) {
      return NextResponse.json({ error: 'waste_factor_percent must be between 0 and 50' }, { status: 400 })
    }

    const result = await updateFeedFrequencyDefault(farmId, id, body)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json(result.data)
  } catch (error) {
    console.error('PUT frequency default error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/farms/[farmId]/feed-settings/frequency-defaults/[id]
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

    const result = await deleteFeedFrequencyDefault(farmId, id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE frequency default error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
