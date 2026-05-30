// app/api/animals/weight-requirements/route.ts
//
// GET /api/animals/weight-requirements?farmId=
//
// Thin wrapper around the weight-status route filtered to requires_weight_update=true.
// Kept for backwards compatibility with the existing AnimalsClientPage usage.

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { listWeightStatus } from '@/lib/database/weightRecords'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')
    if (!farmId) return NextResponse.json({ error: 'Farm ID required' }, { status: 400 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await listWeightStatus(farmId, { requiresUpdate: true })

    if (error) {
      console.error('❌ [Weight Requirements] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Re-shape for the AnimalsClientPage contract it already expects
    const requirements = (data ?? []).map(row => ({
      id:                    row.id,
      animal_id:             row.id,          // view id == animal id
      farm_id:               row.farm_id,
      tag_number:            row.tag_number,
      name:                  row.name,
      current_weight:        row.weight,
      last_weight_date:      row.last_weight_date,
      days_since_weight:     row.days_since_weight,
      requires_weight_update: row.requires_weight_update,
      next_due_date:         row.next_due_date,
    }))

    console.log(`✅ [Weight Requirements] Found ${requirements.length} requirements`)
    return NextResponse.json({ requirements })
  } catch (error) {
    console.error('❌ [Weight Requirements] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}