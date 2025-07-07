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

const inventorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.enum(['feed', 'medical', 'equipment', 'supplies', 'chemicals', 'maintenance', 'other']),
  sku: z.string().optional(),
  unit_of_measure: z.string().min(1, 'Unit of measure is required'),
  current_stock: z.number().min(0),
  minimum_stock: z.number().min(0),
  maximum_stock: z.number().optional(),
  unit_cost: z.number().optional(),
  storage_location: z.string().optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
})

type InventoryFormData = z.infer<typeof inventorySchema>

interface AddInventoryModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onItemAdded: (item: any) => void
}

export function AddInventoryModal({ farmId, isOpen, onClose, onItemAdded }: AddInventoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'supplies',
      sku: '',
      unit_of_measure: '',
      current_stock: 0,
      minimum_stock: 0,
      maximum_stock: undefined,
      unit_cost: undefined,
      storage_location: '',
      expiry_date: '',
      notes: '',
    },
  })
  
  const handleSubmit = async (data: InventoryFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          expiry_date: data.expiry_date || null,
          unit_cost: data.unit_cost || null,
          maximum_stock: data.maximum_stock || null,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add inventory item')
      }
      
      onItemAdded(result.item)
      form.reset()
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Add Inventory Item
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                {...form.register('name')}
                error={form.formState.errors.name?.message}
                placeholder="e.g., Dairy Feed Mix"
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                {...form.register('category')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="feed">Feed</option>
                <option value="medical">Medical</option>
                <option value="equipment">Equipment</option>
                <option value="supplies">Supplies</option>
                <option value="chemicals">Chemicals</option>
                <option value="maintenance">Maintenance</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              {...form.register('description')}
              placeholder="Brief description of the item"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                {...form.register('sku')}
                placeholder="Stock keeping unit"
              />
            </div>
            
            <div>
              <Label htmlFor="unit_of_measure">Unit of Measure *</Label>
              <Input
                id="unit_of_measure"
                {...form.register('unit_of_measure')}
                error={form.formState.errors.unit_of_measure?.message}
                placeholder="e.g., kg, liters, pieces"
              />
            </div>
            
            <div>
              <Label htmlFor="storage_location">Storage Location</Label>
              <Input
                id="storage_location"
                {...form.register('storage_location')}
                placeholder="e.g., Barn A, Storage Room"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="current_stock">Current Stock *</Label>
              <Input
                id="current_stock"
                type="number"
                step="0.01"
                {...form.register('current_stock', { valueAsNumber: true })}
                error={form.formState.errors.current_stock?.message}
              />
            </div>
            
            <div>
              <Label htmlFor="minimum_stock">Minimum Stock *</Label>
              <Input
                id="minimum_stock"
                type="number"
                step="0.01"
                {...form.register('minimum_stock', { valueAsNumber: true })}
                error={form.formState.errors.minimum_stock?.message}
              />
            </div>
            
            <div>
              <Label htmlFor="maximum_stock">Maximum Stock</Label>
              <Input
                id="maximum_stock"
                type="number"
                step="0.01"
                {...form.register('maximum_stock', { valueAsNumber: true })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit_cost">Unit Cost ($)</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                {...form.register('unit_cost', { valueAsNumber: true })}
                placeholder="Cost per unit"
              />
            </div>
            
            <div>
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                {...form.register('expiry_date')}
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
              placeholder="Additional notes about this item..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
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
              {loading ? <LoadingSpinner size="sm" /> : 'Add Item'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}