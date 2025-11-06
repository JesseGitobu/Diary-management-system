// src/app/api/onboarding/complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { updateCompletionStatus } from '@/lib/database/onboarding'
import { updateUserRoleStatus } from '@/lib/database/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { userId } = body
    
    // Verify user can only complete their own onboarding
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    console.log('🔍 Completing onboarding for user:', userId)
    
    // 🎯 NEW: Complete onboarding setup with status update
    const success = await completeOnboardingSetup(userId)
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 400 })
    }
    
    console.log('✅ Onboarding completed successfully for user:', userId)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Onboarding completed successfully'
    })
    
  } catch (error) {
    console.error('Onboarding complete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 🎯 NEW: Complete onboarding setup function
async function completeOnboardingSetup(userId: string) {
  try {
    console.log('🔍 Starting onboarding completion process for user:', userId)
    
    // 1. Mark onboarding as completed in farm_profiles
    const profileSuccess = await updateCompletionStatus(userId, true)
    
    if (!profileSuccess) {
      console.error('❌ Failed to update completion status in farm_profiles')
      return false
    }
    
    console.log('✅ Farm profile completion status updated')
    
    // 🎯 NEW: 2. Update user_roles status to active
    const roleSuccess = await updateUserRoleStatus(userId, 'active')
    
    if (!roleSuccess) {
      console.error('❌ Failed to update user role status to active')
      return false
    }
    
    console.log('✅ User role status updated to active')
    
    return true
    
  } catch (error) {
    console.error('❌ Error completing onboarding setup:', error)
    return false
  }
}