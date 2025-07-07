// src/components/health/AddProtocolModal.tsx
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
import { Plus, Minus } from 'lucide-react'

const protocolSchema = z.object({
  name: z.string().min(2, 'Protocol name must be at least 2 characters'),
  description: z.string().optional(),
  vaccine_name: z.string().min(2, 'Vaccine name is required'),
  frequency_days: z.number().min(1, 'Frequency must be at least 1 day'),
  age_at_first_dose_days: z.number().optional(),
  booster_schedule: z.array(z.string()).optional(),
})

type ProtocolFormData = z.infer<typeof protocolSchema>

interface AddProtocolModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onProtocolAdded: (protocol: any) => void
}

export function AddProtocolModal({ farmId, isOpen, onClose, onProtocolAdded }: AddProtocolModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [boosters, setBoosters] = useState<string[]>([''])
  
  const form = useForm<ProtocolFormData>({
    resolver: zodResolver(protocolSchema),
    defaultValues: {
      name: '',
      description: '',
      vaccine_name: '',
      frequency_days: 365,
      age_at_first_dose_days: undefined,
      booster_schedule: [],
    },
  })
  
  const addBooster = () => {
    setBoosters([...boosters, ''])
  }
  
  const removeBooster = (index: number) => {
    setBoosters(boosters.filter((_, i) => i !== index))
  }
  
  const updateBooster = (index: number, value: string) => {
    const newBoosters = [...boosters]
    newBoosters[index] = value
    setBoosters(newBoosters)
  }
  
  const handleSubmit = async (data: ProtocolFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      // Filter out empty boosters and convert to numbers
      const validBoosters = boosters
        .filter(b => b.trim() !== '')
        .map(b => parseInt(b))
        .filter(b => !isNaN(b))
        .map(b => b.toString())
      
      const response = await fetch('/api/health/protocols', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
          booster_schedule: validBoosters.length > 0 ? validBoosters : null,
          age_at_first_dose_days: data.age_at_first_dose_days || null,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create protocol')
      }
      
      onProtocolAdded(result.protocol)
      form.reset()
      setBoosters([''])
      onClose()
      
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
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          Add Vaccination Protocol
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">Protocol Name</Label>
            <Input
              id="name"
              {...form.register('name')}
              error={form.formState.errors.name?.message}
              placeholder="e.g., Annual Cattle Vaccination"
            />
          </div>
          
          <div>
            <Label htmlFor="vaccine_name">Vaccine Name</Label>
            <Input
              id="vaccine_name"
              {...form.register('vaccine_name')}
              error={form.formState.errors.vaccine_name?.message}
              placeholder="e.g., Bovishield Gold FP 5"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <textarea
              id="description"
              {...form.register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Describe this vaccination protocol..."
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="frequency_days">Frequency (Days)</Label>
              <Input
                id="frequency_days"
                type="number"
                {...form.register('frequency_days', { valueAsNumber: true })}
                error={form.formState.errors.frequency_days?.message}
                placeholder="365"
              />
              <p className="text-sm text-gray-500 mt-1">
                365 = yearly, 180 = every 6 months
              </p>
            </div>
            
            <div>
              <Label htmlFor="age_at_first_dose_days">Age at First Dose (Days, Optional)</Label>
              <Input
                id="age_at_first_dose_days"
                type="number"
                {...form.register('age_at_first_dose_days', { valueAsNumber: true })}
                placeholder="30"
              />
              <p className="text-sm text-gray-500 mt-1">
                When should the first dose be given?
              </p>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Booster Schedule (Optional)</Label>
              <Button type="button" size="sm" variant="outline" onClick={addBooster}>
                <Plus className="w-4 h-4 mr-1" />
                Add Booster
              </Button>
            </div>
            
            {boosters.map((booster, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <Input
                  type="number"
                  value={booster}
                  onChange={(e) => updateBooster(index, e.target.value)}
                  placeholder="Days after first dose"
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => removeBooster(index)}
                  disabled={boosters.length === 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <p className="text-sm text-gray-500">
              Example: 21, 42 (boosters at 21 and 42 days after first dose)
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : 'Create Protocol'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}