// src/components/breeding/InseminationForm.tsx
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
import { getEligibleAnimals } from '@/lib/database/breeding'
import { Syringe, Calendar, User, FileText } from 'lucide-react'

const inseminationSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  event_date: z.string().min(1, 'Insemination date is required'),
  event_time: z.string().min(1, 'Time of insemination is required'),
  insemination_method: z.enum(['artificial_insemination', 'natural_breeding']),
  semen_bull_code: z.string().optional(),
  technician_name: z.string().optional(),
  notes: z.string().optional(),
})

type InseminationFormData = z.infer<typeof inseminationSchema>

interface InseminationFormProps {
  farmId: string
  onEventCreated: () => void
  onCancel: () => void
  preSelectedAnimalId?: string
  initialData?: any | null
  eventId?: string | null
}

const inseminationMethods = [
  {
    value: 'artificial_insemination',
    label: 'Artificial Insemination (AI)',
    description: 'Using frozen semen straws',
    icon: '🧪'
  },
  {
    value: 'natural_breeding',
    label: 'Natural Breeding',
    description: 'Direct bull service',
    icon: '🐂'
  }
]

const commonSemenCodes = [
  'HOL001', 'HOL002', 'HOL003', 'JER001', 'JER002',
  'AYR001', 'GUE001', 'BRO001'
]

const commonTechnicians = [
  'Dr. Smith', 'John Anderson', 'Mary Johnson', 'Mike Wilson',
  'Sarah Davis', 'AI Tech 1', 'AI Tech 2'
]

type EligibleAnimal = {
  id: string
  tag_number: string
  name: string | null
  breed: string | null
  production_status: string | null
  birth_date: string | null
  gender?: string | null
  breeding_events?: Array<{ event_type: string; event_date: string | null }>
  last_heat_detection?: string | null
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
  expected_calving_date?: string | null
  breeding_events?: Array<{ event_type: string; event_date: string | null }>
}

export function InseminationForm({ farmId, onEventCreated, onCancel, preSelectedAnimalId, initialData, eventId }: InseminationFormProps) {
  const [loading, setLoading] = useState(false)
  const [animals, setAnimals] = useState<EligibleAnimal[]>([])
  const [selectedAnimal, setSelectedAnimal] = useState<EligibleAnimal | null>(null)
  const [selectedAnimalDetails, setSelectedAnimalDetails] = useState<SelectedAnimalDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<InseminationFormData>({
    resolver: zodResolver(inseminationSchema),
    defaultValues: {
      animal_id: preSelectedAnimalId || '',
      event_date: new Date().toISOString().split('T')[0],
      event_time: new Date().toTimeString().slice(0, 5),
      insemination_method: 'artificial_insemination',
      semen_bull_code: '',
      technician_name: '',
      notes: '',
    },
  })
  
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
    form.reset({
      animal_id: initialData.animal_id || '',
      event_date: datePart,
      event_time: timePart || new Date().toTimeString().slice(0, 5),
      insemination_method: initialData.insemination_method || 'artificial_insemination',
      semen_bull_code: initialData.semen_bull_code || '',
      technician_name: initialData.technician_name || '',
      notes: initialData.notes || '',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])
  
  const selectedAnimalId = form.watch('animal_id')

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

  const getLastHeatDetection = (animal: EligibleAnimal | SelectedAnimalDetails | null) => {
    const events = animal?.breeding_events || []
    const heatDates = events
      .filter((event) => event.event_type === 'heat_detection' && event.event_date)
      .map((event) => new Date(event.event_date as string))
      .sort((a, b) => b.getTime() - a.getTime())

    return heatDates.length > 0 ? heatDates[0].toISOString() : null
  }

  const formatDateTime = (dateTime?: string | null) => {
    if (!dateTime) return 'No heat record'
    return new Date(dateTime).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  const formatProductionStatus = (status?: string | null) => {
    if (!status) return 'Unknown status'
    return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  }

  const calculateAge = (birthDate?: string | null) => {
    if (!birthDate) return 'Unknown age'
    const birth = new Date(birthDate)
    const now = new Date()
    const years = now.getFullYear() - birth.getFullYear()
    const months = now.getMonth() - birth.getMonth()
    const normalizedMonths = years * 12 + months

    if (normalizedMonths < 12) {
      return `${normalizedMonths} months old`
    }

    const displayYears = Math.floor(normalizedMonths / 12)
    const displayMonths = normalizedMonths % 12
    return displayMonths === 0
      ? `${displayYears} year${displayYears === 1 ? '' : 's'} old`
      : `${displayYears} year${displayYears === 1 ? '' : 's'}, ${displayMonths} month${displayMonths === 1 ? '' : 's'} old`
  }

  const getServiceSummary = (animalDetails: SelectedAnimalDetails | null) => {
    const events = animalDetails?.breeding_events || []
    const inseminations = events.filter((event) => event.event_type === 'insemination' && event.event_date)
    const pregnancyChecks = events.filter((event) => event.event_type === 'pregnancy_check' && event.event_date)
    const latestCalvingDate = animalDetails?.latest_calving?.calving_date ? new Date(animalDetails.latest_calving.calving_date) : null

    const serviceCountAfterLastCalving = inseminations.filter((event) => {
      if (!event.event_date) return false
      const eventDate = new Date(event.event_date)
      return latestCalvingDate ? eventDate > latestCalvingDate : true
    }).length

    const successRate = inseminations.length
      ? `${Math.round((pregnancyChecks.length / inseminations.length) * 100)}%`
      : 'N/A'

    return {
      serviceCountAfterLastCalving,
      successRate,
    }
  }

  const loadEligibleAnimals = async () => {
    try {
      const eligibleAnimals = await getEligibleAnimals(farmId, 'insemination')
      
      const preparedAnimals: EligibleAnimal[] = (eligibleAnimals || []).map((animal: any) => ({
        ...animal,
        last_heat_detection: getLastHeatDetection(animal),
      }))
      
      // Inject animal if pre-selected but not in list (e.g. status issue)
      if (preSelectedAnimalId) {
        const found = preparedAnimals.find((a) => a.id === preSelectedAnimalId)
        if (!found) {
          preparedAnimals.unshift({
            id: preSelectedAnimalId,
            tag_number: 'Selected Animal',
            name: '(Current)',
            gender: 'female',
            breed: 'Unknown',
            production_status: null,
            birth_date: null,
            breeding_events: [],
            last_heat_detection: null,
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
  
  const handleSubmit = async (data: InseminationFormData) => {
    setLoading(true)
    setError(null)

    try {
      const dateTime = `${data.event_date}T${data.event_time}:00`
      const { event_time, ...restData } = data

      const payload = {
        ...restData,
        event_date: dateTime,
        farm_id: farmId,
        event_type: 'insemination',
      }

      const url = eventId ? `/api/breeding-events/${eventId}` : '/api/breeding-events'
      const method = eventId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventData: payload }),
      })

      const result = await response.json()

      if (result.success) {
        onEventCreated()
      } else {
        setError(result.error || `Failed to ${eventId ? 'update' : 'create'} insemination event`)
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  const selectedMethod = form.watch('insemination_method')
  const animalId = form.watch('animal_id')
  
  // Update selected animal when animal_id changes
  useEffect(() => {
    if (animalId) {
      const animal = animals.find(a => a.id === animalId) || null
      setSelectedAnimal(animal)
    } else {
      setSelectedAnimal(null)
    }
  }, [animalId, animals])
  
  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {animals.length === 0 && !preSelectedAnimalId && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
          <div className="flex items-center space-x-2">
            <Syringe className="w-4 h-4" />
            <span>No female animals are currently available for insemination.</span>
          </div>
        </div>
      )}
      
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Animal Selection */}
        <div>
          <Label htmlFor="animal_id">Select Animal for Insemination *</Label>
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
                {animal.tag_number} - {animal.name || 'Unnamed'} • {animal.breed || 'Unknown breed'} • {formatProductionStatus(animal.production_status)} • {formatDateTime(animal.last_heat_detection)}
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
          
          {/* Selected Animal Info */}
          {selectedAnimal && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">
                    {selectedAnimal.name || `Animal ${selectedAnimal.tag_number}`}
                  </p>
                  <p className="text-xs text-green-700">
                    {selectedAnimal.breed} • {calculateAge(selectedAnimal.birth_date)}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  Ready for breeding
                </Badge>
              </div>
            </div>
          )}

          {selectedAnimalDetails && !detailsLoading && (
            <Card className="mt-4 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle>Animal breeding details</CardTitle>
                <CardDescription>Age, production, calving, and service history for the selected animal.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
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
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Last heat detection</p>
                    <p className="mt-1 font-medium">{formatDateTime(getLastHeatDetection(selectedAnimalDetails))}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Services after last calving</p>
                    <p className="mt-1 font-medium">{getServiceSummary(selectedAnimalDetails).serviceCountAfterLastCalving}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Estimated service success</p>
                    <p className="mt-1 font-medium">{getServiceSummary(selectedAnimalDetails).successRate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Insemination Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="event_date">Insemination Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="event_date"
                type="date"
                {...form.register('event_date')}
                error={form.formState.errors.event_date?.message}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Record the actual date of insemination service
            </p>
          </div>
          <div>
            <Label htmlFor="event_time">Time of Insemination *</Label>
            <Input
              id="event_time"
              type="time"
              {...form.register('event_time')}
              error={form.formState.errors.event_time?.message}
            />
            <p className="text-xs text-gray-600 mt-1">
              Time when insemination was performed
            </p>
          </div>
        </div>
        
        {/* Insemination Method */
        <div>
          <Label>Method of Insemination *</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {inseminationMethods.map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() => form.setValue('insemination_method', method.value as any)}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  selectedMethod === method.value
                    ? 'border-farm-green bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{method.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{method.label}</h4>
                    <p className="text-sm text-gray-600">{method.description}</p>
                    {selectedMethod === method.value && (
                      <Badge className="bg-green-100 text-green-800 mt-1">Selected</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
}
        {/* Semen/Bull Code */}
        <div>
          <Label htmlFor="semen_bull_code">
            {selectedMethod === 'artificial_insemination' ? 'Semen Code/Straw ID' : 'Bull ID/Registration'}
          </Label>
          <div className="space-y-2">
            <Input
              id="semen_bull_code"
              {...form.register('semen_bull_code')}
              placeholder={
                selectedMethod === 'artificial_insemination' 
                  ? 'e.g., HOL123456, JER001' 
                  : 'e.g., Bull-001, REG12345'
              }
            />
            
            {/* Common codes suggestions */}
            {selectedMethod === 'artificial_insemination' && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-gray-600 mr-2">Common codes:</span>
                {commonSemenCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => form.setValue('semen_bull_code', code)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {selectedMethod === 'artificial_insemination' 
              ? 'Semen straw identification code or bull registration number'
              : 'Bull identification number, registration, or farm code'
            }
          </p>
        </div>
        
        {/* Technician Name */}
        <div>
          <Label htmlFor="technician_name">
            {selectedMethod === 'artificial_insemination' ? 'AI Technician' : 'Person Responsible'}
          </Label>
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="technician_name"
                {...form.register('technician_name')}
                placeholder={
                  selectedMethod === 'artificial_insemination'
                    ? 'Name of AI technician'
                    : 'Name of person managing breeding'
                }
                className="pl-10"
              />
            </div>
            
            {/* Common technicians suggestions */}
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-gray-600 mr-2">Quick select:</span>
              {commonTechnicians.map((tech) => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => form.setValue('technician_name', tech)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Service Details */}
        {selectedMethod === 'artificial_insemination' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
              <Syringe className="w-4 h-4 mr-2" />
              AI Service Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Best Practice:</span>
                <p className="text-blue-600">Inseminate 12-18 hours after heat detection</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Timing:</span>
                <p className="text-blue-600">AM heat = PM service, PM heat = AM service</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Notes */}
        <div>
          <Label htmlFor="notes">Additional Notes</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={3}
              className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Additional information about the insemination service..."
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Record any special circumstances, breeding conditions, or observations
          </p>
        </div>
        
        {/* Success Probability Indicator */}
        {selectedAnimal && selectedMethod && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <h4 className="font-medium text-green-900 mb-2">Breeding Success Factors</h4>
            <div className="space-y-1 text-sm text-green-700">
              <p>✓ Female animal in breeding condition</p>
              <p>✓ {selectedMethod === 'artificial_insemination' ? 'AI method selected' : 'Natural breeding method selected'}</p>
              <p>✓ Proper timing and technician assigned</p>
              <p className="font-medium mt-2">Expected conception rate: 60-70% for healthy animals</p>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || (animals.length === 0 && !preSelectedAnimalId)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {eventId ? 'Saving...' : 'Recording...'}
              </>
            ) : (
              <>
                <Syringe className="w-4 h-4 mr-2" />
                {eventId ? 'Save Changes' : 'Record Insemination'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}