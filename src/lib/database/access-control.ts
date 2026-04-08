// src/lib/database/access-control.ts

import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'

export type AccessResource =
  | 'animals' | 'health' | 'production' | 'breeding' | 'financial'
  | 'inventory' | 'equipment' | 'reports' | 'feed' | 'team' | 'dashboard' | 'settings'

export type ActionCategory = 'view' | 'create' | 'edit' | 'delete' | 'export'

export type UserRole = 'farm_owner' | 'farm_manager' | 'worker' | 'veterinarian' | 'super_admin'

export const VALID_RESOURCES: AccessResource[] = [
  'animals', 'health', 'production', 'breeding', 'financial',
  'inventory', 'equipment', 'reports', 'feed', 'team', 'dashboard', 'settings',
]
export const VALID_ACTION_CATEGORIES: ActionCategory[] = ['view', 'create', 'edit', 'delete', 'export']
export const VALID_ROLES: UserRole[] = ['farm_owner', 'farm_manager', 'worker', 'veterinarian', 'super_admin']

// ─── Types ────────────────────────────────────────────────────────────────────

/** One row from resource_operations — the master catalogue */
export interface ResourceOperation {
  resource: string
  operation_key: string
  action_category: string
  label: string
  description?: string | null
  sort_order: number
  is_active: boolean
}

/** Policy metadata + its granted operations */
export interface AccessControlPolicy {
  id: string
  farm_id: string
  name: string
  role_type: UserRole
  is_granted: boolean
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  /** Granted operations grouped by resource: { animals: ['view_list', 'add_newborn'] } */
  operations: Record<string, string[]>
}

/** Input for creating a new policy */
export interface CreateAccessControlInput {
  name: string
  role_type: UserRole
  /** Operations to grant: { animals: ['view_list', 'add_newborn'], health: ['view_records'] } */
  operations: Record<string, string[]>
  is_granted?: boolean
  description?: string | null
}

/** Input for updating an existing policy */
export interface UpdateAccessControlInput {
  name?: string
  operations?: Record<string, string[]>
  is_granted?: boolean
  description?: string | null
}

export interface AcceptedTeamMember {
  id: string
  user_id: string
  email: string
  full_name: string
  role_type: UserRole
  accepted_at: string
  user_roles_id?: string
  assigned_policy_id?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Attaches operations to policies by joining policy_operation_grants.
 * Returns a map of policyId → { resource: operation_key[] }
 */
async function fetchOperationsForPolicies(
  supabase: any,
  policyIds: string[]
): Promise<Record<string, Record<string, string[]>>> {
  if (policyIds.length === 0) return {}

  const { data: grants, error } = await supabase
    .from('policy_operation_grants')
    .select('policy_id, resource, operation_key')
    .in('policy_id', policyIds)

  if (error || !grants) return {}

  const result: Record<string, Record<string, string[]>> = {}
  for (const grant of grants) {
    if (!result[grant.policy_id]) result[grant.policy_id] = {}
    if (!result[grant.policy_id][grant.resource]) result[grant.policy_id][grant.resource] = []
    result[grant.policy_id][grant.resource].push(grant.operation_key)
  }
  return result
}

/**
 * Validates that all operation_keys exist in the resource_operations catalogue.
 * Returns error string or null if valid.
 */
function validateOperations(operations: Record<string, string[]>): string | null {
  if (!operations || typeof operations !== 'object' || Array.isArray(operations)) {
    return 'operations must be an object mapping resources to operation key arrays'
  }
  if (Object.keys(operations).length === 0) {
    return 'At least one resource with operations must be provided'
  }
  for (const [resource, keys] of Object.entries(operations)) {
    if (!VALID_RESOURCES.includes(resource as AccessResource)) {
      return `Invalid resource: "${resource}". Must be one of: ${VALID_RESOURCES.join(', ')}`
    }
    if (!Array.isArray(keys) || keys.length === 0) {
      return `Resource "${resource}" must have at least one operation key`
    }
  }
  return null
}

// ─── Exported DB Functions ────────────────────────────────────────────────────

/** Get all accepted team members for a farm with their assigned policy */
export async function getAcceptedTeamMembers(farmId: string): Promise<AcceptedTeamMember[]> {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: invitationData, error: invError } = await supabase
      .from('farm_invitations')
      .select('id, email, full_name, role_type, accepted_at')
      .eq('farm_id', farmId)
      .eq('status', 'accepted')
      .not('accepted_at', 'is', null)
      .order('accepted_at', { ascending: false })

    if (invError) {
      console.error('❌ Error fetching accepted team members:', invError)
      return []
    }

    const acceptedInvitationIds = (invitationData || []).map((inv: any) => inv.id)
    let userRolesByInvitationId: Record<string, any> = {}

    if (acceptedInvitationIds.length > 0) {
      const { data: userRolesData } = await (supabase as any)
        .from('user_roles')
        .select('id, user_id, invitation_id')
        .in('invitation_id', acceptedInvitationIds)

      userRolesByInvitationId = (userRolesData || []).reduce((acc: any, ur: any) => {
        acc[ur.invitation_id] = ur
        return acc
      }, {})
    }

    const { data: policyAssignments } = await (supabase as any)
      .from('team_member_policy_assignments')
      .select('user_role_id, policy_id')
      .eq('farm_id', farmId)

    const teamMembers = (invitationData || []).map((inv: any) => {
      const userRole = userRolesByInvitationId[inv.id]
      if (!userRole) return null

      const policyAssignment = (policyAssignments || []).find(
        (pa: any) => pa.user_role_id === userRole.id
      )

      return {
        id: `${inv.email}-${inv.role_type}`,
        user_id: userRole.user_id,
        email: inv.email,
        full_name: inv.full_name,
        role_type: inv.role_type,
        accepted_at: inv.accepted_at,
        user_roles_id: userRole.id,
        assigned_policy_id: policyAssignment?.policy_id || null,
      }
    }).filter(Boolean)

    return teamMembers as AcceptedTeamMember[]
  } catch (error) {
    console.error('❌ Exception fetching team members:', error)
    return []
  }
}

/** Get all access control policies for a farm (includes operations) */
export async function getAccessControlPolicies(farmId: string): Promise<AccessControlPolicy[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('access_control_policies')
    .select('id, farm_id, name, role_type, is_granted, description, created_by, created_at, updated_at')
    .eq('farm_id', farmId)
    .order('role_type', { ascending: true })
    .order('name', { ascending: true })

  if (error || !data) {
    console.error('❌ Error fetching access control policies:', error)
    return []
  }

  const policyIds = data.map((p: any) => p.id)
  const operationsMap = await fetchOperationsForPolicies(supabase, policyIds)

  return data.map((p: any) => ({
    ...p,
    operations: operationsMap[p.id] ?? {},
  })) as AccessControlPolicy[]
}

/** Create a new access control policy with its operation grants */
export async function createAccessControlPolicy(
  farmId: string,
  input: CreateAccessControlInput
): Promise<{ policy: AccessControlPolicy | null; error: string | null }> {
  const supabase = await createServerSupabaseClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return { policy: null, error: 'Unauthorized' }

  if (!VALID_ROLES.includes(input.role_type)) {
    return { policy: null, error: `Invalid role type: ${input.role_type}` }
  }

  const opsError = validateOperations(input.operations)
  if (opsError) return { policy: null, error: opsError }

  // Insert policy metadata
  const { data: newPolicy, error: insertError } = await (supabase
    .from('access_control_policies') as any)
    .insert([{
      farm_id: farmId,
      name: input.name,
      role_type: input.role_type,
      is_granted: input.is_granted ?? true,
      description: input.description || null,
      created_by: user.user.id,
    }])
    .select('id, farm_id, name, role_type, is_granted, description, created_by, created_at, updated_at')
    .single()

  if (insertError) {
    console.error('❌ [CREATE_POLICY] Insert error:', insertError)
    return {
      policy: null,
      error: insertError.message.includes('duplicate')
        ? 'A policy with this name already exists for this role'
        : 'Failed to create access control policy',
    }
  }

  // Insert operation grants
  const grants = Object.entries(input.operations).flatMap(([resource, keys]) =>
    keys.map(operation_key => ({
      policy_id: newPolicy.id,
      resource,
      operation_key,
    }))
  )

  if (grants.length > 0) {
    const { error: grantsError } = await (supabase as any)
      .from('policy_operation_grants')
      .insert(grants)

    if (grantsError) {
      console.error('❌ [CREATE_POLICY] Grants insert error:', grantsError)
      // Rollback: delete the policy we just created
      await (supabase as any).from('access_control_policies').delete().eq('id', newPolicy.id)
      return { policy: null, error: 'Failed to save policy operations. Some operation keys may be invalid.' }
    }
  }

  return {
    policy: { ...newPolicy, operations: input.operations },
    error: null,
  }
}

/** Update an existing policy's metadata and/or operation grants */
export async function updateAccessControlPolicy(
  policyId: string,
  farmId: string,
  input: UpdateAccessControlInput
): Promise<{ policy: AccessControlPolicy | null; error: string | null }> {
  const supabase = await createServerSupabaseClient()

  if (Object.keys(input).length === 0) {
    return { policy: null, error: 'No updates provided' }
  }

  if (input.operations) {
    const opsError = validateOperations(input.operations)
    if (opsError) return { policy: null, error: opsError }
  }

  // Update policy metadata
  const metaUpdate: any = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) metaUpdate.name = input.name
  if (input.is_granted !== undefined) metaUpdate.is_granted = input.is_granted
  if (input.description !== undefined) metaUpdate.description = input.description

  const { data: updatedPolicy, error: updateError } = await (supabase
    .from('access_control_policies') as any)
    .update(metaUpdate)
    .eq('id', policyId)
    .eq('farm_id', farmId)
    .select('id, farm_id, name, role_type, is_granted, description, created_by, created_at, updated_at')
    .single()

  if (updateError) {
    console.error('❌ [UPDATE_POLICY] Error:', updateError)
    return { policy: null, error: 'Failed to update access control policy' }
  }

  // Replace operation grants if provided
  if (input.operations) {
    // Delete all existing grants for this policy
    await (supabase as any)
      .from('policy_operation_grants')
      .delete()
      .eq('policy_id', policyId)

    // Insert new grants
    const grants = Object.entries(input.operations).flatMap(([resource, keys]) =>
      keys.map(operation_key => ({ policy_id: policyId, resource, operation_key }))
    )

    if (grants.length > 0) {
      const { error: grantsError } = await (supabase as any)
        .from('policy_operation_grants')
        .insert(grants)

      if (grantsError) {
        console.error('❌ [UPDATE_POLICY] Grants error:', grantsError)
        return { policy: null, error: 'Failed to update policy operations' }
      }
    }
  }

  // Fetch final operations state
  const operationsMap = await fetchOperationsForPolicies(supabase, [policyId])

  return {
    policy: { ...updatedPolicy, operations: operationsMap[policyId] ?? input.operations ?? {} },
    error: null,
  }
}

/** Delete a policy (cascade deletes its grants via FK) */
export async function deleteAccessControlPolicy(
  policyId: string,
  farmId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createServerSupabaseClient()

  const { error } = await (supabase
    .from('access_control_policies') as any)
    .delete()
    .eq('id', policyId)
    .eq('farm_id', farmId)

  if (error) {
    console.error('❌ [DELETE_POLICY] Error:', error)
    return { success: false, error: 'Failed to delete access control policy' }
  }

  return { success: true, error: null }
}

/** Initialize default policies for a new farm */
export async function initializeDefaultPolicies(farmId: string, userId: string): Promise<boolean> {
  try {
    const adminSupabase = createAdminClient()

    const defaults: CreateAccessControlInput[] = [
      {
        name: 'Farm Owner Full Access',
        role_type: 'farm_owner',
        is_granted: true,
        operations: {
          animals:    ['view_list','view_stats','view_profile','view_overview_tab','view_health_tab','view_breeding_tab','view_production_tab','view_feeding_tab','view_timeline','add_newborn','add_purchased','import','edit_profile','update_weight','update_status','release','manage_categories','export'],
          health:     ['view_records','view_stats','view_vaccinations','view_veterinarians','view_protocols','view_outbreaks','view_vet_visits','add_record','report_issue','add_vet','schedule_vet_visit','record_vaccination','open_outbreak','edit_record','edit_vet','manage_protocols','update_outbreak','delete_record','delete_vet','export'],
          production: ['view_records','view_stats','view_charts','view_distribution','view_quality','record_yield','add_session','edit_record','edit_session','set_targets','configure_distribution','delete_record','delete_session','export'],
          breeding:   ['view_overview','view_calendar','view_pregnant','record_heat','record_insemination','record_pregnancy_check','record_calving','register_calf','edit_record','configure_settings','delete_record','export'],
          financial:  ['view_dashboard','view_transactions','view_charts','add_income','add_expense','edit_transaction','configure_categories','delete_transaction','export'],
          inventory:  ['view_items','view_stats','view_suppliers','view_low_stock','add_item','add_supplier','edit_item','adjust_stock','edit_supplier','delete_item','delete_supplier','export'],
          equipment:  ['view_list','view_stats','view_maintenance','add_equipment','schedule_maintenance','edit_equipment','edit_maintenance','delete_equipment','delete_maintenance','export'],
          reports:    ['view_overview','view_kpi','view_trends','view_custom','export_pdf','export_excel'],
          feed:       ['view_overview','view_inventory','view_consumption','view_types','record_consumption','add_feed_type','add_feeding_group','edit_feed_type','edit_feeding_group','delete_feed_type','delete_feeding_group','export'],
          team:       ['view_members','view_departments','view_invitations','view_policies','view_system_users','view_stats','add_worker','add_department','send_invitation','create_policy','edit_worker','edit_department','assign_policy','edit_policy','delete_worker','delete_department','cancel_invitation','delete_policy'],
          dashboard:  ['view_stats','view_alerts','view_activity','view_management_cards','view_team_panel'],
          settings:   ['view_hub','create_backup','edit_farm_profile','configure_tagging','configure_production','configure_feed','configure_health_breeding','configure_notifications','configure_financial','manage_subscription','download_backup'],
        },
      },
      {
        name: 'Farm Manager Full Access',
        role_type: 'farm_manager',
        is_granted: true,
        operations: {
          animals:    ['view_list','view_stats','view_profile','view_overview_tab','view_health_tab','view_breeding_tab','view_production_tab','view_feeding_tab','view_timeline','add_newborn','add_purchased','import','edit_profile','update_weight','update_status','release','manage_categories','export'],
          health:     ['view_records','view_stats','view_vaccinations','view_veterinarians','view_protocols','view_outbreaks','view_vet_visits','add_record','report_issue','add_vet','schedule_vet_visit','record_vaccination','open_outbreak','edit_record','edit_vet','manage_protocols','update_outbreak','delete_record','delete_vet','export'],
          production: ['view_records','view_stats','view_charts','view_distribution','view_quality','record_yield','add_session','edit_record','edit_session','set_targets','configure_distribution','delete_record','delete_session','export'],
          breeding:   ['view_overview','view_calendar','view_pregnant','record_heat','record_insemination','record_pregnancy_check','record_calving','register_calf','edit_record','configure_settings','delete_record','export'],
          financial:  ['view_dashboard','view_transactions','view_charts','add_income','add_expense','edit_transaction','configure_categories','delete_transaction','export'],
          inventory:  ['view_items','view_stats','view_suppliers','view_low_stock','add_item','add_supplier','edit_item','adjust_stock','edit_supplier','delete_item','delete_supplier','export'],
          equipment:  ['view_list','view_stats','view_maintenance','add_equipment','schedule_maintenance','edit_equipment','edit_maintenance','delete_equipment','delete_maintenance','export'],
          reports:    ['view_overview','view_kpi','view_trends','view_custom','export_pdf','export_excel'],
          feed:       ['view_overview','view_inventory','view_consumption','view_types','record_consumption','add_feed_type','add_feeding_group','edit_feed_type','edit_feeding_group','delete_feed_type','delete_feeding_group','export'],
          team:       ['view_members','view_departments','view_invitations','view_policies','view_system_users','view_stats'],
          dashboard:  ['view_stats','view_alerts','view_activity','view_management_cards','view_team_panel'],
          settings:   ['view_hub'],
        },
      },
      {
        name: 'Worker Operations',
        role_type: 'worker',
        is_granted: true,
        operations: {
          animals:    ['view_list','view_stats','view_profile','view_overview_tab','view_health_tab','view_production_tab','view_timeline','add_newborn','add_purchased','update_weight','update_status'],
          health:     ['view_records','view_stats','view_vaccinations','add_record','record_vaccination'],
          production: ['view_records','view_stats','view_charts','record_yield'],
          breeding:   ['view_overview','view_calendar','view_pregnant'],
          dashboard:  ['view_stats','view_alerts','view_activity','view_management_cards'],
        },
      },
      {
        name: 'Veterinarian Health & Reports',
        role_type: 'veterinarian',
        is_granted: true,
        operations: {
          animals:    ['view_list','view_stats','view_profile','view_overview_tab','view_health_tab','view_timeline'],
          health:     ['view_records','view_stats','view_vaccinations','view_veterinarians','view_protocols','view_outbreaks','view_vet_visits','add_record','report_issue','add_vet','schedule_vet_visit','record_vaccination','open_outbreak','edit_record','edit_vet','manage_protocols','update_outbreak','delete_record','delete_vet','export'],
          reports:    ['view_overview','view_kpi','view_trends','view_custom','export_pdf','export_excel'],
          dashboard:  ['view_stats','view_alerts','view_activity','view_management_cards'],
        },
      },
    ]

    for (const policy of defaults) {
      // Insert policy
      const { data: inserted, error: pErr } = await (adminSupabase
        .from('access_control_policies') as any)
        .insert([{
          farm_id: farmId,
          name: policy.name,
          role_type: policy.role_type,
          is_granted: true,
          created_by: userId,
        }])
        .select('id')
        .single()

      if (pErr || !inserted) {
        console.error('❌ [INIT_POLICIES] Error inserting policy:', policy.name, pErr)
        continue
      }

      // Insert grants
      const grants = Object.entries(policy.operations).flatMap(([resource, keys]) =>
        keys.map(operation_key => ({ policy_id: inserted.id, resource, operation_key }))
      )

      const { error: gErr } = await (adminSupabase as any)
        .from('policy_operation_grants')
        .insert(grants)

      if (gErr) console.error('❌ [INIT_POLICIES] Error inserting grants for:', policy.name, gErr)
    }

    console.log('✅ [INIT_POLICIES] Default policies created for farm:', farmId)
    return true
  } catch (error) {
    console.error('❌ [INIT_POLICIES] Exception:', error)
    return false
  }
}

/** Assign a policy to a team member (one policy per member) */
export async function assignPolicyToTeamMember(
  farmId: string,
  teamMemberId: string,
  policyId: string | null
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createServerSupabaseClient()

  try {
    if (policyId === null) {
      const { error } = await (supabase as any)
        .from('team_member_policy_assignments')
        .delete()
        .eq('farm_id', farmId)
        .eq('user_role_id', teamMemberId)

      if (error) return { success: false, error: 'Failed to revoke policy' }
      return { success: true, error: null }
    }

    // Delete any existing assignment first
    await (supabase as any)
      .from('team_member_policy_assignments')
      .delete()
      .eq('farm_id', farmId)
      .eq('user_role_id', teamMemberId)

    const { error: insertError } = await (supabase as any)
      .from('team_member_policy_assignments')
      .insert({ farm_id: farmId, user_role_id: teamMemberId, policy_id: policyId })

    if (insertError) {
      return {
        success: false,
        error: insertError.message.includes('duplicate')
          ? 'Policy already assigned'
          : 'Failed to assign policy',
      }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('❌ [ASSIGN_POLICY] Exception:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/** Revoke a policy from a team member */
export async function revokePolicyFromTeamMember(
  farmId: string,
  teamMemberId: string
): Promise<{ success: boolean; error: string | null }> {
  return assignPolicyToTeamMember(farmId, teamMemberId, null)
}
