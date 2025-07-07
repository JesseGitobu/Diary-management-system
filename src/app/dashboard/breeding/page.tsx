import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getBreedingStats, getBreedingCalendar } from '@/lib/database/breeding'
import { redirect } from 'next/navigation'
import { BreedingDashboard } from '@/components/breeding/BreedingDashboard'
import { addDays, format } from 'date-fns'

export default async function BreedingPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  // Get breeding data
  const breedingStats = await getBreedingStats(userRole.farm_id)
  
  // Get calendar events for next 30 days
  const today = new Date()
  const thirtyDaysFromNow = addDays(today, 30)
  const calendarEvents = await getBreedingCalendar(
    userRole.farm_id,
    format(today, 'yyyy-MM-dd'),
    format(thirtyDaysFromNow, 'yyyy-MM-dd')
  )
  
  return (
    <div className="dashboard-container">
      <BreedingDashboard
        userRole={userRole.role_type}
        farmId={userRole.farm_id}
        breedingStats={breedingStats}
        calendarEvents={calendarEvents}
      />
    </div>
  )
}