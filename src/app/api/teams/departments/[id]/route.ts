import { getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/database/auth'
import { updateDepartment, deleteDepartment } from '@/lib/database/departments'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any

    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 })
    }

    const department = await updateDepartment(
      id,
      userRole.farm_id, // ← was missing; scopes the update to the user's own farm
      user.id,
      {
        name: name.trim(),
        description: description?.trim() || undefined,
      }
    )

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found or failed to update' },
        { status: 404 }
      )
    }

    return NextResponse.json(department, { status: 200 })
  } catch (error) {
    console.error('Department PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any

    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const success = await deleteDepartment(id, userRole.farm_id)

    if (!success) {
      return NextResponse.json(
        { error: 'Department not found or failed to delete' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Department DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}