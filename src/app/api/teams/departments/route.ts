// src/app/api/teams/departments/route.ts
import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/database/auth'
import { createDepartment, getDepartments } from '@/lib/database/departments'

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userRole = await getUserRole(user.id) as any

        if (!userRole?.farm_id) {
            return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
        }

        const departmentRecords = await getDepartments(
            userRole.farm_id,

        )

        return NextResponse.json({
            success: true,
            data: departmentRecords
        })

    } catch (error) {
        console.error('Department GET error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userRole = await getUserRole(user.id) as any

        if (!userRole?.farm_id) {
            return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
        }

        const farmId = userRole.farm_id
        const body = await request.json()
        const { name, description } = body

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: 'Department name is required' }, { status: 400 })
        }

        // Create department using utility function
        const department = await createDepartment(farmId, name.trim(), description?.trim() || undefined)

        if (!department) {
            return NextResponse.json(
                { error: 'Failed to create department' },
                { status: 500 }
            )
        }

        return NextResponse.json(department, { status: 201 })
    } catch (error) {
        console.error('Department POST error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
