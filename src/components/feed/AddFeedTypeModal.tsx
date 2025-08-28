'use client'

import { useState } from 'react'
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

// Interface for the data from settings
interface FeedTypeCategory {
  id: string
  name: string
  color: string
}

interface AnimalCategory {
  id: string
  name: string
}

interface WeightConversion {
  id: string
  unit_name: string
  conversion_factor_to_kg: number
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
  category_id: z.string().optional(),
  preferred_measurement_unit: z.string().optional(),
  low_stock_threshold: z.number().min(0, 'Threshold must be positive').nullable().optional(),
})

type FeedTypeFormData = z.infer<typeof feedTypeSchema>

interface AddFeedTypeModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (feedType: any) => void
  feedTypeCategories?: FeedTypeCategory[]
  animalCategories?: AnimalCategory[]
  weightConversions?: WeightConversion[]
}

export function AddFeedTypeModal({ 
  farmId, 
  isOpen, 
  onClose, 
  onSuccess,
  feedTypeCategories = [],
  animalCategories = [],
  weightConversions = []
}: AddFeedTypeModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<FeedTypeFormData>({
    resolver: zodResolver(feedTypeSchema),
    defaultValues: {
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
    },
  })
  
  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const currentCategories = form.getValues('animal_categories')
    
    if (checked) {
      form.setValue('animal_categories', [...currentCategories, categoryId])
    } else {
      form.setValue('animal_categories', currentCategories.filter(cat => cat !== categoryId))
    }
    
    // Clear any existing error for this field
    form.clearErrors('animal_categories')
  }
  
  const handleSubmit = async (data: FeedTypeFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      // Prepare nutritional info as JSONB
      const nutritionalInfo = {
        protein_content: data.protein_content,
        energy_content: data.energy_content,
        fiber_content: data.fiber_content,
        fat_content: data.fat_content,
      }
      
      // Remove nutritional fields from main data and add as JSONB
      const { protein_content, energy_content, fiber_content, fat_content, ...feedTypeData } = data
      
      const requestData = {
        ...feedTypeData,
        farm_id: farmId,
        nutritional_info: nutritionalInfo,
      }
      
      const response = await fetch('/api/feed/types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create feed type')
      }
      
      const result = await response.json()
      onSuccess(result.data)
      form.reset()
      onClose()
      
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
  
  const selectedCategories = form.watch('animal_categories')
  const selectedFeedCategory = feedTypeCategories?.find(cat => cat.id === form.watch('category_id'))
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Add New Feed Type
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
                    onValueChange={(value) => form.setValue('category_id', value)}
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
                              style={{ backgroundColor: category.color }}
                            />
                            <span>{category.name}</span>
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
                    onValueChange={(value) => form.setValue('preferred_measurement_unit', value)}
                  >
                    <SelectTrigger className={form.formState.errors.preferred_measurement_unit ? 'border-red-300' : ''}>
                      <SelectValue placeholder="Select measurement unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {weightConversions.map((conversion) => (
                        <SelectItem key={conversion.id} value={conversion.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{conversion.unit_name}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              (1 {conversion.unit_name} = {conversion.conversion_factor_to_kg} kg)
                            </span>
                          </div>
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
                    setValueAs: (v: string) => v === "" ? null : Number(v)
                  })}
                  error={form.formState.errors.typical_cost_per_kg?.message}
                  placeholder="e.g., 100"
                />
              </div>
              
              <div>
                <Label htmlFor="low_stock_threshold">Low Stock Alert Threshold (kg)</Label>
                <Input
                  id="low_stock_threshold"
                  type="number"
                  step="0.1"
                  {...form.register('low_stock_threshold', { 
                    setValueAs: (v: string) => v === "" ? null : Number(v)
                  })}
                  error={form.formState.errors.low_stock_threshold?.message}
                  placeholder="e.g., 50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You'll receive alerts when stock falls below this level
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
          
          {/* Nutritional Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Nutritional Information (Optional)</h4>
            <p className="text-sm text-gray-600">
              Add nutritional data to help with feed planning and analysis.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="protein_content">Protein (%)</Label>
                <Input
                  id="protein_content"
                  type="number"
                  step="0.1"
                  {...form.register('protein_content', { 
                    setValueAs: (v: string) => v === "" ? null : Number(v)
                  })}
                  error={form.formState.errors.protein_content?.message}
                  placeholder="e.g., 18.5"
                />
              </div>
              
              <div>
                <Label htmlFor="fat_content">Fat (%)</Label>
                <Input
                  id="fat_content"
                  type="number"
                  step="0.1"
                  {...form.register('fat_content', { 
                    setValueAs: (v: string) => v === "" ? null : Number(v)
                  })}
                  error={form.formState.errors.fat_content?.message}
                  placeholder="e.g., 3.2"
                />
              </div>
              
              <div>
                <Label htmlFor="fiber_content">Fiber (%)</Label>
                <Input
                  id="fiber_content"
                  type="number"
                  step="0.1"
                  {...form.register('fiber_content', { 
                    setValueAs: (v: string) => v === "" ? null : Number(v)
                  })}
                  error={form.formState.errors.fiber_content?.message}
                  placeholder="e.g., 25.0"
                />
              </div>
              
              <div>
                <Label htmlFor="energy_content">Energy (MJ/kg)</Label>
                <Input
                  id="energy_content"
                  type="number"
                  step="0.1"
                  {...form.register('energy_content', { 
                    setValueAs: (v: string) => v === "" ? null : Number(v)
                  })}
                  error={form.formState.errors.energy_content?.message}
                  placeholder="e.g., 12.5"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || animalCategories.length === 0}
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Create Feed Type'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}