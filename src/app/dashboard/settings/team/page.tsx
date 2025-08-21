import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getTeamMembers, getPendingInvitations, getTeamStats } from '@/lib/database/team'
import { redirect } from 'next/navigation'
import { TeamManagement } from '@/components/settings/team/TeamManagement'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Users & Roles Settings | Farm Management',
  description: 'Manage team members and their permissions',
}

export default async function TeamPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  // Only farm owners and managers can access team management
  if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
    redirect('/dashboard')
  }
  
  const [teamMembers, pendingInvitations, teamStats] = await Promise.all([
    getTeamMembers(userRole.farm_id),
    getPendingInvitations(userRole.farm_id),
    getTeamStats(userRole.farm_id)
  ])
  
  return (
    <div className="dashboard-container">
      <TeamManagement
        currentUser={user}
        currentUserRole={userRole.role_type}
        farmId={userRole.farm_id}
        teamMembers={teamMembers}
        pendingInvitations={pendingInvitations}
        teamStats={teamStats}
      />
    </div>
  )
}