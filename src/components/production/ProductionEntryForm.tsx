// src/components/production/ProductionEntryForm.tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ProductionSettings } from '@/types/production-distribution-settings'

type ProductionFormData = {
  animal_id: string;
  record_date: string;
  milking_session: 'morning' | 'afternoon' | 'evening';
  milk_volume: number;
  fat_content?: number | null;
  protein_content?: number | null;
  somatic_cell_count?: number | null;
  lactose_content?: number | null;
  temperature?: number | null;
  ph_level?: number | null;
  notes?: string | null;
}

interface ProductionEntryFormProps {
  farmId: string
  animals: Array<{ id: string; tag_number: string; name?: string; gender: string; production_status: string }>
  initialData?: Partial<ProductionFormData>
  onSuccess?: () => void
  isMobile?: boolean
  settings: ProductionSettings | null
}

export function ProductionEntryForm({
  farmId,
  animals,
  initialData,
  onSuccess,
  isMobile,
  settings
}: ProductionEntryFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Memoize schema construction to react to settings changes
  const productionSchema = useMemo(() => {
    // Determine if quality fields are required based on tracking mode and specific toggles
    const isQualityFocused = settings?.productionTrackingMode === 'quality_focused'
    
    // Helper to create a number schema that matches the nullable/optional nature of ProductionFormData
    // regardless of whether it is "required" in the UI/logic.
    const createNumberSchema = (isRequired: boolean, label: string, min = 0, max = 100) => {
      // Base schema matches ProductionFormData: number | null | undefined
      const schema = z.number()
        .min(min, `${label} must be at least ${min}`)
        .max(max, `${label} cannot exceed ${max}`)
        .nullable()
        .optional()

      // If strictly required, we refine the schema to disallow null/undefined
      if (isRequired) {
        return schema.refine((val) => val !== null && val !== undefined, {
          message: `${label} is required`
        })
      }
      return schema
    }

    return z.object({
      animal_id: z.string().min(1, 'Please select an animal'),
      record_date: z.string().min(1, 'Date is required'),
      milking_session: z.enum(['morning', 'afternoon', 'evening']),
      milk_volume: z.number()
        .min(0.1, 'Volume must be positive')
        .max(100, 'Volume seems too high'),
      
      // Dynamic validation based on settings
      fat_content: createNumberSchema(isQualityFocused && !!settings?.fatContentRequired, "Fat Content", 0, 15),
      protein_content: createNumberSchema(isQualityFocused && !!settings?.proteinContentRequired, "Protein Content", 0, 10),
      somatic_cell_count: createNumberSchema(isQualityFocused && !!settings?.sccRequired, "SCC", 0, 9999999),
      lactose_content: createNumberSchema(isQualityFocused && !!settings?.lactoseRequired, "Lactose", 0, 10),
      temperature: createNumberSchema(isQualityFocused && !!settings?.temperatureRequired, "Temperature", 0, 50),
      ph_level: createNumberSchema(isQualityFocused && !!settings?.phRequired, "pH Level", 0, 14),
      
      notes: z.string().nullable().optional(),
    })
  }, [settings])

  const form = useForm<ProductionFormData>({
    resolver: zodResolver(productionSchema),
    defaultValues: {
      animal_id: initialData?.animal_id || '',
      record_date: initialData?.record_date || new Date().toISOString().split('T')[0],
      milking_session: initialData?.milking_session || settings?.defaultSession || 'morning',
      milk_volume: initialData?.milk_volume || undefined,
      fat_content: initialData?.fat_content || null,
      protein_content: initialData?.protein_content || null,
      somatic_cell_count: initialData?.somatic_cell_count || null,
      lactose_content: initialData?.lactose_content || null,
      temperature: initialData?.temperature || null,
      ph_level: initialData?.ph_level || null,
      notes: initialData?.notes || '',
    },
  })

  // Determine visibility
  const isBasicMode = settings?.productionTrackingMode === 'basic'
  const isQualityVisible = !isBasicMode && settings?.enableQualityTracking !== false

  // Determine enabled sessions
  const enabledSessions = settings?.enabledSessions || ['morning', 'afternoon', 'evening']

  // Function to convert empty strings to null for numeric fields
  const preprocessFormData = (data: ProductionFormData) => {
    return {
      ...data,
      fat_content: data.fat_content === undefined ? null : data.fat_content,
      protein_content: data.protein_content === undefined ? null : data.protein_content,
      somatic_cell_count: data.somatic_cell_count === undefined ? null : data.somatic_cell_count,
      lactose_content: data.lactose_content === undefined ? null : data.lactose_content,
      temperature: data.temperature === undefined ? null : data.temperature,
      ph_level: data.ph_level === undefined ? null : data.ph_level,
      notes: data.notes === '' ? null : data.notes,
    }
  }

  const handleSubmit = async (data: ProductionFormData) => {
    setLoading(true)
    setError(null)

    try {
      const processedData = preprocessFormData(data)

      const response = await fetch('/api/production', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...processedData,
          farm_id: farmId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to record production')
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard/production')
      }

      form.reset({
        animal_id: '',
        record_date: new Date().toISOString().split('T')[0],
        milking_session: settings?.defaultSession || 'morning',
        milk_volume: undefined,
        fat_content: null,
        protein_content: null,
        somatic_cell_count: null,
        lactose_content: null,
        temperature: null,
        ph_level: null,
        notes: '',
      })

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const eligibleAnimals = animals.filter(animal =>
    animal.gender === 'female' &&
    animal.production_status === 'lactating'
  )

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Record Milk Production</CardTitle>
        <CardDescription>
          Enter milk production data. 
          {isBasicMode && " (Basic Mode - Volume Only)"}
          {!isBasicMode && " (Advanced Mode - Quality Parameters Enabled)"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="animal_id">Animal *</Label>
              <select
                id="animal_id"
                {...form.register('animal_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="">Select an animal</option>
                {eligibleAnimals.length === 0 ? (
                  <option disabled>No lactating animals available</option>
                ) : (
                  eligibleAnimals.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.tag_number} - {animal.name || 'Unnamed'}
                    </option>
                  ))
                )}
              </select>
              {form.formState.errors.animal_id && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.animal_id.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="record_date">Date *</Label>
              <Input
                id="record_date"
                type="date"
                {...form.register('record_date')}
                error={form.formState.errors.record_date?.message}
              />
            </div>

            <div>
              <Label htmlFor="milking_session">Session *</Label>
              <select
                id="milking_session"
                {...form.register('milking_session')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent capitalize"
              >
                {enabledSessions.map(session => (
                   <option key={session} value={session}>{session}</option>
                ))}
                {/* Fallback if enabledSessions is empty/invalid */}
                {enabledSessions.length === 0 && <option value="morning">Morning</option>}
              </select>
              {form.formState.errors.milking_session && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.milking_session.message}
                </p>
              )}
            </div>
          </div>

          {/* Volume is always required */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="milk_volume">Milk Volume ({settings?.productionUnit || 'liters'}) *</Label>
              <Input
                id="milk_volume"
                type="number"
                step="0.1"
                {...form.register('milk_volume', { valueAsNumber: true })}
                error={form.formState.errors.milk_volume?.message}
                placeholder="e.g., 25.5"
              />
            </div>
            
            {/* Show notes alongside volume in basic mode to save space */}
            {isBasicMode && (
               <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  {...form.register('notes')}
                  placeholder="Optional notes"
                />
              </div>
            )}
          </div>

          {/* Conditional Quality Fields */}
          {isQualityVisible && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
               <h4 className="text-sm font-medium text-gray-500">Quality Parameters</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fat Content */}
                  {settings?.trackFatContent && (
                    <div>
                      <Label htmlFor="fat_content">
                        Fat Content (%) {settings.productionTrackingMode === 'quality_focused' && settings.fatContentRequired && '*'}
                      </Label>
                      <Input
                        id="fat_content"
                        type="number"
                        step="0.01"
                        {...form.register('fat_content', {
                          valueAsNumber: true,
                          setValueAs: (value) => value === '' ? null : parseFloat(value) || null
                        })}
                        error={form.formState.errors.fat_content?.message}
                        placeholder="e.g., 3.75"
                      />
                    </div>
                  )}

                  {/* Protein Content */}
                  {settings?.trackProteinContent && (
                    <div>
                      <Label htmlFor="protein_content">
                         Protein Content (%) {settings.productionTrackingMode === 'quality_focused' && settings.proteinContentRequired && '*'}
                      </Label>
                      <Input
                        id="protein_content"
                        type="number"
                        step="0.01"
                        {...form.register('protein_content', {
                          valueAsNumber: true,
                          setValueAs: (value) => value === '' ? null : parseFloat(value) || null
                        })}
                        error={form.formState.errors.protein_content?.message}
                        placeholder="e.g., 3.25"
                      />
                    </div>
                  )}

                  {/* SCC */}
                  {settings?.trackSomaticCellCount && (
                    <div>
                      <Label htmlFor="somatic_cell_count">
                        Somatic Cell Count {settings.productionTrackingMode === 'quality_focused' && settings.sccRequired && '*'}
                      </Label>
                      <Input
                        id="somatic_cell_count"
                        type="number"
                        {...form.register('somatic_cell_count', {
                          valueAsNumber: true,
                          setValueAs: (value) => value === '' ? null : parseInt(value) || null
                        })}
                        error={form.formState.errors.somatic_cell_count?.message}
                        placeholder="e.g., 200000"
                      />
                    </div>
                  )}

                   {/* Lactose */}
                   {settings?.trackLactoseContent && (
                    <div>
                      <Label htmlFor="lactose_content">
                         Lactose (%) {settings.productionTrackingMode === 'quality_focused' && settings.lactoseRequired && '*'}
                      </Label>
                      <Input
                        id="lactose_content"
                        type="number"
                        step="0.01"
                        {...form.register('lactose_content', {
                          valueAsNumber: true,
                          setValueAs: (value) => value === '' ? null : parseFloat(value) || null
                        })}
                        error={form.formState.errors.lactose_content?.message}
                      />
                    </div>
                  )}
                  
                  {/* Temperature */}
                  {settings?.trackTemperature && (
                     <div>
                      <Label htmlFor="temperature">
                         Temperature ({settings.temperatureUnit === 'celsius' ? '°C' : '°F'}) {settings.productionTrackingMode === 'quality_focused' && settings.temperatureRequired && '*'}
                      </Label>
                      <Input
                        id="temperature"
                        type="number"
                        step="0.1"
                        {...form.register('temperature', {
                          valueAsNumber: true,
                          setValueAs: (value) => value === '' ? null : parseFloat(value) || null
                        })}
                        error={form.formState.errors.temperature?.message}
                      />
                    </div>
                  )}

                   {/* pH */}
                   {settings?.trackPhLevel && (
                     <div>
                      <Label htmlFor="ph_level">
                         pH Level {settings.productionTrackingMode === 'quality_focused' && settings.phRequired && '*'}
                      </Label>
                      <Input
                        id="ph_level"
                        type="number"
                        step="0.1"
                        {...form.register('ph_level', {
                          valueAsNumber: true,
                          setValueAs: (value) => value === '' ? null : parseFloat(value) || null
                        })}
                        error={form.formState.errors.ph_level?.message}
                      />
                    </div>
                  )}
               </div>
               
               {/* Notes in Advanced Mode */}
               <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  {...form.register('notes', {
                    setValueAs: (value) => value === '' ? null : value
                  })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (onSuccess) onSuccess() 
                else router.push('/dashboard/production')
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Record Production'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}