import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface DepartmentUser {
  id: string
  full_name: string | null
  email: string | null
  role_type: string | null
}

export interface Department {
  id: string
  farm_id: string
  name: string
  description: string | null
  created_at: string | null
  updated_at: string | null
  created_by: string | null
  updated_by: string | null
  // Joined fields
  created_by_user?: DepartmentUser | null
  updated_by_user?: DepartmentUser | null
}

// Internal helper: enriches raw department rows with creator/updater info


async function enrichDepartmentsWithUsers(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  departments: any[]
): Promise<Department[]> {
  if (!departments.length) return []

  const userIds = [
    ...new Set(
      departments
        .flatMap((d) => [d.created_by, d.updated_by])
        .filter(Boolean) as string[]
    ),
  ]

  if (!userIds.length) return departments as Department[]

  // Step 1: Get role_type from user_roles (public schema — no RLS issues)
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role_type')
    .in('user_id', userIds)

  if (rolesError) {
    console.error('Error fetching user roles for departments:', rolesError)
    return departments as Department[]
  }

  // Step 2: Get full_name + email from auth.users via the admin RPC
  // auth.users is not directly queryable via PostgREST join — use rpc or
  // fall back to user_metadata stored in user_roles invitation join
  const { data: authUsers, error: authError } = await supabase
    .rpc('get_users_by_ids', { user_ids: userIds })

  // Build role map
  const roleMap = new Map<string, string>()
  for (const row of userRoles || []) {
    roleMap.set(row.user_id, row.role_type)
  }

  // Build user map
  const userMap = new Map<string, DepartmentUser>()

  if (authError || !authUsers) {
    // Fallback: use only role info, no names
    console.warn('Could not fetch auth users, showing partial info:', authError)
    for (const uid of userIds) {
      userMap.set(uid, {
        id: uid,
        full_name: null,
        email: null,
        role_type: roleMap.get(uid) ?? null,
      })
    }
  } else {
    for (const authUser of authUsers) {
      userMap.set(authUser.id, {
        id: authUser.id,
        full_name: authUser.full_name ?? null,
        email: authUser.email ?? null,
        role_type: roleMap.get(authUser.id) ?? null,
      })
    }
  }

  return departments.map((dept) => ({
    ...dept,
    created_by_user: dept.created_by ? (userMap.get(dept.created_by) ?? null) : null,
    updated_by_user: dept.updated_by ? (userMap.get(dept.updated_by) ?? null) : null,
  }))
}

export async function getDepartments(farmId: string): Promise<Department[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching departments:', error)
    return []
  }

  return enrichDepartmentsWithUsers(supabase, data || [])
}

export async function getDepartmentById(id: string): Promise<Department | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching department:', error)
    return null
  }

  const [enriched] = await enrichDepartmentsWithUsers(supabase, [data])
  return enriched ?? null
}

export async function createDepartment(
  farmId: string,
  name: string,
  createdBy: string,
  description?: string
): Promise<Department | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('departments')
    .insert([{
      farm_id: farmId,
      name,
      description: description || null,
      created_by: createdBy,
      updated_by: createdBy,
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating department:', error)
    return null
  }

  const [enriched] = await enrichDepartmentsWithUsers(supabase, [data])
  return enriched ?? null
}

export async function updateDepartment(
  id: string,
  farmId: string,
  updatedBy: string,
  updates: { name?: string; description?: string }
): Promise<Department | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('departments')
    .update({
      ...updates,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('farm_id', farmId)
    .select()
    .single()

  if (error) {
    console.error('Error updating department:', error)
    return null
  }

  const [enriched] = await enrichDepartmentsWithUsers(supabase, [data])
  return enriched ?? null
}

export async function deleteDepartment(id: string, farmId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', id)
    .eq('farm_id', farmId)

  if (error) {
    console.error('Error deleting department:', error)
    return false
  }

  return true
}

export async function getDepartmentsByFarmWithWorkerCount(farmId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('departments')
    .select(`
      id,
      name,
      description,
      created_at,
      updated_at,
      created_by,
      updated_by,
      workers:workers(count)
    `)
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching departments with worker count:', error)
    return []
  }

  return enrichDepartmentsWithUsers(supabase, data || [])
}