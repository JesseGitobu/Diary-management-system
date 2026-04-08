// src/app/api/access-control/team-members/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAcceptedTeamMembers } from '@/lib/database/access-control'
import { getUserRole } from '@/lib/database/auth'

/**
 * GET /api/access-control/team-members
 * Get list of team members who have accepted invitations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')

    if (!farmId) {
      return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 })
    }

    console.log('🔍 [API] Fetching team members for farm:', farmId)

    const supabase = await createServerSupabaseClient()

    // Verify user has access to this farm
    const { data: user } = await supabase.auth.getUser()
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.user.id)

    if (!userRole || userRole.farm_id !== farmId || !['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      console.warn('⚠️ [API] User does not have permission to access this farm')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const teamMembers = await getAcceptedTeamMembers(farmId)

    console.log('✅ [API] Team members retrieved:', { count: teamMembers.length })
    return NextResponse.json(teamMembers)
  } catch (error) {
    console.error('❌ [API] Error fetching team members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
