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
import { Badge } from '@/components/ui/Badge'
import { Plus, X, Calendar, Repeat } from 'lucide-react'

const protocolSchema = z.object({
  protocol_name: z.string().min(2, 'Protocol name must be at least 2 characters'),
  protocol_type: z.enum(['vaccination', 'treatment', 'checkup', 'breeding', 'nutrition']),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  frequency_type: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one_time']),
  frequency_value: z.number().min(1).max(365),
  start_date: z.string().min(1, 'Start date is required'),
  // ✅ Fix: Make end_date properly optional and handle empty strings
  end_date: z.string().optional().or(z.literal('')),
  target_animals: z.enum(['all', 'group', 'individual']),
  animal_groups: z.array(z.string()).optional(),
  individual_animals: z.array(z.string()).optional(),
  // ✅ Fix: Handle optional string fields that might be empty
  veterinarian: z.string().optional().or(z.literal('')),
  estimated_cost: z.number().min(0).optional(),
  notes: z.string().optional().or(z.literal('')),
  auto_create_records: z.boolean(),
})

type ProtocolFormData = z.infer<typeof protocolSchema>

interface AddProtocolModalProps {
  farmId: string
  animals: any[]
  isOpen: boolean
  onClose: () => void
  onProtocolCreated: (protocol: any) => void
}

export function AddProtocolModal({ 
  farmId, 
  animals, 
  isOpen, 
  onClose, 
  onProtocolCreated 
}: AddProtocolModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([])
  
  const form = useForm<ProtocolFormData>({
  resolver: zodResolver(protocolSchema),
  defaultValues: {
    protocol_type: 'vaccination',
    frequency_type: 'monthly',
    frequency_value: 1,
    target_animals: 'all',
    auto_create_records: true,
    start_date: '',
    end_date: '',
    veterinarian: '',
    notes: '',
  },
})
  
  const watchedTargetAnimals = form.watch('target_animals')
  const watchedProtocolType = form.watch('protocol_type')
  
  const handleSubmit = async (data: ProtocolFormData) => {
  setLoading(true)
  setError(null)
  
  try {
    const response = await fetch('/api/health/protocols', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        farm_id: farmId,
        individual_animals: watchedTargetAnimals === 'individual' ? selectedAnimals : [],
      }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create protocol')
    }
    
    // Show success message
    console.log('Protocol created successfully:', result.protocol)
    
    // Call the parent callback with the new protocol
    onProtocolCreated(result.protocol)
    
    // Reset form and close modal
    form.reset()
    setSelectedAnimals([])
    onClose()
    
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    console.error('Error creating protocol:', err)
  } finally {
    setLoading(false)
  }
}
  
  const toggleAnimalSelection = (animalId: string) => {
    setSelectedAnimals(prev => 
      prev.includes(animalId) 
        ? prev.filter(id => id !== animalId)
        : [...prev, animalId]
    )
  }
  
  const getFrequencyLabel = (type: string, value: number) => {
    switch (type) {
      case 'daily': return `Every ${value} day${value > 1 ? 's' : ''}`
      case 'weekly': return `Every ${value} week${value > 1 ? 's' : ''}`
      case 'monthly': return `Every ${value} month${value > 1 ? 's' : ''}`
      case 'quarterly': return `Every ${value} quarter${value > 1 ? 's' : ''}`
      case 'yearly': return `Every ${value} year${value > 1 ? 's' : ''}`
      case 'one_time': return 'One time only'
      default: return ''
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Repeat className="w-6 h-6 text-farm-green" />
            <span>Create Health Protocol</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Protocol Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="protocol_name">Protocol Name</Label>
              <Input
                id="protocol_name"
                {...form.register('protocol_name')}
                error={form.formState.errors.protocol_name?.message}
                placeholder="e.g., Monthly Vaccination Schedule"
              />
            </div>
            
            <div>
              <Label htmlFor="protocol_type">Protocol Type</Label>
              <select
                id="protocol_type"
                {...form.register('protocol_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="vaccination">💉 Vaccination</option>
                <option value="treatment">💊 Treatment</option>
                <option value="checkup">🩺 Health Checkup</option>
                <option value="breeding">🐄 Breeding Protocol</option>
                <option value="nutrition">🌾 Nutrition Program</option>
              </select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              {...form.register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Describe the protocol, its purpose, and any special instructions..."
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>
          
          {/* Schedule Configuration */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Schedule Configuration</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="frequency_type">Frequency Type</Label>
                <select
                  id="frequency_type"
                  {...form.register('frequency_type')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="one_time">One Time</option>
                </select>
              </div>
              
              {form.watch('frequency_type') !== 'one_time' && (
                <div>
                  <Label htmlFor="frequency_value">Frequency Value</Label>
                  <Input
                    id="frequency_value"
                    type="number"
                    min="1"
                    max="365"
                    {...form.register('frequency_value', { valueAsNumber: true })}
                    error={form.formState.errors.frequency_value?.message}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {getFrequencyLabel(form.watch('frequency_type'), form.watch('frequency_value'))}
                  </p>
                </div>
              )}
              
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...form.register('start_date')}
                  error={form.formState.errors.start_date?.message}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="end_date">End Date (Optional)</Label>
              <Input
                id="end_date"
                type="date"
                {...form.register('end_date')}
                min={form.watch('start_date')}
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty for ongoing protocol
              </p>
            </div>
          </div>
          
          {/* Target Animals Selection */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-4">Target Animals</h4>
            
            <div className="space-y-4">
              <div>
                <Label>Apply Protocol To:</Label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="all"
                      {...form.register('target_animals')}
                      className="text-farm-green focus:ring-farm-green"
                    />
                    <span>All Animals ({animals.length} animals)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="individual"
                      {...form.register('target_animals')}
                      className="text-farm-green focus:ring-farm-green"
                    />
                    <span>Select Individual Animals</span>
                  </label>
                </div>
              </div>
              
              {watchedTargetAnimals === 'individual' && (
                <div>
                  <Label>Select Animals ({selectedAnimals.length} selected)</Label>
                  <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {animals.map(animal => (
                        <label
                          key={animal.id}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAnimals.includes(animal.id)}
                            onChange={() => toggleAnimalSelection(animal.id)}
                            className="text-farm-green focus:ring-farm-green"
                          />
                          <span className="text-sm">
                            {animal.name || `Animal ${animal.tag_number}`} (#{animal.tag_number})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="veterinarian">Veterinarian (Optional)</Label>
              <Input
                id="veterinarian"
                {...form.register('veterinarian')}
                placeholder="Dr. Smith, Veterinary Clinic"
              />
            </div>
            
            <div>
              <Label htmlFor="estimated_cost">Estimated Cost per Event</Label>
              <Input
                id="estimated_cost"
                type="number"
                step="0.01"
                min="0"
                {...form.register('estimated_cost', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Additional notes or special instructions..."
            />
          </div>
          
          {/* Auto-create Records Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="auto_create_records"
              {...form.register('auto_create_records')}
              className="text-farm-green focus:ring-farm-green"
            />
            <Label htmlFor="auto_create_records" className="cursor-pointer">
              Automatically create health records when protocol events are due
            </Label>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Creating Protocol...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Protocol
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}