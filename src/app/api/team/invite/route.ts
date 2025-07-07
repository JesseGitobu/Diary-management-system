import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createTeamInvitation } from '@/lib/database/team'
import { sendInvitationEmail, generateInvitationLink } from '@/lib/email/invitation'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Only farm owners and managers can invite team members
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { farmId, email, fullName, roleType } = body
    
    // Verify user owns the farm
    if (farmId !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Create the invitation
    const result = await createTeamInvitation(userRole.farm_id, user.id, {
      email,
      fullName,
      roleType,
    })
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    // Send invitation email
    try {
      if (!result.invitationData) {
        throw new Error('Invitation data is missing');
      }
      const invitationLink = generateInvitationLink(result.invitationData.token)
      
      await sendInvitationEmail({
        inviteeName: fullName,
        inviteeEmail: email,
        farmName: 'Your Farm', // We'll get the actual farm name later
        inviterName: user.user_metadata?.full_name || user.email || 'Farm Owner',
        roleType: roleType.replace('_', ' '),
        invitationLink,
        expiresAt: result.invitationData.expiresAt,
      })
      
      console.log(`Invitation sent to ${email} with link: ${invitationLink}`)
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