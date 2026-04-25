// app/api/housing/units/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createHousingUnit, getUnits } from '@/lib/database/housing'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) return NextResponse.json({ error: 'No farm context' }, { status: 400 })

    const result = await getUnits(userRole.farm_id)
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) return NextResponse.json({ error: 'No farm context' }, { status: 400 })

    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    
    const result = await createHousingUnit({
      farm_id: userRole.farm_id,
      building_id: body.building_id,
      name: body.name,
      unit_type: body.unit_type,
      total_capacity: body.total_capacity,
      environmental_conditions: body.environmental_conditions
    })

    if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

    return NextResponse.json({ success: true, data: result.data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}