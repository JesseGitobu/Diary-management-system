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

// Create the client once outside the hook to avoid new references on every render
const supabase = createClient()

// ✅ Filter pregnancy check records to only show confirmed, false, aborted, or complete statuses
const ALLOWED_PREGNANCY_STATUSES = ['confirmed', 'false', 'aborted', 'complete']

function normalizeEvents(data: any[]): any[] {
  return data
    .filter((event: any) => {
      // ✅ For pregnancy_check events, only include if pregnancy_status is in allowed list
      if (event.event_type === 'pregnancy_check' && event.pregnancy_records) {
        const status = event.pregnancy_records.pregnancy_status
        if (!ALLOWED_PREGNANCY_STATUSES.includes(status)) {
          return false
        }
      }
      return true
    })
    .map((event: any) => {
    let inseminationData = {}
    let pregnancyData = {}
    let calvingData = {}
    let followUpData = {}

    const followUpsArr: any[] = Array.isArray(event.breeding_follow_ups)
      ? event.breeding_follow_ups
      : event.breeding_follow_ups &&
          typeof event.breeding_follow_ups === 'object' &&
          event.breeding_follow_ups.id
        ? [event.breeding_follow_ups]
        : []

    if (followUpsArr.length > 0) {
      const fu = followUpsArr[0]
      followUpData = {
        follow_up_id: fu.id,
        follow_up_recorded: true,
        follow_up_created_at: fu.created_at,
        follow_up_updated_at: fu.updated_at,
        follow_up_created_by: fu.created_by,
        follow_up_insemination_scheduled_at: fu.insemination_scheduled_at,
        follow_up_insemination_confirmed: fu.insemination_confirmed,
        follow_up_natural_breeding_start: fu.natural_breeding_start,
        follow_up_natural_breeding_end: fu.natural_breeding_end,
        follow_up_monitoring_plan: fu.monitoring_plan,
        follow_up_ovulation_date: fu.ovulation_date,
        follow_up_ovulation_start_time: fu.ovulation_start_time,
        follow_up_ovulation_end_time: fu.ovulation_end_time,
        follow_up_ovulation_amount_ml: fu.ovulation_amount_ml,
        follow_up_steaming_date: fu.steaming_date,
        follow_up_next_check_date: fu.next_check_date,
        follow_up_expected_heat_date: fu.expected_heat_date,
        follow_up_placenta_expelled: fu.placenta_expelled,
        follow_up_placenta_expelled_at: fu.placenta_expelled_at,
        follow_up_has_medical_issue: fu.has_medical_issue,
        follow_up_medical_issue_description: fu.medical_issue_description,
        follow_up_vet_name: fu.vet_name,
        follow_up_vet_observation: fu.vet_observation,
        follow_up_notes: fu.notes,
      }
    } else {
      followUpData = { follow_up_recorded: false }
    }

    if (event.event_type === 'insemination' && event.service_records) {
      const sr = event.service_records
      inseminationData = {
        insemination_method:
          sr.service_type === 'artificial_insemination'
            ? 'artificial_insemination'
            : 'natural_breeding',
        semen_bull_code: sr.bull_tag_or_semen_code ?? null,
        semen_bull_name: sr.bull_name_or_semen_source ?? null,
        semen_type: sr.semen_type ?? null,
        technician_name: sr.technician_name ?? null,
        expected_calving_date: sr.expected_calving_date ?? null,
        service_cost: sr.service_cost ?? null,
        outcome: sr.outcome ?? null,
        service_notes: sr.notes ?? null,
        service_created_at: sr.created_at ?? null,
        service_updated_at: sr.updated_at ?? null,
      }
    }

    if (event.event_type === 'pregnancy_check' && event.pregnancy_records) {
      const pr = event.pregnancy_records
      pregnancyData = {
        pregnancy_result: pr.pregnancy_status
          ? (reversePregnancyStatusMap[pr.pregnancy_status] ?? pr.pregnancy_status)
          : null,
        examination_method: pr.confirmation_method
          ? (reverseExaminationMethodMap[pr.confirmation_method] ?? pr.confirmation_method)
          : null,
        confirmed_date: pr.confirmed_date ?? null,
        estimated_due_date: pr.expected_calving_date ?? null,
        gestation_length_days: pr.gestation_length_days ?? null,
        veterinarian_name: pr.veterinarian ?? null,
        pregnancy_notes: pr.pregnancy_notes ?? null,
        steaming_date: pr.steaming_date ?? null,
        pregnancy_created_at: pr.created_at ?? null,
        pregnancy_updated_at: pr.updated_at ?? null,
      }
    }

    if (event.event_type === 'calving' && event.calving_records) {
      const cr = event.calving_records
      calvingData = {
        calving_outcome: cr.calving_difficulty ?? 'normal',
        assistance_required: cr.assistance_required ?? false,
        veterinarian_name: cr.veterinarian ?? null,
        complications: cr.complications ?? null,
        calf_alive: cr.calf_alive ?? null,
        colostrum_quality: cr.colostrum_quality ?? null,
        colostrum_produced: cr.colostrum_produced ?? null,
        calving_notes: cr.notes ?? null,
      }

      if (cr.calf_records?.length > 0) {
        const calfRec = cr.calf_records[0]
        const calfAnimal = calfRec.calf_animal ?? null
        calvingData = {
          ...calvingData,
          calf_tag_number: calfAnimal?.tag_number ?? calfRec.registration_number ?? null,
          calf_name: calfAnimal?.name ?? null,
          calf_gender: calfAnimal?.gender ?? calfRec.gender ?? null,
          calf_weight: calfRec.birth_weight ?? null,
          calf_health_status: calfRec.health_status ?? null,
        }
      }
    }

    return {
      ...event,
      heat_signs: event.heat_detection_signs?.map((s: any) => s.sign) ?? [],
      ...inseminationData,
      ...pregnancyData,
      ...calvingData,
      ...followUpData,
    }
  })
}

export function useBreedingEvents(animalId: string | null, farmId?: string) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Offset lives in a ref — updating it never triggers a re-render
  const offsetRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isFetchingRef = useRef(false)

  const fetchBreedingEvents = useCallback(
    async (loadMore = false) => {
      // Prevent concurrent fetches
      if (isFetchingRef.current) return
      isFetchingRef.current = true

      abortControllerRef.current?.abort()
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      const currentOffset = loadMore ? offsetRef.current : 0
      const limit = loadMore ? LOAD_MORE_LIMIT : INITIAL_LIMIT

      if (!loadMore) {
        setLoading(true)
        setError(null)
      }

      try {
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
            animals:animal_id (id, tag_number, name, breed),
            heat_detection_signs (sign),
            service_records (service_type, bull_tag_or_semen_code, bull_name_or_semen_source, semen_type, technician_name, expected_calving_date, service_cost, outcome, notes, created_at, updated_at),
            pregnancy_records (pregnancy_status, confirmed_date, confirmation_method, expected_calving_date, gestation_length_days, veterinarian, pregnancy_notes, steaming_date, created_at, updated_at),
            calving_records (calving_difficulty, assistance_required, veterinarian, complications, calf_alive, colostrum_quality, colostrum_produced, notes, created_at, updated_at, calf_records (gender, birth_weight, registration_number, health_status, animal_id, calf_animal:animal_id (id, tag_number, name, gender))),
            breeding_follow_ups (id, event_id, insemination_scheduled_at, insemination_confirmed, natural_breeding_start, natural_breeding_end, monitoring_plan, ovulation_date, ovulation_start_time, ovulation_end_time, ovulation_amount_ml, steaming_date, next_check_date, expected_heat_date, placenta_expelled, placenta_expelled_at, has_medical_issue, medical_issue_description, vet_name, vet_observation, notes, created_at, updated_at, created_by)
            `,
            { count: 'exact' }
          )
          .order('event_date', { ascending: false })
          .range(currentOffset, currentOffset + limit - 1)

        if (farmId) query = query.eq('farm_id', farmId)
        if (animalId) query = query.eq('animal_id', animalId)

        const { data, error: fetchError, count } = await query

        if (abortController.signal.aborted) return
        if (fetchError) throw fetchError

        console.log('📡 [useBreedingEvents] Events fetched:', {
          count: data?.length,
          farmId,
          animalId,
          totalCount: count,
          sampleAnimalData: data?.[0]?.animals
        })

        const normalized = normalizeEvents(data || [])
        const newOffset = currentOffset + normalized.length

        if (loadMore) {
          // Deduplicate by event ID to prevent duplicate key warnings
          setEvents(prev => {
            const existingIds = new Set(prev.map((e: any) => e.id))
            const newEvents = normalized.filter((e: any) => !existingIds.has(e.id))
            return [...prev, ...newEvents]
          })
        } else {
          setEvents(normalized)
        }

        offsetRef.current = newOffset
        setTotalCount(count || 0)
        setHasMore(newOffset < (count || 0))
      } catch (err) {
        if (abortController.signal.aborted) return
        console.error('[useBreedingEvents] Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load breeding events')
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
        isFetchingRef.current = false
      }
    },
    [animalId, farmId] // no `offset` in deps — it lives in offsetRef
  )

  useEffect(() => {
    // Reset everything when animalId or farmId changes
    offsetRef.current = 0
    setEvents([])
    setError(null)
    fetchBreedingEvents(false)

    return () => {
      abortControllerRef.current?.abort()
      isFetchingRef.current = false
    }
  }, [animalId, farmId]) // deliberately NOT [fetchBreedingEvents] to avoid callback→effect loop

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchBreedingEvents(true)
    }
  }, [hasMore, loading, fetchBreedingEvents])

  return {
    events,
    loading,
    error,
    refetch: () => fetchBreedingEvents(false),
    loadMore,
    hasMore,
    totalCount,
    loadedCount: events.length,
  }
}