import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/database/auth'

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

        const farmId = userRole.farm_id
        const departmentId = id
        const body = await request.json()
        const { name, description } = body

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: 'Department name is required' }, { status: 400 })
        }

        const supabase = await createServerSupabaseClient()

        // Update department
        const { data: department, error } = await supabase
            .from('departments')
            .update({
                name: name.trim(),
                description: description?.trim() || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', departmentId)
            .eq('farm_id', farmId)
            .select()
            .single()

        if (error) {
            console.error('Error updating department:', error)
            return NextResponse.json({ error: 'Failed to update department' }, { status: 500 })
        }

        if (!department) {
            return NextResponse.json(
                { error: 'Department not found' },
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
