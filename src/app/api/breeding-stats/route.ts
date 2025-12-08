import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getBreedingStats, getUpcomingBreedingEvents, getBreedingAlerts } from '@/lib/database/breeding-stats'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Load all breeding data
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
    
    return NextResponse.json({
      breedingStats,
      calendarEvents,
      breedingAlerts
    })
    
  } catch (error) {
    console.error('Breeding stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}