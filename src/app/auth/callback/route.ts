// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createFarmOwnerProfile } from '@/lib/database/auth'
import { acceptInvitation } from '@/lib/database/team'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const invitationToken = searchParams.get('invitation')
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createServerSupabaseClient()
    
    try {
      // Email verification
      const { data, error } = await supabase.auth.verifyOtp({
        type: type as any,
        token_hash,
      })
      
      if (error) {
        console.error('Email verification error:', error)
        return NextResponse.redirect(`${origin}/auth?error=verification_failed`)
      }
      
      if (data.user) {
        // Check for invitation token from URL or user metadata
        const tokenToUse = invitationToken || data.user.user_metadata?.invitation_token
        
        console.log('🔍 User verified, checking flow type...', {
          userId: data.user.id,
          email: data.user.email,
          hasInvitationTokenURL: !!invitationToken,
          hasInvitationTokenMetadata: !!data.user.user_metadata?.invitation_token,
          tokenToUse: tokenToUse,
          userMetadata: data.user.user_metadata
        })
        
        // 🎯 NEW: Ensure user has a role immediately after verification
        const userRole = await ensureUserHasRole(data.user, tokenToUse, supabase)
        
        if (!userRole) {
          console.error('❌ Failed to assign user role')
          return NextResponse.redirect(`${origin}/auth?error=role_assignment_failed`)
        }
        
        // Route user based on their role and status
        return routeUserBasedOnStatus(data.user, userRole, origin)
      }
    } catch (error) {
      console.error('❌ Auth callback error:', error)
      return NextResponse.redirect(`${origin}/auth?error=auth_failed`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth?error=invalid_callback`)
}

// 🎯 NEW: Ensure user has a role immediately after email verification
async function ensureUserHasRole(user: any, invitationToken: string | null, supabase: any) {
  try {
    // Check if user already has a role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('role_type, farm_id, status')
      .eq('user_id', user.id)
      .single()
    
    if (existingRole) {
      console.log('🔍 User already has role:', existingRole)
      return existingRole
    }
    
    // FIRST: Handle invitation flow if invitation token exists
    if (invitationToken) {
      console.log('🔍 Processing team member invitation:', invitationToken)
      
      const result = await acceptInvitation(invitationToken, user.id)
      
      if (result.success) {
        console.log('✅ Team member invitation accepted successfully')
        
        // Clear the invitation token from user metadata after successful acceptance
        try {
          await supabase.auth.updateUser({
            data: {
              ...user.user_metadata,
              invitation_token: null  // Clear the token
            }
          })
          console.log('✅ Invitation token cleared from user metadata')
        } catch (clearError) {
          console.log('⚠️ Could not clear invitation token from metadata:', clearError)
        }
        
        // Return the team member role
        return {
          role_type: result.roleType,
          farm_id: result.farmId,
          status: 'active'
        }
      } else {
        console.error('❌ Failed to accept invitation:', result.error)
        return null
      }
    }
    
    // SECOND: Check if user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (adminUser) {
      console.log('🔍 Admin user detected')
      // Admins don't need user_roles entry, return special admin role
      return {
        role_type: 'super_admin',
        farm_id: null,
        status: 'active'
      }
    }
    
    // THIRD: 🎯 NEW - Assign farm_owner role immediately (pending setup)
    console.log('🔍 Creating pending farm owner role for new user')
    const newRole = await createPendingFarmOwnerRole(user.id, supabase)
    
    if (newRole) {
      console.log('✅ Pending farm owner role created:', newRole)
      return newRole
    }
    
    return null
    
  } catch (error) {
    console.error('❌ Error ensuring user has role:', error)
    return null
  }
}

// 🎯 NEW: Create pending farm owner role immediately
async function createPendingFarmOwnerRole(userId: string, supabase: any) {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_type: 'farm_owner',
        status: 'pending_setup',
        farm_id: null
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error creating pending farm owner role:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('❌ Exception creating pending farm owner role:', error)
    return null
  }
}

// 🎯 NEW: Route user based on role and status
function routeUserBasedOnStatus(user: any, userRole: any, origin: string) {
  console.log('🔍 Routing user based on status:', {
    userId: user.id,
    roleType: userRole.role_type,
    status: userRole.status,
    farmId: userRole.farm_id
  })
  
  // Handle admin users
  if (userRole.role_type === 'super_admin') {
    console.log('🔍 Redirecting admin to admin dashboard')
    return NextResponse.redirect(`${origin}/admin/dashboard`)
  }
  
  // Handle team members (active status with farm)
  if (userRole.status === 'active' && userRole.farm_id) {
    if (userRole.role_type === 'farm_owner') {
      console.log('🔍 Redirecting active farm owner to dashboard')
      return NextResponse.redirect(`${origin}/dashboard`)
    } else {
      // Team member
      console.log('🔍 Redirecting team member to dashboard')
      return NextResponse.redirect(`${origin}/dashboard?welcome=team&farm=${userRole.farm_id}&role=${userRole.role_type}`)
    }
  }
  
  // Handle pending setup (farm owners who haven't completed onboarding)
  if (userRole.status === 'pending_setup') {
    console.log('🔍 Redirecting to onboarding for pending setup')
    return NextResponse.redirect(`${origin}/onboarding`)
  }
  
  // Handle edge cases - users with role but no clear status
  if (userRole.role_type === 'farm_owner') {
    console.log('🔍 Farm owner with unclear status, redirecting to onboarding')
    return NextResponse.redirect(`${origin}/onboarding`)
  } else {
    console.log('🔍 Team member with unclear status, redirecting to dashboard')
    return NextResponse.redirect(`${origin}/dashboard`)
  }
}