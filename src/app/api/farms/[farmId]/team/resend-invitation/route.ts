import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { resendInvitation } from '@/lib/database/team'
import { sendInvitationEmail, generateInvitationLink } from '@/lib/email/invitation'

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
    
    // Only farm owners and managers can resend invitations
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { invitationId } = body
    
    const result = await resendInvitation(invitationId, userRole.farm_id)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    // Send the new invitation email
    try {
      if (!result.invitation) {
        throw new Error('Invitation data is missing')
      }
      const invitationLink = generateInvitationLink(result.invitation.token)
      
      await sendInvitationEmail({
        inviteeName: 'Team Member', // We'll improve this with actual name
        inviteeEmail: result.invitation.email,
        farmName: 'Your Farm',
        inviterName: user.user_metadata?.full_name || user.email || 'Farm Owner',
        roleType: result.invitation.role_type.replace('_', ' '),
        invitationLink,
        expiresAt: result.invitation.expires_at,
      })
      
      console.log(`Invitation resent to ${result.invitation.email} with link: ${invitationLink}`)
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Invitation resent successfully'
    })
    
  } catch (error) {
    console.error('Resend invitation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}