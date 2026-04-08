// src/app/actions/teams-actions.ts
'use server'

import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createDepartment as createDepartmentUtil } from '@/lib/database/departments'
import { redirect } from 'next/navigation'

export async function sendInvitation(formData: FormData) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const userRole = await getUserRole(user.id) as any

  if (!userRole?.farm_id) {
    throw new Error('User is not associated with a farm')
  }

  const farmId = userRole.farm_id

  const supabase = await createServerSupabaseClient()

  const email = formData.get('email') as string
  const role = formData.get('role') as string
  const department_id = (formData.get('department_id') as string) || null
  const message = (formData.get('message') as string) || null

  // Check if user already invited or exists
  const { data: existingInvite } = await supabase
    .from('farm_invitations')
    .select('id')
    .eq('farm_id', farmId)
    .eq('email', email)
    .is('accepted_at', null)
    .single()

  if (existingInvite) {
    throw new Error('Invitation already sent to this email')
  }

  // Generate invitation token
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Create invitation
  const { error } = await (supabase as any)
    .from('farm_invitations')
    .insert({
      farm_id: farmId,
      email,
      role_type: role || '',
      department_id: department_id || null,
      token,
      expires_at,
      sent_by: user.id,
      message: message || null,
    })

  if (error) {
    throw new Error(`Failed to create invitation: ${error.message}`)
  }

  // TODO: Send email with invitation link
  console.log(`Invitation sent to ${email} with token: ${token}`)

  return { success: true, message: `Invitation sent to ${email}` }
}

export async function updateUserRole(userId: string, role: string) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const userRole = await getUserRole(user.id) as any

  if (!userRole?.farm_id) {
    throw new Error('User is not associated with a farm')
  }

  const farmId = userRole.farm_id

  const supabase = await createServerSupabaseClient()

  // Update role
  const { error } = await (supabase as any)
    .from('user_roles')
    .update({ role_type: role })
    .eq('farm_id', farmId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`)
  }

  return { success: true, message: 'Role updated' }
}

export async function removeUserAccess(userId: string) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const userRole = await getUserRole(user.id) as any

  if (!userRole?.farm_id) {
    throw new Error('User is not associated with a farm')
  }

  const farmId = userRole.farm_id

  const supabase = await createServerSupabaseClient()

  // Remove user farm access
  const { error } = await (supabase as any)
    .from('user_roles')
    .delete()
    .eq('farm_id', farmId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to remove access: ${error.message}`)
  }

  return { success: true, message: 'User access removed' }
}

export async function cancelInvitation(invitationId: string) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const supabase = await createServerSupabaseClient()

  // Delete invitation
  const { error } = await supabase
    .from('farm_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('sent_by', user.id)

  if (error) {
    throw new Error(`Failed to cancel invitation: ${error.message}`)
  }

  return { success: true, message: 'Invitation cancelled' }
}

export async function resendInvitation(invitationId: string) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const supabase = await createServerSupabaseClient()

  // Update invitation
  const { error } = await supabase
    .from('farm_invitations')
    .update({
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', invitationId)
    .eq('sent_by', user.id)

  if (error) {
    throw new Error(`Failed to resend invitation: ${error.message}`)
  }

  // TODO: Resend email

  return { success: true, message: 'Invitation resent' }
}

export async function createWorker(formData: FormData) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const userRole = await getUserRole(user.id) as any

  if (!userRole?.farm_id) {
    throw new Error('User is not associated with a farm')
  }

  const farmId = userRole.farm_id

  const supabase = await createServerSupabaseClient()

  const { error } = await (supabase as any)
    .from('workers')
    .insert({
      farm_id: farmId,
      name: formData.get('name') as string,
      worker_number: formData.get('worker_number') as string,
      employment_status: formData.get('employment_status') as string,
      casual_rate: formData.get('casual_rate') ? parseFloat(formData.get('casual_rate') as string) : null,
      department_id: formData.get('department_id') || null,
      shift: (formData.get('shift') as string) || null,
      position: formData.get('position') as string,
    })

  if (error) {
    throw new Error(`Failed to create worker: ${error.message}`)
  }

  return { success: true, message: 'Worker created successfully' }
}

export async function createDepartment(formData: FormData) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const userRole = await getUserRole(user.id) as any

  if (!userRole?.farm_id) {
    throw new Error('User is not associated with a farm')
  }

  const farmId = userRole.farm_id

  const name = formData.get('name') as string
  const description = formData.get('description') as string || null

  if (!name || name.trim() === '') {
    throw new Error('Department name is required')
  }

  // Use the database utility function
  const department = await createDepartmentUtil(farmId, name.trim(), description?.trim() || undefined)

  if (!department) {
    throw new Error('Failed to create department')
  }

  return { success: true, message: 'Department created successfully', department }
}

export async function createTask(formData: FormData) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const userRole = await getUserRole(user.id) as any

  if (!userRole?.farm_id) {
    throw new Error('User is not associated with a farm')
  }

  const farmId = userRole.farm_id

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('tasks')
    .insert({
      farm_id: farmId,
      title: formData.get('title') as string,
      description: formData.get('description') as string || null,
      priority: (formData.get('priority') as string) || 'medium',
      department_id: formData.get('department_id') as string || null,
      assigned_worker_id: formData.get('assigned_worker_id') as string || null,
      due_date: formData.get('due_date') as string,
      due_time: formData.get('due_time') as string || null,
      status: 'pending',
      task_type: (formData.get('task_type') as string) || 'one_time',
      recurrence_pattern: formData.get('recurrence_pattern') as string || null,
      created_by: user.id,
    })

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`)
  }

  return { success: true, message: 'Task created successfully' }
}
