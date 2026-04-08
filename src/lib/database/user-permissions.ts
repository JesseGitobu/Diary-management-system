// src/lib/database/user-permissions.ts
// Server-side helper: resolves a user's effective FarmPermissions.
//
// Resolution order:
//   1. Individual policy assigned via team_member_policy_assignments
//      → fetch its operation grants from policy_operation_grants
//   2. Role-type default policy for this farm
//      → fetch its operation grants
//   3. farm_owner or farm_manager with no policy → FULL_ACCESS_PERMISSIONS
//   4. Everyone else → NO_ACCESS_PERMISSIONS (deny by default)

import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  buildPermissions,
  FULL_ACCESS_PERMISSIONS,
  NO_ACCESS_PERMISSIONS,
  type FarmPermissions,
} from '@/lib/utils/permissions'

/**
 * Fetches operation grants for a policy and builds a FarmPermissions object.
 * Returns null if the policy has no grants or doesn't exist.
 */
async function buildPermissionsFromPolicy(
  supabase: any,
  policyId: string
): Promise<FarmPermissions | null> {
  const { data: grants, error } = await supabase
    .from('policy_operation_grants')
    .select('resource, operation_key')
    .eq('policy_id', policyId)

  if (error || !grants || grants.length === 0) return null

  // Group into { resource: operation_key[] }
  const operations: Record<string, string[]> = {}
  for (const grant of grants) {
    if (!operations[grant.resource]) operations[grant.resource] = []
    operations[grant.resource].push(grant.operation_key)
  }

  return buildPermissions(operations)
}

/**
 * Resolves the effective FarmPermissions for a user.
 *
 * @param userRoleId  - The `id` column from user_roles (not the auth user id)
 * @param farmId      - The farm the user belongs to
 * @param roleType    - The user's role_type (farm_owner, farm_manager, worker, veterinarian)
 */
export async function getUserPermissions(
  userRoleId: string,
  farmId: string,
  roleType: string
): Promise<FarmPermissions> {
  try {
    const supabase = await createServerSupabaseClient()

    // 1. Check for an individually assigned policy
    const { data: assignment } = await supabase
      .from('team_member_policy_assignments')
      .select('policy_id')
      .eq('farm_id', farmId)
      .eq('user_role_id', userRoleId)
      .maybeSingle()

    if (assignment?.policy_id) {
      // Verify the policy is active
      const { data: policy } = await supabase
        .from('access_control_policies')
        .select('id, is_granted')
        .eq('id', assignment.policy_id)
        .eq('is_granted', true)
        .maybeSingle()

      if (policy) {
        const perms = await buildPermissionsFromPolicy(supabase, policy.id)
        if (perms) return perms
      }
    }

    // 2. Fall back to the role-type default policy for this farm
    const { data: rolePolicy } = await supabase
      .from('access_control_policies')
      .select('id')
      .eq('farm_id', farmId)
      .eq('role_type', roleType as any)
      .eq('is_granted', true)
      .maybeSingle()

    if (rolePolicy?.id) {
      const perms = await buildPermissionsFromPolicy(supabase, rolePolicy.id)
      if (perms) return perms
    }

    // 3. Farm owners and farm managers get full access if no policy row exists yet
    if (roleType === 'farm_owner' || roleType === 'farm_manager') return FULL_ACCESS_PERMISSIONS

    // 4. Everyone else: deny by default
    return NO_ACCESS_PERMISSIONS

  } catch (error) {
    console.error('❌ [getUserPermissions] Error:', error)
    const isAdmin = roleType === 'farm_owner' || roleType === 'farm_manager'
    return isAdmin ? FULL_ACCESS_PERMISSIONS : NO_ACCESS_PERMISSIONS
  }
}
