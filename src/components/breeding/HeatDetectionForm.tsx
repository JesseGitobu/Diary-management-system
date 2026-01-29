// src/components/breeding/HeatDetectionForm.tsx
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
  event_time: z.string().min(1, 'Time observed is required'),
  heat_signs: z.array(z.string()).min(1, 'Please select at least one heat sign'),
  heat_action_taken: z.string().optional(),
  notes: z.string().optional(),
})

type HeatDetectionFormData = z.infer<typeof heatDetectionSchema>

interface HeatDetectionFormProps {
  farmId: string
  onEventCreated: () => void
  onCancel: () => void
  preSelectedAnimalId?: string
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

export function HeatDetectionForm({ farmId, onEventCreated, onCancel, preSelectedAnimalId }: HeatDetectionFormProps) {
  const [loading, setLoading] = useState(false)
  const [animals, setAnimals] = useState<any[]>([])
  const [selectedSigns, setSelectedSigns] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<HeatDetectionFormData>({
    resolver: zodResolver(heatDetectionSchema),
    defaultValues: {
      animal_id: preSelectedAnimalId || '',
      event_date: new Date().toISOString().split('T')[0],
      event_time: new Date().toTimeString().slice(0, 5),
      heat_signs: [],
      heat_action_taken: '',
      notes: '',
    },
  })
  
  useEffect(() => {
    loadEligibleAnimals()
  }, [farmId])

  // Force update value if prop changes
  useEffect(() => {
    if (preSelectedAnimalId) {
      form.setValue('animal_id', preSelectedAnimalId)
    }
  }, [preSelectedAnimalId, form])
  
  const loadEligibleAnimals = async () => {
    try {
      const eligibleAnimals = await getEligibleAnimals(farmId, 'heat_detection')
      
      // Inject animal if pre-selected but not in list (e.g. status issue)
      if (preSelectedAnimalId) {
        const found = eligibleAnimals.find((a: any) => a.id === preSelectedAnimalId)
        if (!found) {
          eligibleAnimals.unshift({
            id: preSelectedAnimalId,
            tag_number: 'Selected Animal',
            name: '(Current)',
            gender: 'female'
          })
        }
      }
      
      setAnimals(eligibleAnimals)
      
      // Re-assert value after loading
      if (preSelectedAnimalId) {
        form.setValue('animal_id', preSelectedAnimalId)
      }
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
  
  const handleSubmit = async (data: HeatDetectionFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      // Combine date and time WITHOUT timezone conversion
      // Format: YYYY-MM-DDTHH:MM:SS (local time, not UTC)
      const dateTime = `${data.event_date}T${data.event_time}:00`
      
      // Destructure to exclude event_time from API payload
      const { event_time, ...restData } = data
      
      const response = await fetch('/api/breeding-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventData: {
            ...restData,
            event_date: dateTime,
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
  
  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="animal_id">Select Animal *</Label>
          <select
            id="animal_id"
            {...form.register('animal_id')}
            disabled={!!preSelectedAnimalId}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent ${
              preSelectedAnimalId ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            <option value="">Choose an animal...</option>
            {animals.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {animal.tag_number} - {animal.name || 'Unnamed'} (Female)
              </option>
            ))}
            {/* Fallback option */}
            {preSelectedAnimalId && !animals.find(a => a.id === preSelectedAnimalId) && (
               <option value={preSelectedAnimalId}>Current Animal</option>
            )}
          </select>
          {form.formState.errors.animal_id && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.animal_id.message}
            </p>
          )}
        </div>
        
        {/* Date and Time Observed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="event_date">Date Observed *</Label>
            <Input id="event_date" type="date" {...form.register('event_date')} error={form.formState.errors.event_date?.message} />
          </div>
          <div>
            <Label htmlFor="event_time">Time Observed *</Label>
            <Input id="event_time" type="time" {...form.register('event_time')} error={form.formState.errors.event_time?.message} />
          </div>
        </div>
        
        <div>
          <Label>Observed Heat Signs *</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            {heatSigns.map((sign) => (
              <button
                key={sign}
                type="button"
                onClick={() => toggleHeatSign(sign)}
                className={`flex items-center space-x-2 p-3 border rounded-lg text-left transition-colors ${
                  selectedSigns.includes(sign) ? 'border-farm-green bg-green-50 text-green-800' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {selectedSigns.includes(sign) ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-gray-400" />}
                <span className="text-sm">{sign}</span>
              </button>
            ))}
          </div>
          {form.formState.errors.heat_signs && <p className="text-sm text-red-600 mt-1">{form.formState.errors.heat_signs.message}</p>}
        </div>
        
        <div>
          <Label htmlFor="heat_action_taken">Action Taken</Label>
          <select id="heat_action_taken" {...form.register('heat_action_taken')} className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="">Select action...</option>
            {actionOptions.map(action => <option key={action} value={action}>{action}</option>)}
          </select>
        </div>
        
        <div>
          <Label htmlFor="notes">Additional Notes</Label>
          <textarea id="notes" {...form.register('notes')} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Observations..." />
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? <LoadingSpinner size="sm" /> : 'Record Heat Detection'}</Button>
        </div>
      </form>
    </div>
  )
}