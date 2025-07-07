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

const feedTypeSchema = z.object({
  name: z.string().min(2, 'Feed name must be at least 2 characters'),
  description: z.string().optional(),
  typical_cost_per_kg: z.number().min(0, 'Cost must be positive').optional(),
  supplier: z.string().optional(),
  protein_content: z.number().min(0).max(100).optional(),
  energy_content: z.number().min(0).optional(),
  fiber_content: z.number().min(0).max(100).optional(),
  fat_content: z.number().min(0).max(100).optional(),
})

type FeedTypeFormData = z.infer<typeof feedTypeSchema>

interface AddFeedTypeModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (feedType: any) => void
}

export function AddFeedTypeModal({ 
  farmId, 
  isOpen, 
  onClose, 
  onSuccess 
}: AddFeedTypeModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<FeedTypeFormData>({
    resolver: zodResolver(feedTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      typical_cost_per_kg: undefined,
      supplier: '',
      protein_content: undefined,
      energy_content: undefined,
      fiber_content: undefined,
      fat_content: undefined,
    },
  })
  
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
                  placeholder="e.g., Alfalfa Hay, Corn Silage"
                />
              </div>
              
              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  {...form.register('supplier')}
                  error={form.formState.errors.supplier?.message}
                  placeholder="e.g., ABC Feed Company"
                />
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
            
            <div>
              <Label htmlFor="typical_cost_per_kg">Typical Cost per KG ($)</Label>
              <Input
                id="typical_cost_per_kg"
                type="number"
                step="0.01"
                {...form.register('typical_cost_per_kg', { valueAsNumber: true })}
                error={form.formState.errors.typical_cost_per_kg?.message}
                placeholder="e.g., 0.45"
              />
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
                  {...form.register('protein_content', { valueAsNumber: true })}
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
                  {...form.register('fat_content', { valueAsNumber: true })}
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
                  {...form.register('fiber_content', { valueAsNumber: true })}
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
                  {...form.register('energy_content', { valueAsNumber: true })}
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
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Create Feed Type'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}