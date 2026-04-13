// src/components/breeding/PregnancyCheckForm.tsx
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

type EligibleAnimal = {
  id: string
  tag_number: string
  name: string | null
  breed: string | null
  production_status: string | null
  birth_date: string | null
  gender?: string | null
  last_insemination?: string | null
}

type BreedingHistory = {
  inseminationEvents: Array<{
    event_date?: string | null
    estimated_due_date?: string | null
  }>
  pregnancyChecks: Array<{ result: string | null }>
}

type SelectedAnimalDetails = {
  id: string
  tag_number: string
  name: string | null
  breed: string | null
  production_status: string | null
  birth_date: string | null
  current_daily_production?: number | null
  latest_calving?: { calving_date?: string | null }
}

export function PregnancyCheckForm({ farmId, onEventCreated, onCancel, preSelectedAnimalId }: PregnancyCheckFormProps) {
  const [loading, setLoading] = useState(false)
  const [animals, setAnimals] = useState<EligibleAnimal[]>([])
  const [selectedAnimalDetails, setSelectedAnimalDetails] = useState<SelectedAnimalDetails | null>(null)
  const [breedingHistory, setBreedingHistory] = useState<BreedingHistory | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
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
    }
  }, [preSelectedAnimalId, form])
  
  const selectedAnimalId = form.watch('animal_id')

  useEffect(() => {
    if (!selectedAnimalId) {
      setSelectedAnimalDetails(null)
      setBreedingHistory(null)
      return
    }

    const controller = new AbortController()

    loadSelectedAnimalDetails(selectedAnimalId, controller.signal)
    loadBreedingHistory(selectedAnimalId, controller.signal)

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
        setSelectedAnimalDetails(result.animal)
      } else {
        setSelectedAnimalDetails(null)
      }
    } catch (loadError) {
      if ((loadError as any)?.name !== 'AbortError') {
        console.error('Error loading animal details:', loadError)
      }
      setSelectedAnimalDetails(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  const loadBreedingHistory = async (animalId: string, signal?: AbortSignal) => {
    if (!animalId) {
      setBreedingHistory(null)
      return
    }

    try {
      const response = await fetch(`/api/animals/${animalId}/breeding-records`, { signal })
      const result = await response.json()

      if (response.ok && result.success) {
        setBreedingHistory({
          inseminationEvents: result.inseminationEvents || [],
          pregnancyChecks: result.pregnancyChecks || [],
        })
      } else {
        setBreedingHistory(null)
      }
    } catch (loadError) {
      if ((loadError as any)?.name !== 'AbortError') {
        console.error('Error loading breeding history:', loadError)
      }
      setBreedingHistory(null)
    }
  }

  const formatDateTime = (dateTime?: string | null) => {
    if (!dateTime) return 'No record'
    return new Date(dateTime).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const calculateAge = (birthDate?: string | null) => {
    if (!birthDate) return 'Unknown age'
    const birth = new Date(birthDate)
    const now = new Date()
    const years = now.getFullYear() - birth.getFullYear()
    let months = now.getMonth() - birth.getMonth()

    if (now.getDate() < birth.getDate()) {
      months -= 1
    }

    const totalMonths = years * 12 + months
    if (totalMonths < 12) return `${totalMonths} months old`

    const displayYears = Math.floor(totalMonths / 12)
    const displayMonths = totalMonths % 12
    return displayMonths === 0
      ? `${displayYears} year${displayYears === 1 ? '' : 's'} old`
      : `${displayYears} year${displayYears === 1 ? '' : 's'}, ${displayMonths} month${displayMonths === 1 ? '' : 's'} old`
  }

  const getLatestInsemination = () => {
    const events = breedingHistory?.inseminationEvents || []
    const sorted = events
      .filter((event) => event.event_date)
      .sort((a, b) => new Date(b.event_date!).getTime() - new Date(a.event_date!).getTime())

    return sorted[0] || null
  }

  const getPregnancySuccessRate = () => {
    const inseminations = breedingHistory?.inseminationEvents || []
    const checks = breedingHistory?.pregnancyChecks || []
    if (!inseminations.length || !checks.length) return 'N/A'

    const positiveCount = checks.filter((check) => check.result === 'positive').length
    return `${Math.round((positiveCount / inseminations.length) * 100)}%`
  }

  const getDaysSinceInsemination = () => {
    const latest = getLatestInsemination()
    if (!latest?.event_date) return 'N/A'

    const diff = Math.floor((Date.now() - new Date(latest.event_date).getTime()) / (1000 * 60 * 60 * 24))
    return `${diff} day${diff === 1 ? '' : 's'} ago`
  }

  const loadEligibleAnimals = async () => {
    try {
      const eligibleAnimals = await getAnimalsForPregnancyCheck(farmId)
      
      const preparedAnimals = (eligibleAnimals || []) as EligibleAnimal[]
      
      // Inject animal if pre-selected but not in list
      if (preSelectedAnimalId) {
        const found = preparedAnimals.find((a) => a.id === preSelectedAnimalId)
        if (!found) {
          preparedAnimals.unshift({
            id: preSelectedAnimalId,
            tag_number: 'Selected Animal',
            name: '(Current)',
            breed: 'Unknown',
            production_status: null,
            birth_date: null,
            last_insemination: null,
          })
        }
      }

      setAnimals(preparedAnimals)

      // Re-assert value after loading
      if (preSelectedAnimalId) {
        form.setValue('animal_id', preSelectedAnimalId)
      }
    } catch (error) {
      console.error('Error loading animals:', error)
      setError('Failed to load animals')
    }
  }

  
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
      const latestInsemination = getLatestInsemination()

      if (latestInsemination?.estimated_due_date) {
        form.setValue('estimated_due_date', latestInsemination.estimated_due_date)
        console.log('✅ [PregnancyCheckForm] Auto-populated due date from insemination:', latestInsemination.estimated_due_date)
      } else if (latestInsemination?.event_date) {
        const assumedDueDate = new Date(latestInsemination.event_date)
        assumedDueDate.setDate(assumedDueDate.getDate() + 280)
        form.setValue('estimated_due_date', assumedDueDate.toISOString().split('T')[0])
        console.log('✅ [PregnancyCheckForm] Estimated due date from insemination event date:', assumedDueDate.toISOString().split('T')[0])
      } else {
        console.log('ℹ️ [PregnancyCheckForm] No insemination events available for due date')
      }
    }
  }, [pregnancyResult, breedingHistory, form])
  
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
                {animal.tag_number} - {animal.name || 'Unnamed'} • {animal.breed || 'Unknown breed'}
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

          {selectedAnimalDetails && !detailsLoading && (
            <Card className="mt-4 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle>
                  {selectedAnimalDetails.name || 'Unnamed'} • {selectedAnimalDetails.tag_number}
                </CardTitle>
                <CardDescription>
                  Breed, age, production, calving, insemination, and pregnancy history.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Breed</p>
                    <p className="mt-1 font-medium">{selectedAnimalDetails.breed || 'Unknown breed'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Production status</p>
                    <p className="mt-1 font-medium">{selectedAnimalDetails.production_status || 'Not available'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Age</p>
                    <p className="mt-1 font-medium">{calculateAge(selectedAnimalDetails.birth_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Average production</p>
                    <p className="mt-1 font-medium">{selectedAnimalDetails.current_daily_production ? `${selectedAnimalDetails.current_daily_production} L/day` : 'Not recorded'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Last calving</p>
                    <p className="mt-1 font-medium">{selectedAnimalDetails.latest_calving?.calving_date ? new Date(selectedAnimalDetails.latest_calving.calving_date).toLocaleDateString() : 'No record'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Last insemination</p>
                    <p className="mt-1 font-medium">{formatDateTime(getLatestInsemination()?.event_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Days since insemination</p>
                    <p className="mt-1 font-medium">{getDaysSinceInsemination()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Pregnancy success rate</p>
                    <p className="mt-1 font-medium">{getPregnancySuccessRate()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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