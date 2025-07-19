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
import { getAnimalsForCalving, createBreedingEvent, createCalfFromEvent, type CalvingEvent } from '@/lib/database/breeding'
import { AlertCircle, CheckCircle, Baby, Heart, Clock } from 'lucide-react'

const calvingEventSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  event_date: z.string().min(1, 'Calving date is required'),
  calving_outcome: z.enum(['normal', 'assisted', 'difficult', 'caesarean']),
  calf_gender: z.enum(['male', 'female']),
  calf_weight: z.number().min(0).optional(),
  calf_tag_number: z.string().min(1, 'Calf tag number is required'),
  calf_health_status: z.string().optional(),
  notes: z.string().optional(),
})

type CalvingEventFormData = z.infer<typeof calvingEventSchema>

interface CalvingEventFormProps {
  farmId: string
  onEventCreated: () => void
  onCancel: () => void
}

const calvingOutcomes = [
  { 
    value: 'normal', 
    label: 'Normal Birth', 
    description: 'Natural birth without complications',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  { 
    value: 'assisted', 
    label: 'Assisted Birth', 
    description: 'Required minimal human assistance',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Heart
  },
  { 
    value: 'difficult', 
    label: 'Difficult Birth', 
    description: 'Prolonged labor or complications',
    color: 'bg-orange-100 text-orange-800',
    icon: Clock
  },
  { 
    value: 'caesarean', 
    label: 'Caesarean Section', 
    description: 'Surgical delivery required',
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

export function CalvingEventForm({ farmId, onEventCreated, onCancel }: CalvingEventFormProps) {
  const [loading, setLoading] = useState(false)
  const [animals, setAnimals] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [createCalf, setCreateCalf] = useState(true)
  const [loadingAnimals, setLoadingAnimals] = useState(true)
  
  const form = useForm<CalvingEventFormData>({
    resolver: zodResolver(calvingEventSchema),
    defaultValues: {
      animal_id: '',
      event_date: new Date().toISOString().split('T')[0],
      calving_outcome: 'normal',
      calf_gender: 'female',
      calf_weight: undefined,
      calf_tag_number: '',
      calf_health_status: 'Good',
      notes: '',
    },
  })
  
  useEffect(() => {
    loadEligibleAnimals()
  }, [farmId])
  
  const loadEligibleAnimals = async () => {
    setLoadingAnimals(true)
    try {
      const eligibleAnimals = await getAnimalsForCalving(farmId)
      setAnimals(eligibleAnimals)
    } catch (error) {
      console.error('Error loading animals:', error)
      setError('Failed to load animals eligible for calving')
    } finally {
      setLoadingAnimals(false)
    }
  }
  
  const handleSubmit = async (data: CalvingEventFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const eventData: CalvingEvent = {
        ...data,
        farm_id: farmId,
        event_type: 'calving',
        created_by: 'system', // TODO: Replace with actual user ID if available
      }
      
      const result = await createBreedingEvent(eventData)
      
      if (result.success) {
        // Create calf if requested
        if (createCalf) {
          const calfResult = await createCalfFromEvent(eventData, farmId)
          if (!calfResult.success) {
            setError(`Event recorded but failed to create calf: ${calfResult.error}`)
            return
          }
        }
        onEventCreated()
      } else {
        setError(result.error || 'Failed to create calving event')
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  const selectedOutcome = form.watch('calving_outcome')
  const selectedAnimal = form.watch('animal_id')
  const calvingDate = form.watch('event_date')
  
  // Auto-generate calf tag number based on mother's tag and date
  useEffect(() => {
    if (selectedAnimal && calvingDate && !form.getValues('calf_tag_number')) {
      const animal = animals.find(a => a.id === selectedAnimal)
      if (animal) {
        const year = new Date(calvingDate).getFullYear().toString().slice(-2)
        const month = String(new Date(calvingDate).getMonth() + 1).padStart(2, '0')
        const calfTag = `${animal.tag_number}-${year}${month}C`
        form.setValue('calf_tag_number', calfTag)
      }
    }
  }, [selectedAnimal, calvingDate, animals, form])
  
  if (loadingAnimals) {
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
      
      {animals.length === 0 && !loadingAnimals && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
          <div className="flex items-start space-x-2">
            <Baby className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">No animals eligible for calving</p>
              <p className="text-sm mt-1">
                Animals become eligible when they are confirmed pregnant and approaching their due date (within 30 days).
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
            disabled={animals.length === 0}
          >
            <option value="">Choose an animal...</option>
            {animals.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {animal.tag_number} - {animal.name || 'Unnamed'} 
                {animal.breeding_events?.[0]?.estimated_due_date && 
                  ` (Due: ${new Date(animal.breeding_events[0].estimated_due_date).toLocaleDateString()})`
                }
              </option>
            ))}
          </select>
          {form.formState.errors.animal_id && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.animal_id.message}
            </p>
          )}
        </div>
        
        {/* Calving Date */}
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
        
        {/* Calving Outcome */}
        <div>
          <Label>Calving Outcome *</Label>
          <p className="text-sm text-gray-600 mb-3">
            Select the type of birth that occurred:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {calvingOutcomes.map((outcome) => {
              const Icon = outcome.icon
              const isSelected = selectedOutcome === outcome.value
              
              return (
                <button
                  key={outcome.value}
                  type="button"
                  onClick={() => form.setValue('calving_outcome', outcome.value as any)}
                  className={`p-4 border rounded-lg transition-all text-left ${
                    isSelected
                      ? 'border-farm-green bg-green-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-farm-green text-white' : outcome.color
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{outcome.label}</h4>
                      <p className="text-sm text-gray-600 mt-1">{outcome.description}</p>
                      {isSelected && (
                        <Badge className="mt-2 bg-green-100 text-green-800">Selected</Badge>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
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
                Information about the newborn calf
              </p>
            </div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={createCalf}
                onChange={(e) => setCreateCalf(e.target.checked)}
                className="rounded border-gray-300 text-farm-green focus:ring-farm-green"
              />
              <span className="text-sm text-gray-700">Create calf record in system</span>
            </label>
          </div>
          
          {createCalf && (
            <div className="space-y-4 pl-4 border-l-2 border-green-100">
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
                  Auto-generated based on mother's tag and birth date. You can modify if needed.
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
                  {healthStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  Initial health assessment of the newborn calf
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Additional Notes */}
        <div>
          <Label htmlFor="notes">Additional Notes</Label>
          <textarea
            id="notes"
            {...form.register('notes')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
            placeholder="Any additional information about the calving event, complications, treatments, or observations..."
          />
          <p className="text-sm text-gray-600 mt-1">
            Include any relevant details about the birth, complications, or post-birth care
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading || animals.length === 0}
            className="min-w-[160px]"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Recording...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Baby className="w-4 h-4" />
                <span>Record Calving Event</span>
              </div>
            )}
          </Button>
        </div>
      </form>
      
      {/* Help Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h5 className="font-medium text-blue-900 mb-2">Calving Event Information</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Record the actual birth date and outcome</li>
          <li>• Creating a calf record will automatically add the new animal to your herd</li>
          <li>• The calf tag number is auto-generated but can be customized</li>
          <li>• Document any complications or special care requirements</li>
          <li>• This information helps track breeding performance and calf mortality</li>
        </ul>
      </div>
    </div>
  )
}