import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ farmId: string; id: string }> }
) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userRole = await getUserRole(user.id) as any

        if (!userRole?.farm_id) {
            return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
        }

        // Only farm owners and managers can update team invitations
        if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const { farmId, id: invitationId } = await params
        const body = await request.json()
        const { email, full_name, role_type, department_id } = body

        // Verify user's farm
        if (farmId !== userRole.farm_id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        if (!email || !full_name) {
            return NextResponse.json(
                { error: 'Email and full name are required' },
                { status: 400 }
            )
        }

        const supabase = await createServerSupabaseClient()

        // Update invitation
        const { data: invitation, error } = await supabase
            .from('farm_invitations')
            .update({
                email: email.toLowerCase().trim(),
                full_name: full_name.trim(),
                role_type,
                department_id: department_id || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', invitationId)
            .eq('farm_id', farmId)
            .select()
            .single()

        if (error) {
            console.error('Error updating invitation:', error)
            return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 })
        }

        if (!invitation) {
            return NextResponse.json(
                { error: 'Invitation not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            invitation,
            message: 'Invitation updated successfully'
        })

    } catch (error) {
        console.error('Invitation PUT error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
