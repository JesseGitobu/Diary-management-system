import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

/**
 * GET /api/teams/farm-owner?farmId=...
 * Returns the farm owner(s) from user_roles with their auth metadata (email, full_name).
 * Uses the admin client to read auth.users metadata.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')

    if (!farmId) {
      return NextResponse.json({ error: 'farmId is required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const callerRole = await getUserRole(authData.user.id)
    if (!callerRole || callerRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all user_roles rows for this farm where role_type = 'farm_owner'
    const { data: ownerRoles, error: rolesError } = await (supabase as any)
      .from('user_roles')
      .select('id, user_id, role_type, created_at')
      .eq('farm_id', farmId)
      .eq('role_type', 'farm_owner')

    if (rolesError) {
      console.error('Error fetching farm owner roles:', rolesError)
      return NextResponse.json({ error: 'Failed to fetch farm owner' }, { status: 500 })
    }

    if (!ownerRoles || ownerRoles.length === 0) {
      return NextResponse.json([])
    }

    // Use admin client to read auth.users metadata for each owner
    const adminSupabase = createAdminClient()

    const owners = await Promise.all(
      ownerRoles.map(async (role: any) => {
        const { data: userData } = await adminSupabase.auth.admin.getUserById(role.user_id)
        const user = userData?.user
        const email = user?.email ?? ''
        const fullName =
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          email.split('@')[0] ||
          'Farm Owner'

        return {
          id: role.id,
          user_roles_id: role.id,
          user_id: role.user_id,
          email,
          full_name: fullName,
          role_type: 'farm_owner' as const,
          status: 'accepted' as const,
          sent_at: role.created_at,
          accepted_at: role.created_at,
          department_id: null,
        }
      })
    )

    return NextResponse.json(owners)
  } catch (error) {
    console.error('farm-owner GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
