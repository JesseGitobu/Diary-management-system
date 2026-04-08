// src/lib/database/departments.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface Department {
  id: string
  farm_id: string
  name: string
  description: string | null
  created_at: string | null
  updated_at: string | null
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

  return (data as Department[]) || []
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

  return (data as Department) || null
}

export async function createDepartment(
  farmId: string,
  name: string,
  description?: string
): Promise<Department | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('departments')
    .insert([
      {
        farm_id: farmId,
        name,
        description: description || null,
      }
    ])
    .select()
    .single()

  if (error) {
    console.error('Error creating department:', error)
    return null
  }

  return (data as Department) || null
}

export async function updateDepartment(
  id: string,
  updates: {
    name?: string
    description?: string
  }
): Promise<Department | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('departments')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating department:', error)
    return null
  }

  return (data as Department) || null
}

export async function deleteDepartment(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', id)

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
    .select(
      `
      id,
      name,
      description,
      created_at,
      updated_at,
      workers:workers(count)
    `
    )
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching departments with worker count:', error)
    return []
  }

  return data || []
}
