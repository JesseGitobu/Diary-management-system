// Create src/lib/database/breeding-server.ts
// SERVER-SIDE FUNCTIONS (using createServerSupabaseClient)

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { BreedingEvent, CalvingEvent } from './breeding'

// SERVER-SIDE: Create breeding event (used by API route)
export async function createBreedingEventServer(eventData: BreedingEvent & { created_by: string }) {
  const supabase = await createServerSupabaseClient()
  
  console.log('Creating breeding event with data:', eventData)
  
  const { data, error } = await supabase
    .from('breeding_events')
    .insert(eventData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating breeding event:', error)
    return { success: false, error: error.message }
  }
  
  console.log('Successfully created breeding event:', data)
  return { success: true, data }
}

// SERVER-SIDE: Create calf from calving event
export async function createCalfFromEventServer(calvingEvent: CalvingEvent, farmId: string) {
  if (!calvingEvent.calf_tag_number) {
    return { success: false, error: 'Calf tag number is required' }
  }
  
  const supabase = await createServerSupabaseClient()
  
  const calfData = {
    farm_id: farmId,
    tag_number: calvingEvent.calf_tag_number,
    name: `Calf ${calvingEvent.calf_tag_number}`,
    gender: calvingEvent.calf_gender || 'female',
    birth_date: calvingEvent.event_date,
    weight: calvingEvent.calf_weight,
    status: 'active',
    notes: `Born from animal ID: ${calvingEvent.animal_id}. Health status: ${calvingEvent.calf_health_status || 'Good'}`,
    animal_source: 'born', // or another appropriate value based on your schema
  }
  
  const { data, error } = await supabase
    .from('animals')
    .insert(calfData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating calf:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}