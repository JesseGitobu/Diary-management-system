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
        const workerId = id
        const body = await request.json()

        const {
            name,
            worker_number,
            employment_status,
            position,
            shift,
            department_id,
            casual_rate,
        } = body

        // Basic null checks
        if (!name || !worker_number || !employment_status || !position) {
            return NextResponse.json(
                {
                    error: 'Missing required fields: name, worker_number, employment_status, position',
                },
                { status: 400 }
            )
        }

        // Validate employment status enum
        const validStatuses = ['full_time', 'part_time', 'casual', 'contract']
        if (!validStatuses.includes(employment_status)) {
            return NextResponse.json(
                {
                    error: `Invalid employment status. Must be one of: ${validStatuses.join(', ')}`,
                },
                { status: 400 }
            )
        }

        // Additional validation for casual workers
        if (employment_status === 'casual') {
            if (!casual_rate || parseFloat(casual_rate) <= 0) {
                return NextResponse.json(
                    { error: 'Casual workers must have a valid hourly rate (Kes)' },
                    { status: 400 }
                )
            }
        }

        const supabase = await createServerSupabaseClient()

        // Update worker
        const { data: worker, error } = await supabase
            .from('workers')
            .update({
                name: name.trim(),
                worker_number: worker_number.trim(),
                employment_status,
                position: position.trim(),
                shift: shift?.trim() || null,
                department_id: department_id || null,
                casual_rate: casual_rate ? parseFloat(casual_rate) : null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', workerId)
            .eq('farm_id', farmId)
            .select()
            .single()

        if (error) {
            console.error('Error updating worker:', error)
            return NextResponse.json({ error: 'Failed to update worker' }, { status: 500 })
        }

        if (!worker) {
            return NextResponse.json(
                { error: 'Worker not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(worker, { status: 200 })
    } catch (error) {
        console.error('Worker PUT error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
