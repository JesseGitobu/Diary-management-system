// src/lib/hooks/useBreedingEvents.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const reversePregnancyStatusMap: Record<string, string> = {
  confirmed: 'pregnant',
  false: 'not_pregnant',
  suspected: 'uncertain',
}

const reverseExaminationMethodMap: Record<string, string> = {
  ultrasound: 'Ultrasound',
  blood_test: 'Blood test',
  rectal_palpation: 'Rectal palpation',
  visual: 'Visual observation',
}

export function useBreedingEvents(animalId: string | null) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBreedingEvents = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('breeding_events')
        .select(`
          *,
          animals (tag_number, name, breed),
          service_records (service_type, bull_tag_or_semen_code, technician_name, expected_calving_date),
          pregnancy_records (pregnancy_status, confirmation_method, expected_calving_date, veterinarian),
          heat_detection_signs (sign)
        `)
        .order('event_date', { ascending: false })

      if (animalId) {
        query = query.eq('animal_id', animalId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Normalize joined data into flat fields the timeline and edit forms expect
      const normalized = (data || []).map((event: any) => ({
        ...event,
        heat_signs: event.heat_detection_signs?.map((s: any) => s.sign) ?? [],
        insemination_method: event.service_records?.service_type === 'artificial_insemination'
          ? 'artificial_insemination'
          : event.service_records?.service_type === 'natural'
          ? 'natural_breeding'
          : null,
        semen_bull_code: event.service_records?.bull_tag_or_semen_code ?? null,
        technician_name: event.service_records?.technician_name ?? null,
        pregnancy_result: event.pregnancy_records?.pregnancy_status
          ? (reversePregnancyStatusMap[event.pregnancy_records.pregnancy_status] ?? null)
          : null,
        examination_method: event.pregnancy_records?.confirmation_method
          ? (reverseExaminationMethodMap[event.pregnancy_records.confirmation_method] ?? event.pregnancy_records.confirmation_method)
          : null,
        veterinarian_name: event.pregnancy_records?.veterinarian ?? null,
        estimated_due_date: event.pregnancy_records?.expected_calving_date ?? null,
      }))

      setEvents(normalized)
    } catch (err) {
      console.error('Error fetching breeding events:', err)
      setError(err instanceof Error ? err.message : 'Failed to load breeding events')
    } finally {
      setLoading(false)
    }
  }, [animalId])

  useEffect(() => {
    fetchBreedingEvents()
  }, [fetchBreedingEvents])

  return { events, loading, error, refetch: fetchBreedingEvents }
}
