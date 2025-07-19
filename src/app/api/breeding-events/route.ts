// Update src/app/api/breeding-events/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createBreedingEventServer, createCalfFromEventServer } from '@/lib/database/breeding-server'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    console.log('Current user:', user?.id)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    console.log('User role:', userRole)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const body = await request.json()
    const { eventData, createCalf } = body
    
    console.log('Event data received:', eventData)
    
    // Verify user owns the farm
    if (eventData.farm_id !== userRole.farm_id) {
      console.log('Farm ID mismatch:', { eventFarmId: eventData.farm_id, userFarmId: userRole.farm_id })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Add user ID to event data
    eventData.created_by = user.id
    
    console.log('Final event data for database:', eventData)
    
    // Create the breeding event using server function
    const result = await createBreedingEventServer(eventData)
    
    if (!result.success) {
      console.log('Database error:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    let calfResult = null
    
    // Create calf if it's a calving event and requested
    if (eventData.event_type === 'calving' && createCalf) {
      calfResult = await createCalfFromEventServer(eventData, userRole.farm_id)
      
      if (!calfResult.success) {
        return NextResponse.json({ 
          success: true, 
          event: result.data,
          warning: `Event recorded but failed to create calf: ${calfResult.error}`
        })
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      event: result.data,
      calf: calfResult?.data,
      message: 'Breeding event recorded successfully'
    })
    
  } catch (error) {
    console.error('Breeding events API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const { searchParams } = new URL(request.url)
    const animalId = searchParams.get('animal_id')
    const eventType = searchParams.get('event_type')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Import client-side functions for GET operations
    const { getAnimalBreedingEvents, getRecentBreedingEvents } = await import('@/lib/database/breeding')
    
    // Get breeding events based on filters
    let events = []
    
    if (animalId) {
      events = await getAnimalBreedingEvents(animalId)
    } else {
      events = await getRecentBreedingEvents(userRole.farm_id, limit)
    }
    
    // Filter by event type if specified
    if (eventType) {
      events = events.filter(event => event.event_type === eventType)
    }
    
    return NextResponse.json({ 
      success: true, 
      events 
    })
    
  } catch (error) {
    console.error('Get breeding events API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}