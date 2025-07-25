// Health Records Main Page
// src/app/dashboard/health/page.tsx

import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFarmAnimals } from '@/lib/database/animals'
import { getAnimalHealthRecords, getHealthStats, getUpcomingHealthTasks } from '@/lib/database/health'
import { redirect } from 'next/navigation'
import { HealthRecordsContent } from '@/components/health/HealthDashboard'

export default async function HealthRecordsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  // Get all necessary data
  const [animals, healthRecords, healthStats, upcomingTasks] = await Promise.all([
    getFarmAnimals(userRole.farm_id),
    getAnimalHealthRecords(userRole.farm_id, { limit: 100 }),
    getHealthStats(userRole.farm_id),
    getUpcomingHealthTasks(userRole.farm_id, 30)
  ])
  
  return (
    <div className="dashboard-container">
      <HealthRecordsContent
        user={user}
        userRole={userRole}
        animals={animals}
        healthRecords={healthRecords}
        healthStats={healthStats}
        upcomingTasks={upcomingTasks}
      />
    </div>
  )
}