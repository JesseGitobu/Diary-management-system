import { createServerSupabaseClient } from '@/lib/supabase/server'
//import { UserRole } from '@/lib/supabase/types'

export async function createFarmOwnerProfile(userId: string, email: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    console.log('🔍 Creating farm owner profile for user:', userId)
    
    // Create farm first
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .insert({
        name: 'My Farm', // Default name, will be updated in onboarding
        location: null,
        farm_type: 'dairy',
      })
      .select()
      .single()

    if (farmError) {
      console.error('❌ Error creating farm:', farmError)
      throw farmError
    }

    console.log('✅ Farm created:', farm.id)

    // Create user role (NO profiles table reference)
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,  // This should reference auth.users(id)
        farm_id: farm.id,
        role_type: 'farm_owner',
        status: 'active',
      })

    if (roleError) {
      console.error('❌ Error creating user role:', roleError)
      throw roleError
    }

    console.log('✅ User role created')

    // Create farm profile
    const { error: profileError } = await supabase
      .from('farm_profiles')
      .insert({
        user_id: userId,
        farm_id: farm.id,
        farm_name: 'My Farm',
        onboarding_completed: false,
        completion_percentage: 0,
      })

    if (profileError) {
      console.error('❌ Error creating farm profile:', profileError)
      throw profileError
    }

    console.log('✅ Farm profile created')

    return { success: true, farmId: farm.id }
  } catch (error) {
    console.error('Error creating farm owner profile:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function createTeamMemberProfile(
  userId: string,
  invitationToken: string
) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', invitationToken)
      .eq('status', 'pending')
      .single()

    if (invitationError) throw invitationError

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Invitation has expired')
    }

    // Create user role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        farm_id: invitation.farm_id,
        role_type: invitation.role_type,
        status: 'active',
      })

    if (roleError) throw roleError

    // Update invitation status
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('token', invitationToken)

    if (updateError) throw updateError

    return { success: true, farmId: invitation.farm_id, role: invitation.role_type }
  } catch (error) {
    console.error('Error creating team member profile:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getUserRole(userId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('role_type, farm_id')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error getting user role:', error)
    return null
  }

  return data
}

export async function isAdminUser(userId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .single()

  return !error && data !== null
}