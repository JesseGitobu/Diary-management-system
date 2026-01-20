// src/components/animals/NewbornCalfForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Activity } from 'lucide-react'
import { z } from 'zod'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  getProductionStatusDisplay,
  getProductionStatusBadgeColor,
} from '@/lib/utils/productionStatusUtils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { TagGenerationSection } from './TagGenerationSection' // Import the component we created

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
}

export function NewbornCalfForm({ farmId, onSuccess, onCancel }: NewbornCalfFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableMothers, setAvailableMothers] = useState<Animal[]>([])
  const [loadingMothers, setLoadingMothers] = useState(true)

  const [calculatedProductionStatus, setCalculatedProductionStatus] = useState<string>('calf')
  const [calculatingStatus, setCalculatingStatus] = useState(false)
  const [matchingCategory, setMatchingCategory] = useState<{ id: string; name: string } | null>(null)


  const form = useForm<NewbornCalfFormData>({
    resolver: zodResolver(newbornCalfSchema),
    defaultValues: {
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
        return
      }

      setCalculatingStatus(true)
      try {
        const response = await fetch('/api/animals/calculate-production-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            birth_date: birthDate,
            gender: gender,
            farm_id: farmId
          })
        })

        if (response.ok) {
          const data = await response.json()
          setCalculatedProductionStatus(data.production_status)
          setMatchingCategory(data.matching_category)

          console.log(`Production status calculated: ${data.production_status}`,
            data.matching_category ? `(Category: ${data.matching_category.name})` : '(Default rules)')
        }
      } catch (error) {
        console.error('Error calculating production status:', error)
        // Fallback to 'calf' if calculation fails
        setCalculatedProductionStatus('calf')
        setMatchingCategory(null)
      } finally {
        setCalculatingStatus(false)
      }
    }

    calculateProductionStatus()
  }, [form.watch('birth_date'), form.watch('gender'), farmId])

  // Handle tag changes from TagGenerationSection
  const handleTagChange = (tagNumber: string, autoGenerate: boolean) => {
    form.setValue('tag_number', tagNumber)
    form.setValue('autoGenerateTag', autoGenerate)
  }

  // Prepare custom attributes for tag generation based on form data
  const getCustomAttributesForTag = () => {
    const selectedMother = availableMothers.find(m => m.id === formData.mother_id)

    return [
      { name: 'Breed Group', value: formData.breed || 'Unknown' },
      { name: 'Production Stage', value: 'Calf' },
      { name: 'Gender', value: formData.gender || 'Unknown' },
      { name: 'Source', value: 'Born Here' },
      ...(selectedMother ? [{ name: 'Mother', value: selectedMother.tag_number }] : [])
    ]
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
      const requestData = {
        ...data,
        farm_id: farmId,
        animal_source: 'newborn_calf',
        production_status: calculatedProductionStatus,
        // weight: data.birth_weight,
        status: 'active',
        autoGenerateTag: data.autoGenerateTag,
      }

      const response = await fetch('/api/animals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add calf')
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
        <h3 className="text-lg font-semibold text-gray-900">New Born Calf Registration</h3>
        <p className="text-sm text-gray-600">Register a calf born on your farm</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Tag Generation Section - Now at the top */}
        <TagGenerationSection
          farmId={farmId}
          formData={formData}
          onTagChange={handleTagChange}
          customAttributes={getCustomAttributesForTag()}
        />

        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 border-b pb-2">Basic Information</h4>

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
                  <SelectValue placeholder="Select breed" />
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
        </div>



        {calculatingStatus ? (
          <div className="col-span-2 flex items-center justify-center p-3 bg-blue-50 border border-blue-200 rounded-md">
            <LoadingSpinner size="sm" className="mr-2" />
            <span className="text-sm text-blue-700">Calculating production status...</span>
          </div>
        ) : (formData.birth_date && formData.gender) && (
          <div className="col-span-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Auto-assigned Production Status
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {matchingCategory
                    ? `Based on "${matchingCategory.name}" category → "${getProductionStatusDisplay(calculatedProductionStatus, formData.gender)}"`
                    : `Based on age and ${formData.gender} default rules → "${getProductionStatusDisplay(calculatedProductionStatus, formData.gender)}"`
                  }
                </p>
                {formData.gender === 'male' && (
                  <p className="text-xs text-green-600 mt-1 italic">
                    ℹ️ Male animals are categorized as either Calves or Bulls
                  </p>
                )}
              </div>
              <Badge className={`${getProductionStatusBadgeColor(calculatedProductionStatus)} px-3 py-1`}>
                {getProductionStatusDisplay(calculatedProductionStatus, formData.gender)}
              </Badge>
            </div>
          </div>
        )}

        {/* Parentage Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 border-b pb-2">Parentage Information</h4>

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
                    <SelectValue placeholder="Select mother" />
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
        </div>

        {/* Health & Physical Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 border-b pb-2">Health & Physical Information</h4>

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
                {...form.register('birth_weight', { valueAsNumber: true })}
                placeholder="e.g., 35.5"
              />
              <p className="text-xs text-gray-500">Weight at birth in kilograms</p>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 border-b pb-2">Additional Information</h4>

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
        </div>

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
                Adding Calf...
              </>
            ) : (
              'Add Calf'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}