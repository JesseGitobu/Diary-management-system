import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { generateInvitationToken } from '@/lib/utils/tokens'
import { addDays } from 'date-fns'

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired'
export type UserRole = 'farm_owner' | 'farm_manager' | 'worker' | 'veterinarian'

export interface Invitation {
  id: string
  farm_id: string
  email: string
  full_name: string
  role_type: UserRole
  status: InvitationStatus
  sent_by: string
  sent_at: string
  accepted_at: string | null
  token: string
  expires_at: string
  department_id?: string | null
  created_at: string
  updated_at: string
}

export interface CreateInvitationInput {
  email: string
  full_name: string
  role_type: UserRole
  department_id?: string | null
}

export async function createTeamInvitation(
  farmId: string,
  inviterUserId: string,
  invitationData: CreateInvitationInput
  ): Promise<{ invitation: Invitation | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient()
    
      // Validate input
      const validationError = validateInvitationInput(invitationData)
      if (validationError) {
        return { invitation: null, error: validationError }
      }
    // Generate unique invitation token
    const token = generateInvitationToken()
    const expiresAt = addDays(new Date(), 7) // 7 days expiry
    
    console.log('🔍 Creating invitation with:', {
      token,
      farmId,
      email: invitationData.email,
      role_type: invitationData.role_type,
      department_id: invitationData.department_id,
      expiresAt: expiresAt.toISOString()
    })
    
    // Create invitation record
    const invitationRecord = {
      token,
      farm_id: farmId,
      full_name: invitationData.full_name.trim(),
      email: invitationData.email.toLowerCase().trim(),
      role_type: invitationData.role_type,
      department_id: invitationData.department_id,
      sent_by: inviterUserId,
      sent_at: new Date().toISOString(),
      invited_by: inviterUserId,
      status: 'pending' as 'pending',
      expires_at: expiresAt.toISOString(),
    }

    const { data: newInvitation, error: invitationError } = await (supabase as any)
      .from('farm_invitations')
      .insert(invitationRecord)
      .select()
      .single()

    // FIXED: Cast to any on insert
    if (invitationError) {
      console.error('❌ [CREATE_INVITATION] Insert error:', invitationError)
      return {
        invitation: null,
        error: invitationError.message.includes('duplicate')
          ? `An invitation for "${invitationData.email}" already exists`
          : 'Failed to create invitation',
      }
    }
    console.log('✅ Invitation created successfully:', newInvitation)
    
    return {  invitation: ((newInvitation as any) || null) as Invitation, error: null }
  } catch (error) {
    console.error('❌ Error in createTeamInvitation:', error)
    return { invitation: null,
      error: error instanceof Error ? error.message : 'An unexpected error occurred while creating the invitation',
    }
  }
}

/* Validates invitation input data */
export function validateInvitationInput(data: Partial<CreateInvitationInput>): string | null {
  if (data.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!data.email || !emailRegex.test(data.email)) {
      return 'Please provide a valid email address'
    }
  }

  if (data.full_name !== undefined && (!data.full_name || !data.full_name.trim())) {
    return 'Full name is required and cannot be empty'
  }

  if (data.full_name && data.full_name.trim().length < 2) {
    return 'Full name must be at least 2 characters'
  }

  if (data.role_type !== undefined) {
    const validRoles: UserRole[] = ['farm_owner', 'farm_manager', 'worker', 'veterinarian']
    if (!validRoles.includes(data.role_type)) {
      return `Invalid role type. Must be one of: ${validRoles.join(', ')}`
    }
  }

  return null
}

export async function validateInvitationToken(token: string) {
  const supabase = createAdminClient()
  
  try {
    console.log('🔍 Validating invitation token:', token)

    const { data: invitationData, error } = await supabase
      .from('farm_invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .maybeSingle()

    // FIXED: Cast invitation to any
    const invitation = invitationData as any

      console.log('🔍 Token validation result:', { 
      found: !!invitation, 
      error: error?.message 
    })
    
    if (error) {
      console.error('❌ [VALIDATE_TOKEN] Database error:', error)
      return { 
        isValid: false, 
        error: 'validation_error',
        message: 'Unable to validate invitation'
      }
    }

    if (!invitation) {
      console.warn('⚠️ [VALIDATE_TOKEN] No invitation found with token:', token)
      return { 
        isValid: false, 
        error: 'invitation_not_found',
        message: 'Invitation not found or already used'
      }
    }
    
    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      console.warn('⚠️ [VALIDATE_TOKEN] Token is expired')
      return { 
        isValid: false, 
        error: 'invitation_expired',
        message: 'This invitation has expired'
      }
    }
    
    console.log('✅ [VALIDATE_TOKEN] Token is valid')
    return { isValid: true, invitation }
  } catch (error) {
    console.error('❌ [VALIDATE_TOKEN] Unexpected error:', error)
    return { 
      isValid: false, 
      error: 'validation_error',
      message: 'Unable to validate invitation'
    }
  }
}

export async function getInvitationDetails(token: string) {
  // MUST use admin client because this is called from a public page
  const supabase = createAdminClient()
  
  try {
    console.log('🔍 Looking for invitation with token:', token)
    
    // First, get the invitation with farm details
    const { data: invitationData, error } = await supabase
      .from('farm_invitations')
      .select(`
        *,
        farms (
          name,
          location,
          farm_type
        )
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .single()
    
    // FIXED: Cast invitation to any
    const invitation = invitationData as any

    console.log('🔍 Invitation query result:', { 
      found: !!invitation, 
      error: error?.message || 'no error'
    })
    
    if (error) {
      console.error('❌ Database error in getInvitationDetails:', error)
      return null
    }
    
    if (!invitation) {
      console.log('❌ No invitation found with token:', token)
      return null
    }
    
    // Separately get the inviter's information from auth.users
    let inviterInfo = null
    if (invitation.invited_by) {
      const { data: inviter, error: inviterError } = await supabase.auth.admin.getUserById(invitation.invited_by)
      
      if (!inviterError && inviter.user) {
        inviterInfo = {
          email: inviter.user.email,
          user_metadata: inviter.user.user_metadata
        }
      }
    }
    
    // Check if expired
    const isExpired = new Date(invitation.expires_at) < new Date()
    console.log('🔍 Invitation expiry check:', {
      expires_at: invitation.expires_at,
      now: new Date().toISOString(),
      isExpired
    })
    
    if (isExpired) {
      console.log('❌ Invitation is expired')
      return null
    }
    
    console.log('✅ Valid invitation found:', {
      id: invitation.id,
      email: invitation.email,
      farm_name: invitation.farms?.name,
      role_type: invitation.role_type
    })
    
    // Return invitation with inviter info attached
    return {
      ...invitation,
      inviter: inviterInfo
    }
    
  } catch (error) {
    console.error('❌ Exception in getInvitationDetails:', error)
    return null
  }
}

export async function acceptInvitation(token: string, userId: string) {
  const adminSupabase = createAdminClient()
  
  try {
    console.log('🔍 [ACCEPT_INVITATION] Starting for token:', token.substring(0, 10) + '..., userId:', userId)
    
    // Get invitation details
    const { data: invitationData, error: invitationError } = await adminSupabase
      .from('farm_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()
    
    // FIXED: Cast to any
    const invitation = invitationData as any

    if (invitationError) {
      console.error('❌ [ACCEPT_INVITATION] Error fetching invitation:', invitationError)
      return { success: false, error: `Invitation fetch error: ${invitationError.message}` }
    }

    if (!invitation) {
      console.error('❌ [ACCEPT_INVITATION] No invitation found with token')
      return { success: false, error: 'Invitation not found' }
    }
    
    console.log('✅ [ACCEPT_INVITATION] Invitation found:', { id: invitation.id, farm_id: invitation.farm_id, role_type: invitation.role_type })
    
    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      console.warn('❌ [ACCEPT_INVITATION] Invitation has expired')
      return { success: false, error: 'Invitation has expired' }
    }
    
    console.log('🔍 [ACCEPT_INVITATION] Creating user role for:', { userId, farm_id: invitation.farm_id, role_type: invitation.role_type, invitation_id: invitation.id })
    
    // Create user role
    // FIXED: Cast to any on insert
    const { error: roleError, data: roleData } = await (adminSupabase
      .from('user_roles') as any)
      .insert({
        user_id: userId,
        farm_id: invitation.farm_id,
        role_type: invitation.role_type,
        status: 'active',
        invitation_id: invitation.id,
      })
      .select()
    
    if (roleError) {
      console.error('❌ [ACCEPT_INVITATION] Role insert error:', roleError.message, roleError.details, roleError.hint)
      return { success: false, error: `Role creation failed: ${roleError.message}${roleError.code ? ' (code: ' + roleError.code + ')' : ''}` }
    }

    console.log('✅ [ACCEPT_INVITATION] User role created successfully:', roleData)
    
    console.log('🔍 [ACCEPT_INVITATION] Updating invitation status to accepted')
    
    // Mark invitation as accepted
    // FIXED: Cast to any on update
    const { error: updateError, data: updateData } = await (adminSupabase
      .from('farm_invitations') as any)
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('token', token)
      .select()
    
    if (updateError) {
      console.error('❌ [ACCEPT_INVITATION] Invitation update error:', updateError.message, updateError.details, updateError.hint)
      return { success: false, error: `Invitation update failed: ${updateError.message}${updateError.code ? ' (code: ' + updateError.code + ')' : ''}` }
    }

    console.log('✅ [ACCEPT_INVITATION] Invitation status updated:', updateData)
    
    console.log('✅ [ACCEPT_INVITATION] Full acceptance complete')
    return { 
      success: true, 
      farmId: invitation.farm_id,
      roleType: invitation.role_type 
    }
  } catch (error) {
    console.error('❌ [ACCEPT_INVITATION] Exception:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
export async function resendInvitation(invitationId: string, farmId: string) {
  const adminSupabase = createAdminClient()
  
  try {
    // Get existing invitation
    const { data: invitationData, error: fetchError } = await adminSupabase
      .from('farm_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('farm_id', farmId)
      .single()
    
    // FIXED: Cast to any to fix 'Spread types may only be created from object types'
    const invitation = invitationData as any

    if (fetchError || !invitation) {
      return { success: false, error: 'Invitation not found' }
    }
    
    // Generate new token and extend expiry
    const newToken = generateInvitationToken()
    const newExpiresAt = addDays(new Date(), 7).toISOString()
    
    // Update invitation
    // FIXED: Cast to any on update
    const { error: updateError } = await (adminSupabase
      .from('invitations') as any)
      .update({
        token: newToken,
        expires_at: newExpiresAt,
        status: 'pending'
      })
      .eq('id', invitationId)
    
    if (updateError) {
      return { success: false, error: updateError.message }
    }
    
    return { 
      success: true, 
      invitation: {
        ...invitation,
        token: newToken,
        expires_at: newExpiresAt
      }
    }
  } catch (error) {
    console.error('Error resending invitation:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: errorMessage }
  }
}

export async function cancelInvitation(invitationId: string, farmId: string) {
  const adminSupabase = createAdminClient()
  
  // FIXED: Cast to any on update
  const { error } = await (adminSupabase
    .from('farm_invitations') as any)
    .update({ status: 'declined' })
    .eq('id', invitationId)
    .eq('farm_id', farmId)
  
  if (error) {
    console.error('Error canceling invitation:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

export async function removeTeamMember(userRoleId: string, farmId: string) {
  const adminSupabase = createAdminClient()
  
  try {
    // Get the user role to check if it's the farm owner
    const { data: userRoleData, error: fetchError } = await adminSupabase
      .from('user_roles')
      .select('role_type')
      .eq('id', userRoleId)
      .eq('farm_id', farmId)
      .single()
    
    // FIXED: Cast to any
    const userRole = userRoleData as any

    if (fetchError || !userRole) {
      return { success: false, error: 'Team member not found' }
    }
    
    if (userRole.role_type === 'farm_owner') {
      return { success: false, error: 'Cannot remove farm owner' }
    }
    
    // Update status to inactive instead of deleting
    // FIXED: Cast to any on update
    const { error: updateError } = await (adminSupabase
      .from('user_roles') as any)
      .update({ status: 'inactive' })
      .eq('id', userRoleId)
      .eq('farm_id', farmId)
    
    if (updateError) {
      return { success: false, error: updateError.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error removing team member:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: errorMessage }
  }
}