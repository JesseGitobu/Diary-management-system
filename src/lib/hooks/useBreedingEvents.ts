// src/lib/hooks/useBreedingEvents.ts
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useBreedingEvents(animalId: string | null) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBreedingEvents() {
      try {
        const supabase = createClient()
        
        const query = supabase
          .from('breeding_events')
          .select(`
            *,
            animals (
              tag_number,
              name
            )
          `)
          .order('event_date', { ascending: false })

        // If animalId is provided, filter for specific animal
        if (animalId) {
          query.eq('animal_id', animalId)
        }

        const { data, error } = await query

        if (error) throw error
        setEvents(data || [])
        
      } catch (err) {
        console.error('Error fetching breeding events:', err)
        setError(err instanceof Error ? err.message : 'Failed to load breeding events')
      } finally {
        setLoading(false)
      }
    }

    fetchBreedingEvents()
  }, [animalId])

  return { events, loading, error }
}