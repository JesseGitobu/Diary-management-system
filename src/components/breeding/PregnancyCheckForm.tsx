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
import { getAnimalsForPregnancyCheck, createBreedingEvent, type PregnancyCheckEvent } from '@/lib/database/breeding'
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react'

const pregnancyCheckSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  event_date: z.string().min(1, 'Examination date is required'),
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
}

const examinationMethods = [
  'Rectal palpation',
  'Ultrasound',
  'Blood test',
  'Milk test',
  'Visual observation'
]

export function PregnancyCheckForm({ farmId, onEventCreated, onCancel }: PregnancyCheckFormProps) {
  const [loading, setLoading] = useState(false)
  const [animals, setAnimals] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<PregnancyCheckFormData>({
    resolver: zodResolver(pregnancyCheckSchema),
    defaultValues: {
      animal_id: '',
      event_date: new Date().toISOString().split('T')[0],
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
  
  const loadEligibleAnimals = async () => {
    try {
      const eligibleAnimals = await getAnimalsForPregnancyCheck(farmId)
      setAnimals(eligibleAnimals)
    } catch (error) {
      console.error('Error loading animals:', error)
      setError('Failed to load animals')
    }
  }
  
  const handleSubmit = async (data: PregnancyCheckFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const eventData: PregnancyCheckEvent = {
        ...data,
        farm_id: farmId,
        event_type: 'pregnancy_check',
        estimated_due_date: data.estimated_due_date || undefined,
        created_by: 'system', // TODO: Replace with actual user ID if available
      }
      
      const result = await createBreedingEvent(eventData)
      
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
  
  // Calculate estimated due date (283 days from examination for positive result)
  useEffect(() => {
    if (pregnancyResult === 'pregnant' && examinationDate) {
      const examDate = new Date(examinationDate)
      const dueDate = new Date(examDate.getTime() + (283 * 24 * 60 * 60 * 1000))
      form.setValue('estimated_due_date', dueDate.toISOString().split('T')[0])
    }
  }, [pregnancyResult, examinationDate, form])
  
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
      
      {animals.length === 0 && (
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
            disabled={animals.length === 0}
          >
            <option value="">Choose an animal...</option>
            {animals.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {animal.tag_number} - {animal.name || 'Unnamed'}
              </option>
            ))}
          </select>
          {form.formState.errors.animal_id && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.animal_id.message}
            </p>
          )}
        </div>
        
        {/* Examination Date */}
        <div>
          <Label htmlFor="event_date">Examination Date *</Label>
          <Input
            id="event_date"
            type="date"
            {...form.register('event_date')}
            error={form.formState.errors.event_date?.message}
          />
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
              Automatically calculated as 283 days from examination date
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
          <Button type="submit" disabled={loading || animals.length === 0}>
            {loading ? <LoadingSpinner size="sm" /> : 'Record Pregnancy Check'}
          </Button>
        </div>
      </form>
    </div>
  )
}