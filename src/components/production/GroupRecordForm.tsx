'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ProductionSettings } from '@/types/production-distribution-settings'
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Users,
  ClipboardList,
  Droplets,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  FlaskConical,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Check,
  ChevronsUpDown,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnimalRecord {
  id: string
  tag_number: string
  name?: string | null
  gender: string
  production_status: string
  breed?: string | null
}

interface MilkingGroup {
  id: string
  category_id: string
  category_name: string
  animal_count: number
  animals?: AnimalRecord[]
}

/** An animal selected for this batch, carrying group metadata */
interface SelectedAnimal {
  animal: AnimalRecord
  groupId: string
  groupName: string
}

/** Per-animal health data collected in Step 2 */
interface AnimalHealthData {
  mastitis_test_performed: boolean
  mastitis_result: 'negative' | 'mild' | 'severe' | null
  affected_quarters: string[]
  milk_safety_status: 'safe' | 'unsafe_health' | 'unsafe_colostrum'
  temperature: number | null
}

/** Per-animal volume + quality data collected in Step 3 */
interface AnimalVolumeData {
  milk_volume: number | null
  milking_time: string
  fat_content: number | null
  protein_content: number | null
  somatic_cell_count: number | null
  lactose_content: number | null
  ph_level: number | null
  notes: string
}

/** Historical production data fetched per animal */
interface HistoricalData {
  yesterdayTotal: number | null
  previousSessionVolume: number | null
  previousSessionName: string | null
  sameTimeYesterdayVolume: number | null
  sameTimeYesterdaySessionName: string | null
}

interface GroupRecordFormProps {
  farmId: string
  animals: Array<{
    id: string
    tag_number: string
    name?: string
    gender: string
    production_status: string
  }>
  session: string
  sessionId?: string
  recordDate: string
  settings: ProductionSettings | null
  onSuccess?: () => void
  sessionName?: string
  editingRecord?: any | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUARTERS = ['FL', 'FR', 'RL', 'RR']

const STEP_LABELS = [
  { step: 1, label: 'Select Animals', icon: Users },
  { step: 2, label: 'Health & Safety', icon: ClipboardList },
  { step: 3, label: 'Milk Volume', icon: Droplets },
]

// ─── Helper Components ────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {STEP_LABELS.map(({ step, label, icon: Icon }, idx) => {
        const isComplete = currentStep > step
        const isActive = currentStep === step
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                  isComplete
                    ? 'bg-green-600 border-green-600 text-white'
                    : isActive
                    ? 'bg-white border-green-600 text-green-600'
                    : 'bg-white border-stone-300 text-stone-400'
                }`}
              >
                {isComplete ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isActive ? 'text-green-700' : isComplete ? 'text-green-600' : 'text-stone-400'
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div
                className={`w-16 sm:w-24 h-0.5 mb-5 mx-1 ${
                  currentStep > step ? 'bg-green-600' : 'bg-stone-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function HistoricalBadge({
  label,
  volume,
  unit,
}: {
  label: string
  volume: number | null
  unit: string
}) {
  if (volume === null) return null
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs">
      <span className="font-medium text-stone-500">{label}:</span>
      {volume.toFixed(1)}{unit}
    </span>
  )
}

function VolumeTrend({ current, reference }: { current: number | null; reference: number | null }) {
  if (current === null || reference === null || reference === 0) return null
  const pct = ((current - reference) / reference) * 100
  if (Math.abs(pct) < 1) return <Minus className="w-3 h-3 text-stone-400" />
  if (pct > 0) return <TrendingUp className="w-3 h-3 text-green-600" />
  return <TrendingDown className="w-3 h-3 text-red-500" />
}

function SafetyIcon({ status }: { status: 'safe' | 'unsafe_health' | 'unsafe_colostrum' }) {
  if (status === 'safe') return <ShieldCheck className="w-4 h-4 text-green-600" />
  if (status === 'unsafe_health') return <ShieldAlert className="w-4 h-4 text-red-500" />
  return <ShieldX className="w-4 h-4 text-yellow-600" />
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function GroupRecordForm({
  farmId,
  animals,
  session,
  sessionId,
  recordDate,
  settings,
  onSuccess,
  sessionName,
  editingRecord = null,
}: GroupRecordFormProps) {
  const unit = settings?.productionUnit === 'kg' ? 'kg' : 'L'

  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // ── Step 1: group + animal selection ─────────────────────────────────────
  const [milkingGroups, setMilkingGroups] = useState<MilkingGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [groupError, setGroupError] = useState<string | null>(null)
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set())
  const [groupSearch, setGroupSearch] = useState<Record<string, string>>({})
  const [selectedAnimals, setSelectedAnimals] = useState<SelectedAnimal[]>([])
  const [preRecordedIds, setPreRecordedIds] = useState<Set<string>>(new Set())

  // ── Step 2: health & safety ───────────────────────────────────────────────
  const [healthData, setHealthData] = useState<Record<string, AnimalHealthData>>({})
  const [historicalData, setHistoricalData] = useState<Record<string, HistoricalData>>({})
  const [historicalCacheKey, setHistoricalCacheKey] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // ── Step 3: volume entry ──────────────────────────────────────────────────
  const [volumeData, setVolumeData] = useState<Record<string, AnimalVolumeData>>({})

  // ── Submission ────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitResults, setSubmitResults] = useState<{ ok: number; fail: number }>({ ok: 0, fail: 0 })

  // ── Fetch pre-recorded animals ────────────────────────────────────────────
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const url = sessionName
          ? `/api/production?start_date=${recordDate}&end_date=${recordDate}&session_name=${encodeURIComponent(sessionName)}`
          : `/api/production?start_date=${recordDate}&end_date=${recordDate}`
        const res = await fetch(url)
        if (res.ok) {
          const result = await res.json()
          const records = Array.isArray(result.data) ? result.data : []
          setPreRecordedIds(new Set(records.map((r: any) => r.animal_id)))
        }
      } catch {
        setPreRecordedIds(new Set())
      }
    }
    fetch_()
  }, [recordDate, sessionName])

  // ── Fetch milking groups ──────────────────────────────────────────────────
  useEffect(() => {
    const fetch_ = async () => {
      try {
        setLoadingGroups(true)
        setGroupError(null)
        const res = await fetch(`/api/farms/${farmId}/production/milking-groups`)
        if (!res.ok) throw new Error('Failed to fetch milking groups')
        const result = await res.json()
        const groups: MilkingGroup[] = result.data || []

        const withAnimals = await Promise.all(
          groups.map(async (group) => {
            try {
              const aRes = await fetch(
                `/api/farms/${farmId}/animal-categories/${group.category_id}/matching-animals/production?limit=1000&record_date=${recordDate}`
              )
              if (!aRes.ok) return group
              const aData = await aRes.json()
              let groupAnimals: AnimalRecord[] = Array.isArray(aData.data) ? aData.data : []
              if (settings) {
                const statuses = settings.eligibleProductionStatuses || ['lactating']
                groupAnimals = groupAnimals.filter((a) => statuses.includes(a.production_status))
                if (settings.eligibleGenders?.length) {
                  groupAnimals = groupAnimals.filter((a) =>
                    settings.eligibleGenders?.includes(a.gender) ?? true
                  )
                }
              }
              return { ...group, animals: groupAnimals }
            } catch {
              return group
            }
          })
        )
        setMilkingGroups(withAnimals)
      } catch (err) {
        setGroupError(err instanceof Error ? err.message : 'Failed to load groups')
      } finally {
        setLoadingGroups(false)
      }
    }
    fetch_()
  }, [farmId, settings, recordDate])

  // ── Computed groups list (with fallback) ──────────────────────────────────
  const groups = useMemo(() => {
    if (milkingGroups.length > 0) {
      return milkingGroups.map((g) => ({
        id: g.id,
        name: g.category_name,
        animals: (g.animals || []).filter((a) => !preRecordedIds.has(a.id)),
      }))
    }
    // Fallback: all eligible animals in one group
    let eligible = animals.filter((a) => a.gender === 'female') as AnimalRecord[]
    if (settings) {
      const statuses = settings.eligibleProductionStatuses || ['lactating']
      eligible = eligible.filter((a) => statuses.includes(a.production_status))
      if (settings.eligibleGenders?.length) {
        eligible = eligible.filter((a) => settings.eligibleGenders?.includes(a.gender) ?? true)
      }
    } else {
      eligible = eligible.filter((a) => a.production_status === 'lactating')
    }
    eligible = eligible.filter((a) => !preRecordedIds.has(a.id))
    return [{ id: 'all_eligible', name: 'All Eligible Animals', animals: eligible }]
  }, [milkingGroups, animals, settings, preRecordedIds])

  // ── Step 1 helpers ────────────────────────────────────────────────────────

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev)
      next.has(groupId) ? next.delete(groupId) : next.add(groupId)
      return next
    })
  }

  const isAnimalSelected = (animalId: string) =>
    selectedAnimals.some((s) => s.animal.id === animalId)

  const toggleAnimal = (animal: AnimalRecord, groupId: string, groupName: string) => {
    setSelectedAnimals((prev) => {
      const exists = prev.find((s) => s.animal.id === animal.id)
      if (exists) return prev.filter((s) => s.animal.id !== animal.id)
      return [...prev, { animal, groupId, groupName }]
    })
  }

  const toggleSelectAll = (group: { id: string; name: string; animals: AnimalRecord[] }) => {
    const allIds = new Set(group.animals.map((a) => a.id))
    const allSelected = group.animals.every((a) => isAnimalSelected(a.id))
    if (allSelected) {
      setSelectedAnimals((prev) => prev.filter((s) => !allIds.has(s.animal.id)))
    } else {
      const toAdd = group.animals
        .filter((a) => !isAnimalSelected(a.id))
        .map((a) => ({ animal: a, groupId: group.id, groupName: group.name }))
      setSelectedAnimals((prev) => [...prev, ...toAdd])
    }
  }

  const removeAnimal = (animalId: string) =>
    setSelectedAnimals((prev) => prev.filter((s) => s.animal.id !== animalId))

  // Removes animal from the batch at any step and cleans up its health/volume state
  const removeAnimalFromBatch = (animalId: string) => {
    setSelectedAnimals((prev) => prev.filter((s) => s.animal.id !== animalId))
    setHealthData((prev) => { const next = { ...prev }; delete next[animalId]; return next })
    setVolumeData((prev) => { const next = { ...prev }; delete next[animalId]; return next })
  }

  const filteredGroupAnimals = (group: { id: string; animals: AnimalRecord[] }) => {
    const q = (groupSearch[group.id] || '').toLowerCase()
    if (!q) return group.animals
    return group.animals.filter(
      (a) =>
        a.tag_number.toLowerCase().includes(q) ||
        (a.name && a.name.toLowerCase().includes(q))
    )
  }

  // ── Initialize health data for selected animals ───────────────────────────
  const initHealthData = useCallback(() => {
    setHealthData((prev) => {
      const next: Record<string, AnimalHealthData> = {}
      for (const { animal } of selectedAnimals) {
        next[animal.id] = prev[animal.id] ?? {
          mastitis_test_performed: false,
          mastitis_result: null,
          affected_quarters: [],
          milk_safety_status: 'safe',
          temperature: null,
        }
      }
      return next
    })
  }, [selectedAnimals])

  // ── Fetch historical data for all selected animals ────────────────────────
  // OPTIMIZATION: Batch requests (1 API call instead of N) + Cache by session params + animal IDs
  const fetchHistoricalData = useCallback(async () => {
    // Skip if no animals selected
    if (selectedAnimals.length === 0) {
      console.log('[GroupRecordForm] No animals selected, skipping historical fetch')
      setHistoricalData({})
      return
    }

    // Create cache key including selected animal IDs so different selections get their own cache
    const animalIdString = selectedAnimals.map(s => s.animal.id).sort().join(',')
    const cacheKey = `${farmId}|${recordDate}|${session}|${sessionName}|${animalIdString}`

    console.log('[GroupRecordForm] Fetching historical data:', {
      cacheKey,
      selectedAnimalsCount: selectedAnimals.length,
      recordDate,
      session,
      sessionName,
    })

    // Skip if already loaded for this session and animal selection
    if (historicalCacheKey === cacheKey && Object.keys(historicalData).length > 0) {
      console.log('[GroupRecordForm] Using cached historical data for:', cacheKey)
      return // Already cached!
    }

    setLoadingHistory(true)
    try {
      // OPTIMIZATION 1: Batch endpoint - single API call for all animals
      const res = await fetch(`/api/production/history/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          animalIds: selectedAnimals.map((s) => s.animal.id), // All IDs at once
          date: recordDate,
          session,
          ...(sessionName ? { session_name: sessionName } : {}),
        }),
      })

      if (res.ok) {
        const results = await res.json()
        console.log('[GroupRecordForm] Historical data received:', {
          cacheKey,
          animalsCount: Object.keys(results).length,
          data: results,
        })
        setHistoricalData(results)
        setHistoricalCacheKey(cacheKey) // Mark as cached
      } else {
        console.error('[GroupRecordForm] Historical data fetch failed:', { status: res.status })
        setHistoricalData({})
      }
    } catch (error) {
      console.error('[GroupRecordForm] Failed to fetch batch historical data:', error)
      setHistoricalData({})
    } finally {
      setLoadingHistory(false)
    }
  }, [selectedAnimals, farmId, recordDate, session, sessionName, historicalCacheKey, historicalData])

  // ── Initialize volume data for selected animals ───────────────────────────
  const initVolumeData = useCallback(() => {
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setVolumeData((prev) => {
      const next: Record<string, AnimalVolumeData> = {}
      for (const { animal } of selectedAnimals) {
        next[animal.id] = prev[animal.id] ?? {
          milk_volume: null,
          milking_time: currentTime,
          fat_content: null,
          protein_content: null,
          somatic_cell_count: null,
          lactose_content: null,
          ph_level: null,
          notes: '',
        }
      }
      return next
    })
  }, [selectedAnimals])

  // ── Step navigation ───────────────────────────────────────────────────────

  const goToStep2 = async () => {
    initHealthData()
    await fetchHistoricalData() // Uses cache if available
    setStep(2)
  }

  // Fetch historical data automatically when selected animals change
  useEffect(() => {
    if (selectedAnimals.length > 0) {
      fetchHistoricalData()
    }
  }, [selectedAnimals, fetchHistoricalData])

  // Reset cache when session parameters change
  useEffect(() => {
    setHistoricalCacheKey(null)
    setHistoricalData({})
  }, [recordDate, session, sessionName])

  const goToStep3 = () => {
    initVolumeData()
    setStep(3)
  }

  // ── Health data helpers ───────────────────────────────────────────────────

  const updateHealth = (animalId: string, patch: Partial<AnimalHealthData>) => {
    setHealthData((prev) => {
      const existing = prev[animalId]
      const updated = { ...existing, ...patch }

      // Auto-set safety status based on mastitis result
      if (patch.mastitis_result !== undefined) {
        if (patch.mastitis_result === 'severe') {
          updated.milk_safety_status = 'unsafe_health'
        } else if (patch.mastitis_result === 'negative' || patch.mastitis_result === null) {
          if (existing.milk_safety_status === 'unsafe_health') {
            updated.milk_safety_status = 'safe'
          }
        }
      }
      return { ...prev, [animalId]: updated }
    })
  }

  const applyBulkHealth = (patch: Partial<AnimalHealthData>) => {
    setHealthData((prev) => {
      const next = { ...prev }
      for (const id of Object.keys(next)) {
        const updated = { ...next[id], ...patch }
        if (patch.mastitis_result === 'severe') updated.milk_safety_status = 'unsafe_health'
        else if (patch.mastitis_result === 'negative' || patch.mastitis_result === null) {
          if (next[id].milk_safety_status === 'unsafe_health') updated.milk_safety_status = 'safe'
        }
        next[id] = updated
      }
      return next
    })
  }

  const toggleQuarter = (animalId: string, quarter: string) => {
    setHealthData((prev) => {
      const existing = prev[animalId]
      const quarters = existing.affected_quarters.includes(quarter)
        ? existing.affected_quarters.filter((q) => q !== quarter)
        : [...existing.affected_quarters, quarter]
      return { ...prev, [animalId]: { ...existing, affected_quarters: quarters } }
    })
  }

  // ── Volume data helpers ───────────────────────────────────────────────────

  const updateVolume = (animalId: string, patch: Partial<AnimalVolumeData>) => {
    setVolumeData((prev) => ({ ...prev, [animalId]: { ...prev[animalId], ...patch } }))
  }

  const allVolumesEntered = useMemo(
    () =>
      selectedAnimals.every(
        ({ animal }) => volumeData[animal.id]?.milk_volume !== null && (volumeData[animal.id]?.milk_volume ?? -1) >= 0
      ),
    [selectedAnimals, volumeData]
  )

  // ── Submission ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    let ok = 0
    let fail = 0

    const createMastitisIssue = async (
      animalId: string,
      result: 'mild' | 'severe',
      health: AnimalHealthData,
      vol: AnimalVolumeData
    ) => {
      try {
        await fetch('/api/health/issues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            animal_id: animalId,
            issue_type: 'illness',
            severity: result === 'severe' ? 'high' : 'medium',
            description: `Mastitis detected (${result}) during group production recording`,
            notes: `Milk volume: ${vol.milk_volume}${unit}\nAffected quarters: ${health.affected_quarters.join(', ') || 'Not specified'}`,
            symptoms: ['mastitis', result],
            alert_veterinarian: result === 'severe',
            first_observed_at: new Date().toISOString(),
            illness_temperature: health.temperature?.toString() || null,
            illness_milk_change: true,
            illness_onset_hours: '0',
            illness_other_animals: false,
            illness_appetite: null,
          }),
        })
      } catch {
        // Don't block production record submission
      }
    }

    const errors: string[] = []

    await Promise.all(
      selectedAnimals.map(async ({ animal, groupId }) => {
        const health = healthData[animal.id]
        const vol = volumeData[animal.id]
        if (!vol || vol.milk_volume === null) { fail++; return }

        try {
          const res = await fetch('/api/production', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              farm_id: farmId,
              animal_id: animal.id,
              record_date: recordDate,
              milking_session: session,
              session_name: sessionName || 'Session',
              milking_session_id: sessionId || null,
              milking_time: vol.milking_time || null,
              milk_volume: vol.milk_volume,
              milk_safety_status: health?.milk_safety_status ?? 'safe',
              // Use ?? null so that a zero temperature (invalid range anyway) still passes correctly
              temperature: health?.temperature != null ? health.temperature : null,
              mastitis_test_performed: health?.mastitis_test_performed ?? false,
              mastitis_result: health?.mastitis_result ?? null,
              affected_quarters: health?.affected_quarters?.length ? health.affected_quarters : null,
              // Quality fields — send null explicitly when empty so API coercion works correctly
              fat_content: vol.fat_content ?? null,
              protein_content: vol.protein_content ?? null,
              somatic_cell_count: vol.somatic_cell_count ?? null,
              lactose_content: vol.lactose_content ?? null,
              ph_level: vol.ph_level ?? null,
              notes: vol.notes?.trim() || null,
              recording_type: 'group',
              // Only send a real group UUID; 'all_eligible' is a client-side fallback id
              milking_group_id: groupId !== 'all_eligible' ? groupId : null,
            }),
          })
          if (res.ok) {
            ok++
            if (health?.mastitis_result === 'mild' || health?.mastitis_result === 'severe') {
              await createMastitisIssue(animal.id, health.mastitis_result, health, vol)
            }
          } else {
            fail++
            // Surface the API error message so the user sees what went wrong
            try {
              const errData = await res.json()
              errors.push(`#${animal.tag_number}: ${errData.error || res.statusText}`)
            } catch {
              errors.push(`#${animal.tag_number}: ${res.statusText}`)
            }
          }
        } catch (err) {
          fail++
          errors.push(`#${animal.tag_number}: Network error`)
        }
      })
    )

    if (errors.length > 0) {
      setSubmitError(errors.join(' · '))
    }

    // Mark every successfully-recorded animal as pre-recorded so they are
    // excluded from the next batch without a full page reload
    setPreRecordedIds((prev) => {
      const next = new Set(prev)
      for (const { animal } of selectedAnimals) next.add(animal.id)
      return next
    })

    setSubmitResults({ ok, fail })
    setSubmitting(false)
    setSubmitSuccess(true)
    if (onSuccess) onSuccess()
  }

  // ── Render: Success ───────────────────────────────────────────────────────

  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-stone-900">Batch Submitted!</h3>
        <p className="text-stone-600 max-w-sm">
          {submitResults.ok} record{submitResults.ok !== 1 ? 's' : ''} saved successfully.
          {submitResults.fail > 0 && (
            <span className="text-red-600"> {submitResults.fail} failed.</span>
          )}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setStep(1)
            setSelectedAnimals([])
            setHealthData({})
            setVolumeData({})
            setSubmitSuccess(false)
            setSubmitResults({ ok: 0, fail: 0 })
          }}
        >
          Record Another Batch
        </Button>
      </div>
    )
  }

  // ── Render: Step 1 ────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-stone-900">Select Animals to Record</h3>
        <p className="text-sm text-stone-500 mt-0.5">
          Expand groups, select individual animals or use "Select All", then click Next.
        </p>
      </div>

      {groupError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{groupError}</p>
        </div>
      )}

      {preRecordedIds.size > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          ℹ️ <strong>{preRecordedIds.size}</strong> animal{preRecordedIds.size > 1 ? 's' : ''} already recorded this session are hidden.
        </div>
      )}

      {loadingGroups ? (
        <div className="flex items-center justify-center py-10">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const isExpanded = expandedGroupIds.has(group.id)
            const searchQuery = groupSearch[group.id] || ''
            const filtered = filteredGroupAnimals(group)
            const selectedInGroup = group.animals.filter((a) => isAnimalSelected(a.id)).length
            const allInGroupSelected = group.animals.length > 0 && group.animals.every((a) => isAnimalSelected(a.id))

            return (
              <div
                key={group.id}
                className="border border-stone-200 rounded-lg overflow-hidden"
              >
                {/* Group header row */}
                <button
                  type="button"
                  onClick={() => toggleGroupExpand(group.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        selectedInGroup > 0
                          ? 'bg-green-600 text-white'
                          : 'bg-stone-200 text-stone-500'
                      }`}
                    >
                      {selectedInGroup > 0 ? selectedInGroup : group.animals.length}
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900 text-sm">{group.name}</p>
                      <p className="text-xs text-stone-500">
                        {group.animals.length} eligible animal{group.animals.length !== 1 ? 's' : ''}
                        {selectedInGroup > 0 && (
                          <span className="ml-1 text-green-700 font-medium">
                            · {selectedInGroup} selected
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedInGroup > 0 && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        {selectedInGroup}/{group.animals.length}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-stone-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                </button>

                {/* Expanded animal list */}
                {isExpanded && (
                  <div className="border-t border-stone-200 bg-white">
                    {/* Search + select all */}
                    <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-stone-400" />
                        <input
                          type="text"
                          placeholder="Search animals..."
                          value={searchQuery}
                          onChange={(e) =>
                            setGroupSearch((prev) => ({ ...prev, [group.id]: e.target.value }))
                          }
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSelectAll(group)}
                        className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                          allInGroupSelected
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'bg-white border-stone-300 text-stone-700 hover:border-green-400 hover:text-green-700'
                        }`}
                      >
                        {allInGroupSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {/* Already-recorded animals — greyed out, non-selectable */}
                    {(() => {
                      const alreadyRecorded = group.animals.filter((a) => preRecordedIds.has(a.id))
                      if (alreadyRecorded.length === 0) return null
                      return (
                        <div className="px-4 py-2 border-b border-stone-100 bg-stone-50">
                          <p className="text-xs font-medium text-stone-400 mb-1.5">Already recorded this session</p>
                          <div className="space-y-1">
                            {alreadyRecorded.map((animal) => (
                              <div key={animal.id} className="flex items-center gap-2 py-1 opacity-50">
                                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <span className="text-xs text-stone-500 font-mono">#{animal.tag_number}</span>
                                {animal.name && <span className="text-xs text-stone-400">· {animal.name}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Animal rows */}
                    <div className="max-h-52 overflow-y-auto divide-y divide-stone-100">
                      {group.animals.length === 0 ? (
                        <div className="py-6 text-center text-sm text-stone-400">
                          No eligible animals in this group
                        </div>
                      ) : filtered.length === 0 ? (
                        <div className="py-6 text-center text-sm text-stone-400">
                          No animals match your search
                        </div>
                      ) : (
                        filtered.map((animal) => {
                          const selected = isAnimalSelected(animal.id)
                          return (
                            <div
                              key={animal.id}
                              className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                                selected ? 'bg-green-50' : 'hover:bg-stone-50'
                              }`}
                            >
                              {/* Checkbox — toggles selection */}
                              <button
                                type="button"
                                onClick={() => toggleAnimal(animal, group.id, group.name)}
                                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                              >
                                <div
                                  className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                    selected
                                      ? 'bg-green-600 border-green-600'
                                      : 'border-stone-300 bg-white'
                                  }`}
                                >
                                  {selected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-green-700">
                                    {animal.tag_number.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-stone-900 truncate">
                                    #{animal.tag_number}
                                    {animal.name && (
                                      <span className="text-stone-500 font-normal ml-1">· {animal.name}</span>
                                    )}
                                  </p>
                                  {animal.breed && (
                                    <p className="text-xs text-stone-400">{animal.breed}</p>
                                  )}
                                </div>
                                <span className="flex-shrink-0 px-1.5 py-0.5 bg-stone-100 text-stone-600 text-xs rounded">
                                  {animal.production_status.replace(/_/g, ' ')}
                                </span>
                              </button>

                              {/* × Remove button — only visible when selected */}
                              {selected && (
                                <button
                                  type="button"
                                  onClick={() => removeAnimal(animal.id)}
                                  title="Remove from selection"
                                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:bg-red-100 hover:text-red-600 transition-colors ml-1"
                                >
                                  <span className="text-sm leading-none font-bold">×</span>
                                </button>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Historical data for selected animals */}
      {selectedAnimals.length > 0 && (
        <div className="p-3 sm:p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-3">
          <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Historical Context for Selected Animals</p>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-3">
              <LoadingSpinner size="sm" />
            </div>
          ) : Object.keys(historicalData).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {selectedAnimals.map(({ animal }) => {
                const data = historicalData[animal.id]
                console.log('[GroupRecordForm] Rendering historical data for animal:', {
                  animalId: animal.id,
                  animalTag: animal.tag_number,
                  data,
                })
                if (!data) {
                  console.log('[GroupRecordForm] No historical data for animal:', animal.id)
                  return null
                }
                return (
                  <div key={animal.id} className="p-2 bg-white rounded border border-stone-200 space-y-1.5">
                    <p className="text-xs font-medium text-stone-700">#{animal.tag_number} {animal.name && `· ${animal.name}`}</p>
                    <div className="space-y-1">
                      {data.yesterdayTotal && (
                        <div className="text-[10px] text-stone-600">
                          <span className="font-medium">Yesterday Total:</span> {data.yesterdayTotal.toFixed(1)}L
                        </div>
                      )}
                      {!data.yesterdayTotal && (
                        <div className="text-[10px] text-stone-600">
                          <span className="font-medium">Yesterday Total:</span> <span className="text-stone-400">—</span>
                        </div>
                      )}
                      {data.previousSessionVolume && (
                        <div className="text-[10px] text-stone-600">
                          <span className="font-medium">Previous:</span> {data.previousSessionName || 'Session'} {data.previousSessionVolume.toFixed(1)}L
                        </div>
                      )}
                      {data.sameTimeYesterdayVolume && (
                        <div className="text-[10px] text-stone-600">
                          <span className="font-medium">Same Time Yesterday:</span> {data.sameTimeYesterdayVolume.toFixed(1)}L
                        </div>
                      )}
                      {!data.yesterdayTotal && !data.previousSessionVolume && !data.sameTimeYesterdayVolume && (
                        <p className="text-[10px] text-stone-500 italic">No historical data available</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-[10px] text-stone-500 italic py-2">No historical data available for these animals</p>
          )}
        </div>
      )}

      {/* Selected animals — chip strip + next button */}
      {selectedAnimals.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-3 pb-2 space-y-2">
          {/* Chip strip */}
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {selectedAnimals.map(({ animal }) => (
              <span
                key={animal.id}
                className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200"
              >
                #{animal.tag_number}
                {animal.name && <span className="text-green-600">· {animal.name}</span>}
                <button
                  type="button"
                  onClick={() => removeAnimal(animal.id)}
                  title={`Remove #${animal.tag_number}`}
                  className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-green-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                >
                  <span className="text-xs font-bold leading-none">×</span>
                </button>
              </span>
            ))}
          </div>
          {/* Count + next */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-600">
              <span className="font-semibold text-stone-900">{selectedAnimals.length}</span> animal{selectedAnimals.length !== 1 ? 's' : ''} selected
            </p>
            <Button onClick={goToStep2} className="gap-2">
              Next: Health & Safety
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  // ── Render: Step 2 ────────────────────────────────────────────────────────

  const renderStep2 = () => {
    // Group selected animals by their group name for display
    const byGroup: Record<string, SelectedAnimal[]> = {}
    for (const sa of selectedAnimals) {
      if (!byGroup[sa.groupName]) byGroup[sa.groupName] = []
      byGroup[sa.groupName].push(sa)
    }

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-stone-900">Health & Safety Review</h3>
          <p className="text-sm text-stone-500 mt-0.5">
            Record mastitis tests and milk safety for each animal. Use bulk actions to apply to all.
          </p>
        </div>

        {loadingHistory && (
          <div className="flex items-center gap-2 text-sm text-stone-500 py-2">
            <LoadingSpinner size="sm" />
            Loading historical data…
          </div>
        )}

        {/* Bulk actions */}
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-2">
          <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Bulk Actions — Apply to All</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                applyBulkHealth({
                  mastitis_test_performed: true,
                  mastitis_result: 'negative',
                  milk_safety_status: 'safe',
                })
              }
              className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-md border border-green-200 hover:bg-green-200 transition-colors"
            >
              ✓ All Negative (Safe)
            </button>
            <button
              type="button"
              onClick={() => applyBulkHealth({ milk_safety_status: 'safe', mastitis_test_performed: false, mastitis_result: null })}
              className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-md border border-blue-200 hover:bg-blue-200 transition-colors"
            >
              Skip Test — All Safe
            </button>
            <button
              type="button"
              onClick={() => applyBulkHealth({ milk_safety_status: 'unsafe_colostrum' })}
              className="px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-md border border-yellow-200 hover:bg-yellow-200 transition-colors"
            >
              All Colostrum
            </button>
          </div>
        </div>

        {/* Per-animal health cards grouped by group */}
        {Object.entries(byGroup).map(([groupName, groupAnimals]) => (
          <div key={groupName}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide px-2">
                {groupName}
              </span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>

            <div className="space-y-3">
              {groupAnimals.map(({ animal }) => {
                const health = healthData[animal.id] || {
                  mastitis_test_performed: false,
                  mastitis_result: null,
                  affected_quarters: [],
                  milk_safety_status: 'safe',
                  temperature: null,
                }
                const hist = historicalData[animal.id]

                return (
                  <div
                    key={animal.id}
                    className={`border rounded-lg overflow-hidden ${
                      health.milk_safety_status === 'unsafe_health'
                        ? 'border-red-300'
                        : health.milk_safety_status === 'unsafe_colostrum'
                        ? 'border-yellow-300'
                        : 'border-stone-200'
                    }`}
                  >
                    {/* Animal header */}
                    <div className="bg-stone-50 border-b border-stone-200">
                      {/* Top row: avatar + name + safety icon + remove */}
                      <div className="flex items-center gap-3 px-4 pt-2.5 pb-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-green-700">
                            {animal.tag_number.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-stone-900">
                            #{animal.tag_number}
                            {animal.name && <span className="font-normal text-stone-500 ml-1">· {animal.name}</span>}
                          </p>
                          {animal.breed && <p className="text-xs text-stone-400">{animal.breed}</p>}
                        </div>
                        {/* Safety badge */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <SafetyIcon status={health.milk_safety_status} />
                          <span className="text-xs text-stone-500">
                            {health.milk_safety_status === 'safe'
                              ? 'Safe'
                              : health.milk_safety_status === 'unsafe_health'
                              ? 'Unsafe'
                              : 'Colostrum'}
                          </span>
                        </div>
                        {/* Remove animal from batch */}
                        <button
                          type="button"
                          onClick={() => removeAnimalFromBatch(animal.id)}
                          title="Remove from batch"
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                        >
                          <span className="text-sm font-bold leading-none">×</span>
                        </button>
                      </div>

                      {/* Production history row — 3 labelled stats */}
                      {loadingHistory ? (
                        <div className="px-4 pb-2.5">
                          <div className="h-3 w-32 bg-stone-200 rounded animate-pulse" />
                        </div>
                      ) : hist ? (
                        <div className="px-4 pb-2.5 grid grid-cols-3 gap-2">
                          {/* 1 — Total yesterday */}
                          <div className="bg-white rounded border border-stone-200 px-2 py-1.5">
                            <p className="text-xs text-stone-400 leading-none mb-0.5">Total Yesterday</p>
                            <p className={`text-sm font-semibold leading-none ${
                              hist.yesterdayTotal !== null ? 'text-stone-800' : 'text-stone-300'
                            }`}>
                              {hist.yesterdayTotal !== null ? `${hist.yesterdayTotal.toFixed(1)}${unit}` : '—'}
                            </p>
                          </div>
                          {/* 2 — Same session yesterday */}
                          <div className="bg-white rounded border border-stone-200 px-2 py-1.5">
                            <p className="text-xs text-stone-400 leading-none mb-0.5">
                              {hist.sameTimeYesterdaySessionName
                                ? `${hist.sameTimeYesterdaySessionName} Yesterday`
                                : 'Same Session Yest.'}
                            </p>
                            <p className={`text-sm font-semibold leading-none ${
                              hist.sameTimeYesterdayVolume !== null ? 'text-stone-800' : 'text-stone-300'
                            }`}>
                              {hist.sameTimeYesterdayVolume !== null
                                ? `${hist.sameTimeYesterdayVolume.toFixed(1)}${unit}`
                                : '—'}
                            </p>
                          </div>
                          {/* 3 — Previous session (most recent record before this one) */}
                          <div className="bg-white rounded border border-stone-200 px-2 py-1.5">
                            <p className="text-xs text-stone-400 leading-none mb-0.5">
                              {hist.previousSessionName ? `Prev (${hist.previousSessionName})` : 'Prev Session'}
                            </p>
                            <p className={`text-sm font-semibold leading-none ${
                              hist.previousSessionVolume !== null ? 'text-stone-800' : 'text-stone-300'
                            }`}>
                              {hist.previousSessionVolume !== null
                                ? `${hist.previousSessionVolume.toFixed(1)}${unit}`
                                : '—'}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Health controls */}
                    <div className="p-4 space-y-3">
                      {/* Mastitis test toggle */}
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-stone-700">
                          Mastitis Test Performed
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            updateHealth(animal.id, {
                              mastitis_test_performed: !health.mastitis_test_performed,
                              mastitis_result: !health.mastitis_test_performed ? health.mastitis_result : null,
                            })
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            health.mastitis_test_performed ? 'bg-green-600' : 'bg-stone-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                              health.mastitis_test_performed ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Mastitis result (only if test performed) */}
                      {health.mastitis_test_performed && (
                        <div>
                          <label className="text-xs font-medium text-stone-600 mb-1 block">
                            Test Result
                          </label>
                          <div className="flex gap-2">
                            {(['negative', 'mild', 'severe'] as const).map((result) => (
                              <button
                                key={result}
                                type="button"
                                onClick={() => updateHealth(animal.id, { mastitis_result: result })}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors capitalize ${
                                  health.mastitis_result === result
                                    ? result === 'negative'
                                      ? 'bg-green-600 border-green-600 text-white'
                                      : result === 'mild'
                                      ? 'bg-yellow-500 border-yellow-500 text-white'
                                      : 'bg-red-600 border-red-600 text-white'
                                    : 'bg-white border-stone-300 text-stone-600 hover:border-stone-400'
                                }`}
                              >
                                {result}
                              </button>
                            ))}
                          </div>

                          {/* Affected quarters (if mild/severe) */}
                          {(health.mastitis_result === 'mild' || health.mastitis_result === 'severe') && (
                            <div className="mt-2">
                              <label className="text-xs text-stone-500 mb-1 block">
                                Affected Quarters
                              </label>
                              <div className="flex gap-1.5">
                                {QUARTERS.map((q) => (
                                  <button
                                    key={q}
                                    type="button"
                                    onClick={() => toggleQuarter(animal.id, q)}
                                    className={`flex-1 py-1 text-xs font-medium rounded border transition-colors ${
                                      health.affected_quarters.includes(q)
                                        ? 'bg-red-600 border-red-600 text-white'
                                        : 'bg-white border-stone-300 text-stone-600 hover:border-red-400'
                                    }`}
                                  >
                                    {q}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Safety status */}
                      <div>
                        <label className="text-xs font-medium text-stone-600 mb-1 block">
                          Milk Safety Status
                        </label>
                        <select
                          value={health.milk_safety_status}
                          disabled={health.mastitis_result === 'severe'}
                          onChange={(e) =>
                            updateHealth(animal.id, {
                              milk_safety_status: e.target.value as any,
                            })
                          }
                          className={`w-full text-sm px-3 py-1.5 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                            health.mastitis_result === 'severe'
                              ? 'bg-red-50 cursor-not-allowed opacity-75'
                              : ''
                          }`}
                        >
                          <option value="safe">✓ Safe — Approved for Sale</option>
                          <option value="unsafe_health">⚠️ Unsafe — Animal Health Issue</option>
                          <option value="unsafe_colostrum">✖️ Colostrum — Cannot Sell</option>
                        </select>
                        {health.mastitis_result === 'severe' && (
                          <p className="text-xs text-red-600 mt-1">
                            Auto-set to unsafe due to severe mastitis.
                          </p>
                        )}
                      </div>

                      {/* Temperature (optional) */}
                      <div>
                        <label className="text-xs font-medium text-stone-600 mb-1 block">
                          Temperature (°C) <span className="font-normal text-stone-400">Optional</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min={35}
                          max={41}
                          placeholder="e.g. 38.5"
                          value={health.temperature ?? ''}
                          onChange={(e) =>
                            updateHealth(animal.id, {
                              temperature: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                          className="w-full text-sm px-3 py-1.5 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-3 pb-1 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button onClick={goToStep3} className="gap-2">
            Next: Milk Volume
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  // ── Render: Step 3 ────────────────────────────────────────────────────────

  const renderStep3 = () => {
    const isQualityVisible =
      settings &&
      settings.productionTrackingMode !== 'basic' &&
      (settings.trackFatContent ||
        settings.trackProteinContent ||
        settings.trackSomaticCellCount ||
        settings.trackLactoseContent ||
        settings.trackPhLevel)

    const byGroup: Record<string, SelectedAnimal[]> = {}
    for (const sa of selectedAnimals) {
      if (!byGroup[sa.groupName]) byGroup[sa.groupName] = []
      byGroup[sa.groupName].push(sa)
    }

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-stone-900">Milk Volume Entry</h3>
          <p className="text-sm text-stone-500 mt-0.5">
            Enter milk volume for each animal. Historical context is shown for reference.
          </p>
        </div>

        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{submitError}</p>
          </div>
        )}

        {Object.entries(byGroup).map(([groupName, groupAnimals]) => (
          <div key={groupName}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide px-2">
                {groupName}
              </span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>

            <div className="space-y-3">
              {groupAnimals.map(({ animal }) => {
                const vol = volumeData[animal.id]
                const health = healthData[animal.id]
                const hist = historicalData[animal.id]
                if (!vol) return null

                return (
                  <div key={animal.id} className="border border-stone-200 rounded-lg overflow-hidden">
                    {/* Animal header */}
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-stone-50 border-b border-stone-200">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-green-700">
                          {animal.tag_number.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900">
                          #{animal.tag_number}
                          {animal.name && <span className="font-normal text-stone-500 ml-1">· {animal.name}</span>}
                        </p>
                        {/* Historical + trend */}
                        {hist && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <HistoricalBadge label="Yesterday" volume={hist.yesterdayTotal} unit={unit} />
                            <HistoricalBadge
                              label={hist.sameTimeYesterdaySessionName ? `Same session yesterday` : 'Prev session'}
                              volume={hist.sameTimeYesterdayVolume ?? hist.previousSessionVolume}
                              unit={unit}
                            />
                            <VolumeTrend
                              current={vol.milk_volume}
                              reference={hist.sameTimeYesterdayVolume ?? hist.previousSessionVolume}
                            />
                          </div>
                        )}
                      </div>
                      {/* Safety pill */}
                      <div className="flex-shrink-0 flex items-center gap-1">
                        <SafetyIcon status={health?.milk_safety_status || 'safe'} />
                        {health?.mastitis_result && health.mastitis_result !== null && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              health.mastitis_result === 'severe'
                                ? 'bg-red-100 text-red-700'
                                : health.mastitis_result === 'mild'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {health.mastitis_result}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Volume input */}
                    <div className="p-4 space-y-3">
                      {/* Main volume */}
                      <div>
                        <label className="text-xs font-medium text-stone-600 mb-1 block">
                          Milk Volume ({unit}) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min={0}
                            max={100}
                            placeholder="0.0"
                            value={vol.milk_volume ?? ''}
                            onChange={(e) =>
                              updateVolume(animal.id, {
                                milk_volume: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            className="w-full text-xl font-semibold pr-10 pl-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 font-medium text-sm">
                            {unit}
                          </span>
                        </div>
                      </div>

                      {/* Milking time (if session requires it) */}
                      {settings?.milkingSessions?.find((s) => s.id === session)?.requiresTimeInput && (
                        <div>
                          <label className="text-xs font-medium text-stone-600 mb-1 block">
                            Exact Milking Time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            value={vol.milking_time}
                            onChange={(e) => updateVolume(animal.id, { milking_time: e.target.value })}
                            className="w-full text-sm px-3 py-1.5 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      )}

                      {/* Quality parameters */}
                      {isQualityVisible && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                          {settings?.trackFatContent && (
                            <div>
                              <label className="text-xs text-stone-500 block mb-0.5">Fat (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="3.75"
                                value={vol.fat_content ?? ''}
                                onChange={(e) =>
                                  updateVolume(animal.id, {
                                    fat_content: e.target.value ? parseFloat(e.target.value) : null,
                                  })
                                }
                                className="w-full text-sm px-2 py-1 border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                          )}
                          {settings?.trackProteinContent && (
                            <div>
                              <label className="text-xs text-stone-500 block mb-0.5">Protein (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="3.25"
                                value={vol.protein_content ?? ''}
                                onChange={(e) =>
                                  updateVolume(animal.id, {
                                    protein_content: e.target.value ? parseFloat(e.target.value) : null,
                                  })
                                }
                                className="w-full text-sm px-2 py-1 border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                          )}
                          {settings?.trackSomaticCellCount && (
                            <div>
                              <label className="text-xs text-stone-500 block mb-0.5">SCC</label>
                              <input
                                type="number"
                                placeholder="200000"
                                value={vol.somatic_cell_count ?? ''}
                                onChange={(e) =>
                                  updateVolume(animal.id, {
                                    somatic_cell_count: e.target.value ? parseInt(e.target.value) : null,
                                  })
                                }
                                className="w-full text-sm px-2 py-1 border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                          )}
                          {settings?.trackLactoseContent && (
                            <div>
                              <label className="text-xs text-stone-500 block mb-0.5">Lactose (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="4.8"
                                value={vol.lactose_content ?? ''}
                                onChange={(e) =>
                                  updateVolume(animal.id, {
                                    lactose_content: e.target.value ? parseFloat(e.target.value) : null,
                                  })
                                }
                                className="w-full text-sm px-2 py-1 border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                          )}
                          {settings?.trackPhLevel && (
                            <div>
                              <label className="text-xs text-stone-500 block mb-0.5">pH</label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="6.7"
                                value={vol.ph_level ?? ''}
                                onChange={(e) =>
                                  updateVolume(animal.id, {
                                    ph_level: e.target.value ? parseFloat(e.target.value) : null,
                                  })
                                }
                                className="w-full text-sm px-2 py-1 border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      <div>
                        <label className="text-xs text-stone-500 block mb-0.5">Notes (optional)</label>
                        <textarea
                          rows={1}
                          placeholder="Any observations..."
                          value={vol.notes}
                          onChange={(e) => updateVolume(animal.id, { notes: e.target.value })}
                          className="w-full text-sm px-3 py-1.5 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-stone-200 pt-3 pb-1 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setStep(2)} className="gap-2" disabled={submitting}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {!allVolumesEntered && (
              <span className="text-xs text-stone-500">
                {selectedAnimals.filter(({ animal }) => volumeData[animal.id]?.milk_volume === null || volumeData[animal.id]?.milk_volume === undefined).length} volume{selectedAnimals.filter(({ animal }) => volumeData[animal.id]?.milk_volume === null || volumeData[animal.id]?.milk_volume === undefined).length !== 1 ? 's' : ''} remaining
              </span>
            )}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !allVolumesEntered}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Submitting…
                </>
              ) : (
                <>
                  Submit {selectedAnimals.length} Record{selectedAnimals.length !== 1 ? 's' : ''}
                  <Check className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <StepIndicator currentStep={step} />
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  )
}