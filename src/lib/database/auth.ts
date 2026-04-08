// src/lib/database/auth.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
//import { UserRole } from '@/lib/supabase/types'

// 🎯 UPDATED: Now handles both new users and existing pending users
export async function createFarmOwnerProfile(userId: string, email: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    console.log('🔍 Creating farm owner profile for user:', userId)
    
    // 🎯 NEW: Check if user already has a pending role
    const existingRole = await getUserRole(userId) as any
    
    if (existingRole) {
      console.log('🔍 User already has role:', existingRole)
      
      // If user has pending_setup status and no farm, create farm for them
      if (existingRole.status === 'pending_setup' && !existingRole.farm_id) {
        console.log('🔍 Creating farm for existing pending user')
        return await createFarmForExistingUser(userId)
      }
      
      // If user already has farm, return success
      if (existingRole.farm_id) {
        console.log('✅ User already has farm:', existingRole.farm_id)
        return { success: true, farmId: existingRole.farm_id }
      }
    }
    
    // 🎯 UPDATED: Original logic for users without roles (legacy support)
    return await createFarmAndRole(userId, email)
    
  } catch (error) {
    console.error('Error creating farm owner profile:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 🎯 NEW: Create farm for users who already have pending_setup role
async function createFarmForExistingUser(userId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    console.log('🔍 Creating farm for existing pending user:', userId)
    
    // Create farm
    // FIXED: Cast to any to bypass 'never' type on insert
    const { data: farm, error: farmError } = await (supabase
      .from('farms') as any)
      .insert({
        name: 'My Farm',
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

    // Update existing user role with farm_id and active status
    // FIXED: Cast to any
    const { error: roleError } = await (supabase
      .from('user_roles') as any)
      .update({
        farm_id: farm.id,
        status: 'active'
      })
      .eq('user_id', userId)
      .eq('role_type', 'farm_owner')

    if (roleError) {
      console.error('❌ Error updating user role:', roleError)
      throw roleError
    }

    console.log('✅ User role updated with farm_id')

    // Create farm profile
    // FIXED: Cast to any
    const { error: profileError } = await (supabase
      .from('farm_profiles') as any)
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
    console.error('Error creating farm for existing user:', error)
    throw error
  }
}

// 🎯 NEW: Original farm and role creation logic (for legacy support)
async function createFarmAndRole(userId: string, email: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    console.log('🔍 Creating farm and role for new user:', userId)
    
    // Create farm
    // FIXED: Cast to any
    const { data: farm, error: farmError } = await (supabase
      .from('farms') as any)
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

    // Create user role
    // FIXED: Cast to any
    const { error: roleError } = await (supabase
      .from('user_roles') as any)
      .insert({
        user_id: userId,
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
    // FIXED: Cast to any
    const { error: profileError } = await (supabase
      .from('farm_profiles') as any)
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
    console.error('Error creating farm and role:', error)
    throw error
  }
}

export async function createTeamMemberProfile(
  userId: string,
  invitationToken: string
) {
  const supabase = await createServerSupabaseClient()
  
  try {
    console.log('🔍 Creating team member profile for user:', userId, 'with token:', invitationToken)
    
    // Get invitation details
    const { data: invitationData, error: invitationError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', invitationToken)
      .eq('status', 'pending')
      .single()

    // FIXED: Cast invitation to any
    const invitation = invitationData as any

    if (invitationError) {
      console.error('❌ Error getting invitation:', invitationError)
      throw invitationError
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Invitation has expired')
    }

    console.log('✅ Valid invitation found:', invitation.id)

    // Create user role
    // FIXED: Cast to any
    const { error: roleError } = await (supabase
      .from('user_roles') as any)
      .insert({
        user_id: userId,
        farm_id: invitation.farm_id,
        role_type: invitation.role_type,
        status: 'active',
      })

    if (roleError) {
      console.error('❌ Error creating team member role:', roleError)
      throw roleError
    }

    console.log('✅ Team member role created')

    // Update invitation status
    // FIXED: Cast to any
    const { error: updateError } = await (supabase
      .from('invitations') as any)
      .update({ status: 'accepted' })
      .eq('token', invitationToken)

    if (updateError) {
      console.error('❌ Error updating invitation status:', updateError)
      throw updateError
    }

    console.log('✅ Invitation status updated to accepted')

    return { success: true, farmId: invitation.farm_id, role: invitation.role_type }
  } catch (error) {
    console.error('Error creating team member profile:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 🎯 UPDATED: Now includes status in the response
export async function getUserRole(userId: string) {
  const supabase = await createServerSupabaseClient()

  // Test the connection
  const { data: testData, error: testError } = await supabase
    .from('user_roles')
    .select('count')
    .limit(1)
    .single()
  
  if (testError) {
    console.error('Database connection issue:', testError)
    return null
  }
  
  // 🎯 UPDATED: Now selects status as well
  const { data, error } = await supabase
    .from('user_roles')
    .select('id, role_type, farm_id, status')
    .eq('user_id', userId)
    .maybeSingle()

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

// 🎯 NEW: Helper function to update user role status
// 🎯 IMPROVED: Helper function to update user role status
export async function updateUserRoleStatus(userId: string, status: string, farmId?: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    console.log('🔍 Updating user role status:', { userId, status, farmId })
    
    const updateData: any = { 
      status,
      //updated_at: new Date().toISOString() // Good practice to track updates
    }
    
    if (farmId) {
      updateData.farm_id = farmId
    }
    
    // FIXED: Cast to any
    const { data, error } = await (supabase
      .from('user_roles') as any)
      .update(updateData)
      .eq('user_id', userId)
      .select() // Return the updated record to verify
    
    if (error) {
      console.error('❌ Error updating user role status:', error)
      return false
    }
    
    if (!data || data.length === 0) {
      console.error('❌ No user role found to update for userId:', userId)
      return false
    }
    
    console.log('✅ User role status updated successfully:', data[0])
    return true
    
  } catch (error) {
    console.error('❌ Exception updating user role status:', error)
    return false
  }
}

// 🎯 NEW: Helper function to check if user needs onboarding
export async function userNeedsOnboarding(userId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data, error } = await (supabase
      .from('user_roles') as any)
      .select('status, role_type, farm_id')
      .eq('user_id', userId)
      .single()
    
    if (error || !data) {
      return true // If no role found, needs onboarding
    }
    
    // Farm owners with pending_setup status need onboarding
    if (data.role_type === 'farm_owner' && data.status === 'pending_setup') {
      return true
    }
    
    // Farm owners without farm_id need onboarding
    if (data.role_type === 'farm_owner' && !data.farm_id) {
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error checking if user needs onboarding:', error)
    return true // Default to needing onboarding on error
  }
}