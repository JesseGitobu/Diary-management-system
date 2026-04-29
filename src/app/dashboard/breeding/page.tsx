// src/app/dashboard/breeding/page.tsx
import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getBreedingStats, getUpcomingBreedingEvents, getBreedingAlerts } from '@/lib/database/breeding-stats'
import { redirect } from 'next/navigation'
import { BreedingDashboardWrapper } from '@/components/breeding/BreedingDashboardWrapper'
import { getUserPermissions } from '@/lib/database/user-permissions'

export const metadata: Metadata = {
  title: 'Breeding Management | DairyTrack Pro',
  description: 'Track breeding cycles, manage breeding events, monitor pregnancy status, and optimize your dairy herd genetics with detailed breeding analytics.',
}

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
  const [breedingStats, upcomingEvents, breedingAlerts, permissions] = await Promise.all([
    getBreedingStats(userRole.farm_id),
    getUpcomingBreedingEvents(userRole.farm_id),
    getBreedingAlerts(userRole.farm_id),
    getUserPermissions(userRole.id, userRole.farm_id, userRole.role_type),
  ])
  
  console.log('\n📄 [BreedingPage] Upcoming events received:', upcomingEvents.length)
  if (upcomingEvents.length > 0) {
    console.log('📄 [BreedingPage] First upcoming event:', JSON.stringify(upcomingEvents[0], null, 2))
  }
  
  // Transform upcoming events to calendar format
  // ✅ UPDATED: Now includes all breeding_follow_ups fields
  const calendarEvents = upcomingEvents.map((event, idx) => {
    const transformed = {
      id: event.id,
      event_type: event.event_type,
      scheduled_date: event.scheduled_date,
      status: event.status,
      animal_id: event.animal_id,
      animals: {
        tag_number: event.animal_tag,
        name: event.animal_name
      },
      // Include heat action and follow-up data
      heat_action_taken: event.heat_action_taken,
      follow_up_insemination_scheduled_at: event.follow_up_insemination_scheduled_at,
      follow_up_natural_breeding_start: event.follow_up_natural_breeding_start,
      follow_up_natural_breeding_end: event.follow_up_natural_breeding_end,
      follow_up_monitoring_plan: event.follow_up_monitoring_plan,
      follow_up_ovulation_date: event.follow_up_ovulation_date,
      follow_up_has_medical_issue: event.follow_up_has_medical_issue,
      follow_up_medical_issue_description: event.follow_up_medical_issue_description,
      follow_up_vet_name: event.follow_up_vet_name,
      follow_up_notes: event.follow_up_notes,
      follow_up_created_at: event.follow_up_created_at,
    }
    console.log(`📄 [BreedingPage] Transform [${idx}]: ${event.animal_name || event.animal_tag} - action='${event.heat_action_taken}', insemScheduled='${transformed.follow_up_insemination_scheduled_at}'`)
    return transformed
  })
  
  console.log('📄 [BreedingPage] Transformed calendar events:', calendarEvents.length)
  
  return (
    <div className="dashboard-container">
      <BreedingDashboardWrapper
        userRole={userRole.role_type}
        farmId={userRole.farm_id}
        initialBreedingStats={breedingStats}
        initialCalendarEvents={calendarEvents}
        initialBreedingAlerts={breedingAlerts}
        permissions={permissions}
      />
    </div>
  )
}