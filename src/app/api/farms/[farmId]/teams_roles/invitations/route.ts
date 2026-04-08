import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createTeamInvitation } from '@/lib/database/team-invitation'
import { sendInvitationEmail, generateInvitationLink } from '@/lib/email/invitation'

export async function POST(request: NextRequest, { params }: { params: Promise<{ farmId: string }> }) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userRole = await getUserRole(user.id) as any

        if (!userRole?.farm_id) {
            return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
        }

        // Only farm owners and managers can invite team members
        if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const { farmId } = await params
        const body = await request.json()
        const { email, full_name, role_type, department_id } = body

        // Verify user owns the farm
        if (farmId !== userRole.farm_id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Create the invitation
        const result = await createTeamInvitation(userRole.farm_id, user.id, {
            email,
            full_name: full_name,
            role_type: role_type,
            department_id: department_id || null,
        })

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        // Send invitation email
        try {
            if (!result.invitation) {
                throw new Error('Invitation data is missing');
            }

            const supabase = await createServerSupabaseClient()
            const { data: farm, error: farmError } = await supabase
                .from('farms')
                .select('name')
                .eq('id', farmId)
                .single()

            if (!farmError && farm) {
                // Get inviter's user metadata for their name
                const { data: inviterData } = await supabase.auth.admin.getUserById(user.id)
                const inviterName = inviterData?.user?.user_metadata?.full_name ||
                    inviterData?.user?.email?.split('@')[0] ||
                    'Farm Manager'

                const invitationLink = generateInvitationLink(result.invitation.token)

                await sendInvitationEmail({
                    inviteeName: full_name,
                    inviteeEmail: email,
                    farmName: 'Your Farm', // We'll get the actual farm name later
                    inviterName: inviterName,
                    roleType: role_type.replace('_', ' '),
                    invitationLink,
                    expiresAt: result.invitation.expires_at,
                })

                console.log(`Invitation sent to ${email} with link: ${invitationLink}`)
            }
        } catch (emailError) {
            console.error('Error sending invitation email:', emailError)
            // Don't fail the request if email fails
        }

        return NextResponse.json({
            success: true,
            invitation: result.invitation,
            message: 'Invitation sent successfully'
        })

    } catch (error) {
        console.error('Team invite API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}