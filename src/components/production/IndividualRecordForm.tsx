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
  recordDate: string
  settings: ProductionSettings | null
  onSuccess?: () => void
  onRecordSaved?: (animalId: string) => void
  closeAfterSuccess?: boolean
  recordingType?: 'individual' | 'group'
  milkingGroupId?: string
}

export function IndividualRecordForm({
  farmId,
  animals,
  session,
  recordDate,
  settings,
  onSuccess,
  onRecordSaved,
  closeAfterSuccess = true,
  recordingType = 'individual',
  milkingGroupId
}: IndividualRecordFormProps) {
  const [step, setStep] = useState<'select' | 'form'>('select')
  const [selectedAnimal, setSelectedAnimal] = useState<typeof animals[0] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preRecordedAnimalIds, setPreRecordedAnimalIds] = useState<Set<string>>(new Set())

  // Reset form when date or session changes
  useEffect(() => {
    console.log(`[IndividualRecordForm] Date/Session changed - recordDate: ${recordDate}, session: ${session}`)
    setStep('select')
    setSelectedAnimal(null)
    setSearchQuery('')
    setError(null)
  }, [recordDate, session])

  // Fetch already-recorded animals for this date and session
  useEffect(() => {
    const fetchPreRecordedAnimals = async () => {
      try {
        console.log(`[IndividualRecordForm] Fetching pre-recorded animals for date: ${recordDate}, session: ${session}`)
        // Note: API filters by date only (start_date=end_date). Session filtering will be done in-app
        const response = await fetch(
          `/api/production?start_date=${recordDate}&end_date=${recordDate}`
        )
        
        console.log(`[IndividualRecordForm] Fetch response status: ${response.status}`)
        
        if (response.ok) {
          const result = await response.json()
          console.log(`[IndividualRecordForm] Pre-recorded animals result:`, result)
          const records = Array.isArray(result.data) ? result.data : []
          
          // Filter by session since API doesn't support that parameter
          const sessionFilteredRecords = records.filter((r: any) => r.milking_session === session)
          console.log(`[IndividualRecordForm] Filtered to session "${session}": ${sessionFilteredRecords.length} pre-recorded animals`)
          
          const preRecordedIds = new Set<string>(sessionFilteredRecords.map((r: any) => r.animal_id))
          console.log(`[IndividualRecordForm] Pre-recorded animal IDs:`, Array.from(preRecordedIds))
          setPreRecordedAnimalIds(preRecordedIds)
        } else {
          console.error(`[IndividualRecordForm] Fetch failed with status ${response.status}`)
          setPreRecordedAnimalIds(new Set())
        }
      } catch (err) {
        console.error('[IndividualRecordForm] Error fetching pre-recorded animals:', err)
        setPreRecordedAnimalIds(new Set())
      }
    }

    fetchPreRecordedAnimals()
  }, [recordDate, session])

  // Schema with dynamic validation
  const productionSchema = useMemo(() => {
    const isQualityFocused = settings?.productionTrackingMode === 'quality_focused'
    
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
      milk_volume: z.number()
        .min(0.1, 'Volume must be positive')
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
    })
  }, [settings])

  const form = useForm<ProductionFormData>({
    resolver: zodResolver(productionSchema),
    defaultValues: {
      animal_id: selectedAnimal?.id || '',
      record_date: recordDate,
      milking_session: session,
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
    },
  })

  // Filter eligible animals based on production settings
  const eligibleAnimals = useMemo(() => {
    const baseAnimals = animals.filter(a => a.gender === 'female')
    
    if (!settings) {
      // If no settings, default to lactating only
      let filtered = baseAnimals.filter(a => a.production_status === 'lactating')
      // Exclude pre-recorded animals
      filtered = filtered.filter(a => !preRecordedAnimalIds.has(a.id))
      return filtered
    }

    // Apply gender filter from settings
    let filtered = baseAnimals
    
    // Apply eligible statuses from settings
    const eligibleStatuses = settings.eligibleProductionStatuses || ['lactating']
    filtered = filtered.filter(a => eligibleStatuses.includes(a.production_status))
    
    // Filter by eligible genders if specified
    if (settings.eligibleGenders && settings.eligibleGenders.length > 0) {
      filtered = filtered.filter(a => settings.eligibleGenders?.includes(a.gender) ?? true)
    }
    
    // Exclude pre-recorded animals
    filtered = filtered.filter(a => !preRecordedAnimalIds.has(a.id))
    
    // TODO: Add these filters when animal object includes required properties
    // - minAnimalAgeMonths: requires animal birth_date
    // - maxDaysInMilk: requires animal lactation_start_date
    // - excludeSickAnimals: requires animal health_status
    // - excludeTreatmentWithdrawal: requires animal active_treatments
    
    console.log(`[IndividualRecordForm] eligibleAnimals computed:`, {
      totalAnimals: animals.length,
      femaleAnimals: baseAnimals.length,
      preRecordedCount: preRecordedAnimalIds.size,
      eligibleCount: filtered.length
    })
    
    return filtered
  }, [animals, settings, preRecordedAnimalIds])

  // Filter based on search query
  const filteredAnimals = useMemo(() => {
    if (!searchQuery.trim()) return eligibleAnimals
    const query = searchQuery.toLowerCase()
    return eligibleAnimals.filter(a =>
      a.tag_number.toLowerCase().includes(query) ||
      (a.name?.toLowerCase().includes(query) ?? false)
    )
  }, [eligibleAnimals, searchQuery])

  const selectAnimal = (animal: typeof animals[0]) => {
    setSelectedAnimal(animal)
    form.setValue('animal_id', animal.id)
    setStep('form')
    setSearchQuery('')
    setError(null)
  }

  const handleChangeAnimal = () => {
    setStep('select')
    setSelectedAnimal(null)
    form.reset()
    setSearchQuery('')
  }

  const handleSubmit = async (data: ProductionFormData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
          recording_type: recordingType,
          milking_group_id: milkingGroupId || null,
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
        throw new Error(errorData.error || 'Failed to save record')
      }

      const animalId = data.animal_id

      // For group mode: notify parent without closing
      if (onRecordSaved) {
        onRecordSaved(animalId)
      }

      // For individual mode: close if configured to do so
      if (closeAfterSuccess && onSuccess) {
        onSuccess()
      }

      // Reset form for next entry
      setSelectedAnimal(null)
      setStep('select')
      form.reset({
        animal_id: '',
        record_date: recordDate,
        milking_session: session,
        milk_volume: undefined,
        milk_safety_status: 'safe',
        temperature: null,
        mastitis_test_performed: false,
        mastitis_result: null,
        affected_quarters: null,
        notes: '',
      })
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
  if (!selectedAnimal) return null

  const isBasicMode = settings?.productionTrackingMode === 'basic'
  const isQualityVisible = !isBasicMode && settings?.enableQualityTracking !== false

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

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Historical Context Panel */}
      <ProductionHistoricalContext
        farmId={farmId}
        animalId={selectedAnimal.id}
        currentDate={recordDate}
        currentSession={session}
      />

      {/* Form */}
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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

        {/* Health & Safety Section */}
        <ProductionHealthSection
          form={form}
          settings={settings}
        />

        {/* Milk Safety Status */}
        <div>
          <Label htmlFor="milk_safety_status">Milk Safety Status *</Label>
          <select
            id="milk_safety_status"
            {...form.register('milk_safety_status')}
            className="w-full mt-2 px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="safe">✓ Safe - Approved for Sale</option>
            <option value="unsafe_health">⚠️ Unsafe - Animal Health Issue</option>
            <option value="unsafe_colostrum">✖️ Unsafe - Colostrum (Cannot Sell)</option>
          </select>
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
            disabled={loading || !form.getValues('milk_volume')}
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Save Record'}
          </Button>
        </div>
      </form>
    </div>
  )
}
