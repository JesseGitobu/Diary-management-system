import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRole } from '@/lib/database/auth'
import { createInvitation, validateInvitationInput, CreateInvitationInput, UserRole,  } from '@/lib/database/invitations'
import { sendInvitationEmail } from '@/lib/email/invitation'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userRole = await getUserRole(user.id) as any

        if (!userRole?.farm_id) {
            console.warn(`No farm role found for user ${user.id}`)
            return NextResponse.json([])
        }

        const farmId = userRole.farm_id
        console.log(`Fetching invitations for farm: ${farmId}`)

        // Get invitations for user's farm
        const { data: invitations, error } = await supabase
            .from('farm_invitations')
            .select('*')
            .eq('farm_id', farmId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching invitations:', error)
            return NextResponse.json(
                { error: 'Failed to fetch invitations' },
                { status: 500 }
            )
        }

        console.log(`Found ${(invitations || []).length} invitations`)
        return NextResponse.json(invitations || [])
    } catch (error) {
        console.error('Invitation GET error:', error)
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
            console.error(`No farm associated with user ${user.id}`)
            return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
        }

        // Check if user has permission to send invitations (farm_owner or farm_manager)
        if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
            return NextResponse.json(
                { error: 'You do not have permission to send invitations' },
                { status: 403 }
            )
        }

        const farmId = userRole.farm_id
        const body = await request.json()

        // Extract and validate required fields
        const { email, full_name, role_type, department_id } = body

        // Basic null checks
        if (!email || !full_name || !role_type) {
            return NextResponse.json(
                {
                    error: 'Missing required fields: email, full_name, role_type',
                },
                { status: 400 }
            )
        }

        // Validate role type enum
        const validRoles: UserRole[] = ['farm_owner', 'farm_manager', 'worker', 'veterinarian']
        if (!validRoles.includes(role_type)) {
            return NextResponse.json(
                {
                    error: `Invalid role type. Must be one of: ${validRoles.join(', ')}`,
                },
                { status: 400 }
            )
        }

        // Prepare invitation input
        const invitationInput: CreateInvitationInput = {
            email: email.toLowerCase().trim(),
            full_name: full_name.trim(),
            role_type,
            department_id: department_id || null,
        }

        // Validate using utility function
        const validationError = validateInvitationInput(invitationInput)
        if (validationError) {
            return NextResponse.json({ error: validationError }, { status: 400 })
        }

        // Create invitation
        const { invitation, error } = await createInvitation(farmId, user.id, invitationInput)

        if (error) {
            return NextResponse.json({ error }, { status: 400 })
        }

        if (!invitation) {
            return NextResponse.json(
                { error: 'Failed to create invitation' },
                { status: 500 }
            )
        }

        console.log('✅ [API] Invitation created successfully:', {
            invitationId: invitation.id,
            token: invitation.token,
            email: invitation.email,
            hasToken: !!invitation.token
        })

        // Send invitation email (don't block response if email fails)
        try {
            // Fetch farm details
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

                // Generate invitation link
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
                const invitationLink = `${baseUrl}/accept-invitation/${invitation.token}`

                console.log('📧 [API] Email link:', {
                    link: invitationLink,
                    token: invitation.token,
                    tokenLength: invitation.token?.length
                })

                // Send email
                const emailResult = await sendInvitationEmail({
                    inviteeName: full_name,
                    inviteeEmail: email.toLowerCase(),
                    farmName: farm.name,
                    inviterName: inviterName,
                    roleType: role_type.replace('_', ' '),
                    invitationLink: invitationLink,
                    expiresAt: invitation.expires_at,
                })

                console.log('✅ [API] Invitation email sent:', emailResult)
            }
        } catch (emailError) {
            // Log but don't fail the API - invitation was created successfully
            console.error('❌ [API] Error sending invitation email:', emailError)
        }

        return NextResponse.json(invitation, { status: 201 })
    } catch (error) {
        console.error('Invitation POST error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
