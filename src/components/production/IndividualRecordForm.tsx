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
import { Search, ChevronLeft, AlertCircle } from 'lucide-react'

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
}

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
}: IndividualRecordFormProps) {
  const [step, setStep] = useState<'select' | 'form'>(editingRecord ? 'form' : 'select')
  const [selectedAnimal, setSelectedAnimal] = useState<typeof animals[0] | null>(
    editingRecord ? animals.find(a => a.id === editingRecord.animal_id) || null : null
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [pickerQuery, setPickerQuery] = useState('')
  const [showAnimalPicker, setShowAnimalPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preRecordedAnimalIds, setPreRecordedAnimalIds] = useState<Set<string>>(new Set())
  const [successMessage, setSuccessMessage] = useState<string | null>(null)



  // Reset form when date or session changes
  useEffect(() => {
    setStep('select')
    setSelectedAnimal(null)
    setSearchQuery('')
    setError(null)
    setSuccessMessage(null)
  }, [recordDate, session])

  // Auto-dismiss success message after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Fetch already-recorded animals for this date and session
  useEffect(() => {
    const fetchPreRecordedAnimals = async () => {
      try {
        // Filter server-side by session_name (resolves to milking_sessions UUIDs)
        const url = sessionName
          ? `/api/production?start_date=${recordDate}&end_date=${recordDate}&session_name=${encodeURIComponent(sessionName)}`
          : `/api/production?start_date=${recordDate}&end_date=${recordDate}`

        const response = await fetch(url)

        if (response.ok) {
          const result = await response.json()
          const records = Array.isArray(result.data) ? result.data : []

          // Server already filters by milking_session_id when sessionId is provided.
          // Client-side guard: if no sessionId was sent, fall back to matching by sessionId field.
          const preRecordedIds = new Set<string>(records.map((r: any) => r.animal_id))

          setPreRecordedAnimalIds(preRecordedIds)
        } else {
          const errBody = await response.json().catch(() => ({}))
          setPreRecordedAnimalIds(new Set())
        }
      } catch (err) {
        setPreRecordedAnimalIds(new Set())
      }
    }

    fetchPreRecordedAnimals()
  }, [recordDate, session, sessionId, sessionName])

  // Auto-select the pre-chosen animal when provided (group recording mode)
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

  // Schema with dynamic validation
  const productionSchema = useMemo(() => {
    const isQualityFocused = settings?.productionTrackingMode === 'quality_focused'
    
    // Find current session to check if milking time is required
    const currentSession = settings?.milkingSessions?.find(s => s.id === session)
    const requiresMilkingTime = currentSession?.requiresTimeInput || false
    
    const createNumberSchema = (isRequired: boolean, label: string, min = 0, max = 100) => {
      const schema = z.number()
        .min(min, `${label} must be at least ${min}`)
        .max(max, `${label} cannot exceed ${max}`)
        .nullable()
        .optional()
      
      if (isRequired) {
        return schema.refine((val) => val !== null && val !== undefined, {
          message: `${label} is required`
        })
      }
      return schema
    }

    return z.object({
      animal_id: z.string().min(1, 'Animal is required'),
      record_date: z.string().min(1, 'Date is required'),
      milking_session: z.string().min(1, 'Session is required'),
      milking_time: requiresMilkingTime 
        ? z.string().min(1, 'Exact milking time is required for this session')
        : z.string().optional().nullable(),
      milk_volume: z.number()
        .min(0, 'Volume must not be negative')
        .max(100, 'Volume seems too high'),
      milk_safety_status: z.enum(['safe', 'unsafe_health', 'unsafe_colostrum']),
      temperature: createNumberSchema(false, 'Temperature', 35, 41),
      mastitis_test_performed: z.boolean().optional(),
      mastitis_result: z.enum(['negative', 'mild', 'severe']).nullable().optional(),
      affected_quarters: z.array(z.string()).nullable().optional(),
      fat_content: createNumberSchema(isQualityFocused && !!settings?.fatContentRequired, 'Fat Content', 0, 15),
      protein_content: createNumberSchema(isQualityFocused && !!settings?.proteinContentRequired, 'Protein Content', 0, 10),
      somatic_cell_count: createNumberSchema(isQualityFocused && !!settings?.sccRequired, 'SCC', 0, 9999999),
      lactose_content: createNumberSchema(isQualityFocused && !!settings?.lactoseRequired, 'Lactose', 0, 10),
      ph_level: createNumberSchema(isQualityFocused && !!settings?.phRequired, 'pH Level', 0, 14),
      notes: z.string().nullable().optional(),
    }).refine(
      (data) => {
        // If mastitis test is performed, result must be provided
        // Only validate if mastitis_test_performed is explicitly true
        if (data.mastitis_test_performed === true && !data.mastitis_result) {
          return false
        }
        return true
      },
      {
        message: 'Test result is required when mastitis test is performed',
        path: ['mastitis_result']
      }
    ).refine(
      (data) => {
        // If mastitis result is severe, milk safety status must be unsafe_health
        if (data.mastitis_result === 'severe' && data.milk_safety_status !== 'unsafe_health') {
          return false
        }
        return true
      },
      {
        message: 'Milk safety status must be marked as "Unsafe - Animal Health Issue" when mastitis result is severe',
        path: ['milk_safety_status']
      }
    )
  }, [settings, session])

  // Get current time in HH:MM format for default milking time
  const getCurrentTime = () => {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
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
      mastitis_test_performed: editingRecord?.mastitis_test_performed ?? (settings?.requireMastitisTest ? false : false),
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

  // Reset form when a new animal is pre-selected in group mode (but not when editing)
  useEffect(() => {
    if (!preSelectedAnimalId || editingRecord) {
      return
    }
    
    // Calculate current time in HH:MM format
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const currentTime = `${hours}:${minutes}`
    
    const animal = animals.find(a => a.id === preSelectedAnimalId)
    if (animal) {
      
      form.reset({
        animal_id: animal.id,
        record_date: recordDate,
        milking_session: session,
        milking_time: currentTime,
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
      }, {
        keepErrors: false,
        keepDirty: false,
        keepTouched: false,
        keepIsSubmitted: false,
        keepIsValidating: false,
        keepIsValid: false,
      })
    }
  }, [preSelectedAnimalId, animals, recordDate, session, editingRecord, form])

  // Watch mastitis result to conditionally show withdrawal period banner
  const mastitisTestPerformed = form.watch('mastitis_test_performed')
  const mastitisResult = form.watch('mastitis_result')
  const milkSafetyStatus = form.watch('milk_safety_status')
  const showWithdrawalWarning = mastitisTestPerformed && (mastitisResult === 'mild' || mastitisResult === 'severe')



  // Auto-update milk safety status when severe mastitis is detected
  useEffect(() => {
    if (mastitisResult === 'severe') {
      // Automatically set safety status to unsafe due to animal health when severe mastitis is detected
      form.setValue('milk_safety_status', 'unsafe_health', { shouldValidate: true })
    } else if (mastitisResult === 'negative' || mastitisResult === null) {
      // When mastitis is negative or cleared, reset to safe
      form.setValue('milk_safety_status', 'safe', { shouldValidate: true })
    }
  }, [mastitisResult, form])

  // Update form when animal is selected
  useEffect(() => {
    if (selectedAnimal) {
      form.setValue('animal_id', selectedAnimal.id)
    }
  }, [selectedAnimal])

  // Check if quality parameters should be visible
  // Hide quality parameters if tracking mode is 'basic' (volume only)
  const isQualityVisible = settings && settings.productionTrackingMode !== 'basic' && (
    settings.trackFatContent ||
    settings.trackProteinContent ||
    settings.trackSomaticCellCount ||
    settings.trackLactoseContent ||
    settings.trackPhLevel ||
    settings.productionTrackingMode === 'quality_focused'
  )

  // Filter eligible animals based on production settings
  const eligibleAnimals = useMemo(() => {
    const baseAnimals = animals.filter(a => a.gender === 'female')
    
    if (!settings) {
      // If no settings, default to lactating only
      let filtered = baseAnimals.filter(a => a.production_status === 'lactating')
      filtered = filtered.filter(a => {
        const isEditing = a.id === editingRecord?.animal_id
        const isPreRecorded = preRecordedAnimalIds.has(a.id)
        const keep = isEditing || !isPreRecorded
        return keep
      })
      return filtered
    }

    // Apply gender filter from settings
    let filtered = baseAnimals
    
    // Apply eligible statuses from settings
    const eligibleStatuses = settings.eligibleProductionStatuses || ['lactating']
    const beforeStatusFilter = filtered.length
    filtered = filtered.filter(a => {
      const included = eligibleStatuses.includes(a.production_status)
      return included
    })
    
    // Filter by eligible genders if specified
    if (settings.eligibleGenders && settings.eligibleGenders.length > 0) {
      const beforeGenderFilter = filtered.length
      filtered = filtered.filter(a => settings.eligibleGenders?.includes(a.gender) ?? true)
    }
    
    // Exclude pre-recorded animals EXCEPT the one being edited
    const beforeExcludePreRecorded = filtered.length
    filtered = filtered.filter(a => {
      const isEditing = a.id === editingRecord?.animal_id
      const isPreRecorded = preRecordedAnimalIds.has(a.id)
      const keep = isEditing || !isPreRecorded
      return keep
    })
    
    // TODO: Add these filters when animal object includes required properties
    // - minAnimalAgeMonths: requires animal birth_date
    // - maxDaysInMilk: requires animal lactation_start_date
    // - excludeSickAnimals: requires animal health_status
    // - excludeTreatmentWithdrawal: requires animal active_treatments
    
    return filtered
  }, [animals, settings, preRecordedAnimalIds, editingRecord?.animal_id])

  // Filter based on search query (select step)
  const filteredAnimals = useMemo(() => {
    if (!searchQuery.trim()) {
      return eligibleAnimals
    }
    const query = searchQuery.toLowerCase()
    const result = eligibleAnimals.filter(a =>
      a.tag_number.toLowerCase().includes(query) ||
      (a.name?.toLowerCase().includes(query) ?? false)
    )
    return result
  }, [eligibleAnimals, searchQuery])

  // Animals available in the inline picker (exclude currently selected animal)
  const pickerAnimals = useMemo(() => {
    const withoutCurrent = eligibleAnimals.filter(a => a.id !== selectedAnimal?.id)
    if (!pickerQuery.trim()) return withoutCurrent
    const query = pickerQuery.toLowerCase()
    return withoutCurrent.filter(a =>
      a.tag_number.toLowerCase().includes(query) ||
      (a.name?.toLowerCase().includes(query) ?? false)
    )
  }, [eligibleAnimals, selectedAnimal, pickerQuery])

  const selectAnimal = (animal: typeof animals[0]) => {
    setSelectedAnimal(animal)
    form.setValue('animal_id', animal.id)
    setStep('form')
    setSearchQuery('')
    setError(null)
  }

  const handleChangeAnimal = () => {
    setShowAnimalPicker(true)
    setPickerQuery('')
  }

  const selectNewAnimal = (animal: typeof animals[0]) => {
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

  // Helper function to create health issue for mastitis
  const createMastitisHealthIssue = async (
    animalId: string,
    mastitisResult: 'mild' | 'severe',
    data: ProductionFormData
  ) => {
    try {
      // Map mastitis severity to health issue severity
      const healthSeverity = mastitisResult === 'severe' ? 'high' : 'medium'
      const shouldAlertVeterinarian = mastitisResult === 'severe'

      const healthIssuePayload = {
        animal_id: animalId,
        issue_type: 'illness',
        severity: healthSeverity,
        description: `Mastitis detected (${mastitisResult}) during production recording`,
        notes: `Milk volume: ${data.milk_volume}L\nAffected quarters: ${data.affected_quarters?.join(', ') || 'Not specified'}\nRecording notes: ${data.notes || 'None'}`,
        symptoms: ['mastitis', mastitisResult],
        alert_veterinarian: shouldAlertVeterinarian,
        first_observed_at: new Date().toISOString(),
        // Illness-specific fields
        illness_temperature: data.temperature?.toString() || null,
        illness_milk_change: true,
        illness_onset_hours: '0',
        illness_other_animals: false,
        illness_appetite: null,
      }

      const healthResponse = await fetch('/api/health/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(healthIssuePayload),
      })

      if (!healthResponse.ok) {
        const errorData = await healthResponse.json()
        // Don't throw - health issue creation failure shouldn't prevent production record from being saved
      } else {
        const healthData = await healthResponse.json()
        
        // Set success message
        const severityLabel = mastitisResult === 'severe' ? 'Severe Mastitis' : 'Mild Mastitis'
        const veterinarianAlert = shouldAlertVeterinarian ? ' Veterinarian has been alerted.' : ''
        setSuccessMessage(`✓ Production record saved. Health issue created for ${severityLabel}.${veterinarianAlert}`)
        
        return true
      }
    } catch (err) {
      // Don't throw - we don't want to fail the production record save if health issue creation fails
    }
    return false
  }

  const handleSubmit = async (data: ProductionFormData) => {
    // Validate mastitis test requirement at submission time
    if (settings?.requireMastitisTest && !data.mastitis_test_performed) {
      setError('Mastitis test is required for this record before it can be saved')
      return
    }
    
    // Find current session to check if milking time input is required
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
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
          session_name: sessionName || 'Session',   // used by server to resolve milking_sessions UUID
          recording_type: recordingType,
          milking_group_id: milkingGroupId || null,
          milking_session_id: sessionId || null,    // kept for reference; server resolves the real UUID
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

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${editingRecord ? 'update' : 'save'} record`)
      }

      const animalId = data.animal_id

      // Mark as recorded so the change-animal picker excludes it immediately (only for new records)
      if (!editingRecord) {
        setPreRecordedAnimalIds(prev => new Set([...prev, animalId]))
      }

      // Set success message
      if (editingRecord) {
        setSuccessMessage('✓ Production record updated successfully')
      }

      // Create health issue if mastitis is detected (mild or severe) - only for new records
      if (!editingRecord && (data.mastitis_result === 'mild' || data.mastitis_result === 'severe')) {
        await createMastitisHealthIssue(animalId, data.mastitis_result, data)
      }

      // For group mode: notify parent without closing
      if (onRecordSaved) {
        onRecordSaved(animalId)
      }

      // For individual mode: close if configured to do so
      if (closeAfterSuccess && onSuccess) {
        onSuccess()
      }

      // When editing, go back to animal selection after showing success message
      if (editingRecord) {
        setTimeout(() => {
          setSelectedAnimal(null)
          setStep('select')
        }, 1500)
      } else if (recordingType !== 'group') {
        // For new records in individual mode, reset form
        setSelectedAnimal(null)
        setStep('select')
      }

      // Reset form for new records, but keep data for editing (will auto-dismiss with success message)
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

  if (step === 'select') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select Animal</h3>
        
        {preRecordedAnimalIds.size > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <p>ℹ️ <strong>{preRecordedAnimalIds.size} animal{preRecordedAnimalIds.size > 1 ? 's' : ''}</strong> {preRecordedAnimalIds.size > 1 ? 'have' : 'has'} already been recorded in this session and {preRecordedAnimalIds.size > 1 ? 'are' : 'is'} hidden from the list below.</p>
          </div>
        )}
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-stone-400" />
          <input
            type="text"
            placeholder="Search by animal ID or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Animal List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredAnimals.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <p className="text-sm">
                {eligibleAnimals.length === 0
                  ? 'No lactating animals available'
                  : 'No animals match your search'}
              </p>
            </div>
          ) : (
            filteredAnimals.map(animal => (
              <button
                key={animal.id}
                onClick={() => selectAnimal(animal)}
                className="w-full flex items-center space-x-3 p-3 border border-stone-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
              >
                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-green-700">
                    {animal.tag_number.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-900">{animal.tag_number}</p>
                  <p className="text-sm text-stone-500">{animal.name || 'Unnamed'}</p>
                </div>

                {/* Status Badge */}
                <div className="flex-shrink-0 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                  Lactating
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  // Step 2: Record Form
  if (!selectedAnimal) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Animal Header */}
      <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-200">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-sm font-bold text-green-700">
              {selectedAnimal.tag_number.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-stone-900">{selectedAnimal.tag_number}</p>
            <p className="text-sm text-stone-500">{selectedAnimal.name || 'Unnamed'}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleChangeAnimal}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Change Animal
        </Button>
      </div>

      {/* Inline animal picker */}
      {showAnimalPicker && (
        <div className="border border-stone-200 rounded-lg bg-white shadow-md p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-stone-700">Select a different animal</p>
            <button
              type="button"
              onClick={() => setShowAnimalPicker(false)}
              className="text-xs text-stone-500 hover:text-stone-800"
            >
              Cancel
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by tag or name..."
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-4 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {pickerAnimals.length === 0 ? (
              <p className="text-sm text-center py-4 text-stone-500">No other unmilked animals</p>
            ) : (
              pickerAnimals.map(animal => (
                <button
                  key={animal.id}
                  type="button"
                  onClick={() => selectNewAnimal(animal)}
                  className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-green-50 hover:border-green-300 border border-transparent transition-colors text-left"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-xs font-semibold text-green-700">
                      {animal.tag_number.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900">{animal.tag_number}</p>
                    <p className="text-xs text-stone-500">{animal.name || 'Unnamed'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2 text-green-700 text-sm">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p>{successMessage}</p>
        </div>
      )}

      {/* Show all form validation errors for debugging */}
      {(() => {
        const filteredErrors = Object.entries(form.formState.errors).filter(([field]) => field !== 'milking_time');
        return filteredErrors.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-semibold text-yellow-800 mb-2">Validation Errors:</p>
            <ul className="text-sm text-yellow-700 space-y-1">
              {filteredErrors.map(([field, error]: any) => (
                <li key={field}>• {field}: {error?.message || 'Invalid'}</li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* Historical Context Panel */}
      <ProductionHistoricalContext
        farmId={farmId}
        animalId={selectedAnimal.id}
        currentDate={recordDate}
        currentSession={session}
        currentSessionName={sessionName}
        sessions={settings?.milkingSessions}
      />

      {/* Form */}
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Withdrawal Days Warning - Only show if mastitis test is positive (mild or severe) */}
        {showWithdrawalWarning && settings?.withdrawalDaysAfterTreatment && settings.withdrawalDaysAfterTreatment > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Withdrawal Period:</strong> {settings.withdrawalDaysAfterTreatment} days must pass after any treatment before milk from this animal can be recorded as sale-ready.
            </p>
          </div>
        )}

        {/* Milk Quantity */}
        <div>
          <Label htmlFor="milk_volume">Milk Quantity ({settings?.productionUnit || 'Liters'}) *</Label>
          <div className="relative mt-2">
            <Input
              id="milk_volume"
              type="number"
              step="0.1"
              placeholder="0.0"
              className="text-2xl font-semibold"
              {...form.register('milk_volume', { valueAsNumber: true })}
            />
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-lg font-medium text-stone-500">
              {settings?.productionUnit || 'L'}
            </span>
          </div>
          {form.formState.errors.milk_volume && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.milk_volume.message}</p>
          )}
        </div>

        {/* Milking Time - Conditionally Required */}
        {settings?.milkingSessions?.find(s => s.id === session)?.requiresTimeInput && (
          <div>
            <Label htmlFor="milking_time">Exact Milking Time *</Label>
            <Input
              id="milking_time"
              type="time"
              placeholder="HH:MM"
              className="mt-2"
              {...form.register('milking_time')}
            />
            {form.formState.errors.milking_time && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.milking_time.message}</p>
            )}
            <p className="text-xs text-stone-600 mt-1">
              Record the exact time the animal was milked
            </p>
          </div>
        )}

        {/* Health & Safety Section */}
        <ProductionHealthSection
          form={form}
          settings={settings}
        />

        {/* Milk Safety Status */}
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="milk_safety_status">Milk Safety Status *</Label>
            {mastitisResult === 'severe' && (
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                Auto-set: Severe Mastitis
              </span>
            )}
          </div>
          <select
            id="milk_safety_status"
            {...form.register('milk_safety_status')}
            disabled={mastitisResult === 'severe'}
            className={`w-full mt-2 px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
              mastitisResult === 'severe' ? 'bg-red-50 cursor-not-allowed opacity-75' : ''
            }`}
          >
            <option value="safe">✓ Safe - Approved for Sale</option>
            <option value="unsafe_health">⚠️ Unsafe - Animal Health Issue</option>
            <option value="unsafe_colostrum">✖️ Unsafe - Colostrum (Cannot Sell)</option>
          </select>
          {mastitisResult === 'severe' && (
            <p className="text-xs text-red-600 mt-2 px-2 py-1 bg-red-50 rounded border border-red-200">
              ℹ️ When mastitis test result is <strong>severe</strong>, milk is automatically marked as <strong>unsafe due to animal health issue</strong>. You cannot change this status until the mastitis result is updated.
            </p>
          )}
          {form.formState.errors.milk_safety_status && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.milk_safety_status.message}</p>
          )}
        </div>

        {/* Quality Parameters */}
        {isQualityVisible && (
          <div className="space-y-4 pt-4 border-t border-stone-200">
            <h4 className="text-sm font-medium text-stone-700">Quality Parameters</h4>
            <div className="grid grid-cols-2 gap-4">
              {settings?.trackFatContent && (
                <div>
                  <Label htmlFor="fat_content">
                    Fat Content (%) {settings.productionTrackingMode === 'quality_focused' && settings.fatContentRequired && '*'}
                  </Label>
                  <Input
                    id="fat_content"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 3.75"
                    {...form.register('fat_content', {
                      valueAsNumber: true,
                      setValueAs: (value) => value === '' ? null : parseFloat(value) || null
                    })}
                  />
                  {form.formState.errors.fat_content && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.fat_content.message}</p>
                  )}
                </div>
              )}

              {settings?.trackProteinContent && (
                <div>
                  <Label htmlFor="protein_content">
                    Protein (%) {settings.productionTrackingMode === 'quality_focused' && settings.proteinContentRequired && '*'}
                  </Label>
                  <Input
                    id="protein_content"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 3.25"
                    {...form.register('protein_content', {
                      valueAsNumber: true,
                      setValueAs: (value) => value === '' ? null : parseFloat(value) || null
                    })}
                  />
                  {form.formState.errors.protein_content && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.protein_content.message}</p>
                  )}
                </div>
              )}

              {settings?.trackSomaticCellCount && (
                <div>
                  <Label htmlFor="somatic_cell_count">
                    SCC {settings.productionTrackingMode === 'quality_focused' && settings.sccRequired && '*'}
                  </Label>
                  <Input
                    id="somatic_cell_count"
                    type="number"
                    placeholder="e.g., 200000"
                    {...form.register('somatic_cell_count', {
                      valueAsNumber: true,
                      setValueAs: (value) => value === '' ? null : parseInt(value) || null
                    })}
                  />
                  {form.formState.errors.somatic_cell_count && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.somatic_cell_count.message}</p>
                  )}
                </div>
              )}

              {settings?.trackLactoseContent && (
                <div>
                  <Label htmlFor="lactose_content">
                    Lactose (%) {settings.productionTrackingMode === 'quality_focused' && settings.lactoseRequired && '*'}
                  </Label>
                  <Input
                    id="lactose_content"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 4.8"
                    {...form.register('lactose_content', {
                      valueAsNumber: true,
                      setValueAs: (value) => value === '' ? null : parseFloat(value) || null
                    })}
                  />
                  {form.formState.errors.lactose_content && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.lactose_content.message}</p>
                  )}
                </div>
              )}

              {settings?.trackPhLevel && (
                <div>
                  <Label htmlFor="ph_level">
                    pH Level {settings.productionTrackingMode === 'quality_focused' && settings.phRequired && '*'}
                  </Label>
                  <Input
                    id="ph_level"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 6.7"
                    {...form.register('ph_level', {
                      valueAsNumber: true,
                      setValueAs: (value) => value === '' ? null : parseFloat(value) || null
                    })}
                  />
                  {form.formState.errors.ph_level && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.ph_level.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes / Observations</Label>
          <textarea
            id="notes"
            rows={3}
            placeholder="Any additional observations about this animal..."
            className="w-full mt-2 px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            {...form.register('notes', {
              setValueAs: (value) => value === '' ? null : value
            })}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-stone-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleChangeAnimal}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !form.formState.isValid}
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Save Record'}
          </Button>
        </div>
      </form>
    </div>
  )
}
