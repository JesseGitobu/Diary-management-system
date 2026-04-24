// src/app/api/storage/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import {
  getStorageLocation,
  updateStorageLocation,
  deleteStorageLocation,
} from '@/lib/database/storage'

type RouteContext = { params: Promise<{ id: string }> }

// ── GET /api/storage/[id] ─────────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 403 })
    }

    const location = await getStorageLocation(id, userRole.farm_id)
    if (!location) {
      return NextResponse.json({ error: 'Storage location not found' }, { status: 404 })
    }

    return NextResponse.json({ storage: location })
  } catch (error) {
    console.error('Error fetching storage location:', error)
    return NextResponse.json({ error: 'Failed to fetch storage location' }, { status: 500 })
  }
}

// ── PATCH /api/storage/[id] ───────────────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

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

    if (body.name !== undefined && !body.name?.trim()) {
      return NextResponse.json({ error: 'Storage location name cannot be empty' }, { status: 400 })
    }

    const result = await updateStorageLocation(
      id,
      userRole.farm_id,
      {
        // Basic info
        ...(body.name           !== undefined && { name:         body.name.trim() }),
        ...(body.type           !== undefined && { storage_type: body.type }),
        ...(body.status         !== undefined && { status:       body.status }),

        // Physical location
        ...(body.location       !== undefined && { location:     body.location?.trim()   || null }),
        ...(body.building       !== undefined && { building:     body.building?.trim()   || null }),
        ...(body.floor_level    !== undefined && { floor_level:  body.floor_level        || null }),

        // Capacity
        ...(body.capacity       !== undefined && { capacity:      body.capacity != null ? Number(body.capacity) : null }),
        ...(body.capacity_unit  !== undefined && { capacity_unit: body.capacity_unit || null }),

        // Environmental
        ...(body.temperature_controlled !== undefined && { temperature_controlled: body.temperature_controlled }),
        ...(body.min_temperature        !== undefined && { min_temperature:        body.min_temperature != null ? Number(body.min_temperature) : null }),
        ...(body.max_temperature        !== undefined && { max_temperature:        body.max_temperature != null ? Number(body.max_temperature) : null }),
        ...(body.humidity_controlled    !== undefined && { humidity_controlled:    body.humidity_controlled }),
        ...(body.min_humidity           !== undefined && { min_humidity:           body.min_humidity    != null ? Number(body.min_humidity)    : null }),
        ...(body.max_humidity           !== undefined && { max_humidity:           body.max_humidity    != null ? Number(body.max_humidity)    : null }),

        // Access
        ...(body.restricted_access      !== undefined && { restricted_access:      body.restricted_access }),
        ...(body.requires_authorization !== undefined && { requires_authorization: body.requires_authorization }),

        // Categories & notes
        ...(body.categories   !== undefined && {
          categories: Array.isArray(body.categories) && body.categories.length > 0
            ? body.categories
            : null,
        }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.notes       !== undefined && { notes:       body.notes?.trim()       || null }),
      },
      user.id,
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ storage: result.data })
  } catch (error) {
    console.error('Error updating storage location:', error)
    return NextResponse.json({ error: 'Failed to update storage location' }, { status: 500 })
  }
}

// ── DELETE /api/storage/[id] ──────────────────────────────────────────────────
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

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

    const result = await deleteStorageLocation(id, userRole.farm_id, user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ message: 'Storage location removed successfully' })
  } catch (error) {
    console.error('Error deleting storage location:', error)
    return NextResponse.json({ error: 'Failed to delete storage location' }, { status: 500 })
  }
}
