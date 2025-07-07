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

const animalSchema = z.object({
  tag_number: z.string().min(1, 'Tag number is required'),
  name: z.string().optional(),
  breed: z.string().optional(),
  gender: z.enum(['male', 'female']),
  birth_date: z.string().optional(),
  weight: z.number().optional(),
  notes: z.string().optional(),
})

type AnimalFormData = z.infer<typeof animalSchema>

interface AddAnimalFormProps {
  farmId: string
}

export function AddAnimalForm({ farmId }: AddAnimalFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  
  const form = useForm<AnimalFormData>({
    resolver: zodResolver(animalSchema),
    defaultValues: {
      tag_number: '',
      name: '',
      breed: '',
      gender: 'female',
      birth_date: '',
      weight: undefined,
      notes: '',
    },
  })
  
  const handleSubmit = async (data: AnimalFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/animals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
          birth_date: data.birth_date || null,
          weight: data.weight || null,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add animal')
      }
      
      router.push('/dashboard/animals')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Animal Information</CardTitle>
        <CardDescription>
          Enter the details for the new animal
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tag_number">Tag Number *</Label>
              <Input
                id="tag_number"
                {...form.register('tag_number')}
                error={form.formState.errors.tag_number?.message}
                placeholder="e.g., 001"
              />
            </div>
            
            <div>
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                {...form.register('name')}
                error={form.formState.errors.name?.message}
                placeholder="e.g., Bessie"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="breed">Breed</Label>
              <Input
                id="breed"
                {...form.register('breed')}
                error={form.formState.errors.breed?.message}
                placeholder="e.g., Holstein"
              />
            </div>
            
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                {...form.register('gender')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birth_date">Birth Date</Label>
              <Input
                id="birth_date"
                type="date"
                {...form.register('birth_date')}
                error={form.formState.errors.birth_date?.message}
              />
            </div>
            
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                {...form.register('weight', { valueAsNumber: true })}
                error={form.formState.errors.weight?.message}
                placeholder="e.g., 450"
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
              placeholder="Additional notes about this animal..."
            />
          </div>
          
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/animals')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Add Animal'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}