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
        
        // FIRST: Handle invitation flow if invitation token exists
        if (tokenToUse) {
          console.log('🔍 Processing team member invitation:', tokenToUse)
          
          const result = await acceptInvitation(tokenToUse, data.user.id)
          
          if (result.success) {
            console.log('✅ Team member invitation accepted successfully')
            
            // Clear the invitation token from user metadata after successful acceptance
            try {
              await supabase.auth.updateUser({
                data: {
                  ...data.user.user_metadata,
                  invitation_token: null  // Clear the token
                }
              })
              console.log('✅ Invitation token cleared from user metadata')
            } catch (clearError) {
              console.log('⚠️ Could not clear invitation token from metadata:', clearError)
            }
            
            return NextResponse.redirect(`${origin}/dashboard?welcome=team&farm=${result.farmId}&role=${result.roleType}`)
          } else {
            console.error('❌ Failed to accept invitation:', result.error)
            return NextResponse.redirect(`${origin}/auth?error=invitation_failed&message=${encodeURIComponent(result.error ?? '')}`)
          }
        }
        
        // SECOND: Check if user already has a role (existing user)
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('role_type, farm_id')
          .eq('user_id', data.user.id)
          .single()
        
        if (existingRole) {
          console.log('🔍 Existing user found, redirecting to dashboard')
          return NextResponse.redirect(`${origin}/dashboard`)
        }
        
        // THIRD: Check if user is admin
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', data.user.id)
          .single()
        
        if (adminUser) {
          console.log('🔍 Admin user detected, redirecting to admin dashboard')
          return NextResponse.redirect(`${origin}/admin/dashboard`)
        }
        
        // LAST: Only create farm owner if no invitation token AND no existing role
        console.log('🔍 Creating new farm owner profile for user without invitation')
        const result = await createFarmOwnerProfile(data.user.id, data.user.email!)
        console.log('Farm owner profile creation result:', result)
        
        if (result.success) {
          return NextResponse.redirect(`${origin}/onboarding`)
        } else {
          console.error('❌ Failed to create farm owner profile:', result.error)
          return NextResponse.redirect(`${origin}/auth?error=setup_failed`)
        }
      }
    } catch (error) {
      console.error('❌ Auth callback error:', error)
      return NextResponse.redirect(`${origin}/auth?error=auth_failed`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth?error=invalid_callback`)
}