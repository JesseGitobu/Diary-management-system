import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/database/auth'
import { deleteAccessControlPolicy } from '@/lib/database/access-control'

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

        // Only farm owners and managers can delete policies
        if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const farmId = userRole.farm_id
        const policyId = id

        // Delete policy using utility function
        const { success, error } = await deleteAccessControlPolicy(policyId, farmId)

        if (!success) {
            console.error('Error deleting policy:', error)
            return NextResponse.json({ error: error || 'Failed to delete policy' }, { status: 400 })
        }

        return NextResponse.json({ success: true, message: 'Policy deleted successfully' })
    } catch (error) {
        console.error('Policy DELETE error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
