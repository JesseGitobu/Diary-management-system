// src/app/dashboard/teams/page.tsx
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getDepartments } from '@/lib/database/departments'
import { getWorkers } from '@/lib/database/workers'
import { TeamRolesManagement } from '@/components/teams-roles/TeamRolesManagement'

export const metadata: Metadata = {
  title: 'Teams & Roles',
  description: 'Manage your farm team, roles, and task assignments',
}

export default async function TeamsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id) as any
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }

  const farmId = userRole.farm_id

  // Fetch departments and workers lists
  const [departments, workers] = await Promise.all([
    getDepartments(farmId),
    getWorkers(farmId),
  ])

  // Fetch statistics
  const supabase = await createServerSupabaseClient()
  
  const [
    { count: workerCount },
    { count: taskCount },
    { count: invitationCount },
    { count: departmentCount },
  ] = await Promise.all([
    (supabase as any)
      .from('workers')
      .select('id', { count: 'exact', head: true })
      .eq('farm_id', farmId),
    (supabase as any)
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .neq('status', 'completed'),
    (supabase as any)
      .from('farm_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .is('accepted_at', null),
    (supabase as any)
      .from('departments')
      .select('id', { count: 'exact', head: true })
      .eq('farm_id', farmId),
  ])

  const stats = {
    activeWorkers: workerCount || 0,
    activeTasks: taskCount || 0,
    pendingInvitations: invitationCount || 0,
    departments: departmentCount || 0,
  }

  return (
    <TeamRolesManagement 
      stats={stats} 
      farmId={farmId} 
      departmentsList={departments}
      workersList={workers}
    />
  )
}
