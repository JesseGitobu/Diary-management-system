'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { Heart, Calendar, DollarSign, FileText } from 'lucide-react' 

const breedingSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  breeding_type: z.enum(['natural', 'artificial_insemination', 'embryo_transfer']),
  breeding_date: z.string().min(1, 'Breeding date is required'),
  sire_id: z.string().optional().or(z.literal('')), // Allow empty string
  sire_name: z.string().optional().or(z.literal('')), // Allow empty string
  sire_breed: z.string().optional().or(z.literal('')), // Allow empty string
  sire_registration_number: z.string().optional().or(z.literal('')), // Allow empty string
  technician_name: z.string().optional().or(z.literal('')), // Allow empty string
  cost: z.number().min(0).optional().or(z.nan()), // Handle NaN from empty inputs
  success_rate: z.number().min(0).max(100).optional().or(z.nan()), // Handle NaN from empty inputs
  notes: z.string().optional().or(z.literal('')), // Allow empty string
}).transform((data) => ({
  // Transform the data to handle empty strings and NaN values
  ...data,
  sire_id: data.sire_id === '' ? undefined : data.sire_id,
  sire_name: data.sire_name === '' ? undefined : data.sire_name,
  sire_breed: data.sire_breed === '' ? undefined : data.sire_breed,
  sire_registration_number: data.sire_registration_number === '' ? undefined : data.sire_registration_number,
  technician_name: data.technician_name === '' ? undefined : data.technician_name,
  notes: data.notes === '' ? undefined : data.notes,
  cost: isNaN(data.cost ?? NaN) ? undefined : data.cost,
  success_rate: isNaN(data.success_rate ?? NaN) ? undefined : data.success_rate,
}))

type BreedingFormData = z.infer<typeof breedingSchema> extends infer T ? (T extends { [k: string]: any } ? T : never) : never

interface RecordBreedingFormProps {
  farmId: string
  animals: any[]
}

export function RecordBreedingForm({ farmId, animals }: RecordBreedingFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  
  const form = useForm({
    resolver: zodResolver(breedingSchema),
    defaultValues: {
      animal_id: '',
      breeding_type: 'artificial_insemination',
      breeding_date: new Date().toISOString().split('T')[0],
      sire_id: undefined,
      sire_name: undefined,
      sire_breed: undefined,
      sire_registration_number: undefined,
      technician_name: undefined,
      cost: undefined,
      success_rate: undefined,
      notes: undefined,
    },
  })
  
  const selectedBreedingType = form.watch('breeding_type')
  const selectedAnimalId = form.watch('animal_id')
  const selectedAnimal = animals.find(a => a.id === selectedAnimalId)
  
const handleSubmit = async (data: BreedingFormData) => {
  setLoading(true)
  setError(null)
  
  try {
    // Clean the form data before sending to API
    const cleanedData = {
      ...data,
      farm_id: farmId,
      // Convert empty strings to undefined for optional fields
      sire_id: data.sire_id === '' ? undefined : data.sire_id,
      sire_name: data.sire_name === '' ? undefined : data.sire_name,
      sire_breed: data.sire_breed === '' ? undefined : data.sire_breed,
      sire_registration_number: data.sire_registration_number === '' ? undefined : data.sire_registration_number,
      technician_name: data.technician_name === '' ? undefined : data.technician_name,
      notes: data.notes === '' ? undefined : data.notes,
      // Handle numeric fields - convert undefined to null, keep valid numbers
      cost: data.cost === undefined || data.cost === 0 ? undefined : data.cost,
      success_rate: data.success_rate === undefined || data.success_rate === 0 ? undefined : data.success_rate,
    }
    
    const response = await fetch('/api/breeding/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanedData),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to record breeding')
    }
    
    router.push('/dashboard/breeding?success=breeding_recorded')
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An unexpected error occurred')
  } finally {
    setLoading(false)
  }
}
  
  return (
    <div className="space-y-6">
      {/* Animal Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5" />
            <span>Select Animal</span>
          </CardTitle>
          <CardDescription>
            Choose the female animal to record breeding for
          </CardDescription>
        </CardHeader>
        <CardContent>
          {animals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No animals available for breeding. Make sure you have female animals that are not currently pregnant.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {animals.map((animal) => (
                <div
                  key={animal.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedAnimalId === animal.id
                      ? 'border-farm-green bg-farm-green/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => form.setValue('animal_id', animal.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">
                      {animal.name || `Animal ${animal.tag_number}`}
                    </h4>
                    <Badge variant="outline">
                      {animal.tag_number}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Breed: {animal.breed || 'Unknown'}</p>
                    {animal.birth_date && (
                      <p>Age: {Math.floor((new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} months</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {form.formState.errors.animal_id && (
            <p className="text-sm text-red-600 mt-2">
              {form.formState.errors.animal_id.message}
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Breeding Details */}
      {selectedAnimalId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Breeding Details</span>
            </CardTitle>
            <CardDescription>
              Record the breeding information for {selectedAnimal?.name || selectedAnimal?.tag_number}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="breeding_type">Breeding Type</Label>
                  <select
                    id="breeding_type"
                    {...form.register('breeding_type')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="artificial_insemination">Artificial Insemination</option>
                    <option value="natural">Natural Breeding</option>
                    <option value="embryo_transfer">Embryo Transfer</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="breeding_date">Breeding Date</Label>
                  <Input
                    id="breeding_date"
                    type="date"
                    {...form.register('breeding_date')}
                    error={form.formState.errors.breeding_date?.message}
                  />
                </div>
              </div>
              
              {/* Sire Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Sire Information</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sire_name">Sire Name</Label>
                    <Input
                      id="sire_name"
                      {...form.register('sire_name')}
                      placeholder="e.g., Bull Name or AI Stud"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="sire_breed">Sire Breed</Label>
                    <Input
                      id="sire_breed"
                      {...form.register('sire_breed')}
                      placeholder="e.g., Holstein, Jersey"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="sire_registration_number">Registration Number</Label>
                  <Input
                    id="sire_registration_number"
                    {...form.register('sire_registration_number')}
                    placeholder="Official registration or AI number"
                  />
                </div>
              </div>
              
              {/* Additional Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Additional Information</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedBreedingType === 'artificial_insemination' && (
                    <div>
                      <Label htmlFor="technician_name">Technician Name</Label>
                      <Input
                        id="technician_name"
                        {...form.register('technician_name')}
                        placeholder="AI technician"
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="cost">Cost ($)</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      {...form.register('cost', { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="success_rate">Expected Success Rate (%)</Label>
                    <Input
                      id="success_rate"
                      type="number"
                      min="0"
                      max="100"
                      {...form.register('success_rate', { valueAsNumber: true })}
                      placeholder="60"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    {...form.register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                    placeholder="Additional breeding notes, observations, or special instructions..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/breeding')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Record Breeding'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}