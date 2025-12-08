// src/app/api/onboarding/skip/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { updateUserRoleStatus } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      console.error('❌ Unauthorized: No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('🔍 User skipping onboarding:', user.id)
    
    const supabase = await createServerSupabaseClient()
    
    // Get current user status
    const { data: currentRoleResult, error: roleError } = await supabase
      .from('user_roles')
      .select('status, farm_id, role_type')
      .eq('user_id', user.id)
      .single()
    
    // Cast to any to fix "Property 'status' does not exist on type 'never'"
    const currentRole = currentRoleResult as any

    if (roleError || !currentRole) {
      console.error('❌ Error fetching user role:', roleError)
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }
    
    // Simply update the user's status to pending_setup without creating a farm
    // Cast supabase to any to fix "Argument of type ... is not assignable to parameter of type 'never'"
    const { error: updateError } = await (supabase as any)
      .from('user_roles')
      .update({
        status: 'pending_setup',
        // Explicitly set farm_id to null
        farm_id: null
      })
      .eq('user_id', user.id)
      .eq('role_type', 'farm_owner')
    
    if (updateError) {
      console.error('❌ Failed to update user status:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update user status',
        details: updateError.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Status updated to pending_setup',
      previousStatus: currentRole.status,
      newStatus: 'pending_setup',
      farmId: null
    })
    
  } catch (error) {
    console.error('❌ Skip onboarding API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}