// src/components/animals/NewbornCalfForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Activity, CheckCircle2, Clock, TrendingUp, Calendar,
  Syringe, UserCheck, Baby, XCircle, ChevronDown, ChevronUp,
  Droplets, AlertTriangle, Info, Heart, FileText
} from 'lucide-react'

// ── Service record per breeding cycle ─────────────────────────────────────────
interface ServiceRecord {
  cycle_number: number
  service_date: string
  service_method: string
  bull_name: string
  bull_code: string
  semen_type: string
  ai_technician: string
  service_outcome: string
  steaming_date: string
  expected_calving_date: string
  actual_calving_date: string
  calving_outcome: string
  calving_time: string
  colostrum_produced: string
  days_in_milk: string
}

function emptyRecord(cycle: number): ServiceRecord {
  return {
    cycle_number: cycle,
    service_date: '', service_method: '', bull_name: '', bull_code: '',
    semen_type: '', ai_technician: '', service_outcome: '', steaming_date: '',
    expected_calving_date: '', actual_calving_date: '', calving_outcome: '',
    calving_time: '', colostrum_produced: '', days_in_milk: '',
  }
}
import { z } from 'zod'
import { CollapsibleFormSection } from './CollapsibleFormSection'
import {
  countBasicInfoFields,
  countParentageFields,
  countHealthPhysicalFields,
  countLactatingFields,
  countServedFields,
  countSteamingDryCowsFields,
  countOpenDryCowsFields,
  countAdditionalInfoFields,
} from '@/lib/utils/formFieldCounters'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { getProductionStatusDisplay } from '@/lib/utils/productionStatusUtils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { TagGenerationSection } from './TagGenerationSection' // Import the component we created
import { getCustomAttributesForTag } from '@/lib/utils/animalTagAttributes'

// Updated validation schema - tag_number now optional since it can be auto-generated
const newbornCalfSchema = z.object({
  tag_number: z.string().optional(), // Now optional since auto-generation is available
  name: z.string().optional(),
  breed: z.string().min(1, 'Breed is required'),
  gender: z.enum(['male', 'female'], {
    required_error: 'Gender is required',
  }),
  birth_date: z.string().min(1, 'Birth date is required'),
  mother_id: z.string().min(1, 'Mother selection is required'),
  father_info: z.string().optional(),
  health_status: z.enum(['healthy', 'sick', 'requires_attention', 'quarantined'], {
    required_error: 'Health status is required',
  }),
  birth_weight: z.number().positive().optional(),
  notes: z.string().optional(),
  // Add these for tag generation
  autoGenerateTag: z.boolean().optional(),
})

type NewbornCalfFormData = z.infer<typeof newbornCalfSchema>

interface Animal {
  id: string
  tag_number: string
  name?: string
  breed: string
  gender: 'male' | 'female'
  production_status?: string
}

interface NewbornCalfFormProps {
  farmId: string
  onSuccess: (animal: any) => void
  onCancel: () => void
  editingAnimal?: any  // ✅ NEW: Optional animal for edit mode
  isEditMode?: boolean  // ✅ NEW: Flag indicating edit mode
}

export function NewbornCalfForm({ farmId, onSuccess, onCancel, editingAnimal, isEditMode = false }: NewbornCalfFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableMothers, setAvailableMothers] = useState<Animal[]>([])
  const [loadingMothers, setLoadingMothers] = useState(true)

  // ✅ NEW: Section expansion state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([
    'basic-info',
    'parentage',
    'health-physical',
    'additional-info'
  ]))

  const [calculatedProductionStatus, setCalculatedProductionStatus] = useState<string>('calf')
  const [calculatingStatus, setCalculatingStatus] = useState(false)
  const [matchingCategory, setMatchingCategory] = useState<{ id: string; name: string } | null>(null)
  const [ageInDays, setAgeInDays] = useState<number>(0)
  const [ageInMonths, setAgeInMonths] = useState<number>(0)

  // Production status override + service record state
  const [selectedProductionStatus, setSelectedProductionStatus] = useState<string>('calf')
  const [lactationNumber, setLactationNumber] = useState<number | ''>('')
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([])
  const [expandedCycles, setExpandedCycles] = useState<Set<number>>(new Set())

  // ✅ NEW: Production-status-specific state
  const [currentMilkProduction, setCurrentMilkProduction] = useState<number | ''>('')
  const [currentLactationNumber, setCurrentLactationNumber] = useState<number | ''>('')
  const [breedingCycleNumber, setBreedingCycleNumber] = useState<number | ''>('')
  const [lastBreedingCycleNumber, setLastBreedingCycleNumber] = useState<number | ''>('')


  const form = useForm<NewbornCalfFormData>({
    resolver: zodResolver(newbornCalfSchema),
    defaultValues: isEditMode && editingAnimal ? {
      tag_number: editingAnimal.tag_number || '',
      name: editingAnimal.name || '',
      breed: editingAnimal.breed || 'holstein',
      gender: editingAnimal.gender || 'female',
      health_status: editingAnimal.health_status || 'healthy',
      birth_date: editingAnimal.birth_date || new Date().toISOString().split('T')[0],
      mother_id: editingAnimal.mother_id || '',
      father_info: editingAnimal.father_info || '',
      birth_weight: editingAnimal.birth_weight || undefined,
      notes: editingAnimal.notes || '',
      autoGenerateTag: false,
    } : {
      tag_number: '',
      name: '',
      breed: 'holstein',
      gender: 'female',
      health_status: 'healthy',
      birth_date: new Date().toISOString().split('T')[0], // Today's date
      mother_id: '',
      father_info: '',
      birth_weight: undefined,
      notes: '',
      autoGenerateTag: true, // Default to auto-generation
    },
  })

  // Watch form data for tag generation context
  const formData = form.watch()

  // ✅ NEW: Pre-populate production-specific state variables from editingAnimal when in edit mode
  useEffect(() => {
    if (isEditMode && editingAnimal) {
      // Set the production status
      const status = editingAnimal.production_status || 'calf'
      setSelectedProductionStatus(status)

      // Pre-populate production-specific fields based on status
      if (editingAnimal.current_daily_production !== null && editingAnimal.current_daily_production !== undefined) {
        setCurrentMilkProduction(editingAnimal.current_daily_production)
      }
      if (editingAnimal.lactation_number !== null && editingAnimal.lactation_number !== undefined) {
        setCurrentLactationNumber(editingAnimal.lactation_number)
        setLactationNumber(editingAnimal.lactation_number)
      }

      // Pre-populate service records if available
      if (editingAnimal.service_records && Array.isArray(editingAnimal.service_records)) {
        setServiceRecords(editingAnimal.service_records)
        if (editingAnimal.service_records.length > 0) {
          setExpandedCycles(new Set([editingAnimal.service_records.length]))
        }
      }
    }
  }, [isEditMode, editingAnimal])

  // Load available mothers (female animals that could be mothers)
  useEffect(() => {
    const fetchAvailableMothers = async () => {
      try {
        setLoadingMothers(true)
        const response = await fetch(`/api/animals/mothers?farmId=${farmId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch available mothers')
        }

        const data = await response.json()
        setAvailableMothers(data.mothers || [])
      } catch (error) {
        console.error('Error fetching mothers:', error)
        setError('Failed to load available mothers')
      } finally {
        setLoadingMothers(false)
      }
    }

    if (farmId) {
      fetchAvailableMothers()
    }
  }, [farmId])

  useEffect(() => {
    const calculateProductionStatus = async () => {
      const birthDate = form.watch('birth_date')
      const gender = form.watch('gender')

      if (!birthDate || !gender) {
        setCalculatedProductionStatus('calf')
        setMatchingCategory(null)
        return
      }

      setCalculatingStatus(true)
      try {
        const [y, m, d] = birthDate.split('-').map(Number)
        const birth = new Date(y, m - 1, d)
        const now = new Date()
        const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))
        const months = Math.floor(days / 30)

        setAgeInDays(days)
        setAgeInMonths(months)

        let productionStatus = 'calf'
        if (gender === 'female') {
          if (months < 6) productionStatus = 'calf'
          else if (months <= 22) productionStatus = 'heifer'
          else productionStatus = 'lactating'
        } else {
          productionStatus = months < 6 ? 'calf' : 'bull'
        }

        setCalculatedProductionStatus(productionStatus)
        setMatchingCategory(null)
      } catch (error) {
        console.error('Error calculating production status:', error)
        setCalculatedProductionStatus('calf')
        setMatchingCategory(null)
      } finally {
        setCalculatingStatus(false)
      }
    }

    calculateProductionStatus()
  }, [form.watch('birth_date'), form.watch('gender')])

  // Keep selectedProductionStatus in sync with auto-calculation
  useEffect(() => {
    setSelectedProductionStatus(calculatedProductionStatus)
    // Reset cycle/records when status no longer needs them
    const needsCycles = ['lactating', 'served', 'steaming_dry_cows', 'open_culling_dry_cows'].includes(calculatedProductionStatus)
    if (!needsCycles) {
      setLactationNumber('')
      setCurrentMilkProduction('')
      setCurrentLactationNumber('')
      setBreedingCycleNumber('')
      setLastBreedingCycleNumber('')
      setServiceRecords([])
      setExpandedCycles(new Set())
    }
  }, [calculatedProductionStatus])

  // Sync service records array whenever lactation number or selected status changes
  useEffect(() => {
    // ✅ UPDATED: Handle different cycle numbers based on production status
    let needsCycles = false
    let count = 0

    if (selectedProductionStatus === 'lactating') {
      needsCycles = true
      count = typeof currentLactationNumber === 'number' && currentLactationNumber >= 1 ? currentLactationNumber : 0
    } else if (selectedProductionStatus === 'served') {
      needsCycles = true
      count = typeof breedingCycleNumber === 'number' && breedingCycleNumber >= 1 ? breedingCycleNumber : 0
    } else if (selectedProductionStatus === 'steaming_dry_cows') {
      needsCycles = true
      count = typeof breedingCycleNumber === 'number' && breedingCycleNumber >= 1 ? breedingCycleNumber : 0
    }
    // 'open_culling_dry_cows' doesn't have service records

    if (!needsCycles || count === 0) {
      setServiceRecords([])
      setExpandedCycles(new Set())
      return
    }
    setServiceRecords(prev => {
      const next: ServiceRecord[] = []
      for (let i = 1; i <= count; i++) {
        next.push(prev.find(r => r.cycle_number === i) ?? emptyRecord(i))
      }
      return next
    })
    setExpandedCycles(new Set([count])) // auto-expand current (last) cycle
  }, [selectedProductionStatus, currentLactationNumber, breedingCycleNumber])

  const updateRecord = (cycle: number, field: keyof ServiceRecord, value: string) =>
    setServiceRecords(prev => prev.map(r => r.cycle_number === cycle ? { ...r, [field]: value } : r))

  const toggleCycle = (cycle: number) =>
    setExpandedCycles(prev => { const n = new Set(prev); n.has(cycle) ? n.delete(cycle) : n.add(cycle); return n })

  // Handle tag changes from TagGenerationSection
  const handleTagChange = (tagNumber: string, autoGenerate: boolean) => {
    form.setValue('tag_number', tagNumber, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    })
    form.setValue('autoGenerateTag', autoGenerate)
    form.clearErrors('tag_number')
  }

  // Prepare custom attributes for tag generation based on form data
  const getCustomAttributesForTagData = () => {
    const selectedMother = availableMothers.find(m => m.id === formData.mother_id)

    return getCustomAttributesForTag({
      breed: formData.breed,
      gender: formData.gender,
      source: 'newborn',
      productionStatus: selectedProductionStatus,
      birthDate: formData.birth_date,
      healthStatus: formData.health_status,
      motherInfo: selectedMother ? {
        id: selectedMother.id,
        tagNumber: selectedMother.tag_number,
        name: selectedMother.name,
      } : undefined,
    })
  }

  const handleSubmit = async (data: NewbornCalfFormData) => {
    // Validate that we have a tag number (either auto-generated or manual)
    if (!data.tag_number || data.tag_number.trim().length === 0) {
      setError('Tag number is required. Please enable auto-generation or enter a manual tag number.')
      return
    }

    setLoading(true)
    setError(null)

    console.log(`Submitting calf with calculated production status: ${calculatedProductionStatus}`)

    try {
      // ✅ UPDATED: Build production-specific fields
      const productionSpecificData: any = {}

      if (selectedProductionStatus === 'lactating') {
        if (currentMilkProduction !== '') {
          productionSpecificData.current_daily_production = currentMilkProduction
        }
        if (currentLactationNumber !== '') {
          productionSpecificData.lactation_number = currentLactationNumber
        }
      } else if (selectedProductionStatus === 'served') {
        if (breedingCycleNumber !== '') {
          productionSpecificData.lactation_number = breedingCycleNumber
        }
      } else if (selectedProductionStatus === 'steaming_dry_cows') {
        if (breedingCycleNumber !== '') {
          productionSpecificData.lactation_number = breedingCycleNumber
        }
      } else if (selectedProductionStatus === 'open_culling_dry_cows') {
        if (lastBreedingCycleNumber !== '') {
          productionSpecificData.lactation_number = lastBreedingCycleNumber
        }
      }

      const requestData = {
        ...data,
        farm_id: farmId,
        animal_source: 'newborn_calf',
        production_status: selectedProductionStatus,
        ...productionSpecificData,
        service_records: serviceRecords.length > 0 ? serviceRecords : undefined,
        status: 'active',
        autoGenerateTag: data.autoGenerateTag,
      }

      // ✅ NEW: Use PUT for edit mode, POST for add mode
      const method = isEditMode ? 'PUT' : 'POST'
      const url = isEditMode ? `/api/animals/${editingAnimal.id}` : '/api/animals'

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || (isEditMode ? 'Failed to update calf' : 'Failed to add calf'))
      }

      const result = await response.json()

      // Show success message with generated tag if applicable
      if (result.generatedTagNumber) {
        console.log(`Calf registered successfully with auto-generated tag: ${result.generatedTagNumber}`)
      }

      // Pass the API RESULT (not the form data) to the success handler
      onSuccess(result) // ← This should be the API response, not form data

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{isEditMode ? 'Edit Calf' : 'New Born Calf Registration'}</h3>
        <p className="text-sm text-gray-600">{isEditMode ? 'Update calf information' : 'Register a calf born on your farm'}</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" noValidate>
        {/* Tag Generation Section - Now at the top */}
        <TagGenerationSection
          farmId={farmId}
          formData={formData}
          onTagChange={handleTagChange}
          customAttributes={getCustomAttributesForTagData()}
          animalSource="newborn_calf"  // ✅ NEW: Specify animal source
        />

        {/* Basic Information */}
        <CollapsibleFormSection
          title="Basic Information"
          icon={<Baby className="h-4 w-4" />}
          filledFieldCount={countBasicInfoFields(formData).filled}
          totalFieldCount={countBasicInfoFields(formData).total}
          isRequired={true}
          defaultExpanded={expandedSections.has('basic-info')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Calf Name (Optional)</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="e.g., Daisy, Princess"
              />
              <p className="text-xs text-gray-500">Give your calf a name</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Birth Date *</Label>
              <Input
                id="birth_date"
                type="date"
                {...form.register('birth_date')}
                error={form.formState.errors.birth_date?.message}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="breed">Breed *</Label>
              <Select
                value={form.watch('breed')}
                onValueChange={(value) => form.setValue('breed', value)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(() => {
                      const breedValue = form.watch('breed')
                      const breedMap: Record<string, string> = {
                        'holstein': 'Holstein-Friesian',
                        'jersey': 'Jersey',
                        'guernsey': 'Guernsey',
                        'ayrshire': 'Ayrshire',
                        'brown_swiss': 'Brown Swiss',
                        'crossbred': 'Crossbred',
                        'other': 'Other'
                      }
                      return breedMap[breedValue] || 'Select breed'
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holstein">Holstein-Friesian</SelectItem>
                  <SelectItem value="jersey">Jersey</SelectItem>
                  <SelectItem value="guernsey">Guernsey</SelectItem>
                  <SelectItem value="ayrshire">Ayrshire</SelectItem>
                  <SelectItem value="brown_swiss">Brown Swiss</SelectItem>
                  <SelectItem value="crossbred">Crossbred</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.breed && (
                <p className="text-sm text-red-600">{form.formState.errors.breed.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={form.watch('gender')}
                onValueChange={(value) => form.setValue('gender', value as 'male' | 'female')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female (Heifer Calf)</SelectItem>
                  <SelectItem value="male">Male (Bull Calf)</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.gender && (
                <p className="text-sm text-red-600">{form.formState.errors.gender.message}</p>
              )}
            </div>
          </div>
        </CollapsibleFormSection>



        {/* ── Production Status Lifecycle ── */}
        {calculatingStatus ? (
          <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <LoadingSpinner size="sm" className="mr-2" />
            <span className="text-sm text-blue-700">Calculating production status…</span>
          </div>
        ) : formData.birth_date && formData.gender ? (() => {
          const isFemale = formData.gender === 'female'

          // Stage definitions
          const stages = isFemale
            ? [
                { key: 'calf',      label: 'Calf',      range: '0 – 6 mo',   thresholdMonths: 0,  color: 'blue'   },
                { key: 'heifer',    label: 'Heifer',    range: '6 – 22 mo',  thresholdMonths: 6,  color: 'green'  },
                { key: 'lactating', label: 'Lactating', range: '> 22 mo',    thresholdMonths: 22, color: 'purple' },
              ]
            : [
                { key: 'calf', label: 'Calf', range: '0 – 6 mo',  thresholdMonths: 0, color: 'blue'   },
                { key: 'bull', label: 'Bull', range: '≥ 6 mo',    thresholdMonths: 6, color: 'orange' },
              ]

          const currentIdx = stages.findIndex(s => s.key === calculatedProductionStatus)
          const nextStage  = stages[currentIdx + 1] ?? null

          // Months until next milestone
          const monthsToNext = nextStage
            ? Math.max(0, nextStage.thresholdMonths - ageInMonths)
            : null

          const stageColors: Record<string, { bg: string; ring: string; dot: string; text: string; badge: string; line: string }> = {
            blue:   { bg: 'bg-blue-50',   ring: 'ring-blue-400',   dot: 'bg-blue-500',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-800',   line: 'bg-blue-300'   },
            green:  { bg: 'bg-green-50',  ring: 'ring-green-400',  dot: 'bg-green-500',  text: 'text-green-700',  badge: 'bg-green-100 text-green-800',  line: 'bg-green-300'  },
            purple: { bg: 'bg-purple-50', ring: 'ring-purple-400', dot: 'bg-purple-500', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800', line: 'bg-purple-300' },
            orange: { bg: 'bg-orange-50', ring: 'ring-orange-400', dot: 'bg-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800', line: 'bg-orange-300' },
          }

          const current = stages[currentIdx]
          const c = stageColors[current?.color ?? 'blue']

          return (
            <div className={`rounded-xl border ${c.bg} border-opacity-60 overflow-hidden`} style={{ borderColor: 'var(--tw-ring-color)' }}>
              {/* Header */}
              <div className={`px-4 py-2.5 flex items-center justify-between border-b border-gray-200 bg-white`}>
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-gray-500" />
                  Production Status
                  <span className="text-xs font-normal text-gray-400">(auto-calculated from birth date)</span>
                </span>
                <Badge className={`${c.badge} px-3 py-0.5 text-xs font-semibold`}>
                  {getProductionStatusDisplay(calculatedProductionStatus, formData.gender)}
                </Badge>
              </div>

              <div className="p-4 space-y-4">
                {/* Stage timeline */}
                <div className="flex items-start gap-0">
                  {stages.map((stage, idx) => {
                    const isPast    = idx < currentIdx
                    const isActive  = idx === currentIdx
                    const isFuture  = idx > currentIdx
                    const sc        = stageColors[stage.color]
                    const isLast    = idx === stages.length - 1

                    return (
                      <div key={stage.key} className="flex items-start flex-1 min-w-0">
                        {/* Node + label */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          {/* Circle */}
                          <div className={`
                            flex items-center justify-center rounded-full transition-all
                            ${isActive  ? `w-9 h-9 ring-2 ${sc.ring} ring-offset-2 ${sc.dot}`   : ''}
                            ${isPast    ? `w-7 h-7 ${sc.dot}`                                     : ''}
                            ${isFuture  ? 'w-7 h-7 bg-gray-200'                                   : ''}
                          `}>
                            {isPast && (
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            )}
                            {isActive && (
                              <span className="text-white text-xs font-bold">{idx + 1}</span>
                            )}
                            {isFuture && (
                              <span className="text-gray-400 text-xs font-semibold">{idx + 1}</span>
                            )}
                          </div>
                          {/* Label below node */}
                          <p className={`mt-1.5 text-xs font-semibold text-center leading-tight ${isActive ? sc.text : isFuture ? 'text-gray-400' : sc.text}`}>
                            {stage.label}
                          </p>
                          <p className={`text-xs text-center leading-tight ${isActive ? sc.text : 'text-gray-400'}`}>
                            {stage.range}
                          </p>
                        </div>

                        {/* Connector line (not after last node) */}
                        {!isLast && (
                          <div className={`flex-1 h-0.5 mt-4 mx-1 ${isPast ? sc.line : 'bg-gray-200'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Current status details row */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Age card */}
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Current Age</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {ageInMonths > 0 ? `${ageInMonths} month${ageInMonths !== 1 ? 's' : ''}` : `${ageInDays} day${ageInDays !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>

                  {/* Next milestone or final stage */}
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
                    {nextStage ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Next Stage</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {nextStage.label}
                            {monthsToNext !== null && monthsToNext > 0 && (
                              <span className="text-xs font-normal text-gray-500 ml-1">
                                in {monthsToNext} mo
                              </span>
                            )}
                            {monthsToNext === 0 && (
                              <span className="text-xs font-normal text-green-600 ml-1">soon</span>
                            )}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Final Stage</p>
                          <p className="text-sm font-semibold text-gray-800">Reached</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Next milestone countdown bar (only when transition is coming) */}
                {nextStage && monthsToNext !== null && nextStage.thresholdMonths > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Progress toward {nextStage.label}
                      </span>
                      <span>
                        {Math.min(ageInMonths, nextStage.thresholdMonths)} / {nextStage.thresholdMonths} mo
                      </span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${stageColors[nextStage.color].dot}`}
                        style={{
                          width: `${Math.min(100, (ageInMonths / nextStage.thresholdMonths) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })() : null}

        

        {/* Parentage Information */}
        <CollapsibleFormSection
          title="Parentage Information"
          icon={<Heart className="h-4 w-4" />}
          filledFieldCount={countParentageFields(formData).filled}
          totalFieldCount={countParentageFields(formData).total}
          isRequired={true}
          defaultExpanded={expandedSections.has('parentage')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mother_id">Mother (Dam) *</Label>
              {loadingMothers ? (
                <div className="flex items-center space-x-2 p-2 border rounded-md">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-gray-600">Loading available mothers...</span>
                </div>
              ) : (
                <Select
                  value={form.watch('mother_id')}
                  onValueChange={(value) => form.setValue('mother_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mother">
                      {(() => {
                        const selectedMotherId = form.watch('mother_id')
                        const selectedMother = availableMothers.find(m => m.id === selectedMotherId)
                        return selectedMother
                          ? (selectedMother.name ? `${selectedMother.name} (${selectedMother.tag_number})` : selectedMother.tag_number)
                          : 'Select mother'
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableMothers.length === 0 ? (
                      // Option 1: Don't render any SelectItem when no mothers available
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        No available mothers found
                      </div>
                    ) : (
                      availableMothers.map(mother => (
                        <SelectItem key={mother.id} value={mother.id}>
                          {mother.name ? `${mother.name} (${mother.tag_number})` : mother.tag_number}
                          {mother.breed && (
                            <span className="text-xs text-gray-500 ml-2">- {mother.breed}</span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              {form.formState.errors.mother_id && (
                <p className="text-sm text-red-600">{form.formState.errors.mother_id.message}</p>
              )}
              <p className="text-xs text-gray-500">Select the mother of this calf</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="father_info">Father (Sire) Information</Label>
              <Input
                id="father_info"
                {...form.register('father_info')}
                placeholder="e.g., AI Bull #12345, Natural Service"
              />
              <p className="text-xs text-gray-500">Sire information (optional)</p>
            </div>
          </div>
        </CollapsibleFormSection>

        {/* Health & Physical Information */}
        <CollapsibleFormSection
          title="Health & Physical Information"
          icon={<Calendar className="h-4 w-4" />}
          filledFieldCount={countHealthPhysicalFields(formData).filled}
          totalFieldCount={countHealthPhysicalFields(formData).total}
          isRequired={true}
          defaultExpanded={expandedSections.has('health-physical')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="health_status">Health Status *</Label>
              <Select
                value={form.watch('health_status')}
                onValueChange={(value) => form.setValue('health_status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select health status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="requires_attention">Requires Attention</SelectItem>
                  <SelectItem value="quarantined">Quarantined</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.health_status && (
                <p className="text-sm text-red-600">{form.formState.errors.health_status.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_weight">Birth Weight (kg)</Label>
              <Input
                id="birth_weight"
                type="number"
                step="0.1"
                min="0"
                {...form.register('birth_weight', { setValueAs: (v: string) => v === '' || v === null || v === undefined ? undefined : parseFloat(v) })}
                placeholder="e.g., 35.5"
              />
              <p className="text-xs text-gray-500">Weight at birth in kilograms</p>
            </div>
          </div>
        </CollapsibleFormSection>

        {/* ── Production Status Input (females ≥ 6 months) ── */}
        {formData.gender === 'female' && ageInMonths >= 6 && (
          <CollapsibleFormSection
            title="Production & Reproductive Status"
            icon={<Activity className="h-4 w-4" />}
            filledFieldCount={selectedProductionStatus === 'lactating' ? countLactatingFields(formData, currentMilkProduction as any, currentLactationNumber as any).filled : selectedProductionStatus === 'served' ? countServedFields(formData, currentMilkProduction as any, breedingCycleNumber as any).filled : selectedProductionStatus === 'steaming_dry_cows' ? countSteamingDryCowsFields(formData, breedingCycleNumber as any).filled : selectedProductionStatus === 'open_culling_dry_cows' ? countOpenDryCowsFields(formData, lastBreedingCycleNumber as any).filled : 0}
            totalFieldCount={selectedProductionStatus === 'lactating' ? countLactatingFields(formData, currentMilkProduction as any, currentLactationNumber as any).total : selectedProductionStatus === 'served' ? countServedFields(formData, currentMilkProduction as any, breedingCycleNumber as any).total : selectedProductionStatus === 'steaming_dry_cows' ? countSteamingDryCowsFields(formData, breedingCycleNumber as any).total : selectedProductionStatus === 'open_culling_dry_cows' ? countOpenDryCowsFields(formData, lastBreedingCycleNumber as any).total : 0}
            isRequired={false}
            defaultExpanded={false}
          >
          <div className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <h4 className="text-sm font-semibold text-green-900 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Production &amp; Reproductive Status
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status selector */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">
                  Current Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedProductionStatus}
                  onValueChange={setSelectedProductionStatus}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ageInMonths >= 6 && ageInMonths <= 22 && (
                      <>
                        <SelectItem value="heifer">Heifer</SelectItem>
                        <SelectItem value="served">Served (In-Calf)</SelectItem>
                      </>
                    )}
                    {ageInMonths > 22 && (
                      <>
                        <SelectItem value="heifer">Heifer</SelectItem>
                        <SelectItem value="served">Served (In-Calf)</SelectItem>
                        <SelectItem value="lactating">Lactating</SelectItem>
                        <SelectItem value="steaming_dry_cows">Steaming Dry</SelectItem>
                        <SelectItem value="open_culling_dry_cows">Open / Dry</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Auto-suggested: <strong>{calculatedProductionStatus}</strong> — override if needed
                </p>
              </div>

              {/* ✅ UPDATED: Status-specific inputs */}
              
              {/* Lactating: Show milk production + current lactation number */}
              {selectedProductionStatus === 'lactating' && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">
                      Current Milk Production (L/day) <span className="text-red-500">*</span>
                      <span className="text-xs text-gray-500 ml-2">(Avg last 7 days)</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g. 25.5"
                      className="bg-white"
                      value={currentMilkProduction}
                      onChange={e => {
                        const v = e.target.value === '' ? '' : parseFloat(e.target.value)
                        setCurrentMilkProduction(isNaN(v as number) ? '' : v)
                      }}
                    />
                    <p className="text-xs text-gray-500">
                      Average daily milk production over the last 7 days in liters
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-700">
                      Current Lactation Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 1, 2, 3 …"
                      className="bg-white"
                      value={currentLactationNumber}
                      onChange={e => {
                        const v = e.target.value === '' ? '' : parseInt(e.target.value, 10)
                        setCurrentLactationNumber(isNaN(v as number) ? '' : v)
                      }}
                    />
                    <p className="text-xs text-gray-500">
                      Which lactation cycle is this animal currently in? (1st, 2nd, 3rd, etc.)
                    </p>
                  </div>
                </>
              )}

              {/* Served: Show breeding cycle number */}
              {selectedProductionStatus === 'served' && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700">
                    Breeding Cycle Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 1, 2, 3 …"
                    className="bg-white"
                    value={breedingCycleNumber}
                    onChange={e => {
                      const v = e.target.value === '' ? '' : parseInt(e.target.value, 10)
                      setBreedingCycleNumber(isNaN(v as number) ? '' : v)
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    Which breeding cycle number is this animal currently on?
                  </p>
                </div>
              )}

              {/* Steaming Dry: Show breeding cycle number */}
              {selectedProductionStatus === 'steaming_dry_cows' && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700">
                    Current Breeding Cycle Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 1, 2, 3 …"
                    className="bg-white"
                    value={breedingCycleNumber}
                    onChange={e => {
                      const v = e.target.value === '' ? '' : parseInt(e.target.value, 10)
                      setBreedingCycleNumber(isNaN(v as number) ? '' : v)
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    Which breeding cycle number is this animal currently in the dry period of?
                  </p>
                </div>
              )}

              {/* Open/Dry: Show last breeding cycle number */}
              {selectedProductionStatus === 'open_culling_dry_cows' && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700">
                    Last Breeding Cycle Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 1, 2, 3 …"
                    className="bg-white"
                    value={lastBreedingCycleNumber}
                    onChange={e => {
                      const v = e.target.value === '' ? '' : parseInt(e.target.value, 10)
                      setLastBreedingCycleNumber(isNaN(v as number) ? '' : v)
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    What was the last breeding cycle number this open animal completed?
                  </p>
                </div>
              )}
            </div>

            {/* ✅ UPDATED: Validation warnings */}
            {selectedProductionStatus === 'lactating' && (currentMilkProduction === '' || currentLactationNumber === '') && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                Enter both milk production and lactation number to unlock service record entry below.
              </div>
            )}

            {selectedProductionStatus === 'served' && breedingCycleNumber === '' && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                Enter the breeding cycle number to unlock service record entry below.
              </div>
            )}

            {selectedProductionStatus === 'steaming_dry_cows' && breedingCycleNumber === '' && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                Enter the current breeding cycle number to unlock service record entry below.
              </div>
            )}
          </div>
        </CollapsibleFormSection>
        )}

        {/* ── Service & Calving Records (one card per cycle) ── */}
        {serviceRecords.length > 0 && (
          <CollapsibleFormSection
            title="Service & Calving Records"
            icon={<Syringe className="h-4 w-4" />}
            filledFieldCount={0}
            totalFieldCount={0}
            isRequired={false}
            defaultExpanded={false}
          >
            <div className="space-y-3">
              <div className="border-b pb-2 flex items-center justify-between">
                <h4 className="text-md font-medium text-gray-900 flex items-center gap-2">
                  <Syringe className="h-4 w-4 text-purple-600" />
                  Service &amp; Calving Records
                  <span className="text-xs font-normal text-gray-500">
                    ({serviceRecords.length} cycle{serviceRecords.length > 1 ? 's' : ''})
                  </span>
                </h4>
                <span className="text-xs text-gray-400">Fill in details for each breeding cycle</span>
              </div>

            {serviceRecords.map(record => {
              // Only 'served' and 'steaming_dry_cows' have a current cycle (the last one)
              // Lactating animals treat all cycles as previous
              const productionHasCurrentCycle = selectedProductionStatus === 'served' || selectedProductionStatus === 'steaming_dry_cows'
              const isCurrent = productionHasCurrentCycle && record.cycle_number === serviceRecords.length
              const isExpanded = expandedCycles.has(record.cycle_number)
              const isPrevious = !isCurrent

              return (
                <div
                  key={record.cycle_number}
                  className={`border rounded-lg overflow-hidden ${isCurrent ? 'border-purple-300 shadow-sm' : 'border-gray-200'}`}
                >
                  {/* Cycle header */}
                  <button
                    type="button"
                    onClick={() => toggleCycle(record.cycle_number)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                      isCurrent ? 'bg-purple-50 hover:bg-purple-100' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isCurrent ? 'text-purple-800' : 'text-gray-700'}`}>
                        Cycle {record.cycle_number}
                      </span>
                      {isCurrent
                        ? <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">Current</span>
                        : <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">Previous</span>
                      }
                      {record.service_date && (
                        <span className="text-xs text-gray-500">Serviced: {record.service_date}</span>
                      )}
                    </div>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-gray-500" />
                      : <ChevronDown className="h-4 w-4 text-gray-500" />
                    }
                  </button>

                  {/* Cycle body */}
                  {isExpanded && (
                    <div className="p-4 space-y-5">

                      {/* Service Details */}
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                          <Syringe className="h-3 w-3" /> Service Details
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Service Date</Label>
                            <Input type="date" value={record.service_date}
                              onChange={e => updateRecord(record.cycle_number, 'service_date', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Service Method</Label>
                            <select
                              value={record.service_method}
                              onChange={e => updateRecord(record.cycle_number, 'service_method', e.target.value)}
                              className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
                            >
                              <option value="">Select method</option>
                              <option value="artificial_insemination">Artificial Insemination (AI)</option>
                              <option value="natural_breeding">Natural Breeding</option>
                              <option value="embryo_transfer">Embryo Transfer</option>
                              <option value="unknown">Unknown</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Bull / Semen Name</Label>
                            <Input placeholder="e.g. Badger-Bluff Farm Fanny" value={record.bull_name}
                              onChange={e => updateRecord(record.cycle_number, 'bull_name', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Bull / Semen Code</Label>
                            <Input placeholder="e.g. 1HO09356" value={record.bull_code}
                              onChange={e => updateRecord(record.cycle_number, 'bull_code', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Type of Semen</Label>
                            <select
                              value={record.semen_type}
                              onChange={e => updateRecord(record.cycle_number, 'semen_type', e.target.value)}
                              className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
                            >
                              <option value="">Select type</option>
                              <option value="conventional">Conventional</option>
                              <option value="sexed_female">Sexed — Female</option>
                              <option value="sexed_male">Sexed — Male</option>
                              <option value="natural">Natural Service</option>
                              <option value="unknown">Unknown</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1">
                              <UserCheck className="h-3 w-3" /> AI Technician
                            </Label>
                            <Input placeholder="Technician name" value={record.ai_technician}
                              onChange={e => updateRecord(record.cycle_number, 'ai_technician', e.target.value)} />
                          </div>
                        </div>

                        {/* Service Outcome */}
                        <div className="space-y-1">
                          <Label className="text-xs">Outcome of Service</Label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: 'confirmed_pregnant', label: 'Confirmed Pregnant', color: 'green' },
                              { value: 'not_pregnant',       label: 'Not Pregnant',       color: 'red'   },
                              { value: 'pending',            label: 'Pending Check',      color: 'yellow'},
                              { value: 'unknown',            label: 'Unknown',            color: 'gray'  },
                            ].map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateRecord(record.cycle_number, 'service_outcome', opt.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
                                  record.service_outcome === opt.value
                                    ? opt.color === 'green'  ? 'bg-green-100 border-green-400 text-green-800'
                                    : opt.color === 'red'    ? 'bg-red-100 border-red-400 text-red-800'
                                    : opt.color === 'yellow' ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                                    : 'bg-gray-200 border-gray-400 text-gray-800'
                                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                                }`}
                              >
                                {opt.color === 'green'  && <CheckCircle2 className="h-3 w-3" />}
                                {opt.color === 'red'    && <XCircle className="h-3 w-3" />}
                                {opt.color === 'yellow' && <Clock className="h-3 w-3" />}
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="space-y-3 border-t pt-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Dates
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Steaming Date</Label>
                            <Input type="date" value={record.steaming_date}
                              onChange={e => updateRecord(record.cycle_number, 'steaming_date', e.target.value)} />
                            <p className="text-xs text-gray-400">When dry-off began</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Expected Calving Date</Label>
                            <Input type="date" value={record.expected_calving_date}
                              onChange={e => updateRecord(record.cycle_number, 'expected_calving_date', e.target.value)} />
                          </div>
                          {isPrevious && (
                            <div className="space-y-1">
                              <Label className="text-xs">Actual Calving Date</Label>
                              <Input type="date" value={record.actual_calving_date}
                                onChange={e => updateRecord(record.cycle_number, 'actual_calving_date', e.target.value)} />
                            </div>
                          )}
                          {isPrevious && (
                            <div className="space-y-1">
                              <Label className="text-xs flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Calving Time
                              </Label>
                              <Input type="time" value={record.calving_time}
                                onChange={e => updateRecord(record.cycle_number, 'calving_time', e.target.value)} />
                              <p className="text-xs text-gray-400">Time calf was born</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Calving outcome — previous cycles only */}
                      {isPrevious && (
                        <div className="space-y-3 border-t pt-4">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                            <Baby className="h-3 w-3" /> Calving Outcome &amp; Difficulty
                          </p>
                          <div className="space-y-1">
                            <Label className="text-xs">Calving Difficulty</Label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { value: 'easy', label: 'Easy - No issues, quick delivery', color: 'green' },
                                { value: 'normal', label: 'Normal - Standard delivery', color: 'blue' },
                                { value: 'difficult', label: 'Difficult - Hard but unassisted', color: 'yellow' },
                                { value: 'assisted', label: 'Assisted - Required human help', color: 'orange' },
                                { value: 'cesarean', label: 'Cesarean - Surgical delivery', color: 'red' },
                                { value: 'aborted', label: 'Aborted - Pregnancy terminated', color: 'purple' },
                              ].map(opt => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => updateRecord(record.cycle_number, 'calving_outcome', opt.value)}
                                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                                    record.calving_outcome === opt.value
                                      ? opt.color === 'green' ? 'bg-green-100 border-green-400 text-green-800'
                                      : opt.color === 'blue' ? 'bg-blue-100 border-blue-400 text-blue-800'
                                      : opt.color === 'yellow' ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                                      : opt.color === 'orange' ? 'bg-orange-100 border-orange-400 text-orange-800'
                                      : opt.color === 'red' ? 'bg-red-100 border-red-400 text-red-800'
                                      : 'bg-purple-100 border-purple-400 text-purple-800'
                                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs flex items-center gap-1">
                                <Droplets className="h-3 w-3 text-blue-500" /> Colostrum Produced (L)
                              </Label>
                              <Input type="number" step="0.1" min="0" placeholder="e.g. 6.5"
                                value={record.colostrum_produced}
                                onChange={e => updateRecord(record.cycle_number, 'colostrum_produced', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Days in Milk (this cycle)</Label>
                              <Input type="number" min="0" placeholder="e.g. 305"
                                value={record.days_in_milk}
                                onChange={e => updateRecord(record.cycle_number, 'days_in_milk', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Days in milk — current cycle only */}
                      {isCurrent && (
                        <div className="space-y-1 border-t pt-4">
                          <Label className="text-xs flex items-center gap-1">
                            <Info className="h-3 w-3" /> Days in Milk (current)
                          </Label>
                          <Input type="number" min="0" placeholder="e.g. 120"
                            value={record.days_in_milk}
                            onChange={e => updateRecord(record.cycle_number, 'days_in_milk', e.target.value)} />
                          <p className="text-xs text-gray-400">Days milking since last calving</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          </CollapsibleFormSection>
        )}

        {/* Additional Information */}
        <CollapsibleFormSection
          title="Additional Information"
          icon={<FileText className="h-4 w-4" />}
          filledFieldCount={countAdditionalInfoFields(formData).filled}
          totalFieldCount={countAdditionalInfoFields(formData).total}
          isRequired={false}
          defaultExpanded={expandedSections.has('additional-info')}
        >
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent resize-none"
              placeholder="Any additional information about the calf (birth complications, special care needed, etc.)"
            />
            <p className="text-xs text-gray-500">Any special notes about this calf</p>
          </div>
        </CollapsibleFormSection>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="default"
            primary={true}
            type="submit"
            disabled={loading || loadingMothers || !formData.tag_number}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {isEditMode ? 'Updating Calf...' : 'Adding Calf...'}
              </>
            ) : (
              isEditMode ? 'Update Calf' : 'Add Calf'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}