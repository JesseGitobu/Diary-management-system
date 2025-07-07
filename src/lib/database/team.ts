import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { InvitationInsert, UserRoleInsert } from '@/lib/supabase/types'
import { generateInvitationToken } from '@/lib/utils/tokens'
import { addDays } from 'date-fns'

export async function getTeamMembers(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    console.log('🔍 Fetching team members for farm:', farmId)
    
    // Get user roles for this farm - NO JOINS, just the roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')  // Remove the profiles join completely
      .eq('farm_id', farmId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    
    if (rolesError) {
      console.error('❌ Error fetching user roles:', rolesError)
      return []
    }
    
    if (!userRoles || userRoles.length === 0) {
      console.log('ℹ️ No team members found for farm:', farmId)
      return []
    }
    
    console.log('🔍 Found', userRoles.length, 'user roles, fetching user details...')
    
    // Use admin client to get user information from Supabase auth
    const adminSupabase = createAdminClient()
    const teamMembers = []
    
    for (const role of userRoles) {
      try {
        console.log('🔍 Fetching user data for user_id:', role.user_id)
        
        // Get user information from Supabase auth
        const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(role.user_id)
        
        if (userData.user && !userError) {
          console.log('✅ User data found for:', userData.user.email)
          teamMembers.push({
            ...role,
            profiles: {  // Keep this structure for compatibility with your components
              id: userData.user.id,
              email: userData.user.email,
              user_metadata: userData.user.user_metadata
            }
          })
        } else {
          console.error('❌ Error fetching user data:', userError)
          // Include role with minimal info if user fetch fails
          teamMembers.push({
            ...role,
            profiles: {
              id: role.user_id,
              email: 'Unknown',
              user_metadata: {}
            }
          })
        }
      } catch (userFetchError) {
        console.error('❌ Exception fetching user data for role:', role.id, userFetchError)
        // Include role with minimal info if user fetch fails
        teamMembers.push({
          ...role,
          profiles: {
            id: role.user_id,
            email: 'Unknown',
            user_metadata: {}
          }
        })
      }
    }
    
    console.log('✅ Successfully fetched', teamMembers.length, 'team members')
    return teamMembers
    
  } catch (error) {
    console.error('❌ Exception in getTeamMembers:', error)
    return []
  }
}

export async function getPendingInvitations(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('farm_id', farmId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching pending invitations:', error)
    return []
  }
  
  return data || []
}

export async function createTeamInvitation(
  farmId: string,
  inviterUserId: string,
  invitationData: {
    email: string
    fullName: string
    roleType: 'farm_manager' | 'worker'
  }
) {
  const adminSupabase = createAdminClient()
  
  try {
    // Generate unique invitation token
    const token = generateInvitationToken()
    const expiresAt = addDays(new Date(), 7) // 7 days expiry
    
    console.log('🔍 Creating invitation with:', {
      token,
      farmId,
      email: invitationData.email,
      roleType: invitationData.roleType,
      expiresAt: expiresAt.toISOString()
    })
    
    // Create invitation record
    const invitationRecord = {
      token,
      farm_id: farmId,
      email: invitationData.email,
      role_type: invitationData.roleType,
      invited_by: inviterUserId,
      status: 'pending' as 'pending',
      expires_at: expiresAt.toISOString(),
    }
    
    const { data: invitation, error: invitationError } = await adminSupabase
      .from('invitations')
      .insert(invitationRecord)
      .select()
      .single()
    
    console.log('🔍 Database insert result:', { invitation, invitationError })
    
    if (invitationError) {
      console.error('❌ Error creating invitation:', invitationError)
      return { success: false, error: invitationError.message }
    }
    
    console.log('✅ Invitation created successfully:', invitation)
    
    return { 
      success: true, 
      invitation,
      invitationData: {
        ...invitationData,
        token,
        expiresAt: expiresAt.toISOString()
      }
    }
  } catch (error) {
    console.error('❌ Error in createTeamInvitation:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function validateInvitationToken(token: string) {
  const supabase = createAdminClient()
  
  try {
    console.log('🔍 Validating invitation token:', token)

    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

      console.log('🔍 Token validation result:', { 
      found: !!invitation, 
      error: error?.message 
    })
    
    if (error || !invitation) {
      return { 
        isValid: false, 
        error: 'invitation_not_found',
        message: 'Invitation not found or already used'
      }
    }
    
    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return { 
        isValid: false, 
        error: 'invitation_expired',
        message: 'This invitation has expired'
      }
    }
    
    return { isValid: true, invitation }
  } catch (error) {
    console.error('Error validating invitation token:', error)
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
    const { data: invitation, error } = await supabase
      .from('invitations')
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
    // Get invitation details
    const { data: invitation, error: invitationError } = await adminSupabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()
    
    if (invitationError || !invitation) {
      return { success: false, error: 'Invitation not found' }
    }
    
    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return { success: false, error: 'Invitation has expired' }
    }
    
    // Create user role
    const { error: roleError } = await adminSupabase
      .from('user_roles')
      .insert({
        user_id: userId,
        farm_id: invitation.farm_id,
        role_type: invitation.role_type,
        status: 'active',
      })
    
    if (roleError) {
      console.error('Error creating user role:', roleError)
      return { success: false, error: 'Failed to create user role' }
    }
    
    // Mark invitation as accepted
    const { error: updateError } = await adminSupabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('token', token)
    
    if (updateError) {
      console.error('Error updating invitation status:', updateError)
      return { success: false, error: 'Failed to update invitation status' }
    }
    
    return { 
      success: true, 
      farmId: invitation.farm_id,
      roleType: invitation.role_type 
    }
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function resendInvitation(invitationId: string, farmId: string) {
  const adminSupabase = createAdminClient()
  
  try {
    // Get existing invitation
    const { data: invitation, error: fetchError } = await adminSupabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('farm_id', farmId)
      .single()
    
    if (fetchError || !invitation) {
      return { success: false, error: 'Invitation not found' }
    }
    
    // Generate new token and extend expiry
    const newToken = generateInvitationToken()
    const newExpiresAt = addDays(new Date(), 7).toISOString()
    
    // Update invitation
    const { error: updateError } = await adminSupabase
      .from('invitations')
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
  
  const { error } = await adminSupabase
    .from('invitations')
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
    const { data: userRole, error: fetchError } = await adminSupabase
      .from('user_roles')
      .select('role_type')
      .eq('id', userRoleId)
      .eq('farm_id', farmId)
      .single()
    
    if (fetchError || !userRole) {
      return { success: false, error: 'Team member not found' }
    }
    
    if (userRole.role_type === 'farm_owner') {
      return { success: false, error: 'Cannot remove farm owner' }
    }
    
    // Update status to inactive instead of deleting
    const { error: updateError } = await adminSupabase
      .from('user_roles')
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

export async function getTeamStats(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  // Get total team members
  const { count: totalMembers } = await supabase
    .from('user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .eq('status', 'active')
  
  // Get pending invitations
  const { count: pendingInvitations } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
  
  // Get members by role
  const { data: roleStats } = await supabase
    .from('user_roles')
    .select('role_type')
    .eq('farm_id', farmId)
    .eq('status', 'active')
  
  const owners = roleStats?.filter(r => r.role_type === 'farm_owner').length || 0
  const managers = roleStats?.filter(r => r.role_type === 'farm_manager').length || 0
  const workers = roleStats?.filter(r => r.role_type === 'worker').length || 0
  
  return {
    total: totalMembers || 0,
    pending: pendingInvitations || 0,
    owners,
    managers,
    workers,
  }
}