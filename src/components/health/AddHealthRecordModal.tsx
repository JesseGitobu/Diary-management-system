// Enhanced AddHealthRecordModal with improved animal selection and features
// src/components/health/AddHealthRecordModal.tsx

'use client'

import { useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Search, Filter, X, Calendar, DollarSign, Stethoscope } from 'lucide-react'

const healthRecordSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  record_date: z.string().min(1, 'Record date is required'),
  record_type: z.enum(['vaccination', 'treatment', 'checkup', 'injury', 'illness']),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  veterinarian: z.string().optional(),
  cost: z.number().min(0, 'Cost must be positive').optional(),
  notes: z.string().optional(),
  next_due_date: z.string().optional(), // For vaccinations and follow-ups
  medication: z.string().optional(), // For treatments
  severity: z.enum(['low', 'medium', 'high']).optional(), // For injuries/illness
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

interface AddHealthRecordModalProps {
  farmId: string
  animals: Animal[]
  isOpen: boolean
  onClose: () => void
  onRecordAdded: (record: any) => void
  preSelectedAnimalId?: string // Allow pre-selecting an animal
}

export function AddHealthRecordModal({ 
  farmId, 
  animals, 
  isOpen, 
  onClose, 
  onRecordAdded,
  preSelectedAnimalId 
}: AddHealthRecordModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [animalSearch, setAnimalSearch] = useState('')
  const [showAllAnimals, setShowAllAnimals] = useState(false)
  
  const form = useForm<HealthRecordFormData>({
    resolver: zodResolver(healthRecordSchema),
    defaultValues: {
      animal_id: preSelectedAnimalId || '',
      record_date: new Date().toISOString().split('T')[0],
      record_type: 'checkup',
      severity: 'medium',
    },
  })
  
  const watchedRecordType = form.watch('record_type')
  
  // Filter and search animals
  const filteredAnimals = useMemo(() => {
    let filtered = animals.filter(animal => animal.status === 'active')
    
    if (animalSearch) {
      const search = animalSearch.toLowerCase()
      filtered = filtered.filter(animal => 
        animal.tag_number.toLowerCase().includes(search) ||
        animal.name?.toLowerCase().includes(search) ||
        animal.breed?.toLowerCase().includes(search)
      )
    }
    
    // Show only first 20 animals unless "show all" is clicked
    if (!showAllAnimals && filtered.length > 20) {
      return filtered.slice(0, 20)
    }
    
    return filtered
  }, [animals, animalSearch, showAllAnimals])
  
  const handleSubmit = async (data: HealthRecordFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/health/records', {
        method: 'POST',
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
        throw new Error(result.error || 'Failed to add health record')
      }
      
      onRecordAdded(result.record)
      form.reset({
        record_date: new Date().toISOString().split('T')[0],
        record_type: 'checkup',
        severity: 'medium',
      })
      setAnimalSearch('')
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
  
  const selectedAnimal = animals.find(a => a.id === form.watch('animal_id'))
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Stethoscope className="w-6 h-6 text-farm-green" />
            <span>Add Health Record</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center space-x-2">
            <span className="text-red-500">⚠️</span>
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Animal Selection Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <Label className="text-base font-medium mb-3 block">Select Animal</Label>
            
            {/* Animal Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by tag number, name, or breed..."
                value={animalSearch}
                onChange={(e) => setAnimalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              />
            </div>
            
            {/* Selected Animal Display */}
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
                  <Badge variant="secondary">Selected</Badge>
                </div>
              </div>
            )}
            
            {/* Animal Selection Dropdown */}
            <div>
              <select
                {...form.register('animal_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="">Choose an animal...</option>
                {filteredAnimals.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    {animal.name || `Animal ${animal.tag_number}`} (#{animal.tag_number}) - {animal.breed}
                  </option>
                ))}
              </select>
              
              {filteredAnimals.length === 20 && !showAllAnimals && (
                <button
                  type="button"
                  onClick={() => setShowAllAnimals(true)}
                  className="mt-2 text-sm text-farm-green hover:text-farm-green/80"
                >
                  Show all {animals.length} animals...
                </button>
              )}
              
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
            <Button type="submit" disabled={loading || !form.watch('animal_id')}>
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Adding Record...</span>
                </>
              ) : (
                <>
                  <span>{getRecordTypeIcon(watchedRecordType)}</span>
                  <span className="ml-2">Add Health Record</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}