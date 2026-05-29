'use client'

import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ProductionHistoricalContext } from './ProductionHistoricalContext'
import { ProductionHealthSection } from './ProductionHealthSection'
import { ProductionSettings } from '@/types/production-distribution-settings'
import {
  Search,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Droplets,
  Users,
  X,
  FlaskConical,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ClipboardList,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type ProductionFormData = {
  animal_id: string
  record_date: string
  milking_session: string
  milking_time?: string | null
  milk_volume: number
  milk_safety_status: 'safe' | 'unsafe_health' | 'unsafe_colostrum'
  temperature?: number | null
  mastitis_test_performed?: boolean
  mastitis_result?: 'negative' | 'mild' | 'severe' | null
  affected_quarters?: string[] | null
  fat_content?: number | null
  protein_content?: number | null
  somatic_cell_count?: number | null
  lactose_content?: number | null
  ph_level?: number | null
  notes?: string | null
}

interface IndividualRecordFormProps {
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
  onRecordSaved?: (animalId: string) => void
  closeAfterSuccess?: boolean
  sessionName?: string
  recordingType?: 'individual' | 'group'
  milkingGroupId?: string
  /** When set, the animal picker is skipped and this animal is pre-loaded */
  preSelectedAnimalId?: string
  editingRecord?: {
    id: string
    animal_id: string
    record_date: string
    milking_session_id: string
    milk_volume: number
    milk_safety_status: 'safe' | 'unsafe_health' | 'unsafe_colostrum'
    temperature?: number | null
    mastitis_test_performed?: boolean
    mastitis_result?: 'negative' | 'mild' | 'severe' | null
    affected_quarters?: string[] | null
    fat_content?: number | null
    protein_content?: number | null
    somatic_cell_count?: number | null
    lactose_content?: number | null
    ph_level?: number | null
    notes?: string | null
    milking_time?: string | null
  } | null
  /** When editing a record that was created via group recording */
  sourceRecordingType?: 'individual' | 'group'
  /** Group name the record was created under (only when sourceRecordingType === 'group') */
  sourceGroupName?: string
}

// ── Small UI helpers ──────────────────────────────────────────────────────────

function SafetyPill({ status }: { status?: string }) {
  const map: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
    safe:             { label: 'Safe',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',  Icon: ShieldCheck  },
    unsafe_health:    { label: 'Unsafe – Health', cls: 'bg-red-50 text-red-700 border-red-200',             Icon: ShieldAlert  },
    unsafe_colostrum: { label: 'Colostrum',       cls: 'bg-amber-50 text-amber-700 border-amber-200',       Icon: ShieldX      },
  }
  const { label, cls, Icon } = map[status ?? ''] ?? {
    label: 'Unknown',
    cls: 'bg-gray-100 text-gray-500 border-gray-200',
    Icon: ShieldCheck,
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 mt-1 text-xs text-red-600">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {message}
    </p>
  )
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-4 ${className}`}>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function IndividualRecordForm({
  farmId,
  animals,
  session,
  sessionId,
  recordDate,
  settings,
  onSuccess,
  onRecordSaved,
  closeAfterSuccess = true,
  recordingType = 'individual',
  milkingGroupId,
  sessionName,
  preSelectedAnimalId,
  editingRecord = null,
  sourceRecordingType,
  sourceGroupName,
}: IndividualRecordFormProps) {
  const [step, setStep] = useState<'select' | 'form'>(editingRecord ? 'form' : 'select')
  const [selectedAnimal, setSelectedAnimal] = useState<(typeof animals)[0] | null>(
    editingRecord ? animals.find(a => a.id === editingRecord.animal_id) || null : null
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [pickerQuery, setPickerQuery] = useState('')
  const [showAnimalPicker, setShowAnimalPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preRecordedAnimalIds, setPreRecordedAnimalIds] = useState<Set<string>>(new Set())
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [animalLactationNumbers, setAnimalLactationNumbers] = useState<Map<string, number>>(new Map())

  // Whether this edit originated from a group-mode record
  const isGroupEdit = sourceRecordingType === 'group' || recordingType === 'group'

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!editingRecord) {
      setStep('select')
      setSelectedAnimal(null)
      setSearchQuery('')
      setError(null)
      setSuccessMessage(null)
    }
  }, [recordDate, session])

  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 4000)
      return () => clearTimeout(t)
    }
  }, [successMessage])

  useEffect(() => {
    const fetchPreRecorded = async () => {
      try {
        const url = sessionName
          ? `/api/production?start_date=${recordDate}&end_date=${recordDate}&session_name=${encodeURIComponent(sessionName)}`
          : `/api/production?start_date=${recordDate}&end_date=${recordDate}`
        const res = await fetch(url)
        if (res.ok) {
          const result = await res.json()
          const records: any[] = Array.isArray(result.data) ? result.data : []
          setPreRecordedAnimalIds(new Set(records.map(r => r.animal_id)))
        } else {
          setPreRecordedAnimalIds(new Set())
        }
      } catch {
        setPreRecordedAnimalIds(new Set())
      }
    }
    fetchPreRecorded()
  }, [recordDate, session, sessionId, sessionName])

  // Fetch lactation cycle records to filter out heifers without calving history
  useEffect(() => {
    if (!farmId) return
    const fetchLactationData = async () => {
      try {
        const res = await fetch(`/api/farms/${farmId}/lactation-cycles`)
        if (res.ok) {
          const result = await res.json()
          const cycles: any[] = Array.isArray(result.data) ? result.data : []
          // Create a map of animal_id to max lactation_number
          const lactationMap = new Map<string, number>()
          cycles.forEach(cycle => {
            if (cycle.animal_id && cycle.lactation_number) {
              const existing = lactationMap.get(cycle.animal_id) || 0
              lactationMap.set(cycle.animal_id, Math.max(existing, cycle.lactation_number))
            }
          })
          setAnimalLactationNumbers(lactationMap)
        } else {
          setAnimalLactationNumbers(new Map())
        }
      } catch {
        setAnimalLactationNumbers(new Map())
      }
    }
    fetchLactationData()
  }, [farmId])

  useEffect(() => {
    if (!preSelectedAnimalId) return
    const animal = animals.find(a => a.id === preSelectedAnimalId)
    if (animal) {
      setSelectedAnimal(animal)
      setStep('form')
      setSearchQuery('')
      setError(null)
    }
  }, [preSelectedAnimalId, animals])

  // ── Validation schema ─────────────────────────────────────────────────────

  const productionSchema = useMemo(() => {
    const isQualityFocused = settings?.productionTrackingMode === 'quality_focused'
    const currentSession = settings?.milkingSessions?.find(s => s.id === session)
    const requiresMilkingTime = currentSession?.requiresTimeInput || false

    const numField = (required: boolean, label: string, min = 0, max = 100) => {
      const base = z.number().min(min).max(max).nullable().optional()
      return required
        ? base.refine(v => v != null, { message: `${label} is required` })
        : base
    }

    return z
      .object({
        animal_id: z.string().min(1, 'Animal is required'),
        record_date: z.string().min(1, 'Date is required'),
        milking_session: z.string().min(1, 'Session is required'),
        milking_time: requiresMilkingTime
          ? z.string().min(1, 'Exact milking time is required for this session')
          : z.string().optional().nullable(),
        milk_volume: z.number().min(0, 'Volume must not be negative').max(100, 'Volume seems too high'),
        milk_safety_status: z.enum(['safe', 'unsafe_health', 'unsafe_colostrum']),
        temperature: numField(false, 'Temperature', 35, 41),
        mastitis_test_performed: z.boolean().optional(),
        mastitis_result: z.enum(['negative', 'mild', 'severe']).nullable().optional(),
        affected_quarters: z.array(z.string()).nullable().optional(),
        fat_content: numField(isQualityFocused && !!settings?.fatContentRequired, 'Fat Content', 0, 15),
        protein_content: numField(isQualityFocused && !!settings?.proteinContentRequired, 'Protein Content', 0, 10),
        somatic_cell_count: numField(isQualityFocused && !!settings?.sccRequired, 'SCC', 0, 9999999),
        lactose_content: numField(isQualityFocused && !!settings?.lactoseRequired, 'Lactose', 0, 10),
        ph_level: numField(isQualityFocused && !!settings?.phRequired, 'pH Level', 0, 14),
        notes: z.string().nullable().optional(),
      })
      .refine(d => !(d.mastitis_test_performed === true && !d.mastitis_result), {
        message: 'Test result is required when mastitis test is performed',
        path: ['mastitis_result'],
      })
      .refine(d => !(d.mastitis_result === 'severe' && d.milk_safety_status !== 'unsafe_health'), {
        message: 'Milk safety must be "Unsafe – Health" when mastitis is severe',
        path: ['milk_safety_status'],
      })
  }, [settings, session])

  const getCurrentTime = () => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }

  const form = useForm<ProductionFormData>({
    resolver: zodResolver(productionSchema),
    mode: 'onBlur',
    defaultValues: {
      animal_id: editingRecord?.animal_id || selectedAnimal?.id || '',
      record_date: editingRecord?.record_date || recordDate,
      milking_session: editingRecord?.milking_session_id || session,
      milking_time: editingRecord?.milking_time || getCurrentTime(),
      milk_volume: editingRecord?.milk_volume ?? undefined,
      milk_safety_status: editingRecord?.milk_safety_status || 'safe',
      temperature: editingRecord?.temperature ?? null,
      mastitis_test_performed: editingRecord?.mastitis_test_performed ?? false,
      mastitis_result: editingRecord?.mastitis_result ?? null,
      affected_quarters: editingRecord?.affected_quarters ?? null,
      fat_content: editingRecord?.fat_content ?? null,
      protein_content: editingRecord?.protein_content ?? null,
      somatic_cell_count: editingRecord?.somatic_cell_count ?? null,
      lactose_content: editingRecord?.lactose_content ?? null,
      ph_level: editingRecord?.ph_level ?? null,
      notes: editingRecord?.notes || '',
    },
  })

  // Reset when pre-selected animal changes (group mode)
  useEffect(() => {
    if (!preSelectedAnimalId || editingRecord) return
    const animal = animals.find(a => a.id === preSelectedAnimalId)
    if (animal) {
      form.reset({
        animal_id: animal.id,
        record_date: recordDate,
        milking_session: session,
        milking_time: getCurrentTime(),
        milk_volume: undefined,
        milk_safety_status: 'safe',
        temperature: null,
        mastitis_test_performed: false,
        mastitis_result: null,
        affected_quarters: null,
        fat_content: null,
        protein_content: null,
        somatic_cell_count: null,
        lactose_content: null,
        ph_level: null,
        notes: '',
      })
    }
  }, [preSelectedAnimalId, animals, recordDate, session, editingRecord])

  const mastitisTestPerformed = form.watch('mastitis_test_performed')
  const mastitisResult = form.watch('mastitis_result')
  const showWithdrawalWarning =
    mastitisTestPerformed && (mastitisResult === 'mild' || mastitisResult === 'severe')

  useEffect(() => {
    if (mastitisResult === 'severe') {
      form.setValue('milk_safety_status', 'unsafe_health', { shouldValidate: true })
    } else if (mastitisResult === 'negative' || mastitisResult === null) {
      form.setValue('milk_safety_status', 'safe', { shouldValidate: true })
    }
  }, [mastitisResult, form])

  useEffect(() => {
    if (selectedAnimal) form.setValue('animal_id', selectedAnimal.id)
  }, [selectedAnimal])

  const isQualityVisible =
    settings &&
    settings.productionTrackingMode !== 'basic' &&
    (settings.trackFatContent ||
      settings.trackProteinContent ||
      settings.trackSomaticCellCount ||
      settings.trackLactoseContent ||
      settings.trackPhLevel ||
      settings.productionTrackingMode === 'quality_focused')

  // ── Eligible animals ──────────────────────────────────────────────────────

  const eligibleAnimals = useMemo(() => {
    let filtered = animals.filter(a => a.gender === 'female')
    const statuses = settings?.eligibleProductionStatuses || ['lactating']
    filtered = filtered.filter(a => statuses.includes(a.production_status))
    if (settings?.eligibleGenders?.length) {
      filtered = filtered.filter(a => settings.eligibleGenders?.includes(a.gender) ?? true)
    }
    // Filter out heifers: only include animals with lactation_number >= 1
    filtered = filtered.filter(a => {
      const isEditing = a.id === editingRecord?.animal_id
      const lactationNumber = animalLactationNumbers.get(a.id) || 0
      return isEditing || (lactationNumber >= 1 && !preRecordedAnimalIds.has(a.id))
    })
    return filtered
  }, [animals, settings, preRecordedAnimalIds, editingRecord?.animal_id, animalLactationNumbers])

  const filteredAnimals = useMemo(() => {
    if (!searchQuery.trim()) return eligibleAnimals
    const q = searchQuery.toLowerCase()
    return eligibleAnimals.filter(
      a => a.tag_number.toLowerCase().includes(q) || (a.name?.toLowerCase().includes(q) ?? false)
    )
  }, [eligibleAnimals, searchQuery])

  const pickerAnimals = useMemo(() => {
    const without = eligibleAnimals.filter(a => a.id !== selectedAnimal?.id)
    if (!pickerQuery.trim()) return without
    const q = pickerQuery.toLowerCase()
    return without.filter(
      a => a.tag_number.toLowerCase().includes(q) || (a.name?.toLowerCase().includes(q) ?? false)
    )
  }, [eligibleAnimals, selectedAnimal, pickerQuery])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const selectAnimal = (animal: (typeof animals)[0]) => {
    setSelectedAnimal(animal)
    form.setValue('animal_id', animal.id)
    setStep('form')
    setSearchQuery('')
    setError(null)
  }

  const selectNewAnimal = (animal: (typeof animals)[0]) => {
    setSelectedAnimal(animal)
    form.reset({
      animal_id: animal.id,
      record_date: recordDate,
      milking_session: session,
      milking_time: getCurrentTime(),
      milk_volume: undefined,
      milk_safety_status: 'safe',
      temperature: null,
      mastitis_test_performed: false,
      mastitis_result: null,
      affected_quarters: null,
      fat_content: null,
      protein_content: null,
      somatic_cell_count: null,
      lactose_content: null,
      ph_level: null,
      notes: '',
    })
    setShowAnimalPicker(false)
    setPickerQuery('')
    setError(null)
  }

  const createMastitisHealthIssue = async (
    animalId: string,
    result: 'mild' | 'severe',
    data: ProductionFormData
  ) => {
    try {
      const res = await fetch('/api/health/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animal_id: animalId,
          issue_type: 'illness',
          severity: result === 'severe' ? 'high' : 'medium',
          description: `Mastitis detected (${result}) during production recording`,
          notes: `Milk volume: ${data.milk_volume}L\nAffected quarters: ${data.affected_quarters?.join(', ') || 'Not specified'}`,
          symptoms: ['mastitis', result],
          alert_veterinarian: result === 'severe',
          first_observed_at: new Date().toISOString(),
          illness_temperature: data.temperature?.toString() || null,
          illness_milk_change: true,
          illness_onset_hours: '0',
          illness_other_animals: false,
          illness_appetite: null,
        }),
      })
      if (res.ok) {
        const severityLabel = result === 'severe' ? 'Severe Mastitis' : 'Mild Mastitis'
        const vetAlert = result === 'severe' ? ' Veterinarian has been alerted.' : ''
        setSuccessMessage(`Production record saved. Health issue created for ${severityLabel}.${vetAlert}`)
      }
    } catch {
      // Non-blocking
    }
  }

  const handleSubmit = async (data: ProductionFormData) => {
    if (settings?.requireMastitisTest && !data.mastitis_test_performed) {
      setError('Mastitis test is required before this record can be saved')
      return
    }
    const currentSession = settings?.milkingSessions?.find(s => s.id === session)
    if (currentSession?.requiresTimeInput && !data.milking_time) {
      setError('Please provide the exact milking time for this session')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const endpoint = editingRecord ? `/api/production/${editingRecord.id}` : '/api/production'
      const method = editingRecord ? 'PUT' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
          session_name: sessionName || 'Session',
          // When editing a group record, preserve the group recording type
          recording_type: editingRecord && sourceRecordingType ? sourceRecordingType : recordingType,
          milking_group_id: milkingGroupId || null,
          milking_session_id: sessionId || null,
          milking_time: data.milking_time || null,
          temperature: data.temperature === undefined ? null : data.temperature,
          mastitis_test_performed: data.mastitis_test_performed || false,
          mastitis_result: data.mastitis_result || null,
          affected_quarters: data.affected_quarters?.length ? data.affected_quarters : null,
          fat_content: data.fat_content === undefined ? null : data.fat_content,
          protein_content: data.protein_content === undefined ? null : data.protein_content,
          somatic_cell_count: data.somatic_cell_count === undefined ? null : data.somatic_cell_count,
          lactose_content: data.lactose_content === undefined ? null : data.lactose_content,
          ph_level: data.ph_level === undefined ? null : data.ph_level,
          notes: data.notes === '' ? null : data.notes,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Failed to ${editingRecord ? 'update' : 'save'} record`)
      }

      const animalId = data.animal_id

      if (!editingRecord) {
        setPreRecordedAnimalIds(prev => new Set([...prev, animalId]))
      }

      if (editingRecord) {
        setSuccessMessage('Production record updated successfully')
      }

      if (!editingRecord && (data.mastitis_result === 'mild' || data.mastitis_result === 'severe')) {
        await createMastitisHealthIssue(animalId, data.mastitis_result, data)
      }

      onRecordSaved?.(animalId)
      onSuccess?.()

      if (editingRecord) {
        setTimeout(() => {
          setSelectedAnimal(null)
          setStep('select')
        }, 1500)
      } else if (recordingType !== 'group') {
        setSelectedAnimal(null)
        setStep('select')
      }

      if (!editingRecord) {
        form.reset({
          animal_id: '',
          record_date: recordDate,
          milking_session: session,
          milking_time: getCurrentTime(),
          milk_volume: undefined,
          milk_safety_status: 'safe',
          temperature: null,
          mastitis_test_performed: false,
          mastitis_result: null,
          affected_quarters: null,
          notes: '',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 1: Animal picker ─────────────────────────────────────────────────

  if (step === 'select') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-base font-semibold text-gray-900">Select animal</h3>
          {preRecordedAnimalIds.size > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {preRecordedAnimalIds.size} animal{preRecordedAnimalIds.size > 1 ? 's' : ''} already recorded this session are hidden
            </p>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by tag or name…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Animal list */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {filteredAnimals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                <Droplets className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-600">No animals found</p>
              <p className="text-xs text-gray-400 mt-1">
                {eligibleAnimals.length === 0
                  ? 'No eligible animals available'
                  : 'Try a different search'}
              </p>
            </div>
          ) : (
            filteredAnimals.map(animal => (
              <button
                key={animal.id}
                onClick={() => selectAnimal(animal)}
                className="w-full flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                  <span className="text-sm font-bold text-emerald-700">
                    {animal.tag_number.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    #{animal.tag_number}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{animal.name || 'Unnamed'}</p>
                </div>
                <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {animal.production_status.replace(/_/g, ' ')}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  // ── Step 2: Recording form ────────────────────────────────────────────────

  if (!selectedAnimal) return null

  const milkSafetyStatus = form.watch('milk_safety_status')

  return (
    <div className="space-y-4">

      {/* ── Animal identity card ──────────────────────────────────────────── */}
      <SectionCard>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <span className="text-base font-bold text-emerald-700">
                {selectedAnimal.tag_number.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                #{selectedAnimal.tag_number}
                {selectedAnimal.name && (
                  <span className="font-normal text-gray-500 ml-1.5">· {selectedAnimal.name}</span>
                )}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Droplets className="w-3 h-3" />
                  {selectedAnimal.production_status.replace(/_/g, ' ')}
                </span>
                {/* Group-origin badge */}
                {isGroupEdit && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
                    <Users className="w-3 h-3" />
                    {sourceGroupName ? `Group: ${sourceGroupName}` : 'Group recording'}
                  </span>
                )}
                {editingRecord && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    Editing record
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Change animal — only shown when not editing */}
          {!editingRecord && (
            <button
              type="button"
              onClick={() => setShowAnimalPicker(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Change
            </button>
          )}
        </div>

        {/* Inline animal picker */}
        {showAnimalPicker && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600">Select a different animal</p>
              <button
                type="button"
                onClick={() => setShowAnimalPicker(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search…"
                value={pickerQuery}
                onChange={e => setPickerQuery(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div className="max-h-44 overflow-y-auto space-y-1">
              {pickerAnimals.length === 0 ? (
                <p className="text-xs text-center py-4 text-gray-400">No other animals available</p>
              ) : (
                pickerAnimals.map(animal => (
                  <button
                    key={animal.id}
                    type="button"
                    onClick={() => selectNewAnimal(animal)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-emerald-700">
                        {animal.tag_number.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">#{animal.tag_number}</p>
                      <p className="text-xs text-gray-400">{animal.name || 'Unnamed'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Status messages ───────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* ── Historical context ────────────────────────────────────────────── */}
      <ProductionHistoricalContext
        farmId={farmId}
        animalId={selectedAnimal.id}
        currentDate={recordDate}
        currentSession={session}
        currentSessionName={sessionName}
        sessions={settings?.milkingSessions}
      />

      {/* ── Main form ─────────────────────────────────────────────────────── */}
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">

        {/* Withdrawal warning */}
        {showWithdrawalWarning &&
          settings?.withdrawalDaysAfterTreatment &&
          settings.withdrawalDaysAfterTreatment > 0 && (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Withdrawal period:</strong> {settings.withdrawalDaysAfterTreatment} days must pass
                after any treatment before milk can be recorded as sale-ready.
              </p>
            </div>
          )}

        {/* ── Volume card ────────────────────────────────────────────────── */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Milk volume</p>
          </div>

          <div className="relative">
            <input
              id="milk_volume"
              type="number"
              step="0.1"
              placeholder="0.0"
              className="w-full text-3xl font-bold text-gray-900 pr-16 pl-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 placeholder:text-gray-300"
              {...form.register('milk_volume', { valueAsNumber: true })}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-semibold text-gray-400">
              {settings?.productionUnit || 'L'}
            </span>
          </div>
          <FieldError message={form.formState.errors.milk_volume?.message} />

          {/* Optional milking time */}
          {settings?.milkingSessions?.find(s => s.id === session)?.requiresTimeInput && (
            <div className="mt-3">
              <FieldLabel required>Exact milking time</FieldLabel>
              <input
                type="time"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                {...form.register('milking_time')}
              />
              <FieldError message={form.formState.errors.milking_time?.message} />
            </div>
          )}
        </SectionCard>

        {/* ── Health & Safety card ────────────────────────────────────────── */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Health & safety</p>
          </div>

          {/*
            ProductionHealthSection owns:
            - Temperature (single field, with inline high/low warning)
            - Mastitis toggle + result buttons + quarters + alerts
            The parent no longer renders a second temperature or safety-status field.
          */}
          <ProductionHealthSection form={form} settings={settings} />

          {/* Milk safety status — separate from mastitis, lives here in the parent */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <FieldLabel required>Milk safety status</FieldLabel>
              {mastitisResult === 'severe' && (
                <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  Auto-set: severe mastitis
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'safe',             label: 'Safe',      sublabel: 'Approved for sale',   cls: 'border-emerald-200 bg-emerald-50 text-emerald-800', activeCls: 'ring-2 ring-emerald-400 border-emerald-400' },
                { value: 'unsafe_health',    label: 'Unsafe',    sublabel: 'Animal health issue', cls: 'border-red-200 bg-red-50 text-red-800',             activeCls: 'ring-2 ring-red-400 border-red-400'         },
                { value: 'unsafe_colostrum', label: 'Colostrum', sublabel: 'Cannot sell',         cls: 'border-amber-200 bg-amber-50 text-amber-800',       activeCls: 'ring-2 ring-amber-400 border-amber-400'     },
              ] as const).map(opt => {
                const isActive   = milkSafetyStatus === opt.value
                const isDisabled = mastitisResult === 'severe' && opt.value !== 'unsafe_health'
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => form.setValue('milk_safety_status', opt.value, { shouldValidate: true })}
                    className={`flex flex-col items-center text-center px-2 py-2.5 rounded-xl border transition-all
                      ${opt.cls}
                      ${isActive ? opt.activeCls : 'opacity-60 hover:opacity-80'}
                      ${isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                  >
                    <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                    <span className="text-[10px] opacity-75 mt-0.5 leading-tight">{opt.sublabel}</span>
                  </button>
                )
              })}
            </div>
            {mastitisResult === 'severe' && (
              <p className="text-xs text-red-600 mt-1.5">
                Safety is locked to "Unsafe – Health" while mastitis result is severe.
              </p>
            )}
            <FieldError message={form.formState.errors.milk_safety_status?.message} />
          </div>
        </SectionCard>

        {/* ── Quality parameters card ──────────────────────────────────────── */}
        {isQualityVisible && (
          <SectionCard>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-violet-600" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Quality parameters</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {settings?.trackFatContent && (
                <div>
                  <FieldLabel required={settings.productionTrackingMode === 'quality_focused' && !!settings.fatContentRequired}>
                    Fat content (%)
                  </FieldLabel>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="3.75"
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    {...form.register('fat_content', {
                      valueAsNumber: true,
                      setValueAs: v => (v === '' ? null : parseFloat(v) || null),
                    })}
                  />
                  <FieldError message={form.formState.errors.fat_content?.message as string | undefined} />
                </div>
              )}
              {settings?.trackProteinContent && (
                <div>
                  <FieldLabel required={settings.productionTrackingMode === 'quality_focused' && !!settings.proteinContentRequired}>
                    Protein (%)
                  </FieldLabel>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="3.25"
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    {...form.register('protein_content', {
                      valueAsNumber: true,
                      setValueAs: v => (v === '' ? null : parseFloat(v) || null),
                    })}
                  />
                  <FieldError message={form.formState.errors.protein_content?.message as string | undefined} />
                </div>
              )}
              {settings?.trackSomaticCellCount && (
                <div>
                  <FieldLabel required={settings.productionTrackingMode === 'quality_focused' && !!settings.sccRequired}>
                    SCC (cells/ml)
                  </FieldLabel>
                  <input
                    type="number"
                    placeholder="200000"
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    {...form.register('somatic_cell_count', {
                      valueAsNumber: true,
                      setValueAs: v => (v === '' ? null : parseInt(v) || null),
                    })}
                  />
                  <FieldError message={form.formState.errors.somatic_cell_count?.message as string | undefined} />
                </div>
              )}
              {settings?.trackLactoseContent && (
                <div>
                  <FieldLabel required={settings.productionTrackingMode === 'quality_focused' && !!settings.lactoseRequired}>
                    Lactose (%)
                  </FieldLabel>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="4.8"
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    {...form.register('lactose_content', {
                      valueAsNumber: true,
                      setValueAs: v => (v === '' ? null : parseFloat(v) || null),
                    })}
                  />
                  <FieldError message={form.formState.errors.lactose_content?.message as string | undefined} />
                </div>
              )}
              {settings?.trackPhLevel && (
                <div>
                  <FieldLabel required={settings.productionTrackingMode === 'quality_focused' && !!settings.phRequired}>
                    pH level
                  </FieldLabel>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="6.7"
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    {...form.register('ph_level', {
                      valueAsNumber: true,
                      setValueAs: v => (v === '' ? null : parseFloat(v) || null),
                    })}
                  />
                  <FieldError message={form.formState.errors.ph_level?.message as string | undefined} />
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* ── Notes card ───────────────────────────────────────────────────── */}
        <SectionCard>
          <FieldLabel>Notes & observations</FieldLabel>
          <textarea
            rows={2}
            placeholder="Any additional observations about this animal…"
            className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none placeholder:text-gray-400"
            {...form.register('notes', {
              setValueAs: v => (v === '' ? null : v),
            })}
          />
        </SectionCard>

        {/* ── Submit row ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 pt-1 pb-2">
          {!editingRecord && (
            <button
              type="button"
              onClick={() => { setShowAnimalPicker(false); setStep('select') }}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <Button
            type="submit"
            disabled={loading || !form.formState.isValid}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? (
              <><LoadingSpinner size="sm" /> Saving…</>
            ) : editingRecord ? (
              <><CheckCircle2 className="w-4 h-4" /> Update record</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Save record</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}