// Health Records Main Page
// src/app/dashboard/health/page.tsx

import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFarmAnimals } from '@/lib/database/animals'
import { getAnimalHealthRecords, getHealthStats, getUpcomingHealthTasks } from '@/lib/database/health'
import { redirect } from 'next/navigation'
import { HealthDashboardWrapper } from '@/components/health/HealthDashboardWrapper'
import { getUserPermissions } from '@/lib/database/user-permissions'

export const metadata: Metadata = {
  title: 'Health Management | DairyTrack Pro',
  description: 'Monitor herd health with detailed health records, disease tracking, treatment history, vaccination schedules, and health alerts for your dairy farm.',
}

export default async function HealthRecordsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id) as any
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  const [animals, healthRecords, healthStats, upcomingTasks, permissions] = await Promise.all([
    getFarmAnimals(userRole.farm_id, { includeInactive: true }),
    getAnimalHealthRecords(userRole.farm_id, { limit: 100 }),
    getHealthStats(userRole.farm_id),
    getUpcomingHealthTasks(userRole.farm_id, 30),
    getUserPermissions(userRole.id, userRole.farm_id, userRole.role_type),
  ])
  
  return (
    <div className="dashboard-container">
      <HealthDashboardWrapper
        user={user}
        userRole={userRole}
        farmId={userRole.farm_id}
        animals={animals}
        healthRecords={healthRecords}
        initialHealthStats={{
          ...healthStats,
          protocolsRecorded: healthStats.protocolsRecorded,
        }}
        upcomingTasks={upcomingTasks}
        permissions={permissions}
      />
    </div>
  )
}