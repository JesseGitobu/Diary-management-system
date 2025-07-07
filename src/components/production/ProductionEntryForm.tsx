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

const productionSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  record_date: z.string().min(1, 'Date is required'),
  milking_session: z.enum(['morning', 'afternoon', 'evening']),
  milk_volume: z.number().min(0, 'Volume must be positive').max(100, 'Volume seems too high'),
  fat_content: z.number().min(0).max(10).optional(),
  protein_content: z.number().min(0).max(10).optional(),
  somatic_cell_count: z.number().min(0).optional(),
  lactose_content: z.number().min(0).max(10).optional(),
  temperature: z.number().min(0).max(50).optional(),
  ph_level: z.number().min(6).max(8).optional(),
  notes: z.string().optional(),
})

type ProductionFormData = z.infer<typeof productionSchema>

interface ProductionEntryFormProps {
  farmId: string
  animals: Array<{ id: string; tag_number: string; name?: string }>
  initialData?: Partial<ProductionFormData>
  onSuccess?: () => void
}

export function ProductionEntryForm({ 
  farmId, 
  animals, 
  initialData,
  onSuccess 
}: ProductionEntryFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  
  const form = useForm<ProductionFormData>({
    resolver: zodResolver(productionSchema),
    defaultValues: {
      animal_id: initialData?.animal_id || '',
      record_date: initialData?.record_date || new Date().toISOString().split('T')[0],
      milking_session: initialData?.milking_session || 'morning',
      milk_volume: initialData?.milk_volume || undefined,
      fat_content: initialData?.fat_content || undefined,
      protein_content: initialData?.protein_content || undefined,
      somatic_cell_count: initialData?.somatic_cell_count || undefined,
      lactose_content: initialData?.lactose_content || undefined,
      temperature: initialData?.temperature || undefined,
      ph_level: initialData?.ph_level || undefined,
      notes: initialData?.notes || '',
    },
  })
  
  const handleSubmit = async (data: ProductionFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/production', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to record production')
      }
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard/production')
      }
      
      // Reset form for next entry
      form.reset({
        animal_id: '',
        record_date: new Date().toISOString().split('T')[0],
        milking_session: 'morning',
      })
      
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
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Milk Production</CardTitle>
        <CardDescription>
          Enter milk production data for individual animals
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="animal_id">Animal *</Label>
              <select
                id="animal_id"
                {...form.register('animal_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="">Select an animal</option>
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
            
            <div>
              <Label htmlFor="record_date">Date *</Label>
              <Input
                id="record_date"
                type="date"
                {...form.register('record_date')}
                error={form.formState.errors.record_date?.message}
              />
            </div>
            
            <div>
              <Label htmlFor="milking_session">Session *</Label>
              <select
                id="milking_session"
                {...form.register('milking_session')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
            </div>
          </div>
          
          {/* Production Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="milk_volume">Milk Volume (Liters) *</Label>
              <Input
                id="milk_volume"
                type="number"
                step="0.1"
                {...form.register('milk_volume', { valueAsNumber: true })}
                error={form.formState.errors.milk_volume?.message}
                placeholder="e.g., 25.5"
              />
            </div>
            
            <div>
              <Label htmlFor="fat_content">Fat Content (%)</Label>
              <Input
                id="fat_content"
                type="number"
                step="0.01"
                {...form.register('fat_content', { valueAsNumber: true })}
                error={form.formState.errors.fat_content?.message}
                placeholder="e.g., 3.75"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="protein_content">Protein Content (%)</Label>
              <Input
                id="protein_content"
                type="number"
                step="0.01"
                {...form.register('protein_content', { valueAsNumber: true })}
                error={form.formState.errors.protein_content?.message}
                placeholder="e.g., 3.25"
              />
            </div>
            
            <div>
              <Label htmlFor="somatic_cell_count">Somatic Cell Count</Label>
              <Input
                id="somatic_cell_count"
                type="number"
                {...form.register('somatic_cell_count', { valueAsNumber: true })}
                error={form.formState.errors.somatic_cell_count?.message}
                placeholder="e.g., 200000"
              />
            </div>
          </div>
          
          {/* Advanced Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="lactose_content">Lactose Content (%)</Label>
              <Input
                id="lactose_content"
                type="number"
                step="0.01"
                {...form.register('lactose_content', { valueAsNumber: true })}
                error={form.formState.errors.lactose_content?.message}
                placeholder="e.g., 4.8"
              />
            </div>
            
            <div>
              <Label htmlFor="temperature">Temperature (°C)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                {...form.register('temperature', { valueAsNumber: true })}
                error={form.formState.errors.temperature?.message}
                placeholder="e.g., 37.5"
              />
            </div>
            
            <div>
              <Label htmlFor="ph_level">pH Level</Label>
              <Input
                id="ph_level"
                type="number"
                step="0.1"
                {...form.register('ph_level', { valueAsNumber: true })}
                error={form.formState.errors.ph_level?.message}
                placeholder="e.g., 6.7"
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
              placeholder="Any additional notes about this milking session..."
            />
          </div>
          
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/production')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Record Production'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}