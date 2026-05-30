// app/api/animals/weight-records/[id]/route.ts
//
// GET    /api/animals/weight-records/:id?farmId=
// PUT    /api/animals/weight-records/:id
// DELETE /api/animals/weight-records/:id

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import {
  getWeightRecord,
  updateWeightRecord,
  deleteWeightRecord,
} from '@/lib/database/weightRecords'

type RouteContext = { params: Promise<{ id: string }> }

function getFarmId(userRole: any): string | null {
  return userRole?.farm_id ?? null
}

// ─── GET — single record ──────────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    const farmId = getFarmId(userRole)
    if (!farmId) return NextResponse.json({ error: 'No farm associated' }, { status: 400 })

    const { data, error } = await getWeightRecord(id, farmId)

    if (error || !data) {
      return NextResponse.json({ error: 'Weight record not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('❌ [Weight Records] GET single error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PUT — update record ──────────────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    const farmId = getFarmId(userRole)
    if (!farmId) return NextResponse.json({ error: 'No farm associated' }, { status: 400 })

    const body = await request.json()
    const {
      weight_kg,
      weight_date,
      weight_unit,
      measurement_purpose,
      method,
      body_condition_score,
      measured_by,
      notes,
    } = body

    // Validate any provided fields
    if (weight_kg !== undefined) {
      const parsed = parseFloat(weight_kg)
      if (isNaN(parsed) || parsed <= 0) {
        return NextResponse.json({ error: 'weight_kg must be a positive number' }, { status: 400 })
      }
    }

    if (body_condition_score !== undefined && body_condition_score !== null) {
      const bcs = parseFloat(body_condition_score)
      if (isNaN(bcs) || bcs < 1 || bcs > 5) {
        return NextResponse.json({ error: 'body_condition_score must be between 1 and 5' }, { status: 400 })
      }
    }

    if (weight_unit && !['kg', 'lbs'].includes(weight_unit)) {
      return NextResponse.json({ error: 'weight_unit must be kg or lbs' }, { status: 400 })
    }

    if (method && !['scale', 'tape_measure', 'visual_estimate'].includes(method)) {
      return NextResponse.json(
        { error: 'method must be scale, tape_measure, or visual_estimate' },
        { status: 400 }
      )
    }

    console.log(`📝 [Weight Records] Updating ${id}`)

    const { data, error } = await updateWeightRecord(id, farmId, {
      weight_kg:            weight_kg !== undefined ? parseFloat(weight_kg) : undefined,
      weight_date,
      weight_unit,
      measurement_purpose,
      method,
      body_condition_score: body_condition_score ?? undefined,
      measured_by,
      notes,
    })

    if (error) {
      console.error('❌ [Weight Records] Update error:', error)
      const status = (error as any).code === 'NOT_FOUND' ? 404 : 400
      return NextResponse.json({ error: error.message }, { status })
    }

    console.log(`✅ [Weight Records] Updated ${id}`)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('❌ [Weight Records] PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE — remove record ───────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    const farmId = getFarmId(userRole)
    if (!farmId) return NextResponse.json({ error: 'No farm associated' }, { status: 400 })

    console.log(`🗑️ [Weight Records] Deleting ${id}`)

    const { data, error } = await deleteWeightRecord(id, farmId)

    if (error) {
      console.error('❌ [Weight Records] Delete error:', error)
      const status = (error as any).code === 'NOT_FOUND' ? 404 : 400
      return NextResponse.json({ error: error.message }, { status })
    }

    console.log(`✅ [Weight Records] Deleted ${id}`)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('❌ [Weight Records] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}