// ─────────────────────────────────────────────────────────────────────────────
// app/api/animals/[id]/weight-records/route.ts
//
// GET  /api/animals/:id/weight-records?farmId=
// POST /api/animals/:id/weight-records        (convenience — animal_id from URL)
//
// This scoped route makes it ergonomic to work with one animal's history.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { listWeightStatus } from '@/lib/database/weightRecords'
import { getAnimalWeightHistory, createWeightRecord } from '@/lib/database/weightRecords'

type AnimalRouteContext = { params: Promise<{ id: string }> }

export async function GET(
  request: NextRequest,
  { params }: AnimalRouteContext
) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    const farmId: string | null = userRole?.farm_id ?? null
    if (!farmId) return NextResponse.json({ error: 'No farm associated' }, { status: 400 })

    const { data, error } = await getAnimalWeightHistory(id, farmId)

    if (error) {
      console.error('❌ [Animal Weight History] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error) {
    console.error('❌ [Animal Weight History] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: AnimalRouteContext
) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    const farmId: string | null = userRole?.farm_id ?? null
    if (!farmId) return NextResponse.json({ error: 'No farm associated' }, { status: 400 })

    const body = await request.json()
    const { weight_kg, weight_date, weight_unit, measurement_purpose, method, body_condition_score, notes } = body

    if (!weight_kg || !weight_date) {
      return NextResponse.json({ error: 'weight_kg and weight_date are required' }, { status: 400 })
    }

    const { data, error } = await createWeightRecord({
      animal_id:            id,
      farm_id:              farmId,
      weight_kg:            parseFloat(weight_kg),
      weight_date,
      weight_unit,
      measurement_purpose,
      method,
      body_condition_score: body_condition_score ?? null,
      measured_by:          user.email ?? 'system',
      notes,
    })

    if (error) {
      const status = (error as any).code === 'NOT_FOUND' ? 404 : 400
      return NextResponse.json({ error: error.message }, { status })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('❌ [Animal Weight History] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}