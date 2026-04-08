// src/app/api/access-control/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getAccessControlPolicies,
  createAccessControlPolicy,
  updateAccessControlPolicy,
  deleteAccessControlPolicy,
  VALID_ROLES,
  VALID_RESOURCES,
} from '@/lib/database/access-control'

/** Verify request user has farm_owner or farm_manager role for the given farm */
async function verifyFarmManager(farmId: string): Promise<{ userId: string } | NextResponse> {
  const supabase = await createServerSupabaseClient()
  const { data: auth } = await supabase.auth.getUser()

  if (!auth?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role_type')
    .eq('farm_id', farmId)
    .eq('user_id', auth.user.id)
    .single()

  if (!userRole || !['farm_owner', 'farm_manager'].includes((userRole as any)?.role_type)) {
    return NextResponse.json(
      { error: 'Only farm owners and managers can manage access control policies.' },
      { status: 403 }
    )
  }

  return { userId: auth.user.id }
}

/**
 * GET /api/access-control?farmId=...
 * Returns all policies for a farm including their operation grants.
 */
export async function GET(request: NextRequest) {
  try {
    const farmId = new URL(request.url).searchParams.get('farmId')
    if (!farmId) return NextResponse.json({ error: 'farmId is required' }, { status: 400 })

    const auth = await verifyFarmManager(farmId)
    if (auth instanceof NextResponse) return auth

    const policies = await getAccessControlPolicies(farmId)
    return NextResponse.json(policies)
  } catch (error) {
    console.error('❌ [GET /api/access-control]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/access-control
 * Body: { farmId, name, role_type, operations, is_granted?, description? }
 *
 * operations shape: { animals: ['view_list', 'add_newborn'], health: ['view_records'] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { farmId, name, role_type, operations, is_granted, description } = body

    if (!farmId) return NextResponse.json({ error: 'farmId is required' }, { status: 400 })

    const auth = await verifyFarmManager(farmId)
    if (auth instanceof NextResponse) return auth

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (!role_type || !VALID_ROLES.includes(role_type)) {
      return NextResponse.json(
        { error: `role_type must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      )
    }
    if (!operations || typeof operations !== 'object' || Array.isArray(operations)) {
      return NextResponse.json(
        { error: 'operations must be an object: { resource: operation_key[] }' },
        { status: 400 }
      )
    }
    if (Object.keys(operations).length === 0) {
      return NextResponse.json(
        { error: 'operations must contain at least one resource' },
        { status: 400 }
      )
    }
    for (const resource of Object.keys(operations)) {
      if (!VALID_RESOURCES.includes(resource as any)) {
        return NextResponse.json(
          { error: `Invalid resource: "${resource}". Must be one of: ${VALID_RESOURCES.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const { policy, error } = await createAccessControlPolicy(farmId, {
      name, role_type, operations, is_granted: is_granted ?? true, description,
    })

    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json(policy, { status: 201 })
  } catch (error) {
    console.error('❌ [POST /api/access-control]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/access-control
 * Body: { policyId, farmId, name?, operations?, is_granted?, description? }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { policyId, farmId, name, operations, is_granted, description } = body

    if (!policyId || !farmId) {
      return NextResponse.json({ error: 'policyId and farmId are required' }, { status: 400 })
    }

    const auth = await verifyFarmManager(farmId)
    if (auth instanceof NextResponse) return auth

    if (operations !== undefined) {
      if (typeof operations !== 'object' || Array.isArray(operations)) {
        return NextResponse.json(
          { error: 'operations must be an object: { resource: operation_key[] }' },
          { status: 400 }
        )
      }
      if (Object.keys(operations).length === 0) {
        return NextResponse.json(
          { error: 'operations must contain at least one resource' },
          { status: 400 }
        )
      }
      for (const resource of Object.keys(operations)) {
        if (!VALID_RESOURCES.includes(resource as any)) {
          return NextResponse.json(
            { error: `Invalid resource: "${resource}"` },
            { status: 400 }
          )
        }
      }
    }

    const { policy, error } = await updateAccessControlPolicy(policyId, farmId, {
      name, operations, is_granted, description,
    })

    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json(policy)
  } catch (error) {
    console.error('❌ [PUT /api/access-control]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/access-control?id=...&farmId=...
 */
export async function DELETE(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams
    const policyId = params.get('id')
    const farmId = params.get('farmId')

    if (!policyId || !farmId) {
      return NextResponse.json({ error: 'id and farmId are required' }, { status: 400 })
    }

    const auth = await verifyFarmManager(farmId)
    if (auth instanceof NextResponse) return auth

    const { success, error } = await deleteAccessControlPolicy(policyId, farmId)
    if (!success) return NextResponse.json({ error }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ [DELETE /api/access-control]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
