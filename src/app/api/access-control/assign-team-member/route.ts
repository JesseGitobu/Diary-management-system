// src/app/api/access-control/assign-team-member/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { assignPolicyToTeamMember } from '@/lib/database/access-control'

/**
 * POST /api/access-control/assign-team-member
 * Assign or revoke an access control policy for a team member
 * One policy per team member (exclusive assignment)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { farmId, teamMemberId, policyId } = body

    console.log('🔍 [API] Assigning policy to team member:', { farmId, teamMemberId, policyId })

    if (!farmId || !teamMemberId) {
      return NextResponse.json(
        { error: 'Farm ID and team member ID are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Verify user has access to this farm (must be farm_owner or farm_manager)
    const { data: user } = await supabase.auth.getUser()
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('farm_id', farmId)
      .eq('user_id', user.user.id)
      .single()

    if (roleError || !userRole || !['farm_owner', 'farm_manager'].includes((userRole as any)?.role_type)) {
      console.warn('⚠️ [API] User does not have permission to manage policies for this farm:', {
        userId: user.user.id,
        farmId,
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If policyId is provided, verify it exists and belongs to this farm
    if (policyId) {
      const { data: policy, error: policyCheckError } = await supabase
        .from('access_control_policies')
        .select('id')
        .eq('id', policyId)
        .eq('farm_id', farmId)
        .single()

      if (policyCheckError || !policy) {
        console.warn('⚠️ [API] Policy not found or does not belong to this farm:', { policyId, farmId })
        return NextResponse.json(
          { error: 'Policy not found or does not belong to this farm' },
          { status: 404 }
        )
      }
    }

    // Assign the policy
    const result = await assignPolicyToTeamMember(farmId, teamMemberId, policyId || null)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    console.log('✅ [API] Policy assignment successful')
    return NextResponse.json({
      success: true,
      message: policyId ? 'Policy assigned successfully' : 'Policy revoked successfully',
    })
  } catch (error) {
    console.error('❌ [API] Error assigning policy:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
