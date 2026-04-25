// app/api/housing/pens/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createHousingPen, getPens } from '@/lib/database/housing'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) return NextResponse.json({ error: 'No farm context' }, { status: 400 })

    const result = await getPens(userRole.farm_id)
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Pen GET API error:', error)
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
    
    const result = await createHousingPen({
      farm_id: userRole.farm_id,
      building_id: body.building_id,
      unit_id: body.unit_id,
      pen_number: body.pen_number,
      special_type: body.special_type,
      capacity: body.capacity,
      dimensions: body.dimensions,
      conditions: body.conditions
    })

    if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

    return NextResponse.json({ success: true, data: result.data }, { status: 201 })
  } catch (error) {
    console.error('Pen POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}