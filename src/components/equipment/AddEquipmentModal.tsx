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

const equipmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  equipment_type: z.string().min(1, 'Equipment type is required'),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  purchase_date: z.string().optional(),
  purchase_cost: z.number().optional(),
  warranty_expiry: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
})

type EquipmentFormData = z.infer<typeof equipmentSchema>

interface AddEquipmentModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onEquipmentAdded: (equipment: any) => void
}

export function AddEquipmentModal({ farmId, isOpen, onClose, onEquipmentAdded }: AddEquipmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: '',
      description: '',
      equipment_type: 'milking_equipment',
      brand: '',
      model: '',
      serial_number: '',
      purchase_date: '',
      purchase_cost: undefined,
      warranty_expiry: '',
      location: '',
      notes: '',
    },
  })
  
  const handleSubmit = async (data: EquipmentFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
          purchase_date: data.purchase_date || null,
          purchase_cost: data.purchase_cost || null,
          warranty_expiry: data.warranty_expiry || null,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add equipment')
      }
      
      onEquipmentAdded(result.equipment)
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
  
  const equipmentTypes = [
    { value: 'milking_equipment', label: 'Milking Equipment' },
    { value: 'tractor', label: 'Tractor' },
    { value: 'feed_mixer', label: 'Feed Mixer' },
    { value: 'manure_spreader', label: 'Manure Spreader' },
    { value: 'hay_equipment', label: 'Hay Equipment' },
    { value: 'cooling_system', label: 'Cooling System' },
    { value: 'generator', label: 'Generator' },
    { value: 'barn_equipment', label: 'Barn Equipment' },
    { value: 'water_system', label: 'Water System' },
    { value: 'other', label: 'Other' },
  ]
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Add Equipment
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Equipment Name *</Label>
              <Input
                id="name"
                {...form.register('name')}
                error={form.formState.errors.name?.message}
                placeholder="e.g., Milking Machine #1"
              />
            </div>
            
            <div>
              <Label htmlFor="equipment_type">Type *</Label>
              <select
                id="equipment_type"
                {...form.register('equipment_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                {equipmentTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {form.formState.errors.equipment_type && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.equipment_type.message}
                </p>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              {...form.register('description')}
              placeholder="Brief description of the equipment"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                {...form.register('brand')}
                placeholder="Equipment brand"
              />
            </div>
            
            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                {...form.register('model')}
                placeholder="Model number"
              />
            </div>
            
            <div>
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                {...form.register('serial_number')}
                placeholder="Serial number"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purchase_date">Purchase Date</Label>
              <Input
                id="purchase_date"
                type="date"
                {...form.register('purchase_date')}
              />
            </div>
            
            <div>
              <Label htmlFor="purchase_cost">Purchase Cost ($)</Label>
              <Input
                id="purchase_cost"
                type="number"
                step="0.01"
                {...form.register('purchase_cost', { valueAsNumber: true })}
                placeholder="Purchase cost"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
              <Input
                id="warranty_expiry"
                type="date"
                {...form.register('warranty_expiry')}
              />
            </div>
            
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...form.register('location')}
                placeholder="e.g., Barn A, Shed 2"
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
              placeholder="Additional notes about this equipment..."
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
              {loading ? <LoadingSpinner size="sm" /> : 'Add Equipment'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}