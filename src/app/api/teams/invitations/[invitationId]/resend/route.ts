import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient, getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { generateSecureToken } from '@/lib/database/invitations'
import { sendInvitationEmail, generateInvitationLink } from '@/lib/email/invitation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any

    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // Fetch the existing invitation to verify it belongs to this farm
    const { data: existing, error: fetchError } = await supabase
      .from('farm_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('farm_id', userRole.farm_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    const inv = existing as any

    // Regenerate token and extend expiry by 7 days
    const newToken = generateSecureToken()
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('farm_invitations')
      .update({
        token: newToken,
        expires_at: newExpiresAt,
        status: 'pending',
        sent_at: new Date().toISOString(),
        accepted_at: null,
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('Error updating invitation:', updateError)
      return NextResponse.json({ error: 'Failed to refresh invitation' }, { status: 500 })
    }

    // Resend the email
    try {
      const adminSupabase = createAdminClient()

      const { data: farm } = await supabase
        .from('farms')
        .select('name')
        .eq('id', userRole.farm_id)
        .single()

      const { data: inviterData } = await adminSupabase.auth.admin.getUserById(user.id)
      const inviterName =
        inviterData?.user?.user_metadata?.full_name ||
        inviterData?.user?.email?.split('@')[0] ||
        'Farm Manager'

      await sendInvitationEmail({
        inviteeName: inv.full_name,
        inviteeEmail: inv.email,
        farmName: farm?.name ?? 'the farm',
        inviterName,
        roleType: inv.role_type.replace('_', ' '),
        invitationLink: generateInvitationLink(newToken),
        expiresAt: newExpiresAt,
      })
    } catch (emailError) {
      // Log but don't fail — the token was already refreshed in the DB
      console.error('Error resending invitation email:', emailError)
    }

    return NextResponse.json({ success: true, invitation: updated })
  } catch (error) {
    console.error('Invitation resend error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
