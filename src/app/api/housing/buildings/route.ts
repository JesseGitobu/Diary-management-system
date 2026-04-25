// app/api/housing/buildings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createBuilding, getBuildings } from '@/lib/database/housing'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const result = await getBuildings(userRole.farm_id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Housing Building GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth Check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Farm Association Check
    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    // 3. Permissions Check
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()

    // 4. Validation
    if (!body.name || !body.type || !body.total_capacity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 5. Database Operation
    const result = await createBuilding({
      farm_id: userRole.farm_id,
      name: body.name,
      type: body.type,
      total_capacity: parseInt(body.total_capacity),
      location: body.location,
      year_built: body.year_built ? parseInt(body.year_built) : undefined,
      status: body.status || 'active',
      notes: body.notes
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: 'Building created successfully' 
    }, { status: 201 })

  } catch (error) {
    console.error('Housing Building POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}