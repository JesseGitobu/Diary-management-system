// app/api/animals/weight-status/route.ts
//
// GET /api/animals/weight-status?farmId=&requiresUpdate=true&animalId=
//
// Returns the animal_weight_status view — the aggregated summary per animal
// (current weight, trend, days since last measurement, etc.)
 
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
    if (!farmId) return NextResponse.json({ error: 'farmId is required' }, { status: 400 })
 
    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
 
    const requiresUpdate = searchParams.get('requiresUpdate') === 'true'
    const animalId       = searchParams.get('animalId') ?? undefined
 
    const { data, error } = await listWeightStatus(farmId, { requiresUpdate, animalId })
 
    if (error) {
      console.error('❌ [Weight Status] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
 
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error) {
    console.error('❌ [Weight Status] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}