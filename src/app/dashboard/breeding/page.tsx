import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getBreedingStats, getUpcomingBreedingEvents, getBreedingAlerts } from '@/lib/database/breeding-stats'
import { redirect } from 'next/navigation'
import { BreedingDashboardWrapper } from '@/components/breeding/BreedingDashboardWrapper'

export default async function BreedingPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id) as any
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  // Load initial data server-side for faster initial load
  const [breedingStats, upcomingEvents, breedingAlerts] = await Promise.all([
    getBreedingStats(userRole.farm_id),
    getUpcomingBreedingEvents(userRole.farm_id),
    getBreedingAlerts(userRole.farm_id)
  ])
  
  // Transform upcoming events to calendar format
  const calendarEvents = upcomingEvents.map(event => ({
    id: event.id,
    event_type: event.event_type,
    scheduled_date: event.scheduled_date,
    status: event.status,
    animals: {
      tag_number: event.animal_tag,
      name: event.animal_name
    }
  }))
  
  return (
    <div className="dashboard-container">
      <BreedingDashboardWrapper
        userRole={userRole.role_type}
        farmId={userRole.farm_id}
        initialBreedingStats={breedingStats}
        initialCalendarEvents={calendarEvents}
        initialBreedingAlerts={breedingAlerts}
      />
    </div>
  )
}