// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createFarmOwnerProfile } from '@/lib/database/auth'
import { acceptInvitation } from '@/lib/database/team-invitation'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const invitationToken = searchParams.get('invitation')
  const next = searchParams.get('next') ?? '/'

  console.log('🔍 [CALLBACK] Initial params:', {
    hasTokenHash: !!token_hash,
    type,
    hasInvitation: !!invitationToken,
  })

  if (!token_hash || !type) {
    console.error('❌ [CALLBACK] Missing token_hash or type')
    return NextResponse.redirect(`${origin}/auth?error=invalid_callback`)
  }

  const supabase = await createServerSupabaseClient()
  
  try {
    // If a session already exists, skip OTP verification and route the user.
    const { data: currentSession, error: sessionError } = await supabase.auth.getUser()

    if (sessionError && !sessionError.message?.includes('AuthSessionMissingError')) {
      console.warn('⚠️ [CALLBACK] Error checking existing session:', sessionError.message)
    }

    if (currentSession?.user) {
      console.log('🔍 [CALLBACK] Existing session found, skipping OTP verification')
      const tokenToUse = invitationToken || currentSession.user.user_metadata?.invitation_token
      console.log('🔍 [CALLBACK] Looking for invitation token from existing session:', {
        urlToken: !!invitationToken,
        metadataToken: !!currentSession.user.user_metadata?.invitation_token,
      })

      const userRole = await ensureUserHasRole(currentSession.user, tokenToUse, supabase)
      if (!userRole) {
        console.error('❌ [CALLBACK] Failed to assign user role for existing session')
        return NextResponse.redirect(`${origin}/auth?error=role_assignment_failed`)
      }

      console.log('✅ [CALLBACK] User role assigned for existing session:', userRole)
      const redirectUrl = routeUserBasedOnStatus(currentSession.user, userRole, origin)
      console.log('🔍 [CALLBACK] Redirecting to:', redirectUrl.toString())
      return redirectUrl
    }

    // Email verification
    console.log('🔍 [CALLBACK] Attempting email verification...')
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })
    
    if (error) {
      console.error('❌ [CALLBACK] Email verification failed:', error.message)
      return NextResponse.redirect(`${origin}/auth?error=verification_failed&details=${encodeURIComponent(error.message)}`)
    }
    
    if (!data.user) {
      console.error('❌ [CALLBACK] No user returned from verification')
      return NextResponse.redirect(`${origin}/auth?error=no_user_returned`)
    }

    const userId = data.user.id
    const userEmail = data.user.email
    console.log('✅ [CALLBACK] Email verified successfully:', { userId, userEmail })

    // Check for invitation token
    const tokenToUse = invitationToken || data.user.user_metadata?.invitation_token
    console.log('🔍 [CALLBACK] Looking for invitation token:', { 
      urlToken: !!invitationToken,
      metadataToken: !!data.user.user_metadata?.invitation_token,
    })

    // Attempt to assign role
    const userRole = await ensureUserHasRole(data.user, tokenToUse, supabase)
    
    if (!userRole) {
      console.error('❌ [CALLBACK] Failed to assign user role')
      return NextResponse.redirect(`${origin}/auth?error=role_assignment_failed`)
    }

    console.log('✅ [CALLBACK] User role assigned:', userRole)

    // Route user based on their role and status
    const redirectUrl = routeUserBasedOnStatus(data.user, userRole, origin)
    console.log('🔍 [CALLBACK] Redirecting to:', redirectUrl.toString())
    return redirectUrl

  } catch (error) {
    console.error('❌ [CALLBACK] Exception:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(`${origin}/auth?error=auth_failed&details=${encodeURIComponent(errorMsg)}`)
  }
}

async function ensureUserHasRole(user: any, invitationToken: string | null, supabase: any) {
  try {
    console.log('🔍 [ENSURE_ROLE] Starting for user:', user.id)

    // Check if user already has a role
    const { data: existingRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role_type, farm_id, status')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (roleError) {
      console.error('❌ [ENSURE_ROLE] Error checking existing role:', roleError.message)
      return null
    }

    if (existingRole) {
      console.log('✅ [ENSURE_ROLE] User already has role:', existingRole)
      return existingRole
    }

    console.log('🔍 [ENSURE_ROLE] No existing role, proceeding with creation')

    // FIRST: Handle invitation flow
    if (invitationToken) {
      console.log('🔍 [ENSURE_ROLE] Processing invitation...')
      
      const result = await acceptInvitation(invitationToken, user.id)
      
      if (result.success) {
        console.log('✅ [ENSURE_ROLE] Invitation accepted')
        
        try {
          await supabase.auth.updateUser({
            data: {
              ...user.user_metadata,
              invitation_token: null
            }
          })
          console.log('✅ [ENSURE_ROLE] Cleared invitation token from metadata')
        } catch (clearError) {
          console.warn('⚠️ [ENSURE_ROLE] Could not clear token:', clearError)
        }
        
        return {
          role_type: result.roleType,
          farm_id: result.farmId,
          status: 'active'
        }
      } else {
        console.error('❌ [ENSURE_ROLE] Invitation acceptance failed:', result.error)
        return null
      }
    }

    // SECOND: Check if admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (adminError) {
      console.warn('⚠️ [ENSURE_ROLE] Error checking admin status:', adminError.message)
    }

    if (adminUser) {
      console.log('✅ [ENSURE_ROLE] User is admin')
      return {
        role_type: 'super_admin',
        farm_id: null,
        status: 'active'
      }
    }

    // THIRD: Create pending farm owner role
    console.log('🔍 [ENSURE_ROLE] Creating pending farm owner role...')
    const newRole = await createPendingFarmOwnerRole(user.id, supabase)
    
    if (newRole) {
      console.log('✅ [ENSURE_ROLE] Pending role created:', newRole)
      return newRole
    }

    console.error('❌ [ENSURE_ROLE] Failed to create pending role')
    return null
    
  } catch (error) {
    console.error('❌ [ENSURE_ROLE] Exception:', error)
    return null
  }
}

async function createPendingFarmOwnerRole(userId: string, supabase: any) {
  try {
    console.log('🔍 [CREATE_PENDING] Creating role for:', userId)
    
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
      console.error('❌ [CREATE_PENDING] Insert error:', error.message, error.details)
      return null
    }

    console.log('✅ [CREATE_PENDING] Role created:', data)
    return data
    
  } catch (error) {
    console.error('❌ [CREATE_PENDING] Exception:', error)
    return null
  }
}

function routeUserBasedOnStatus(user: any, userRole: any, origin: string): NextResponse {
  console.log('🔍 [ROUTE] Routing user:', {
    userId: user.id,
    roleType: userRole.role_type,
    status: userRole.status,
    farmId: userRole.farm_id
  })

  // Admin users
  if (userRole.role_type === 'super_admin') {
    console.log('✅ [ROUTE] Routing admin to admin dashboard')
    return NextResponse.redirect(`${origin}/admin/dashboard`)
  }

  // Active users with farm
  if (userRole.status === 'active' && userRole.farm_id) {
    if (userRole.role_type === 'farm_owner') {
      console.log('✅ [ROUTE] Routing farm owner to dashboard')
      return NextResponse.redirect(`${origin}/dashboard`)
    } else {
      console.log('✅ [ROUTE] Routing team member to dashboard')
      return NextResponse.redirect(`${origin}/dashboard?welcome=team`)
    }
  }

  // Pending setup
  if (userRole.status === 'pending_setup') {
    console.log('✅ [ROUTE] Routing to onboarding')
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  // Fallback
  if (userRole.role_type === 'farm_owner') {
    console.log('⚠️ [ROUTE] Unclear status, routing farm owner to onboarding')
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  console.log('⚠️ [ROUTE] Default routing to dashboard')
  return NextResponse.redirect(`${origin}/dashboard`)
}