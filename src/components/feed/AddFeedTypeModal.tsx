'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

// Standard/default measuring units available for conversions
const STANDARD_MEASURING_UNITS = [
  // Standard Metric Weight Units
  { value: 'kg', label: 'Kilograms (kg)', type: 'weight' },
  { value: 'g', label: 'Grams (g)', type: 'weight' },
  { value: 'mg', label: 'Milligrams (mg)', type: 'weight' },
  { value: 't', label: 'Metric Tons (t)', type: 'weight' },

  // Imperial Weight Units
  { value: 'lbs', label: 'Pounds (lbs)', type: 'weight' },
  { value: 'oz', label: 'Ounces (oz)', type: 'weight' },
  { value: 'st', label: 'Stone (st)', type: 'weight' },

  // Liquid Volume Units (Metric)
  { value: 'L', label: 'Liters (L)', type: 'volume' },
  { value: 'mL', label: 'Milliliters (mL)', type: 'volume' },
  { value: 'cL', label: 'Centiliters (cL)', type: 'volume' },
  { value: 'dL', label: 'Deciliters (dL)', type: 'volume' },

  // Liquid Volume Units (Imperial/US)
  { value: 'gal', label: 'Gallons (gal)', type: 'volume' },
  { value: 'qt', label: 'Quarts (qt)', type: 'volume' },
  { value: 'pt', label: 'Pints (pt)', type: 'volume' },
  { value: 'cup', label: 'Cups (cup)', type: 'volume' },
  { value: 'fl oz', label: 'Fluid Ounces (fl oz)', type: 'volume' },
  { value: 'tbsp', label: 'Tablespoons (tbsp)', type: 'volume' },
  { value: 'tsp', label: 'Teaspoons (tsp)', type: 'volume' },
] as const

// Interface for the data from settings
interface FeedTypeCategory {
  id: string
  farm_id: string
  category_name: string
  description?: string | null
  created_at?: string | null
  sort_order?: number | null
  is_default?: boolean
  is_active?: boolean
  collect_nutritional_data?: boolean
  color?: string | null
  updated_at?: string | null
  created_by?: string | null
  updated_by?: string | null
}

interface AnimalCategory {
  id: string
  name: string
}

interface WeightConversion {
  id: string
  farm_id: string
  from_unit: string
  to_unit: string
  conversion_factor: number
  unit_name?: string | null
  is_default?: boolean
  is_active?: boolean
  created_at?: string | null
}

const feedTypeSchema = z.object({
  name: z.string().min(2, 'Feed name must be at least 2 characters'),
  description: z.string().nullable().optional(),
  typical_cost_per_kg: z.number().min(0, 'Cost must be positive').nullable().optional(),
  supplier: z.string().nullable().optional(),
  protein_content: z.number().min(0).max(100).nullable().optional(),
  energy_content: z.number().min(0).nullable().optional(),
  fiber_content: z.number().min(0).max(100).nullable().optional(),
  fat_content: z.number().min(0).max(100).nullable().optional(),
  animal_categories: z.array(z.string()).min(1, 'Please select at least one animal category'),
  category_id: z.string().optional().transform(v => (v === '' ? undefined : v)),
  preferred_measurement_unit: z.string().optional().transform(v => (v === '' ? undefined : v)),
  low_stock_threshold: z.number().min(0, 'Threshold must be positive').nullable().optional(),
  low_stock_threshold_unit: z.string().optional(),
})

type FeedTypeFormData = z.infer<typeof feedTypeSchema>

interface FeedType {
  id: string
  name: string
  description?: string | null
  typical_cost_per_kg?: number | null
  supplier?: string | null
  animal_categories: string[]
  category_id?: string | null
  preferred_measurement_unit?: string | null
  low_stock_threshold?: number | null
  low_stock_threshold_unit?: string | null
  farm_id: string
  created_at?: string
  updated_at?: string
}

const defaultValues: FeedTypeFormData = {
  name: '',
  description: '',
  typical_cost_per_kg: null,
  supplier: '',
  protein_content: null,
  energy_content: null,
  fiber_content: null,
  fat_content: null,
  animal_categories: [],
  category_id: undefined,
  preferred_measurement_unit: undefined,
  low_stock_threshold: null,
  low_stock_threshold_unit: undefined,
}

const parseSupplierFromNotes = (notes?: string | null) => {
  if (!notes) return ''
  const match = notes.match(/^Supplier:\s*(.+)$/i)
  return match ? match[1] : notes
}

const getNutritionalInfo = (feedType: any) =>
  feedType.nutritional_info || feedType.nutritional_value || {}

interface AddFeedTypeModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (feedType: FeedType) => void
  feedTypeCategories?: FeedTypeCategory[]
  animalCategories?: AnimalCategory[]
  weightConversions?: WeightConversion[]
  /** When provided, the modal operates in edit mode */
  feedType?: any | null
}

export function AddFeedTypeModal({
  farmId,
  isOpen,
  onClose,
  onSuccess,
  feedTypeCategories = [],
  animalCategories = [],
  weightConversions = [],
  feedType = null,
}: AddFeedTypeModalProps) {
  const isEditing = !!feedType
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FeedTypeFormData>({
    resolver: zodResolver(feedTypeSchema),
    defaultValues,
  })

  // Populate form when editing, clear when closing
  useEffect(() => {
    if (isOpen && feedType) {
      const nutrition = getNutritionalInfo(feedType)
      form.reset({
        name: feedType.name || '',
        description: feedType.description || '',
        typical_cost_per_kg: feedType.typical_cost_per_kg ?? null,
        supplier: feedType.supplier || parseSupplierFromNotes(feedType.notes),
        protein_content: nutrition.protein_content ?? null,
        energy_content: nutrition.energy_content ?? null,
        fiber_content: nutrition.fiber_content ?? null,
        fat_content: nutrition.fat_content ?? null,
        animal_categories: feedType.animal_categories || [],
        category_id: feedType.category_id || undefined,
        preferred_measurement_unit:
          feedType.preferred_measurement_unit || feedType.unit_of_measure || undefined,
        low_stock_threshold: feedType.low_stock_threshold ?? null,
        low_stock_threshold_unit: feedType.low_stock_threshold_unit || undefined,
      })
    }

    if (!isOpen) {
      form.reset(defaultValues)
      setError(null)
    }
  }, [isOpen, feedType, form])

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const current = form.getValues('animal_categories')
    form.setValue(
      'animal_categories',
      checked ? [...current, categoryId] : current.filter(id => id !== categoryId)
    )
    form.clearErrors('animal_categories')
  }

  const handleSubmit = async (data: FeedTypeFormData) => {
    setLoading(true)
    setError(null)

    try {
      const { protein_content, energy_content, fiber_content, fat_content, ...rest } = data

      // Sanitize UUID fields: convert empty strings to null to avoid database UUID validation errors
      const sanitized = {
        ...rest,
        category_id: rest.category_id ? rest.category_id : null,
        preferred_measurement_unit: rest.preferred_measurement_unit ? rest.preferred_measurement_unit : null,
        low_stock_threshold_unit: rest.low_stock_threshold_unit ? rest.low_stock_threshold_unit : null,
      }

      if (isEditing) {
        // PUT — include nutritional info as JSONB
        const requestData = {
          ...sanitized,
          nutritional_info: { protein_content, energy_content, fiber_content, fat_content },
        }

        const response = await fetch(`/api/feed/types/${feedType.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update feed type')
        }

        const result = await response.json()
        onSuccess(result.data as FeedType)
      } else {
        // POST — pass all fields; sanitizeFeedTypePayload handles remapping
        const requestData = {
          ...sanitized,
          nutritional_info: { protein_content, energy_content, fiber_content, fat_content },
        }

        const response = await fetch('/api/feed/types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create feed type')
        }

        const result = await response.json()
        onSuccess(result.data as FeedType)
      }

      form.reset(defaultValues)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const selectedCategories = form.watch('animal_categories')
  const selectedFeedCategory = feedTypeCategories.find(cat => cat.id === form.watch('category_id'))

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {isEditing ? 'Edit Feed Type' : 'Add New Feed Type'}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Basic Information</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Feed Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  error={form.formState.errors.name?.message}
                  placeholder="e.g., Rhodes grass Hay, Silage, Lucerne"
                />
              </div>

              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  {...form.register('supplier')}
                  error={form.formState.errors.supplier?.message}
                  placeholder="e.g., ABC Feeds Store"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Feed Category *</Label>
                {feedTypeCategories.length === 0 ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      No feed categories available. Please create feed categories in Feed Management Settings first.
                    </p>
                  </div>
                ) : (
                  <Select
                    value={form.watch('category_id')}
                    onValueChange={(value) => form.setValue('category_id', value, { shouldValidate: true })}
                  >
                    <SelectTrigger className={form.formState.errors.category_id ? 'border-red-300' : ''}>
                      <SelectValue placeholder="Select feed category" />
                    </SelectTrigger>
                    <SelectContent>
                      {feedTypeCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color || '#999999' }}
                            />
                            <span>{category.category_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {form.formState.errors.category_id && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.category_id.message}
                  </p>
                )}
                {selectedFeedCategory && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs text-gray-600 mb-1"><strong>Category Details:</strong></p>
                    <p className="text-xs text-gray-700">
                      {selectedFeedCategory.description || 'No description provided'}
                    </p>
                    {selectedFeedCategory.collect_nutritional_data && (
                      <p className="text-xs text-blue-700 mt-1">📊 This category requires nutritional data collection</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label>Preferred Measurement Unit *</Label>
                  {weightConversions.length === 0 ? (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        No weight units available. Please create weight conversions in Feed Management Settings first.
                      </p>
                    </div>
                  ) : (
                    <Select
                      value={form.watch('preferred_measurement_unit')}
                      onValueChange={(value) => form.setValue('preferred_measurement_unit', value, { shouldValidate: true })}
                    >
                      <SelectTrigger className={form.formState.errors.preferred_measurement_unit ? 'border-red-300' : ''}>
                        <SelectValue placeholder="Select measurement unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {weightConversions.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100">
                              Created Weight Conversions
                            </div>
                            {weightConversions.map((conversion) => (
                              <SelectItem key={`conv-${conversion.id}`} value={conversion.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {conversion.unit_name || `${conversion.from_unit} (${conversion.from_unit})`}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    1 {conversion.from_unit} = {conversion.conversion_factor} {conversion.to_unit}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        )}
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100">
                          Standard Measuring Units
                        </div>
                        <div className="px-2 py-1 text-xs text-gray-500 italic">Weight Units</div>
                        {STANDARD_MEASURING_UNITS.filter(u => u.type === 'weight').map((unit) => (
                          <SelectItem key={`std-${unit.value}`} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1 text-xs text-gray-500 italic">Volume Units</div>
                        {STANDARD_MEASURING_UNITS.filter(u => u.type === 'volume').map((unit) => (
                          <SelectItem key={`std-${unit.value}`} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {form.formState.errors.preferred_measurement_unit && (
                    <p className="mt-1 text-sm text-red-600">
                      {form.formState.errors.preferred_measurement_unit.message}
                    </p>
                  )}
                </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                {...form.register('description')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                placeholder="Describe the feed type, quality, or special characteristics..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="typical_cost_per_kg">Typical Cost per KG (KSh)</Label>
                <Input
                  id="typical_cost_per_kg"
                  type="number"
                  step="0.01"
                  {...form.register('typical_cost_per_kg', {
                    setValueAs: (v: string) => v === '' ? null : Number(v),
                  })}
                  error={form.formState.errors.typical_cost_per_kg?.message}
                  placeholder="e.g., 100"
                />
              </div>

              <div className="space-y-2">
                <Label>Low Stock Alert Threshold</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      step="0.1"
                      {...form.register('low_stock_threshold', {
                        setValueAs: (v: string) => v === '' ? null : Number(v),
                      })}
                      error={form.formState.errors.low_stock_threshold?.message}
                      placeholder="e.g., 50"
                    />
                  </div>
                  <div className="w-32">
                    <Select
                      value={form.watch('low_stock_threshold_unit')}
                      onValueChange={(value) => form.setValue('low_stock_threshold_unit', value)}
                    >
                      <SelectTrigger className={form.formState.errors.low_stock_threshold_unit ? 'border-red-300' : ''}>
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {weightConversions.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100">
                              Created Weight Conversions
                            </div>
                            {weightConversions.map((conversion) => (
                              <SelectItem key={`conv-${conversion.id}`} value={conversion.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {conversion.unit_name || `${conversion.from_unit} (${conversion.from_unit})`}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    1 {conversion.from_unit} = {conversion.conversion_factor} {conversion.to_unit}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        )}
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100">
                          Standard Measuring Units
                        </div>
                        <div className="px-2 py-1 text-xs text-gray-500 italic">Weight Units</div>
                        {STANDARD_MEASURING_UNITS.filter(u => u.type === 'weight').map((unit) => (
                          <SelectItem key={`std-${unit.value}`} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1 text-xs text-gray-500 italic">Volume Units</div>
                        {STANDARD_MEASURING_UNITS.filter(u => u.type === 'volume').map((unit) => (
                          <SelectItem key={`std-${unit.value}`} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  You&apos;ll receive alerts when stock falls below this level
                </p>
              </div>
            </div>
          </div>

          {/* Animal Categories */}
          <div className="space-y-4">
            <div>
              <Label>Target Animal Categories *</Label>
              <p className="text-sm text-gray-600 mb-3">
                Select which animal categories this feed type is suitable for.
              </p>

              {animalCategories.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    No animal categories available. Please create animal categories in the Feed Management Settings first.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {animalCategories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                        className="h-4 w-4 text-farm-green border-gray-300 rounded focus:ring-farm-green"
                      />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </label>
                  ))}
                </div>
              )}

              {form.formState.errors.animal_categories && (
                <p className="mt-1 text-sm text-red-600">
                  {form.formState.errors.animal_categories.message}
                </p>
              )}
            </div>
          </div>


          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || animalCategories.length === 0}>
              {loading ? <LoadingSpinner size="sm" /> : isEditing ? 'Update Feed Type' : 'Create Feed Type'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
