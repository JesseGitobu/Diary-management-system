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

const feedInventorySchema = z.object({
  feed_type_id: z.string().min(1, 'Please select a feed type'),
  quantity_kg: z.number().min(0.1, 'Quantity must be greater than 0'),
  cost_per_kg: z.number().min(0, 'Cost must be positive').optional(),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  expiry_date: z.string().optional(),
  supplier: z.string().optional(),
  batch_number: z.string().optional(),
  notes: z.string().optional(),
})

type FeedInventoryFormData = z.infer<typeof feedInventorySchema>

interface AddFeedInventoryModalProps {
  farmId: string
  feedTypes: Array<{ id: string; name: string; typical_cost_per_kg?: number }>
  isOpen: boolean
  onClose: () => void
  onSuccess: (inventory: any) => void
}

export function AddFeedInventoryModal({ 
  farmId, 
  feedTypes,
  isOpen, 
  onClose, 
  onSuccess 
}: AddFeedInventoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFeedType, setSelectedFeedType] = useState<string>('')
  
  const form = useForm<FeedInventoryFormData>({
    resolver: zodResolver(feedInventorySchema),
    defaultValues: {
      feed_type_id: '',
      quantity_kg: undefined,
      cost_per_kg: undefined,
      purchase_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      supplier: '',
      batch_number: '',
      notes: '',
    },
  })
  
  // Auto-fill cost when feed type changes
  const handleFeedTypeChange = (feedTypeId: string) => {
    setSelectedFeedType(feedTypeId)
    form.setValue('feed_type_id', feedTypeId)
    
    const feedType = feedTypes.find(ft => ft.id === feedTypeId)
    if (feedType?.typical_cost_per_kg) {
      form.setValue('cost_per_kg', feedType.typical_cost_per_kg)
    }
  }
  
  const calculateTotalCost = () => {
    const quantity = form.watch('quantity_kg')
    const costPerKg = form.watch('cost_per_kg')
    
    if (quantity && costPerKg) {
      return (quantity * costPerKg).toFixed(2)
    }
    return '0.00'
  }
  
  const handleSubmit = async (data: FeedInventoryFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/feed/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          expiry_date: data.expiry_date || null,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add inventory')
      }
      
      const result = await response.json()
      onSuccess(result.data)
      form.reset()
      onClose()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Add Feed Inventory
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Feed Type Selection */}
          <div>
            <Label htmlFor="feed_type_id">Feed Type *</Label>
            <select
              id="feed_type_id"
              value={selectedFeedType}
              onChange={(e) => handleFeedTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
            >
              <option value="">Select a feed type</option>
              {feedTypes.map((feedType) => (
                <option key={feedType.id} value={feedType.id}>
                  {feedType.name}
                  {feedType.typical_cost_per_kg && ` ($${feedType.typical_cost_per_kg}/kg)`}
                </option>
              ))}
            </select>
            {form.formState.errors.feed_type_id && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.feed_type_id.message}
              </p>
            )}
            
            {feedTypes.length === 0 && (
              <p className="text-sm text-amber-600 mt-1">
                No feed types available. Please create a feed type first.
              </p>
            )}
          </div>
          
          {/* Purchase Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Purchase Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity_kg">Quantity (KG) *</Label>
                <Input
                  id="quantity_kg"
                  type="number"
                  step="0.1"
                  {...form.register('quantity_kg', { valueAsNumber: true })}
                  error={form.formState.errors.quantity_kg?.message}
                  placeholder="e.g., 1000"
                />
              </div>
              
              <div>
                <Label htmlFor="cost_per_kg">Cost per KG ($)</Label>
                <Input
                  id="cost_per_kg"
                  type="number"
                  step="0.01"
                  {...form.register('cost_per_kg', { valueAsNumber: true })}
                  error={form.formState.errors.cost_per_kg?.message}
                  placeholder="e.g., 0.45"
                />
              </div>
            </div>
            
            {/* Total Cost Display */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Total Cost: </span>
                ${calculateTotalCost()}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase_date">Purchase Date *</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  {...form.register('purchase_date')}
                  error={form.formState.errors.purchase_date?.message}
                />
              </div>
              
              <div>
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  {...form.register('expiry_date')}
                  error={form.formState.errors.expiry_date?.message}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  {...form.register('supplier')}
                  error={form.formState.errors.supplier?.message}
                  placeholder="e.g., ABC Feed Company"
                />
              </div>
              
              <div>
                <Label htmlFor="batch_number">Batch/Lot Number</Label>
                <Input
                  id="batch_number"
                  {...form.register('batch_number')}
                  error={form.formState.errors.batch_number?.message}
                  placeholder="e.g., LOT2024001"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                {...form.register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                placeholder="Any additional notes about this purchase..."
              />
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
              disabled={loading || feedTypes.length === 0}
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Add to Inventory'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}