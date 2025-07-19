'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { getEligibleAnimals, createBreedingEvent, type HeatDetectionEvent } from '@/lib/database/breeding'
import { CheckCircle, Circle } from 'lucide-react'

const heatDetectionSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  event_date: z.string().min(1, 'Event date is required'),
  heat_signs: z.array(z.string()).min(1, 'Please select at least one heat sign'),
  heat_action_taken: z.string().optional(),
  notes: z.string().optional(),
})

type HeatDetectionFormData = z.infer<typeof heatDetectionSchema>

interface HeatDetectionFormProps {
  farmId: string
  onEventCreated: () => void
  onCancel: () => void
}

const heatSigns = [
  'Standing to be mounted',
  'Mounting other animals',
  'Restlessness',
  'Bellowing/vocalization',
  'Clear mucus discharge',
  'Swollen vulva',
  'Decreased appetite',
  'Increased activity',
  'Chin resting on others',
  'Decreased milk production'
]

const actionOptions = [
  'Marked for breeding',
  'Insemination scheduled',
  'Natural breeding arranged',
  'Monitor further',
  'Vet consultation needed'
]

export function HeatDetectionForm({ farmId, onEventCreated, onCancel }: HeatDetectionFormProps) {
  const [loading, setLoading] = useState(false)
  const [animals, setAnimals] = useState<any[]>([])
  const [selectedSigns, setSelectedSigns] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<HeatDetectionFormData>({
    resolver: zodResolver(heatDetectionSchema),
    defaultValues: {
      animal_id: '',
      event_date: new Date().toISOString().split('T')[0],
      heat_signs: [],
      heat_action_taken: '',
      notes: '',
    },
  })
  
  useEffect(() => {
    loadEligibleAnimals()
  }, [farmId])
  
  const loadEligibleAnimals = async () => {
    try {
      const eligibleAnimals = await getEligibleAnimals(farmId, 'heat_detection')
      setAnimals(eligibleAnimals)
    } catch (error) {
      console.error('Error loading animals:', error)
      setError('Failed to load animals')
    }
  }
  
  const toggleHeatSign = (sign: string) => {
    const newSigns = selectedSigns.includes(sign)
      ? selectedSigns.filter(s => s !== sign)
      : [...selectedSigns, sign]
    
    setSelectedSigns(newSigns)
    form.setValue('heat_signs', newSigns)
  }
  
// Update the handleSubmit function in HeatDetectionForm.tsx

const handleSubmit = async (data: HeatDetectionFormData) => {
  setLoading(true)
  setError(null)
  
  try {
    // Call the API instead of calling database function directly
    const response = await fetch('/api/breeding-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventData: {
          ...data,
          farm_id: farmId,
          event_type: 'heat_detection',
          heat_signs: selectedSigns,
        }
      }),
    })
    
    const result = await response.json()
    
    if (response.ok && result.success) {
      onEventCreated()
    } else {
      setError(result.error || 'Failed to create heat detection event')
    }
  } catch (error) {
    console.error('Error submitting form:', error)
    setError('An unexpected error occurred')
  } finally {
    setLoading(false)
  }
}

// Remove the direct createBreedingEvent import and call from this file
// The form should only call the API, not database functions directly
  
  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Animal Selection */}
        <div>
          <Label htmlFor="animal_id">Select Animal *</Label>
          <select
            id="animal_id"
            {...form.register('animal_id')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
          >
            <option value="">Choose an animal...</option>
            {animals.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {animal.tag_number} - {animal.name || 'Unnamed'} (Female)
              </option>
            ))}
          </select>
          {form.formState.errors.animal_id && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.animal_id.message}
            </p>
          )}
        </div>
        
        {/* Event Date - CORRECTED */}
        <div>
          <Label htmlFor="event_date">Date Observed *</Label>
          <Input
            id="event_date"
            type="date"
            {...form.register('event_date')}
            error={form.formState.errors.event_date?.message}
          />
        </div>
        
        {/* Heat Signs - MAIN FOCUS */}
        <div>
          <Label>Observed Heat Signs *</Label>
          <p className="text-sm text-gray-600 mb-3">
            Select all signs that were observed:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {heatSigns.map((sign) => (
              <button
                key={sign}
                type="button"
                onClick={() => toggleHeatSign(sign)}
                className={`flex items-center space-x-2 p-3 border rounded-lg text-left transition-colors ${
                  selectedSigns.includes(sign)
                    ? 'border-farm-green bg-green-50 text-green-800'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {selectedSigns.includes(sign) ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm">{sign}</span>
              </button>
            ))}
          </div>
          {form.formState.errors.heat_signs && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.heat_signs.message}
            </p>
          )}
        </div>
        
        {/* Action Taken */}
        <div>
          <Label htmlFor="heat_action_taken">Action Taken</Label>
          <select
            id="heat_action_taken"
            {...form.register('heat_action_taken')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
          >
            <option value="">Select action...</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
        
        {/* Notes */}
        <div>
          <Label htmlFor="notes">Additional Notes</Label>
          <textarea
            id="notes"
            {...form.register('notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
            placeholder="Any additional observations or comments..."
          />
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : 'Record Heat Detection'}
          </Button>
        </div>
      </form>
    </div>
  )
}