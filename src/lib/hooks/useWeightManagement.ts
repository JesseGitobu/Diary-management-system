// src/lib/hooks/useWeightManagement.ts
//
// Fetches real animal weight data from the weight-status API endpoint.
// Derives the AnimalWeightSummary shape the modal expects from live DB rows.

'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimalWeightSummary, WeightRecord } from '@/types/weight'

interface UseWeightManagementOptions {
  farmId: string
  enabled?: boolean   // set false to defer fetching until modal opens
}

interface UseWeightManagementResult {
  summaries: AnimalWeightSummary[]
  loading: boolean
  error: string | null
  refetch: () => void
  addWeightRecord: (animalId: string, record: WeightRecord) => void
}

// ─── Shape adapter ────────────────────────────────────────────────────────────
// Converts a raw animal_weight_status view row (+ full history from
// /weight-records?animal_id=) into the AnimalWeightSummary the UI needs.

function buildSummary(
  statusRow: any,
  history: WeightRecord[]
): AnimalWeightSummary {
  const sorted = [...history].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  )

  const current   = statusRow.weight          ?? sorted[0]?.weight_kg   ?? undefined
  const previous  = statusRow.previous_weight ?? sorted[1]?.weight_kg   ?? undefined
  const changeKg  = current != null && previous != null ? +(current - previous).toFixed(1) : undefined
  const changePct = current != null && previous != null && previous !== 0
    ? +((changeKg! / previous) * 100).toFixed(2)
    : undefined

  const trend: AnimalWeightSummary['trend'] =
    statusRow.trend === 'gaining' ? 'gaining'
    : statusRow.trend === 'losing'  ? 'losing'
    : statusRow.trend === 'stable'  ? 'stable'
    : changePct == null             ? 'unknown'
    : Math.abs(changePct) < 1       ? 'stable'
    : changePct > 0                 ? 'gaining'
    : 'losing'

  const daysSince = statusRow.days_since_weight != null
    ? Number(statusRow.days_since_weight)
    : undefined

  return {
    animal_id:            statusRow.id,        // view id == animal id
    tag_number:           statusRow.tag_number,
    name:                 statusRow.name       ?? undefined,
    production_status:    statusRow.production_status ?? undefined,
    gender:               statusRow.gender     ?? undefined,
    current_weight:       current,
    previous_weight:      previous,
    last_measured_at:     statusRow.last_weight_date
                          ? new Date(statusRow.last_weight_date).toISOString()
                          : undefined,
    weight_history:       sorted,
    trend,
    change_kg:            changeKg,
    change_pct:           changePct,
    days_since_last:      daysSince,
    body_condition_score: statusRow.body_condition_score ?? undefined,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWeightManagement({
  farmId,
  enabled = true,
}: UseWeightManagementOptions): UseWeightManagementResult {
  const [summaries, setSummaries] = useState<AnimalWeightSummary[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!farmId || !enabled) return

    setLoading(true)
    setError(null)

    try {
      // 1. Fetch summary view (one row per animal — current weight, trend, BCS, etc.)
      const statusRes = await fetch(
        `/api/animals/weight-status?farmId=${farmId}`
      )
      if (!statusRes.ok) throw new Error('Failed to load weight status')
      const { data: statusRows } = await statusRes.json() as { data: any[] }

      if (!statusRows?.length) {
        setSummaries([])
        return
      }

      // 2. Fetch full history for every animal in one batched call
      //    GET /api/animals/weight-records?farmId=&limit=500
      //    Then group client-side — avoids N+1 requests.
      const historyRes = await fetch(
        `/api/animals/weight-records?farmId=${farmId}&limit=500`
      )
      if (!historyRes.ok) throw new Error('Failed to load weight history')
      const { data: allRecords } = await historyRes.json() as { data: any[] }

      // Group raw DB records by animal_id and normalise to WeightRecord shape
      const historyByAnimal: Record<string, WeightRecord[]> = {}
      for (const r of (allRecords ?? [])) {
        if (!historyByAnimal[r.animal_id]) historyByAnimal[r.animal_id] = []
        historyByAnimal[r.animal_id].push({
          id:                   r.id,
          animal_id:            r.animal_id,
          weight_kg:            Number(r.weight_kg),
          recorded_at:          r.weight_date,   // DB column name
          recorded_by:          r.measured_by   ?? undefined,
          method:               r.method        ?? 'scale',
          notes:                r.notes         ?? undefined,
          body_condition_score: r.body_condition_score != null
                                  ? Number(r.body_condition_score)
                                  : undefined,
        })
      }

      // 3. Build the AnimalWeightSummary for every animal
      const built = statusRows.map(row =>
        buildSummary(row, historyByAnimal[row.id] ?? [])
      )

      // Sort: animals needing attention first (overdue or losing), then alphabetically
      built.sort((a, b) => {
        const aOverdue = (a.days_since_last ?? 0) > 30
        const bOverdue = (b.days_since_last ?? 0) > 30
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
        if (a.trend === 'losing' && b.trend !== 'losing') return -1
        if (b.trend === 'losing' && a.trend !== 'losing') return 1
        return (a.name ?? a.tag_number).localeCompare(b.name ?? b.tag_number)
      })

      setSummaries(built)
    } catch (err: any) {
      console.error('[useWeightManagement]', err)
      setError(err.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [farmId, enabled])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Optimistic update — called by the modal after AddWeightModal saves
  const addWeightRecord = useCallback((animalId: string, record: WeightRecord) => {
    setSummaries(prev => prev.map(s => {
      if (s.animal_id !== animalId) return s

      const newHistory = [record, ...s.weight_history]
      const sortedHistory = [...newHistory].sort(
        (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      )
      const prev2    = sortedHistory[1]?.weight_kg ?? s.current_weight ?? record.weight_kg
      const diff     = +(record.weight_kg - prev2).toFixed(1)
      const pct      = prev2 ? +((diff / prev2) * 100).toFixed(2) : 0
      const trend: AnimalWeightSummary['trend'] =
        Math.abs(pct) < 1 ? 'stable' : pct > 0 ? 'gaining' : 'losing'

      return {
        ...s,
        current_weight:       record.weight_kg,
        previous_weight:      prev2,
        weight_history:       newHistory,
        last_measured_at:     record.recorded_at,
        days_since_last:      0,
        trend,
        change_kg:            diff,
        change_pct:           pct,
        body_condition_score: record.body_condition_score ?? s.body_condition_score,
      }
    }))
  }, [])

  return { summaries, loading, error, refetch: fetchData, addWeightRecord }
}