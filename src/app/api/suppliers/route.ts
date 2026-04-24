// src/app/api/suppliers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createSupplier, getSuppliers, getAllSuppliers } from '@/lib/database/suppliers'

// ── GET /api/suppliers ────────────────────────────────────────────────────────
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

    const suppliers = includeAll
      ? await getAllSuppliers(userRole.farm_id)
      : await getSuppliers(userRole.farm_id)

    return NextResponse.json({ suppliers })
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
  }
}

// ── POST /api/suppliers ───────────────────────────────────────────────────────
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

    // Validate required field
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 })
    }

    const result = await createSupplier(
      userRole.farm_id,
      {
        // Basic info
        name:             body.name.trim(),
        supplier_type:    body.supplier_type    || null,
        status:           body.status           || 'active',
        kra_pin:          body.kra_pin          ? body.kra_pin.trim().toUpperCase() : null,

        // Contact details
        contact_person:   body.contact_person   ? body.contact_person.trim()   : null,
        phone:            body.phone            ? body.phone.trim()             : null,
        alternative_phone:body.alternative_phone? body.alternative_phone.trim(): null,
        email:            body.email            ? body.email.trim().toLowerCase(): null,
        website:          body.website          ? body.website.trim()           : null,

        // Location
        address:          body.address          ? body.address.trim()           : null,
        town:             body.town             ? body.town.trim()              : null,
        county:           body.county           ? body.county.trim()            : null,

        // Business terms
        payment_terms:    body.payment_terms    || null,
        credit_limit_ksh: body.credit_limit_ksh != null ? Number(body.credit_limit_ksh) : null,
        minimum_order_kg: body.minimum_order_kg != null ? Number(body.minimum_order_kg) : null,
        lead_time_days:   body.lead_time_days   != null ? Math.round(Number(body.lead_time_days)) : null,

        // Notes
        notes:            body.notes            ? body.notes.trim()             : null,
      },
      user.id,  // created_by
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ supplier: result.data }, { status: 201 })
  } catch (error) {
    console.error('Error creating supplier:', error)
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
}
