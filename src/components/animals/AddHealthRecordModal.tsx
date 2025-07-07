'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const healthRecordSchema = z.object({
  record_date: z.string().min(1, 'Date is required'),
  record_type: z.enum(['vaccination', 'treatment', 'checkup', 'injury', 'illness']),
  description: z.string().min(1, 'Description is required'),
  veterinarian: z.string().optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().optional(),
})

type HealthRecordFormData = z.infer<typeof healthRecordSchema>

interface AddHealthRecordModalProps {
  animalId: string
  isOpen: boolean
  onClose: () => void
  onRecordAdded: (record: any) => void
}

export function AddHealthRecordModal({ 
  animalId, 
  isOpen, 
  onClose, 
  onRecordAdded 
}: AddHealthRecordModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<HealthRecordFormData>({
    resolver: zodResolver(healthRecordSchema),
    defaultValues: {
      record_date: new Date().toISOString().split('T')[0],
      record_type: 'checkup',
      description: '',
      veterinarian: '',
      cost: undefined,
      notes: '',
    },
  })
  
  const handleSubmit = async (data: HealthRecordFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/animals/${animalId}/health-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          cost: data.cost || null,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add health record')
      }
      
      const result = await response.json()
      onRecordAdded(result.record)
      form.reset()
      
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Add Health Record
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="record_date">Date</Label>
              <Input
                id="record_date"
                type="date"
                {...form.register('record_date')}
                error={form.formState.errors.record_date?.message}
              />
            </div>
            
            <div>
              <Label htmlFor="record_type">Type</Label>
              <select
                id="record_type"
                {...form.register('record_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="checkup">Regular Checkup</option>
                <option value="vaccination">Vaccination</option>
                <option value="treatment">Treatment</option>
                <option value="injury">Injury</option>
                <option value="illness">Illness</option>
              </select>
              {form.formState.errors.record_type && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.record_type.message}
                </p>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              {...form.register('description')}
              error={form.formState.errors.description?.message}
              placeholder="e.g., Annual vaccination, hoof trimming, etc."
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="veterinarian">Veterinarian (Optional)</Label>
              <Input
                id="veterinarian"
                {...form.register('veterinarian')}
                error={form.formState.errors.veterinarian?.message}
                placeholder="Dr. Smith"
              />
            </div>
            
            <div>
              <Label htmlFor="cost">Cost (Optional)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                {...form.register('cost', { valueAsNumber: true })}
                error={form.formState.errors.cost?.message}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Additional notes or observations..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Add Record'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}