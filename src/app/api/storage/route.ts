// src/app/api/storage/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import {
  createStorageLocation,
  getStorageLocations,
  getAllStorageLocations,
} from '@/lib/database/storage'

// ── GET /api/storage ──────────────────────────────────────────────────────────
// ?all=true   → include inactive locations
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const includeAll = searchParams.get('all') === 'true'

    const locations = includeAll
      ? await getAllStorageLocations(userRole.farm_id)
      : await getStorageLocations(userRole.farm_id)

    return NextResponse.json({ locations })
  } catch (error) {
    console.error('Error fetching storage locations:', error)
    return NextResponse.json({ error: 'Failed to fetch storage locations' }, { status: 500 })
  }
}

// ── POST /api/storage ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 403 })
    }

    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Storage location name is required' }, { status: 400 })
    }

    const result = await createStorageLocation(
      userRole.farm_id,
      {
        // Basic info
        name:                   body.name.trim(),
        storage_type:           body.type            || 'dryStorage',
        status:                 body.status          || 'active',

        // Physical location
        location:               body.location        ? body.location.trim()   : null,
        building:               body.building        ? body.building.trim()   : null,
        floor_level:            body.floor_level     || null,

        // Capacity
        capacity:               body.capacity        != null ? Number(body.capacity)               : null,
        capacity_unit:          body.capacity_unit   || null,

        // Environmental
        temperature_controlled: body.temperature_controlled ?? false,
        min_temperature:        body.min_temperature != null ? Number(body.min_temperature)        : null,
        max_temperature:        body.max_temperature != null ? Number(body.max_temperature)        : null,
        humidity_controlled:    body.humidity_controlled    ?? false,
        min_humidity:           body.min_humidity    != null ? Number(body.min_humidity)           : null,
        max_humidity:           body.max_humidity    != null ? Number(body.max_humidity)           : null,

        // Access
        restricted_access:      body.restricted_access      ?? false,
        requires_authorization: body.requires_authorization ?? false,

        // Categories & notes
        categories:             Array.isArray(body.categories) && body.categories.length > 0
                                  ? body.categories
                                  : null,
        description:            body.description     ? body.description.trim() : null,
        notes:                  body.notes           ? body.notes.trim()       : null,
      },
      user.id,
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ storage: result.data }, { status: 201 })
  } catch (error) {
    console.error('Error creating storage location:', error)
    return NextResponse.json({ error: 'Failed to create storage location' }, { status: 500 })
  }
}
