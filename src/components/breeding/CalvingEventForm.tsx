// src/components/breeding/CalvingEventForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { 
  getAnimalsForCalving, 
  generateCalfTag,
  incrementCalfTagNumber,
  fetchLatestSemenBullCode,
  type CalvingEvent 
} from '@/lib/database/breeding'
import { processCalvingAction } from '@/app/actions/breeding-actions' // ✅ Import Server Action
import { AlertCircle, CheckCircle, Baby, Heart, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client' // Import supabase client

const calvingEventSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  event_date: z.string().min(1, 'Calving date is required'),
  event_time: z.string().min(1, 'Time of calving is required'),
  calving_outcome: z.enum(['easy', 'normal', 'difficult', 'assisted', 'caesarean']),
  assistance_required: z.boolean(), // ✅ Required boolean - always has a value
  calf_name: z.string().optional(),
  calf_breed: z.string().min(1, 'Calf breed is required'),
  calf_gender: z.enum(['male', 'female']),
  calf_weight: z.number().min(0).optional(),
  calf_tag_number: z.string().min(1, 'Calf tag number is required'),
  calf_health_status: z.string().optional(),
  calf_father_info: z.string().optional(),
  colostrum_produced: z.number().min(0).optional(), // ✅ Colostrum produced in liters
  colostrum_quality: z.enum(['excellent', 'good', 'fair', 'poor']).optional(), // ✅ Colostrum quality
  veterinarian: z.string().optional(), // ✅ Veterinarian name
  notes: z.string().optional(),
})

type CalvingEventFormData = z.infer<typeof calvingEventSchema>

interface CalvingEventFormProps {
  farmId: string
  onEventCreated: () => void
  onCancel: () => void
  preSelectedAnimalId?: string
  initialData?: any | null
  eventId?: string | null
  animals?: EligibleAnimal[]
  loadingAnimals?: boolean
}

const calvingOutcomes = [
  { 
    value: 'easy', 
    label: 'Easy Birth', 
    description: 'No issues quick delivery',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  { 
    value: 'normal', 
    label: 'Normal Birth', 
    description: 'Standard delivery',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  { 
    value: 'difficult', 
    label: 'Difficult Birth', 
    description: 'Hard but unassisted',
    color: 'bg-orange-100 text-orange-800',
    icon: Clock
  },
  { 
    value: 'assisted', 
    label: 'Assisted Birth', 
    description: 'Experienced technical assistance',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Heart
  },
  { 
    value: 'caesarean', 
    label: 'Caesarean Section', 
    description: 'Surgical delivery',
    color: 'bg-red-100 text-red-800',
    icon: AlertCircle
  },
]

const healthStatuses = [
  'Excellent',
  'Good',
  'Fair',
  'Poor',
  'Requires attention',
  'Under treatment'
]

type EligibleAnimal = {
  id: string
  tag_number: string
  name: string | null
  breed?: string | null
  production_status?: string | null
  expected_calving_date?: string | null
}

type BreedingHistory = {
  inseminationEvents: Array<{
    event_date?: string | null
    estimated_due_date?: string | null
  }>
  pregnancyChecks: Array<{
    check_date?: string | null
    result?: string | null
  }>
  calvingEvents: Array<{
    calving_outcome?: string | null
    event_date?: string | null
  }>
}

type SelectedAnimalDetails = {
  id: string
  tag_number: string
  name: string | null
  breed: string | null
  production_status: string | null
  birth_date: string | null
  current_daily_production?: number | null
  latest_calving?: {
    calving_date?: string | null
    calving_difficulty?: string | null
    assistance_required?: boolean | null
    calf_alive?: boolean | null
  }
}

export function CalvingEventForm({ farmId, onEventCreated, onCancel, preSelectedAnimalId, initialData, eventId, animals: propsAnimals = [], loadingAnimals: propsLoadingAnimals = false }: CalvingEventFormProps) {
  const [loading, setLoading] = useState(false)
  const [selectedAnimalDetails, setSelectedAnimalDetails] = useState<SelectedAnimalDetails | null>(null)
  const [breedingHistory, setBreedingHistory] = useState<BreedingHistory | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  const form = useForm<CalvingEventFormData>({
    resolver: zodResolver(calvingEventSchema),
    mode: 'onBlur',
    defaultValues: {
      animal_id: preSelectedAnimalId || '',
      event_date: new Date().toISOString().split('T')[0],
      event_time: new Date().toTimeString().slice(0, 5),
      calving_outcome: 'easy' as const,
      assistance_required: false,
      calf_name: '',
      calf_breed: 'holstein',
      calf_gender: 'female' as const,
      calf_weight: undefined,
      calf_tag_number: '',
      calf_health_status: 'Healthy',
      calf_father_info: '',
      colostrum_produced: undefined,
      colostrum_quality: undefined,
      veterinarian: '',
      notes: '',
    },
  })
  
  // Fetch current user ID on mount
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    fetchUser()
  }, [])

  // Animals are fetched at parent level, no need to fetch here

  const selectedAnimalId = form.watch('animal_id')

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
        console.error('❌ CalvingEventForm: Error loading animal details:', loadError)
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
          calvingEvents: result.calvingEvents || [],
        })
      } else {
        setBreedingHistory(null)
      }
    } catch (loadError) {
      if ((loadError as any)?.name !== 'AbortError') {
        console.error('❌ CalvingEventForm: Error loading breeding history:', loadError)
      }
      setBreedingHistory(null)
    }
  }

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
    const outcome = initialData.calving_outcome || 'easy'
    form.reset({
      animal_id: initialData.animal_id || '',
      event_date: datePart,
      event_time: timePart || new Date().toTimeString().slice(0, 5),
      calving_outcome: outcome,
      assistance_required: ['assisted', 'caesarean'].includes(outcome),
      calf_name: initialData.calf_name || '',
      calf_breed: initialData.calf_breed || 'holstein',
      calf_gender: initialData.calf_gender || 'female',
      calf_weight: initialData.calf_weight ?? undefined,
      calf_tag_number: initialData.calf_tag_number || '',
      calf_health_status: initialData.calf_health_status || 'Healthy',
      calf_father_info: initialData.calf_father_info || '',
      colostrum_produced: initialData.colostrum_produced ?? undefined,
      colostrum_quality: initialData.colostrum_quality || undefined,
      veterinarian: initialData.veterinarian || '',
      notes: initialData.notes || '',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])

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


  
  const handleSubmit: SubmitHandler<CalvingEventFormData> = async (data: CalvingEventFormData) => {
    if (!userId) {
      setError('User not authenticated. Please reload.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const dateTime = `${data.event_date}T${data.event_time}:00`
      const { event_time, ...restData } = data

      if (eventId) {
        console.log('📝 CalvingEventForm: Updating existing calving event:', eventId)
        // ✅ Remove assistance_required - it only belongs in calving_records, not breeding_events
        const { assistance_required, ...payloadData } = restData
        const payload = {
          ...payloadData,
          event_date: dateTime,
          farm_id: farmId,
          event_type: 'calving',
        }
        const response = await fetch(`/api/breeding-events/${eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventData: payload }),
        })
        const result = await response.json()
        console.log('📝 CalvingEventForm: Update response:', result)
        if (response.ok && result.success) {
          console.log('✅ CalvingEventForm: Calving event updated successfully, closing modal')
          onEventCreated()
        } else {
          console.error('❌ CalvingEventForm: Update failed:', result.error)
          setError(result.error || 'Failed to update calving event')
        }
        return
      }

      const eventData: CalvingEvent = {
        ...restData,
        event_date: dateTime,
        farm_id: farmId,
        event_type: 'calving',
        created_by: userId,
        assistance_required: data.assistance_required,
        colostrum_produced: data.colostrum_produced,
        colostrum_quality: data.colostrum_quality,
        veterinarian: data.veterinarian,
      }

      console.log('📝 CalvingEventForm: Submitting calving event with assistance_required:', data.assistance_required, 'for outcome:', data.calving_outcome)
      console.log('📝 CalvingEventForm: Colostrum - Produced:', data.colostrum_produced, 'Quality:', data.colostrum_quality, 'Veterinarian:', data.veterinarian)
      console.log('📝 CalvingEventForm: Full event data:', eventData)
      const result = await processCalvingAction(eventData, farmId)

      console.log('📝 CalvingEventForm: Server action result:', result)
      console.log('📝 CalvingEventForm: Result type:', typeof result, 'Success value:', result?.success)

      if (result && result.success) {
        console.log('✅ CalvingEventForm: Calving event created successfully')
        try {
          await incrementCalfTagNumber(farmId)
          console.log('✅ CalvingEventForm: Incremented calf tag counter')
        } catch (tagError) {
          console.warn('⚠️ CalvingEventForm: Failed to increment tag counter:', tagError)
        }
        console.log('✅ CalvingEventForm: Calling onEventCreated callback to close modal')
        onEventCreated()
      } else {
        console.error('❌ CalvingEventForm: Server action failed:', result)
        setError(result?.error || 'Failed to process calving event')
      }
    } catch (error) {
      console.error('❌ CalvingEventForm: Error submitting calving event:', error)
      setError('An unexpected error occurred: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
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

  const getLatestPregnancyCheck = () => {
    const checks = breedingHistory?.pregnancyChecks || []
    const sorted = checks
      .filter((check) => check.check_date)
      .sort((a, b) => new Date(b.check_date!).getTime() - new Date(a.check_date!).getTime())

    return sorted[0] || null
  }

  const getDaysSince = (dateString?: string | null) => {
    if (!dateString) return 'N/A'
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24))
    return `${diff} day${diff === 1 ? '' : 's'} ago`
  }

  const getPreviousCalvingOutcome = () => {
    const latestCalving = breedingHistory?.calvingEvents?.[0]
    return latestCalving?.calving_outcome ? `${latestCalving.calving_outcome}` : 'No record'
  }

  const getCalvingSuccessRate = () => {
    const events = breedingHistory?.calvingEvents || []
    if (!events.length) return 'N/A'
    const successCount = events.filter((event) => event.calving_outcome === 'normal').length
    return `${Math.round((successCount / events.length) * 100)}%`
  }

  const selectedOutcome = form.watch('calving_outcome')
  const selectedAnimal = form.watch('animal_id')
  const calvingDate = form.watch('event_date')

  // Auto-update assistance_required based on calving outcome
  useEffect(() => {
    const isAssistanceRequired = ['assisted', 'caesarean'].includes(selectedOutcome)
    console.log(`📝 CalvingEventForm: Setting assistance_required to ${isAssistanceRequired} for outcome "${selectedOutcome}"`)
    form.setValue('assistance_required', isAssistanceRequired)
  }, [selectedOutcome]) // ✅ Remove 'form' from dependencies
  
  useEffect(() => {
    if (selectedAnimal && calvingDate && !form.getValues('calf_tag_number')) {
      const animal = propsAnimals.find(a => a.id === selectedAnimal)
      if (animal) {
        // Generate calf tag based on farm's tagging settings
        generateCalfTag(farmId, calvingDate, animal.tag_number)
          .then(tag => {
            console.log('🐄 CalvingEventForm: Setting calf tag:', tag)
            form.setValue('calf_tag_number', tag)
          })
          .catch(error => {
            console.error('❌ CalvingEventForm: Error generating calf tag:', error)
            // Fallback to simple format
            const year = new Date(calvingDate).getFullYear().toString().slice(-2)
            const month = String(new Date(calvingDate).getMonth() + 1).padStart(2, '0')
            const fallbackTag = `${animal.tag_number}-${year}${month}C`
            form.setValue('calf_tag_number', fallbackTag)
          })
      }
    }
  }, [selectedAnimal, calvingDate, farmId, propsAnimals])

  // Auto-populate sire information from latest insemination
  useEffect(() => {
    if (selectedAnimal && !form.getValues('calf_father_info')) {
      console.log('🐄 CalvingEventForm: Fetching sire information for animal:', selectedAnimal)
      fetchLatestSemenBullCode(selectedAnimal)
        .then(bullCode => {
          if (bullCode) {
            console.log('🐄 CalvingEventForm: Setting sire info:', bullCode)
            form.setValue('calf_father_info', bullCode)
          }
        })
        .catch(error => {
          console.error('❌ CalvingEventForm: Error fetching sire info:', error)
          // Silently fail - field remains empty if no insemination found
        })
    }
  }, [selectedAnimal]) // ✅ FIX: Remove 'form' from dependencies
  
  if (propsLoadingAnimals) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading eligible animals...</span>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {propsAnimals.length === 0 && !propsLoadingAnimals && !preSelectedAnimalId && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
          <div className="flex items-start space-x-2">
            <Baby className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">No animals eligible for calving</p>
              <p className="text-sm mt-1">
                Animals become eligible when they are confirmed pregnant and approaching their due date.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Animal Selection */}
        <div>
          <Label htmlFor="animal_id">Select Animal *</Label>
          <select
            id="animal_id"
            {...form.register('animal_id')}
            disabled={!!preSelectedAnimalId || propsAnimals.length === 0}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent ${
              preSelectedAnimalId ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            <option value="">Choose an animal...</option>
            {propsAnimals.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {animal.tag_number} - {animal.name || 'Unnamed'} • {animal.breed || 'Unknown breed'}
              </option>
            ))}
            {preSelectedAnimalId && !propsAnimals.find(a => a.id === preSelectedAnimalId) && (
               <option key="preselected-fallback" value={preSelectedAnimalId}>Current Animal</option>
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
                  Breed, age, insemination, pregnancy, and previous calving context.
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
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Last insemination</p>
                    <p className="mt-1 font-medium">{formatDateTime(getLatestInsemination()?.event_date)}</p>
                    <p className="text-xs text-gray-500 mt-1">{getDaysSince(getLatestInsemination()?.event_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Last pregnancy check</p>
                    <p className="mt-1 font-medium">{formatDateTime(getLatestPregnancyCheck()?.check_date)}</p>
                    <p className="text-xs text-gray-500 mt-1">{getDaysSince(getLatestPregnancyCheck()?.check_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Previous calving outcome</p>
                    <p className="mt-1 font-medium capitalize">{getPreviousCalvingOutcome()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Calving success rate</p>
                    <p className="mt-1 font-medium">{getCalvingSuccessRate()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Calving Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="event_date">Calving Date *</Label>
            <Input
              id="event_date"
              type="date"
              {...form.register('event_date')}
              error={form.formState.errors.event_date?.message}
            />
            <p className="text-sm text-gray-600 mt-1">
              The actual date when the calf was born
            </p>
          </div>
          <div>
            <Label htmlFor="event_time">Time of Calving *</Label>
            <Input
              id="event_time"
              type="time"
              {...form.register('event_time')}
              error={form.formState.errors.event_time?.message}
            />
            <p className="text-sm text-gray-600 mt-1">
              Time when the calf was born
            </p>
          </div>
        </div>
        
        {/* Calving Outcome */}
        <div>
          <Label htmlFor="calving_outcome">Calving Outcome *</Label>
          <select
            id="calving_outcome"
            {...form.register('calving_outcome')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
          >
            <option value="">Select calving outcome...</option>
            {calvingOutcomes.map((outcome) => (
              <option key={outcome.value} value={outcome.value}>
                {outcome.label} - {outcome.description}
              </option>
            ))}
          </select>
          {form.formState.errors.calving_outcome && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.calving_outcome.message}
            </p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            Select the type of birth that occurred
          </p>
        </div>
        
        {/* Calf Details Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-medium text-gray-900 flex items-center">
                <Baby className="w-5 h-5 mr-2 text-farm-green" />
                Calf Details
              </h4>
              <p className="text-sm text-gray-600">
                Information about the newborn calf. (System will create new Animal, Calving Record, and Calf Record)
              </p>
            </div>
          </div>
          
          <div className="space-y-4 pl-4 border-l-2 border-green-100">
            {/* Calf Name */}
            <div>
              <Label htmlFor="calf_name">Calf Name</Label>
              <Input
                id="calf_name"
                {...form.register('calf_name')}
                placeholder="e.g., Daisy, Princess"
              />
              <p className="text-sm text-gray-600 mt-1">
                Optional name for the calf
              </p>
            </div>

            {/* Calf Breed */}
            <div>
              <Label htmlFor="calf_breed">Breed *</Label>
              <select
                id="calf_breed"
                {...form.register('calf_breed')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="">Select breed...</option>
                <option value="holstein">Holstein-Friesian</option>
                <option value="jersey">Jersey</option>
                <option value="guernsey">Guernsey</option>
                <option value="ayrshire">Ayrshire</option>
                <option value="brown_swiss">Brown Swiss</option>
                <option value="crossbred">Crossbred</option>
                <option value="other">Other</option>
              </select>
              {form.formState.errors.calf_breed && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.calf_breed.message}
                </p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                Select the breed of the calf
              </p>
            </div>

            {/* Calf Gender */}
            <div>
              <Label>Calf Gender *</Label>
              <div className="flex space-x-4 mt-2">
                {['female', 'male'].map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => form.setValue('calf_gender', gender as any)}
                    className={`flex-1 p-3 border rounded-lg transition-colors ${
                      form.watch('calf_gender') === gender
                        ? 'border-farm-green bg-green-50 text-green-800'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-2xl">
                        {gender === 'female' ? '♀' : '♂'}
                      </span>
                      <span className="font-medium capitalize">{gender}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Calf Tag Number */}
            <div>
              <Label htmlFor="calf_tag_number">Calf Tag Number *</Label>
              <Input
                id="calf_tag_number"
                {...form.register('calf_tag_number')}
                error={form.formState.errors.calf_tag_number?.message}
                placeholder="e.g., 001-2024C"
              />
              <p className="text-sm text-gray-600 mt-1">
                Auto-generated based on mother's tag and birth date.
              </p>
            </div>
            
            {/* Calf Weight */}
            <div>
              <Label htmlFor="calf_weight">Birth Weight (kg)</Label>
              <Input
                id="calf_weight"
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...form.register('calf_weight', { valueAsNumber: true })}
                placeholder="e.g., 35.5"
              />
              <p className="text-sm text-gray-600 mt-1">
                Typical birth weight: 30-45 kg for dairy calves
              </p>
            </div>

            {/* Calf Health Status */}
            <div>
              <Label htmlFor="calf_health_status">Health Status</Label>
              <select
                id="calf_health_status"
                {...form.register('calf_health_status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="">Select health status...</option>
                <option value="Healthy">Healthy</option>
                <option value="Sick">Sick</option>
                <option value="Requires attention">Requires Attention</option>
                <option value="Quarantined">Quarantined</option>
              </select>
              <p className="text-sm text-gray-600 mt-1">
                Initial health status of the newborn calf
              </p>
            </div>

            {/* Calf Sire Information */}
            <div>
              <Label htmlFor="calf_father_info">Sire (Father) Information</Label>
              <Input
                id="calf_father_info"
                {...form.register('calf_father_info')}
                placeholder="e.g., AI Bull #12345, Natural Service"
              />
              <p className="text-sm text-gray-600 mt-1">
                Sire information (AI bull number or natural service details)
              </p>
            </div>
          </div>
        </div>
        
        {/* Colostrum & Veterinarian Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="mb-4">
            <h4 className="text-lg font-medium text-gray-900 flex items-center">
              <Heart className="w-5 h-5 mr-2 text-pink-500" />
              Colostrum & Veterinary Information
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Record details about colostrum production and any veterinary care provided.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Colostrum Produced */}
            <div>
              <Label htmlFor="colostrum_produced">Colostrum Produced (liters)</Label>
              <Input
                id="colostrum_produced"
                type="number"
                step="0.1"
                min="0"
                max="50"
                {...form.register('colostrum_produced', { valueAsNumber: true })}
                placeholder="e.g., 7.5"
              />
              <p className="text-sm text-gray-600 mt-1">
                Amount of colostrum produced (typical: 5-20L)
              </p>
            </div>

            {/* Colostrum Quality */}
            <div>
              <Label htmlFor="colostrum_quality">Colostrum Quality</Label>
              <select
                id="colostrum_quality"
                {...form.register('colostrum_quality')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="">Select quality...</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
              <p className="text-sm text-gray-600 mt-1">
                Quality assessment of the colostrum
              </p>
            </div>

            {/* Veterinarian */}
            <div>
              <Label htmlFor="veterinarian">Veterinarian Name</Label>
              <Input
                id="veterinarian"
                {...form.register('veterinarian')}
                placeholder="e.g., Dr. Smith"
              />
              <p className="text-sm text-gray-600 mt-1">
                Name of veterinarian attending the calving (if applicable)
              </p>
            </div>
          </div>
        </div>
        
        {/* Additional Notes */}
        <div>
          <Label htmlFor="notes">Additional Notes</Label>
          <textarea
            id="notes"
            {...form.register('notes')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
            placeholder="Any additional information about the calving event..."
          />
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading || (propsAnimals.length === 0 && !preSelectedAnimalId)}
            className="min-w-[160px]"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Baby className="w-4 h-4" />
                <span>{eventId ? 'Save Changes' : 'Record Calving Event'}</span>
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}