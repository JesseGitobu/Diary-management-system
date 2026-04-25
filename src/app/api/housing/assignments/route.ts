// app/api/housing/assignments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { assignAnimalsToHousing, getHousingAssignments } from '@/lib/database/housing'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) return NextResponse.json({ error: 'No farm context' }, { status: 400 })

    const body = await request.json()
    const { animal_ids, pen_id, reason, notes } = body

    if (!animal_ids || !Array.isArray(animal_ids) || !pen_id) {
      return NextResponse.json({ error: 'Missing required assignment data' }, { status: 400 })
    }

    const result = await assignAnimalsToHousing({
      farm_id: userRole.farm_id,
      pen_id,
      animal_ids,
      reason,
      notes
    })

    if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

    return NextResponse.json({ success: true, data: result.data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) return NextResponse.json({ error: 'No farm context' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const penId = searchParams.get('penId') || undefined

    const result = await getHousingAssignments(userRole.farm_id, penId)

    if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}