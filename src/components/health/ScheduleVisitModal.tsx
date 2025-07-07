// src/components/health/ScheduleVisitModal.tsx
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
import { Calendar, DollarSign } from 'lucide-react'

const visitSchema = z.object({
  veterinarian_id: z.string().optional(),
  visit_date: z.string().min(1, 'Visit date is required'),
  visit_type: z.enum(['routine', 'emergency', 'vaccination', 'treatment', 'consultation']),
  purpose: z.string().min(5, 'Purpose must be at least 5 characters'),
  total_cost: z.number().optional(),
  invoice_number: z.string().optional(),
  notes: z.string().optional(),
  follow_up_required: z.boolean(),
  follow_up_date: z.string().optional(),
})

type VisitFormData = z.infer<typeof visitSchema>

interface ScheduleVisitModalProps {
  farmId: string
  veterinarians: any[]
  isOpen: boolean
  onClose: () => void
  onVisitScheduled: (visit: any) => void
}

export function ScheduleVisitModal({ 
  farmId, 
  veterinarians, 
  isOpen, 
  onClose, 
  onVisitScheduled 
}: ScheduleVisitModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<VisitFormData>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      visit_date: '',
      visit_type: 'routine',
      purpose: '',
      follow_up_required: false,
    },
  })
  
  const handleSubmit = async (data: VisitFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/veterinary/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
          total_cost: data.total_cost || null,
          follow_up_date: data.follow_up_required ? data.follow_up_date : null,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to schedule visit')
      }
      
      onVisitScheduled(result.visit)
      form.reset()
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
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          Schedule Veterinary Visit
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="visit_date">Visit Date</Label>
              <Input
                id="visit_date"
                type="date"
                {...form.register('visit_date')}
                error={form.formState.errors.visit_date?.message}
              />
            </div>
            
            <div>
              <Label htmlFor="visit_type">Visit Type</Label>
              <select
                id="visit_type"
                {...form.register('visit_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="routine">Routine Check</option>
                <option value="emergency">Emergency</option>
                <option value="vaccination">Vaccination</option>
                <option value="treatment">Treatment</option>
                <option value="consultation">Consultation</option>
              </select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="veterinarian_id">Veterinarian (Optional)</Label>
            <select
              id="veterinarian_id"
              {...form.register('veterinarian_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
            >
              <option value="">Select a veterinarian...</option>
              {veterinarians.map((vet) => (
                <option key={vet.id} value={vet.id}>
                  {vet.name} {vet.practice_name && `- ${vet.practice_name}`}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <Label htmlFor="purpose">Purpose/Description</Label>
            <textarea
              id="purpose"
              {...form.register('purpose')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Describe the purpose of this visit..."
            />
            {form.formState.errors.purpose && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.purpose.message}
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_cost">Cost (Optional)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="total_cost"
                  type="number"
                  step="0.01"
                  className="pl-10"
                  {...form.register('total_cost', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="invoice_number">Invoice Number (Optional)</Label>
              <Input
                id="invoice_number"
                {...form.register('invoice_number')}
                placeholder="INV-001"
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
              placeholder="Any additional notes about this visit..."
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="follow_up_required"
                type="checkbox"
                {...form.register('follow_up_required')}
                className="h-4 w-4 text-farm-green focus:ring-farm-green border-gray-300 rounded"
              />
              <Label htmlFor="follow_up_required" className="ml-2">
                Follow-up visit required
              </Label>
            </div>
            
            {form.watch('follow_up_required') && (
              <div>
                <Label htmlFor="follow_up_date">Follow-up Date</Label>
                <Input
                  id="follow_up_date"
                  type="date"
                  {...form.register('follow_up_date')}
                />
              </div>
            )}
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
              {loading ? <LoadingSpinner size="sm" /> : 'Schedule Visit'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}