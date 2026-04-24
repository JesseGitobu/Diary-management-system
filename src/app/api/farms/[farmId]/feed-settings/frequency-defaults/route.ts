// src/app/api/farms/[farmId]/feed-settings/frequency-defaults/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFeedFrequencyDefaults, createFeedFrequencyDefault } from '@/lib/database/feedSettings'

// GET  /api/farms/[farmId]/feed-settings/frequency-defaults
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const defaults = await getFeedFrequencyDefaults(farmId)
    return NextResponse.json(defaults)
  } catch (error) {
    console.error('GET frequency defaults error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/farms/[farmId]/feed-settings/frequency-defaults
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params
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
    const { animal_category_id, feedings_per_day, default_quantity_kg_per_feeding, waste_factor_percent, notes } = body

    if (!animal_category_id) {
      return NextResponse.json({ error: 'animal_category_id is required' }, { status: 400 })
    }
    if (!feedings_per_day || feedings_per_day < 1 || feedings_per_day > 12) {
      return NextResponse.json({ error: 'feedings_per_day must be between 1 and 12' }, { status: 400 })
    }
    if (!default_quantity_kg_per_feeding || default_quantity_kg_per_feeding <= 0) {
      return NextResponse.json({ error: 'default_quantity_kg_per_feeding must be greater than 0' }, { status: 400 })
    }

    const result = await createFeedFrequencyDefault(farmId, {
      animal_category_id,
      feedings_per_day,
      default_quantity_kg_per_feeding,
      waste_factor_percent,
      notes,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }
    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('POST frequency default error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
