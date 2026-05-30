// app/api/animals/weight-records/route.ts
//
// GET  /api/animals/weight-records?farmId=&animal_id=&from_date=&to_date=&limit=&offset=
// POST /api/animals/weight-records

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import {
  listWeightRecords,
  createWeightRecord,
} from '@/lib/database/weightRecords'

// ─── GET — list records ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')
    if (!farmId) return NextResponse.json({ error: 'farmId is required' }, { status: 400 })

    // Ensure the user belongs to this farm
    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await listWeightRecords(farmId, {
      animal_id: searchParams.get('animal_id') ?? undefined,
      from_date:  searchParams.get('from_date')  ?? undefined,
      to_date:    searchParams.get('to_date')    ?? undefined,
      limit:      searchParams.get('limit')  ? parseInt(searchParams.get('limit')!)  : 50,
      offset:     searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    })

    if (error) {
      console.error('❌ [Weight Records] List error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error) {
    console.error('❌ [Weight Records] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST — create record ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated' }, { status: 400 })
    }

    const body = await request.json()
    const {
      animal_id,
      weight_kg,
      weight_date,
      weight_unit,
      measurement_purpose,
      method,
      body_condition_score,
      notes,
      // Legacy field names from the old route — map them transparently
      measurement_date,   // old name for weight_date
      measurement_type,   // old name for measurement_purpose
    } = body

    // Support both old and new field names
    const resolvedDate    = weight_date    ?? measurement_date
    const resolvedPurpose = measurement_purpose ?? measurement_type

    if (!animal_id || !weight_kg || !resolvedDate) {
      return NextResponse.json(
        { error: 'animal_id, weight_kg and weight_date are required' },
        { status: 400 }
      )
    }

    const parsedWeight = parseFloat(weight_kg)
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      return NextResponse.json({ error: 'weight_kg must be a positive number' }, { status: 400 })
    }

    if (body_condition_score !== undefined && body_condition_score !== null) {
      const bcs = parseFloat(body_condition_score)
      if (isNaN(bcs) || bcs < 1 || bcs > 5) {
        return NextResponse.json({ error: 'body_condition_score must be between 1 and 5' }, { status: 400 })
      }
    }

    console.log('📝 [Weight Records] Creating:', { animal_id, weight_kg: parsedWeight, resolvedDate })

    const { data, error } = await createWeightRecord({
      animal_id,
      farm_id:              userRole.farm_id,
      weight_kg:            parsedWeight,
      weight_date:          resolvedDate,
      weight_unit:          weight_unit ?? 'kg',
      measurement_purpose:  resolvedPurpose ?? 'routine',
      method:               method ?? 'scale',
      body_condition_score: body_condition_score ?? null,
      measured_by:          user.email ?? 'system',
      notes,
    })

    if (error) {
      console.error('❌ [Weight Records] Create error:', error)
      const status = (error as any).code === 'NOT_FOUND' ? 404 : 400
      return NextResponse.json({ error: error.message }, { status })
    }

    console.log('✅ [Weight Records] Created:', data?.id)
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('❌ [Weight Records] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}