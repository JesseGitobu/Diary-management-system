import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/database/auth'
import { createWorker, validateWorkerInput, CreateWorkerInput, EmploymentStatus } from '@/lib/database/workers'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user's farms via user_farm_roles
        const { data: userFarmRoles } = await (supabase as any)
            .from('user_farm_roles')
            .select('farm_id')
            .eq('user_id', user.id)
            .eq('status', 'active')

        if (!userFarmRoles || userFarmRoles.length === 0) {
            return NextResponse.json([])
        }

        const farmIds = userFarmRoles.map((ufr: any) => ufr.farm_id)

        // Get workers for user's farms
        const { data: workers, error } = await supabase
            .from('workers')
            .select('*')
            .in('farm_id', farmIds)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching workers:', error)
            return NextResponse.json(
                { error: 'Failed to fetch workers' },
                { status: 500 }
            )
        }

        return NextResponse.json(workers || [])
    } catch (error) {
        console.error('Worker GET error:', error)
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

        // Extract and validate required fields
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
        const validStatuses: EmploymentStatus[] = ['full_time', 'part_time', 'casual', 'contract']
        if (!validStatuses.includes(employment_status)) {
            return NextResponse.json(
                {
                    error: `Invalid employment status. Must be one of: ${validStatuses.join(', ')}`,
                },
                { status: 400 }
            )
        }

        // Prepare worker input
        const workerInput: CreateWorkerInput = {
            name: name.trim(),
            worker_number: worker_number.trim(),
            employment_status,
            position: position.trim(),
            shift: shift?.trim() || null,
            department_id: department_id || null,
            casual_rate: casual_rate ? parseFloat(casual_rate) : null,
        }

        // Validate using utility function
        const validationError = validateWorkerInput(workerInput)
        if (validationError) {
            return NextResponse.json({ error: validationError }, { status: 400 })
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

        // Create worker
        const { worker, error } = await createWorker(farmId, workerInput)

        if (error) {
            return NextResponse.json({ error }, { status: 400 })
        }

        if (!worker) {
            return NextResponse.json(
                { error: 'Failed to create worker' },
                { status: 500 }
            )
        }

        return NextResponse.json(worker, { status: 201 })
    } catch (error) {
        console.error('Worker POST error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
