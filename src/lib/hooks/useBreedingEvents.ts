// src/lib/hooks/useBreedingEvents.ts
import { useState, useEffect, useCallback, useRef } from 'react'
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

const INITIAL_LIMIT = 50
const LOAD_MORE_LIMIT = 50

export function useBreedingEvents(animalId: string | null, farmId?: string) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchBreedingEvents = useCallback(async (loadMore = false, offsetOverride?: number) => {
    const startTime = performance.now()

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      if (!loadMore) {
        setLoading(true)
        setOffset(0)
      }

      const supabase = createClient()
      const currentOffset = offsetOverride ?? (loadMore ? offset : 0)
      const limit = loadMore ? LOAD_MORE_LIMIT : INITIAL_LIMIT

      let query = supabase
        .from('breeding_events')
        .select(
          `
          id,
          event_type,
          event_date,
          notes,
          created_at,
          animal_id,
          farm_id,
          heat_action_taken,
          animals:animal_id (tag_number, name, breed),
          heat_detection_signs (sign),
          service_records (service_type, bull_tag_or_semen_code, technician_name),
          pregnancy_records (pregnancy_status, confirmation_method, veterinarian, expected_calving_date),
          calving_records (calving_difficulty, veterinarian, calf_records (gender, birth_weight, registration_number, health_status))
          `,
          { count: 'exact' }
        )
        .order('event_date', { ascending: false })
        .range(currentOffset, currentOffset + limit - 1)

      if (farmId) {
        query = query.eq('farm_id', farmId)
      }

      if (animalId) {
        query = query.eq('animal_id', animalId)
      }

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      const apiTime = performance.now() - startTime
      console.log('[useBreedingEvents] Fetched', {
        page: `${currentOffset}–${currentOffset + (data?.length ?? 0) - 1}`,
        returned: data?.length ?? 0,
        total: count ?? 0,
        hasMore: (currentOffset + limit) < (count ?? 0),
        apiTime: `${apiTime.toFixed(0)}ms`,
      })

      // Normalize joined data and collect a summary of what had linked data
      const normalizeStart = performance.now()
      const withData = { insemination: 0, pregnancy: 0, heat: 0, calving: 0 }

      const normalized = (data || []).map((event: any) => {
        let inseminationData = {}
        let pregnancyData = {}
        let calvingData = {}

        if (event.event_type === 'insemination' && event.service_records?.[0]) {
          const sr = event.service_records[0]
          inseminationData = {
            insemination_method: sr.service_type === 'artificial_insemination'
              ? 'artificial_insemination'
              : 'natural_breeding',
            semen_bull_code: sr.bull_tag_or_semen_code ?? null,
            technician_name: sr.technician_name ?? null,
          }
          withData.insemination++
        }

        if (event.event_type === 'pregnancy_check' && event.pregnancy_records?.[0]) {
          const pr = event.pregnancy_records[0]
          pregnancyData = {
            pregnancy_result: pr.pregnancy_status
              ? (reversePregnancyStatusMap[pr.pregnancy_status] ?? null)
              : null,
            examination_method: pr.confirmation_method
              ? (reverseExaminationMethodMap[pr.confirmation_method] ?? pr.confirmation_method)
              : null,
            veterinarian_name: pr.veterinarian ?? null,
            estimated_due_date: pr.expected_calving_date ?? null,
          }
          withData.pregnancy++
        }

        if (event.event_type === 'calving' && event.calving_records?.[0]) {
          const cr = event.calving_records[0]
          calvingData = {
            calving_outcome: cr.calving_difficulty ?? 'normal',
            veterinarian_name: cr.veterinarian ?? null,
          }
          // Extract calf data from nested calf_records
          if (cr.calf_records?.[0]) {
            const calfRec = cr.calf_records[0]
            calvingData = {
              ...calvingData,
              calf_gender: calfRec.gender ?? null,
              calf_weight: calfRec.birth_weight ?? null,
              calf_tag_number: calfRec.registration_number ?? null,
              calf_health_status: calfRec.health_status ?? null,
            }
          }
          withData.calving++
        }

        if (event.event_type === 'heat_detection' && event.heat_detection_signs?.length) {
          withData.heat++
        }

        return {
          ...event,
          heat_signs: event.heat_detection_signs?.map((s: any) => s.sign) ?? [],
          ...inseminationData,
          ...pregnancyData,
          ...calvingData,
        }
      })

      console.log('[useBreedingEvents] Normalized', {
        count: normalized.length,
        withLinkedData: withData,
        normalizeTime: `${(performance.now() - normalizeStart).toFixed(0)}ms`,
      })

      if (loadMore) {
        setEvents(prev => [...prev, ...normalized])
        setOffset(currentOffset + limit)
      } else {
        setEvents(normalized)
        setOffset(limit)
      }

      setTotalCount(count || 0)
      setHasMore((currentOffset + limit) < (count || 0))

      console.log('[useBreedingEvents] Done', {
        totalTime: `${(performance.now() - startTime).toFixed(0)}ms`,
        loadedSoFar: loadMore ? `+${normalized.length}` : normalized.length,
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return

      console.error('[useBreedingEvents] Fetch error:', err instanceof Error ? err.message : err)
      setError(err instanceof Error ? err.message : 'Failed to load breeding events')
    } finally {
      if (abortControllerRef.current?.signal.aborted === false) {
        setLoading(false)
      }
    }
  }, [animalId, farmId])

  useEffect(() => {
    console.log('[useBreedingEvents] Animal/Farm changed — resetting', { animalId, farmId })
    setEvents([])
    setOffset(0)
    setError(null)
    fetchBreedingEvents(false, 0)

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [animalId, farmId])

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      console.log('[useBreedingEvents] Load more', { nextOffset: offset })
      fetchBreedingEvents(true, offset)
    }
  }, [hasMore, loading, offset, fetchBreedingEvents])

  return {
    events,
    loading,
    error,
    refetch: () => fetchBreedingEvents(false),
    loadMore,
    hasMore,
    totalCount,
    loadedCount: events.length
  }
}
