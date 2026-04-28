// src/components/breeding/HeatDetectionForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { getEligibleAnimals } from '@/lib/database/breeding'
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
  initialData?: any | null
  eventId?: string | null
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
  'Insemination scheduled',
  'Natural breeding arranged',
  'Monitor further',
  'Vet consultation needed'
]

export function HeatDetectionForm({ farmId, onEventCreated, onCancel, preSelectedAnimalId, initialData, eventId }: HeatDetectionFormProps) {
  const [loading, setLoading] = useState(false)
  const [animals, setAnimals] = useState<Array<{ id: string; tag_number: string; name: string | null; breed: string | null; production_status: string | null }>>([])
  const [selectedSigns, setSelectedSigns] = useState<string[]>([])
  const [selectedAnimalDetails, setSelectedAnimalDetails] = useState<any>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
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
  
  const selectedAnimalId = form.watch('animal_id')

  useEffect(() => {
    loadEligibleAnimals()
  }, [farmId])

  useEffect(() => {
    if (preSelectedAnimalId) {
      form.setValue('animal_id', preSelectedAnimalId)
    }
  }, [preSelectedAnimalId, form])

  useEffect(() => {
    if (!initialData) return
    const raw = initialData.event_date || ''
    const datePart = raw.includes('T') ? raw.split('T')[0] : raw
    const timePart = raw.includes('T') ? (raw.split('T')[1] || '').slice(0, 5) : ''
    const signs: string[] = initialData.heat_signs || []
    setSelectedSigns(signs)
    form.reset({
      animal_id: initialData.animal_id || '',
      event_date: datePart,
      event_time: timePart || new Date().toTimeString().slice(0, 5),
      heat_signs: signs,
      heat_action_taken: initialData.heat_action_taken || '',
      notes: initialData.notes || '',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])

  useEffect(() => {
    if (!selectedAnimalId) {
      setSelectedAnimalDetails(null)
      return
    }

    const controller = new AbortController()
    loadSelectedAnimalDetails(selectedAnimalId, controller.signal)

    return () => controller.abort()
  }, [selectedAnimalId])

  const loadSelectedAnimalDetails = async (animalId: string, signal?: AbortSignal) => {
    if (!animalId) {
      setSelectedAnimalDetails(null)
      return
    }

    try {
      setDetailsLoading(true)
      const response = await fetch(`/api/animals/${animalId}`, { signal })
      const result = await response.json()

      if (response.ok && result.success) {
        const animal = result.animal
        setSelectedAnimalDetails(animal)
      } else {
        setSelectedAnimalDetails(null)
      }
    } catch (loadError) {
      if ((loadError as any)?.name !== 'AbortError') {
        // Error silently handled
      }
      setSelectedAnimalDetails(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  const formatProductionStatus = (status?: string | null) => {
    if (!status) {
      return 'Unknown status'
    }
    const formatted = status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
    return formatted
  }

  const getLatestBreedingEvent = (eventType: 'heat_detection' | 'insemination') => {
    const breedingEvents = selectedAnimalDetails?.breeding_events
    const found = breedingEvents?.find((event: any) => event.event_type === eventType)
    return found?.event_date ?? null
  }

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
            gender: 'female',
            breed: null,
            production_status: null
          })
        }
      }
      
      setAnimals(eligibleAnimals)
      
      // Re-assert value after loading
      if (preSelectedAnimalId) {
        form.setValue('animal_id', preSelectedAnimalId)
      }
    } catch (error) {
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
      // 🔍 DEBUG: Log raw form input
      console.log('🔥 [FORM] Raw form data:', {
        event_date: data.event_date,
        event_time: data.event_time,
        animal_id: data.animal_id,
        heat_action_taken: data.heat_action_taken,
        heat_signs: selectedSigns,
      })

      const dateTime = `${data.event_date}T${data.event_time}:00`
      const { event_time, ...restData } = data

      // 🔍 DEBUG: Log combined datetime
      console.log('🔥 [FORM] Combined datetime:', dateTime)

      const payload = {
        ...restData,
        event_date: dateTime,
        farm_id: farmId,
        event_type: 'heat_detection',
        heat_signs: selectedSigns,
      }

      // 🔍 DEBUG: Log final payload before sending
      console.log('🔥 [FORM] Payload being sent to API:', payload)

      const url = eventId ? `/api/breeding-events/${eventId}` : '/api/breeding-events'
      const method = eventId ? 'PATCH' : 'POST'
      const body = eventId
        ? JSON.stringify({ eventData: payload })
        : JSON.stringify({ eventData: payload })

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      const result = await response.json()

      // 🔍 DEBUG: Log API response
      console.log('🔥 [FORM] API Response:', {
        status: response.status,
        success: result.success,
        event: result.event,
        message: result.message,
        error: result.error,
      })

      if (response.ok && result.success) {
        console.log('✅ [FORM] Heat detection event saved successfully')
        onEventCreated()
      } else {
        setError(result.error || `Failed to ${eventId ? 'update' : 'create'} heat detection event`)
      }
    } catch (error) {
      console.error('❌ [FORM] Error during submission:', error)
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
                {animal.tag_number} - {animal.name || 'Unnamed'} • {animal.breed || 'Unknown breed'} • {formatProductionStatus(animal.production_status)}
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

        {selectedAnimalId && detailsLoading && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Loading selected animal details...
          </div>
        )}

        {selectedAnimalDetails && !detailsLoading && (
          <Card className="border-gray-200 bg-white">
            <CardHeader>
              <CardTitle>Selected animal details</CardTitle>
              <CardDescription>Key production and breeding history for the chosen animal.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Tag</p>
                  <p className="mt-1 font-medium">{selectedAnimalDetails.tag_number}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Name</p>
                  <p className="mt-1 font-medium">{selectedAnimalDetails.name || 'Unnamed'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Breed</p>
                  <p className="mt-1 font-medium">{selectedAnimalDetails.breed || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Production status</p>
                  <p className="mt-1 font-medium">{formatProductionStatus(selectedAnimalDetails.production_status)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Current production</p>
                  <p className="mt-1 font-medium">{selectedAnimalDetails.current_daily_production ? `${selectedAnimalDetails.current_daily_production} L/day` : 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Last calving</p>
                  <p className="mt-1 font-medium">{selectedAnimalDetails.latest_calving?.calving_date ? new Date(selectedAnimalDetails.latest_calving.calving_date).toLocaleDateString() : 'No record'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Last heat detection</p>
                  <p className="mt-1 font-medium">{getLatestBreedingEvent('heat_detection') ? new Date(getLatestBreedingEvent('heat_detection')).toLocaleDateString() : 'No record'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Last insemination</p>
                  <p className="mt-1 font-medium">{getLatestBreedingEvent('insemination') ? new Date(getLatestBreedingEvent('insemination')).toLocaleDateString() : 'No record'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
          <Button type="submit" disabled={loading}>{loading ? <LoadingSpinner size="sm" /> : eventId ? 'Save Changes' : 'Record Heat Detection'}</Button>
        </div>
      </form>
    </div>
  )
}