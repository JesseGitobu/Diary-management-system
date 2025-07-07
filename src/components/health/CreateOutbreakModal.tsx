// src/components/health/CreateOutbreakModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, Search } from 'lucide-react'

const outbreakSchema = z.object({
  disease_id: z.string().min(1, 'Please select a disease'),
  outbreak_date: z.string().min(1, 'Outbreak date is required'),
  affected_animals: z.array(z.string()).optional(),
  suspected_animals: z.array(z.string()).optional(),
  quarantine_area: z.string().optional(),
  notes: z.string().optional(),
})

type OutbreakFormData = z.infer<typeof outbreakSchema>

interface CreateOutbreakModalProps {
  farmId: string
  diseases: any[]
  isOpen: boolean
  onClose: () => void
  onOutbreakCreated: (outbreak: any) => void
}

export function CreateOutbreakModal({ 
  farmId, 
  diseases, 
  isOpen, 
  onClose, 
  onOutbreakCreated 
}: CreateOutbreakModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [animals, setAnimals] = useState<any[]>([])
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([])
  const [animalSearchTerm, setAnimalSearchTerm] = useState('')
  
  const form = useForm<OutbreakFormData>({
    resolver: zodResolver(outbreakSchema),
    defaultValues: {
      outbreak_date: new Date().toISOString().split('T')[0],
      affected_animals: [],
      suspected_animals: [],
    },
  })
  
  // Load animals when modal opens - FIXED: Changed from useState to useEffect
  useEffect(() => {
    if (isOpen) {
      loadFarmAnimals()
    }
  }, [isOpen, farmId])
  
  const loadFarmAnimals = async () => {
    try {
      const response = await fetch(`/api/animals?farmId=${farmId}`)
      if (response.ok) {
        const data = await response.json()
        setAnimals(data.animals || [])
      }
    } catch (error) {
      console.error('Error loading animals:', error)
    }
  }
  
  const toggleAnimalSelection = (animalId: string) => {
    setSelectedAnimals(prev => 
      prev.includes(animalId) 
        ? prev.filter(id => id !== animalId)
        : [...prev, animalId]
    )
  }
  
  const filteredAnimals = animals.filter(animal => 
    animal.name?.toLowerCase().includes(animalSearchTerm.toLowerCase()) ||
    animal.tag_number.toLowerCase().includes(animalSearchTerm.toLowerCase())
  )
  
  const selectedDisease = diseases.find(d => d.id === form.watch('disease_id'))
  
  const handleSubmit = async (data: OutbreakFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/health/outbreaks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
          affected_animals: selectedAnimals,
          total_affected: selectedAnimals.length,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create outbreak report')
      }
      
      onOutbreakCreated(result.outbreak)
      form.reset()
      setSelectedAnimals([])
      onClose()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
          Report Disease Outbreak
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="disease_id">Disease/Condition</Label>
              <select
                id="disease_id"
                {...form.register('disease_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="">Select a disease...</option>
                {diseases.map((disease) => (
                  <option key={disease.id} value={disease.id}>
                    {disease.name} ({disease.category})
                  </option>
                ))}
              </select>
              {form.formState.errors.disease_id && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.disease_id.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="outbreak_date">Outbreak Date</Label>
              <Input
                id="outbreak_date"
                type="date"
                {...form.register('outbreak_date')}
                error={form.formState.errors.outbreak_date?.message}
              />
            </div>
          </div>
          
          {selectedDisease && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant={selectedDisease.is_contagious ? "destructive" : "secondary"}>
                  {selectedDisease.is_contagious ? 'Contagious' : 'Non-contagious'}
                </Badge>
                <Badge variant="outline">{selectedDisease.category}</Badge>
              </div>
              {selectedDisease.description && (
                <p className="text-sm text-gray-600 mb-2">{selectedDisease.description}</p>
              )}
              {selectedDisease.symptoms && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Common symptoms:</p>
                  <p className="text-sm text-gray-600">{selectedDisease.symptoms.join(', ')}</p>
                </div>
              )}
              {selectedDisease.quarantine_days > 0 && (
                <p className="text-sm font-medium text-red-600 mt-2">
                  Recommended quarantine: {selectedDisease.quarantine_days} days
                </p>
              )}
            </div>
          )}
          
          <div>
            <Label htmlFor="quarantine_area">Quarantine Area (Optional)</Label>
            <Input
              id="quarantine_area"
              {...form.register('quarantine_area')}
              placeholder="e.g., Barn 2, Isolation Pen A"
            />
          </div>
          
          <div>
            <Label>Affected Animals</Label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search animals by name or tag..."
                    className="pl-10"
                    value={animalSearchTerm}
                    onChange={(e) => setAnimalSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {filteredAnimals.length === 0 ? (
                <p className="text-gray-500 text-sm">No animals found</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {filteredAnimals.map((animal) => (
                    <div
                      key={animal.id}
                      className={`flex items-center p-2 rounded cursor-pointer ${
                        selectedAnimals.includes(animal.id)
                          ? 'bg-farm-green/10 border border-farm-green'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleAnimalSelection(animal.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAnimals.includes(animal.id)}
                        onChange={() => toggleAnimalSelection(animal.id)}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium text-sm">
                          {animal.name || `Animal ${animal.tag_number}`}
                        </p>
                        <p className="text-xs text-gray-600">
                          Tag: {animal.tag_number} • {animal.breed || 'Unknown breed'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedAnimals.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-gray-600">
                    {selectedAnimals.length} animal(s) selected
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes and Observations</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Describe symptoms observed, suspected cause, actions taken, etc..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : 'Report Outbreak'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}