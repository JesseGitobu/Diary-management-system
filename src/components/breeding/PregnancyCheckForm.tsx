// src/components/breeding/PregnancyCheckForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { getAnimalsForPregnancyCheck } from '@/lib/database/breeding'
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react'

const pregnancyCheckSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  event_date: z.string().min(1, 'Examination date is required'),
  event_time: z.string().min(1, 'Time of examination is required'),
  pregnancy_result: z.enum(['pregnant', 'not_pregnant', 'uncertain']),
  examination_method: z.string().optional(),
  veterinarian_name: z.string().optional(),
  estimated_due_date: z.string().optional(),
  notes: z.string().optional(),
})

type PregnancyCheckFormData = z.infer<typeof pregnancyCheckSchema>

interface PregnancyCheckFormProps {
  farmId: string
  onEventCreated: () => void
  onCancel: () => void
  preSelectedAnimalId?: string
}

const examinationMethods = [
  'Rectal palpation',
  'Ultrasound',
  'Blood test',
  'Milk test',
  'Visual observation'
]

export function PregnancyCheckForm({ farmId, onEventCreated, onCancel, preSelectedAnimalId }: PregnancyCheckFormProps) {
  const [loading, setLoading] = useState(false)
  const [animals, setAnimals] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [inseminationEvents, setInseminationEvents] = useState<any[]>([])
  
  const form = useForm<PregnancyCheckFormData>({
    resolver: zodResolver(pregnancyCheckSchema),
    defaultValues: {
      animal_id: preSelectedAnimalId || '',
      event_date: new Date().toISOString().split('T')[0],
      event_time: new Date().toTimeString().slice(0, 5),
      pregnancy_result: 'uncertain',
      examination_method: '',
      veterinarian_name: '',
      estimated_due_date: '',
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
      // Also fetch insemination data for this animal
      loadInseminationEvents(preSelectedAnimalId)
    }
  }, [preSelectedAnimalId, form])
  
  const loadEligibleAnimals = async () => {
    try {
      const eligibleAnimals = await getAnimalsForPregnancyCheck(farmId)
      
      // Inject animal if pre-selected but not in list
      if (preSelectedAnimalId) {
        const found = eligibleAnimals.find((a: any) => a.id === preSelectedAnimalId)
        if (!found) {
          eligibleAnimals.unshift({
            id: preSelectedAnimalId,
            tag_number: 'Selected Animal',
            name: '(Current)',
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

  // ✅ NEW: Fetch insemination events for the selected animal
  const loadInseminationEvents = async (animalId: string) => {
    try {
      console.log('🔄 [PregnancyCheckForm] Loading insemination events for animal:', animalId)
      const response = await fetch(`/api/animals/${animalId}/breeding-records`)
      const data = await response.json()
      if (data.success && data.inseminationEvents) {
        setInseminationEvents(data.inseminationEvents || [])
        console.log('✅ [PregnancyCheckForm] Loaded insemination events:', data.inseminationEvents)
      } else {
        console.warn('⚠️ [PregnancyCheckForm] No insemination events returned:', data)
      }
    } catch (err) {
      console.error('❌ [PregnancyCheckForm] Error loading insemination events:', err)
    }
  }

  // ✅ UPDATED: Watch animal_id and load insemination events when it changes
  useEffect(() => {
    const animalId = form.watch('animal_id')
    if (animalId && !preSelectedAnimalId) {
      loadInseminationEvents(animalId)
    }
  }, [form.watch('animal_id'), preSelectedAnimalId])
  
  const handleSubmit = async (data: PregnancyCheckFormData) => {
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
            event_type: 'pregnancy_check',
            pregnancy_result: data.pregnancy_result,
            estimated_due_date: data.estimated_due_date || undefined,
          }
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        onEventCreated()
      } else {
        setError(result.error || 'Failed to create pregnancy check event')
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  const pregnancyResult = form.watch('pregnancy_result')
  const examinationDate = form.watch('event_date')
  
  // ✅ UPDATED: Use estimated due date from insemination event (breeding_events table)
  useEffect(() => {
    if (pregnancyResult === 'pregnant') {
      // Get the estimated_due_date from the most recent insemination event
      if (inseminationEvents.length > 0) {
        const latestInsemination = inseminationEvents[0] // Most recent insemination
        
        if (latestInsemination.estimated_due_date) {
          // Use the due date from the insemination event
          form.setValue('estimated_due_date', latestInsemination.estimated_due_date)
          console.log('✅ [PregnancyCheckForm] Auto-populated due date from insemination:', latestInsemination.estimated_due_date)
        } else {
          console.warn('⚠️ [PregnancyCheckForm] Latest insemination missing estimated_due_date:', latestInsemination)
        }
      } else {
        console.log('ℹ️ [PregnancyCheckForm] No insemination events available for due date')
      }
    }
  }, [pregnancyResult, inseminationEvents, form])
  
  const getResultIcon = (result: string) => {
    switch (result) {
      case 'pregnant': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'not_pregnant': return <XCircle className="w-4 h-4 text-red-600" />
      case 'uncertain': return <HelpCircle className="w-4 h-4 text-yellow-600" />
      default: return null
    }
  }
  
  const getResultColor = (result: string) => {
    switch (result) {
      case 'pregnant': return 'bg-green-100 text-green-800'
      case 'not_pregnant': return 'bg-red-100 text-red-800'
      case 'uncertain': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {animals.length === 0 && !preSelectedAnimalId && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
          No animals are currently eligible for pregnancy check. Animals become eligible after insemination.
        </div>
      )}
      
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Animal Selection */}
        <div>
          <Label htmlFor="animal_id">Select Animal *</Label>
          <select
            id="animal_id"
            {...form.register('animal_id')}
            disabled={!!preSelectedAnimalId || animals.length === 0}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent ${
              preSelectedAnimalId ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            <option value="">Choose an animal...</option>
            {animals.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {animal.tag_number} - {animal.name || 'Unnamed'}
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
        
        {/* Examination Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="event_date">Examination Date *</Label>
            <Input
              id="event_date"
              type="date"
              {...form.register('event_date')}
              error={form.formState.errors.event_date?.message}
            />
          </div>
          <div>
            <Label htmlFor="event_time">Time of Examination *</Label>
            <Input
              id="event_time"
              type="time"
              {...form.register('event_time')}
              error={form.formState.errors.event_time?.message}
            />
          </div>
        </div>
        
        {/* Pregnancy Result */}
        <div>
          <Label>Examination Result *</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            {['pregnant', 'not_pregnant', 'uncertain'].map((result) => (
              <button
                key={result}
                type="button"
                onClick={() => form.setValue('pregnancy_result', result as any)}
                className={`flex items-center justify-center space-x-2 p-4 border rounded-lg transition-colors ${
                  pregnancyResult === result
                    ? 'border-farm-green bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {getResultIcon(result)}
                <span className="font-medium capitalize">
                  {result.replace('_', ' ')}
                </span>
                {pregnancyResult === result && (
                  <Badge className={getResultColor(result)}>Selected</Badge>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Examination Method */}
        <div>
          <Label htmlFor="examination_method">Examination Method</Label>
          <select
            id="examination_method"
            {...form.register('examination_method')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
          >
            <option value="">Select method...</option>
            {examinationMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
        
        {/* Veterinarian */}
        <div>
          <Label htmlFor="veterinarian_name">Veterinarian</Label>
          <Input
            id="veterinarian_name"
            {...form.register('veterinarian_name')}
            placeholder="Name of examining veterinarian"
          />
        </div>
        
        {/* Estimated Due Date */}
        {pregnancyResult === 'pregnant' && (
          <div>
            <Label htmlFor="estimated_due_date">Estimated Due Date</Label>
            <Input
              id="estimated_due_date"
              type="date"
              {...form.register('estimated_due_date')}
            />
            <p className="text-sm text-gray-600 mt-1">
              ✅ Auto-filled from insemination event. You can modify if needed.
            </p>
          </div>
        )}
        
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
          <Button type="submit" disabled={loading || (animals.length === 0 && !preSelectedAnimalId)}>
            {loading ? <LoadingSpinner size="sm" /> : 'Record Pregnancy Check'}
          </Button>
        </div>
      </form>
    </div>
  )
}