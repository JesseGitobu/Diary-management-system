// Enhanced EditHealthRecordModal for updating existing health records
// src/components/health/EditHealthRecordModal.tsx

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { X, Calendar, DollarSign, Stethoscope, AlertCircle } from 'lucide-react'

const healthRecordSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  record_date: z.string().min(1, 'Record date is required'),
  record_type: z.enum(['vaccination', 'treatment', 'checkup', 'injury', 'illness']),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  veterinarian: z.string().optional(),
  cost: z.number().min(0, 'Cost must be positive').optional(),
  notes: z.string().optional(),
  next_due_date: z.string().optional(),
  medication: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
})

type HealthRecordFormData = z.infer<typeof healthRecordSchema>

interface Animal {
  id: string
  tag_number: string
  name?: string
  breed?: string
  gender: 'male' | 'female'
  birth_date?: string
  status: string
}

interface HealthRecord {
  id: string
  animal_id: string
  record_date: string
  record_type: 'vaccination' | 'treatment' | 'checkup' | 'injury' | 'illness'
  description: string
  veterinarian?: string
  cost?: number
  notes?: string
  next_due_date?: string
  medication?: string
  severity?: 'low' | 'medium' | 'high'
  animals?: {
    id: string
    name?: string
    tag_number: string
    breed?: string
  }
}

interface EditHealthRecordModalProps {
  farmId: string
  animals: Animal[]
  record: HealthRecord
  isOpen: boolean
  onClose: () => void
  onRecordUpdated: (record: any) => void
}

export function EditHealthRecordModal({ 
  farmId, 
  animals, 
  record,
  isOpen, 
  onClose, 
  onRecordUpdated
}: EditHealthRecordModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<HealthRecordFormData>({
    resolver: zodResolver(healthRecordSchema),
    defaultValues: {
      animal_id: record.animal_id || '',
      record_date: record.record_date?.split('T')[0] || '',
      record_type: record.record_type || 'checkup',
      description: record.description || '',
      veterinarian: record.veterinarian || '',
      cost: record.cost || 0,
      notes: record.notes || '',
      next_due_date: record.next_due_date?.split('T')[0] || '',
      medication: record.medication || '',
      severity: record.severity || 'medium',
    },
  })

  // Update form values when record changes
  useEffect(() => {
    if (record) {
      form.reset({
        animal_id: record.animal_id || '',
        record_date: record.record_date?.split('T')[0] || '',
        record_type: record.record_type || 'checkup',
        description: record.description || '',
        veterinarian: record.veterinarian || '',
        cost: record.cost || 0,
        notes: record.notes || '',
        next_due_date: record.next_due_date?.split('T')[0] || '',
        medication: record.medication || '',
        severity: record.severity || 'medium',
      })
    }
  }, [record, form])
  
  const watchedRecordType = form.watch('record_type')
  
  // Filter active animals
  const activeAnimals = useMemo(() => {
    return animals.filter(animal => animal.status === 'active')
  }, [animals])
  
  const handleSubmit = async (data: HealthRecordFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/health/records/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
          cost: data.cost || 0,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update health record')
      }
      
      onRecordUpdated(result.record)
      onClose()
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }
  
  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'vaccination': return '💉'
      case 'treatment': return '💊'
      case 'checkup': return '🩺'
      case 'injury': return '🩹'
      case 'illness': return '🤒'
      default: return '📋'
    }
  }
  
  const selectedAnimal = activeAnimals.find(a => a.id === form.watch('animal_id'))
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Stethoscope className="w-6 h-6 text-farm-green" />
            <span>Edit Health Record</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Current Animal Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <Label className="text-base font-medium mb-3 block">Animal Information</Label>
            
            {selectedAnimal && (
              <div className="mb-4 p-3 bg-farm-green/10 border border-farm-green/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-farm-green">
                      {selectedAnimal.name || `Animal ${selectedAnimal.tag_number}`}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Tag: {selectedAnimal.tag_number} • {selectedAnimal.breed} • {selectedAnimal.gender}
                      {selectedAnimal.birth_date && (
                        <span> • Born: {new Date(selectedAnimal.birth_date).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                  <Badge variant="secondary">Current</Badge>
                </div>
              </div>
            )}
            
            {/* Animal Selection Dropdown */}
            <div>
              <Label htmlFor="animal_id">Change Animal (Optional)</Label>
              <select
                {...form.register('animal_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="">Keep current animal...</option>
                {activeAnimals.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    {animal.name || `Animal ${animal.tag_number}`} (#{animal.tag_number}) - {animal.breed}
                  </option>
                ))}
              </select>
              
              {form.formState.errors.animal_id && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.animal_id.message}
                </p>
              )}
            </div>
          </div>
          
          {/* Record Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="record_date" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Record Date</span>
              </Label>
              <Input
                id="record_date"
                type="date"
                {...form.register('record_date')}
                error={form.formState.errors.record_date?.message}
              />
            </div>
            
            <div>
              <Label htmlFor="record_type">Record Type</Label>
              <select
                id="record_type"
                {...form.register('record_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="checkup">{getRecordTypeIcon('checkup')} General Checkup</option>
                <option value="vaccination">{getRecordTypeIcon('vaccination')} Vaccination</option>
                <option value="treatment">{getRecordTypeIcon('treatment')} Treatment</option>
                <option value="injury">{getRecordTypeIcon('injury')} Injury</option>
                <option value="illness">{getRecordTypeIcon('illness')} Illness</option>
              </select>
            </div>
          </div>
          
          {/* Conditional Fields Based on Record Type */}
          {(watchedRecordType === 'injury' || watchedRecordType === 'illness') && (
            <div>
              <Label htmlFor="severity">Severity Level</Label>
              <select
                id="severity"
                {...form.register('severity')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="low">🟢 Low - Minor concern</option>
                <option value="medium">🟡 Medium - Moderate attention needed</option>
                <option value="high">🔴 High - Urgent care required</option>
              </select>
            </div>
          )}
          
          {watchedRecordType === 'treatment' && (
            <div>
              <Label htmlFor="medication">Medication/Treatment</Label>
              <Input
                id="medication"
                {...form.register('medication')}
                placeholder="e.g., Penicillin, Anti-inflammatory"
              />
            </div>
          )}
          
          {(watchedRecordType === 'vaccination' || watchedRecordType === 'treatment') && (
            <div>
              <Label htmlFor="next_due_date">Next Due Date (Optional)</Label>
              <Input
                id="next_due_date"
                type="date"
                {...form.register('next_due_date')}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-sm text-gray-500 mt-1">
                When is the next vaccination due or follow-up needed?
              </p>
            </div>
          )}
          
          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              {...form.register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Describe the health record details, symptoms, treatment given, etc..."
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="veterinarian">Veterinarian (Optional)</Label>
              <Input
                id="veterinarian"
                {...form.register('veterinarian')}
                placeholder="Dr. Smith, Veterinary Clinic Name"
              />
            </div>
            
            <div>
              <Label htmlFor="cost" className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <span>Cost (Optional)</span>
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                {...form.register('cost', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Any additional observations, follow-up instructions, or important notes..."
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Updating...</span>
                </>
              ) : (
                <>
                  <span>{getRecordTypeIcon(watchedRecordType)}</span>
                  <span className="ml-2">Update Health Record</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}