import { createServerSupabaseClient } from '@/lib/supabase/server'

export type EmploymentStatus = 'full_time' | 'part_time' | 'casual' | 'contract'
export type WorkerPosition = 'farm_manager' | 'worker' | 'veterinarian' | 'other'

export interface Worker {
  id: string
  farm_id: string
  name: string
  worker_number: string
  employment_status: EmploymentStatus
  position: string // Flexible field to accommodate custom positions or enum values
  shift: string | null
  department_id: string | null
  casual_rate: number | null
  created_at: string
  updated_at: string
}

export interface CreateWorkerInput {
  name: string
  worker_number: string
  employment_status: EmploymentStatus
  position: string
  shift?: string | null
  department_id?: string | null
  casual_rate?: number | null
}

export interface UpdateWorkerInput {
  name?: string
  worker_number?: string
  employment_status?: EmploymentStatus
  position?: string
  shift?: string | null
  department_id?: string | null
  casual_rate?: number | null
}

export async function getWorkers(farmId: string): Promise<Worker[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching workers:', error)
    return []
  }

  return (data as Worker[]) || []
}

export async function getWorkerById(id: string): Promise<Worker | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching worker:', error)
    return null
  }

  return (data as Worker) || null
}

export async function createWorker(
  farmId: string,
  data: CreateWorkerInput
): Promise<{ worker: Worker | null; error: string | null }> {
  const supabase = await createServerSupabaseClient()

  // Validate input
  const validationError = validateWorkerInput(data)
  if (validationError) {
    return { worker: null, error: validationError }
  }

  // For casual workers, ensure casual_rate is provided
  if (data.employment_status === 'casual' && (!data.casual_rate || data.casual_rate <= 0)) {
    return { worker: null, error: 'Casual workers must have a valid hourly rate' }
  }

  // For non-casual workers, ensure casual_rate is null
  const workerData = {
    farm_id: farmId,
    name: data.name.trim(),
    worker_number: data.worker_number.trim(),
    employment_status: data.employment_status,
    position: data.position.trim(),
    shift: data.shift?.trim() || null,
    department_id: data.department_id || null,
    casual_rate: data.employment_status === 'casual' ? data.casual_rate : null,
  }

  const { data: newWorker, error } = await supabase
    .from('workers')
    .insert([workerData])
    .select()
    .single()

  if (error) {
    console.error('Error creating worker:', error)
    return {
      worker: null,
      error: error.message.includes('duplicate')
        ? `Worker number "${data.worker_number}" already exists for this farm`
        : 'Failed to create worker',
    }
  }

  return { worker: (newWorker as Worker) || null, error: null }
}

export async function updateWorker(
  id: string,
  updates: UpdateWorkerInput
): Promise<{ worker: Worker | null; error: string | null }> {
  const supabase = await createServerSupabaseClient()

  // Validate input if provided
  if (Object.keys(updates).length === 0) {
    return { worker: null, error: 'No updates provided' }
  }

  const validationError = validateWorkerInput(updates as CreateWorkerInput)
  if (validationError) {
    return { worker: null, error: validationError }
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  }

  // Only add fields that were provided
  if (updates.name !== undefined) updateData.name = updates.name.trim()
  if (updates.worker_number !== undefined) updateData.worker_number = updates.worker_number.trim()
  if (updates.employment_status !== undefined) updateData.employment_status = updates.employment_status
  if (updates.position !== undefined) updateData.position = updates.position.trim()
  if (updates.shift !== undefined) updateData.shift = updates.shift?.trim() || null
  if (updates.department_id !== undefined) updateData.department_id = updates.department_id || null
  if (updates.casual_rate !== undefined) updateData.casual_rate = updates.casual_rate || null

  // Handle casual_rate based on employment status
  if (updates.employment_status === 'casual' && updates.casual_rate === undefined) {
    return { worker: null, error: 'Casual workers must have a valid hourly rate' }
  }

  const { data, error } = await supabase
    .from('workers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating worker:', error)
    return {
      worker: null,
      error: error.message.includes('duplicate')
        ? `Worker number already exists for this farm`
        : 'Failed to update worker',
    }
  }

  return { worker: (data as Worker) || null, error: null }
}

export async function deleteWorker(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('workers')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting worker:', error)
    return false
  }

  return true
}

export async function getWorkersByDepartment(
  farmId: string,
  departmentId: string
): Promise<Worker[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('farm_id', farmId)
    .eq('department_id', departmentId)
    .order('name')

  if (error) {
    console.error('Error fetching workers by department:', error)
    return []
  }

  return (data as Worker[]) || []
}

export async function getWorkerCount(farmId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()

  const { count, error } = await supabase
    .from('workers')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)

  if (error) {
    console.error('Error counting workers:', error)
    return 0
  }

  return count || 0
}

/**
 * Validates worker input data
 */
export function validateWorkerInput(data: Partial<CreateWorkerInput>): string | null {
  if (data.name !== undefined && (!data.name || !data.name.trim())) {
    return 'Worker name is required and cannot be empty'
  }

  if (data.worker_number !== undefined && (!data.worker_number || !data.worker_number.trim())) {
    return 'Worker number is required and cannot be empty'
  }

  if (data.position !== undefined && (!data.position || !data.position.trim())) {
    return 'Position is required and cannot be empty'
  }

  if (data.employment_status !== undefined) {
    const validStatuses: EmploymentStatus[] = ['full_time', 'part_time', 'casual', 'contract']
    if (!validStatuses.includes(data.employment_status)) {
      return `Invalid employment status. Must be one of: ${validStatuses.join(', ')}`
    }
  }

  if (data.casual_rate !== undefined && data.casual_rate !== null) {
    if (typeof data.casual_rate !== 'number' || data.casual_rate < 0) {
      return 'Casual rate must be a positive number'
    }
  }

  return null
}
