// src/components/animals/EditAnimalModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AlertTriangle, Edit, Save, Scale, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const editAnimalSchema = z.object({
  tag_number: z.string().min(1, 'Tag number is required'),
  name: z.string().optional(),
  breed: z.string().min(1, 'Breed is required'),
  gender: z.enum(['male', 'female']),
  birth_date: z.string().optional(),
  weight: z.number().optional(),
  health_status: z.string().optional(),
  production_status: z.string().optional(),
  notes: z.string().optional(),
  
  // Conditional fields for purchased animals
  purchase_date: z.string().optional(),
  service_date: z.string().optional(),
  service_method: z.string().optional(),
  current_daily_production: z.number().optional(),
})

type EditAnimalFormData = z.infer<typeof editAnimalSchema>

interface EditAnimalModalProps {
  animal: any
  farmId: string
  isOpen: boolean
  onClose: () => void
  onAnimalUpdated: (updatedAnimal: any) => void
  highlightWeight?: boolean 
  weightUpdateReason?: string
}

export function EditAnimalModal({ 
  animal, 
  farmId, 
  isOpen, 
  onClose, 
  onAnimalUpdated,
  highlightWeight = false,
  weightUpdateReason 
}: EditAnimalModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableMothers, setAvailableMothers] = useState<any[]>([])
  const [weightHistory, setWeightHistory] = useState<any[]>([])
  
  const form = useForm<EditAnimalFormData>({
    resolver: zodResolver(editAnimalSchema),
    defaultValues: {
      tag_number: animal.tag_number || '',
      name: animal.name || '',
      breed: animal.breed || '',
      gender: animal.gender || 'female',
      birth_date: animal.birth_date ? animal.birth_date.split('T')[0] : '',
      weight: animal.weight || undefined,
      health_status: animal.health_status || '',
      production_status: animal.production_status || '',
      notes: animal.notes || '',
      purchase_date: animal.purchase_date ? animal.purchase_date.split('T')[0] : '',
      service_date: animal.service_date ? animal.service_date.split('T')[0] : '',
      service_method: animal.service_method || '',
      current_daily_production: animal.current_daily_production || undefined,
    },
  })
  
  useEffect(() => {
    if (animal.animal_source === 'newborn_calf') {
      fetchAvailableMothers()
    }
  }, [farmId])

  useEffect(() => {
    if (highlightWeight) {
      fetchWeightHistory()
    }
  }, [highlightWeight])
  
  const fetchWeightHistory = async () => {
    try {
      const response = await fetch(`/api/animals/${animal.id}/weight-history`)
      if (response.ok) {
        const data = await response.json()
        setWeightHistory(data.records || [])
      }
    } catch (error) {
      console.error('Error fetching weight history:', error)
    }
  }
  
  const fetchAvailableMothers = async () => {
    try {
      const response = await fetch(`/api/animals?farm_id=${farmId}&gender=female&exclude=${animal.id}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableMothers(data.animals || [])
      }
    } catch (error) {
      console.error('Error fetching mothers:', error)
    }
  }
  
  const handleSubmit = async (data: EditAnimalFormData) => {
  setLoading(true)
  setError(null)
  
  console.log('📝 [EditModal] Submitting update:', {
    animalId: animal.id,
    oldWeight: animal.weight,
    newWeight: data.weight
  })
  
  try {
    const response = await fetch(`/api/animals/${animal.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        weight: data.weight, // ✅ Ensure weight is included
        current_daily_production: data.current_daily_production || null,
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update animal')
    }
    
    const result = await response.json()
    
    console.log('✅ [EditModal] Update successful:', {
      animalId: result.animal.id,
      newWeight: result.animal.weight
    })
    
    onAnimalUpdated(result.animal)
    onClose()
    
  } catch (err: any) {
    console.error('❌ [EditModal] Update error:', err)
    setError(err.message)
  } finally {
    setLoading(false)
  }
}
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              highlightWeight ? "bg-orange-100" : "bg-blue-100"
            )}>
              {highlightWeight ? (
                <Scale className="w-5 h-5 text-orange-600" />
              ) : (
                <Edit className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {highlightWeight ? 'Update Weight' : 'Edit Animal'}
              </h2>
              <p className="text-gray-600">
                {highlightWeight 
                  ? 'Weight recording required for this animal' 
                  : 'Update animal information'
                }
              </p>
            </div>
          </div>
          
        </div>
        
        {/* Weight Update Alert Banner */}
        {highlightWeight && weightUpdateReason && (
          <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-orange-900 mb-1">
                  Weight Update Required
                </h4>
                <p className="text-sm text-orange-700">
                  {getWeightUpdateMessage(weightUpdateReason)}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Weight History (if available) */}
        {highlightWeight && weightHistory.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Previous Weights</h4>
            <div className="space-y-1">
              {weightHistory.slice(0, 3).map((record: any, index: number) => (
                <div key={index} className="text-sm text-blue-700 flex justify-between">
                  <span>{new Date(record.measurement_date).toLocaleDateString()}</span>
                  <span className="font-medium">{record.weight_kg} kg</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="tag_number">Tag Number *</Label>
              <Input
                id="tag_number"
                {...form.register('tag_number')}
                error={form.formState.errors.tag_number?.message}
                disabled={true} // Tag number should not be editable
              />
            </div>
            
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Optional animal name"
              />
            </div>
          </div>
          
          {/* HIGHLIGHTED WEIGHT SECTION */}
          <div className={cn(
            "p-4 rounded-lg border-2 transition-all",
            highlightWeight 
              ? "border-orange-400 bg-orange-50 shadow-md" 
              : "border-gray-200"
          )}>
            <div className="flex items-center space-x-2 mb-3">
              <Scale className={cn(
                "w-5 h-5",
                highlightWeight ? "text-orange-600" : "text-gray-600"
              )} />
              <Label 
                htmlFor="weight" 
                className={cn(
                  "text-base font-semibold",
                  highlightWeight && "text-orange-900"
                )}
              >
                Current Weight (kg) {highlightWeight && '*'}
              </Label>
            </div>
            
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="0"
              {...form.register('weight', { 
                valueAsNumber: true,
                required: highlightWeight ? 'Weight is required' : false
              })}
              placeholder="e.g., 450.5"
              error={form.formState.errors.weight?.message}
              autoFocus={highlightWeight} // Auto-focus if weight update needed
              className={cn(
                highlightWeight && "border-orange-300 focus:ring-orange-500"
              )}
            />
            
            {highlightWeight && (
              <p className="text-xs text-orange-700 mt-2">
                💡 Please enter the current weight to continue. This helps monitor the animal's growth and health.
              </p>
            )}
          </div>
          
          {/* Animal Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="breed">Breed *</Label>
              <Select
                value={form.watch('breed')}
                onValueChange={(value) => form.setValue('breed', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select breed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holstein">Holstein</SelectItem>
                  <SelectItem value="jersey">Jersey</SelectItem>
                  <SelectItem value="guernsey">Guernsey</SelectItem>
                  <SelectItem value="ayrshire">Ayrshire</SelectItem>
                  <SelectItem value="crossbred">Crossbred</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={form.watch('gender')}
                onValueChange={(value) => form.setValue('gender', value as 'male' | 'female')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="birth_date">Birth Date</Label>
              <Input
                id="birth_date"
                type="date"
                {...form.register('birth_date')}
              />
            </div>
          </div>
          
          {/* Physical & Status Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                {...form.register('weight', { valueAsNumber: true })}
                placeholder="e.g., 450"
              />
            </div>
            
            <div>
              <Label htmlFor="health_status">Health Status</Label>
              <Select
                value={form.watch('health_status')}
                onValueChange={(value) => form.setValue('health_status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select health status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="requires_attention">Requires Attention</SelectItem>
                  <SelectItem value="quarantined">Quarantined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="production_status">Production Status</Label>
              <Select
                value={form.watch('production_status')}
                onValueChange={(value) => form.setValue('production_status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select production status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calf">Calf</SelectItem>
                  <SelectItem value="heifer">Heifer</SelectItem>
                  <SelectItem value="served">Served</SelectItem>
                  <SelectItem value="lactating">Lactating</SelectItem>
                  <SelectItem value="dry">Dry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Conditional Fields for Purchased Animals */}
          {animal.animal_source === 'purchased_animal' && (
            <div className="border-l-4 border-blue-500 pl-4 space-y-4">
              <h4 className="font-medium text-blue-900">Purchase Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    {...form.register('purchase_date')}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Conditional Fields for Served Status */}
          {form.watch('production_status') === 'served' && (
            <div className="border-l-4 border-green-500 pl-4 space-y-4">
              <h4 className="font-medium text-green-900">Service Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="service_date">Service Date</Label>
                  <Input
                    id="service_date"
                    type="date"
                    {...form.register('service_date')}
                  />
                </div>
                <div>
                  <Label htmlFor="service_method">Service Method</Label>
                  <Select
                    value={form.watch('service_method')}
                    onValueChange={(value) => form.setValue('service_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="artificial_insemination">Artificial Insemination</SelectItem>
                      <SelectItem value="natural_breeding">Natural Breeding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          {/* Conditional Fields for Lactating Status */}
          {form.watch('production_status') === 'lactating' && (
            <div className="border-l-4 border-yellow-500 pl-4 space-y-4">
              <h4 className="font-medium text-yellow-900">Production Information</h4>
              <div>
                <Label htmlFor="current_daily_production">Current Daily Production (L)</Label>
                <Input
                  id="current_daily_production"
                  type="number"
                  step="0.1"
                  {...form.register('current_daily_production', { valueAsNumber: true })}
                  placeholder="e.g., 28.5"
                />
              </div>
            </div>
          )}
          
          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Additional notes about this animal..."
            />
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {highlightWeight ? 'Skip for Now' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                highlightWeight && "bg-orange-600 hover:bg-orange-700"
              )}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {highlightWeight ? 'Recording...' : 'Updating...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {highlightWeight ? 'Record Weight' : 'Update Animal'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

function getWeightUpdateMessage(reason: string): string {
  const messages: Record<string, string> = {
    'new_calf_over_month': 'This calf is over 30 days old and requires an initial weight recording for proper growth monitoring.',
    'purchased_over_month': 'This purchased animal requires a current weight recording to track its health and development.',
    'routine_schedule': 'Regular weight measurement is due based on the monitoring schedule for this animal.',
    'special_event': 'Weight measurement is required due to recent health or production changes.',
  }
  
  return messages[reason] || 'Weight update is needed to maintain accurate health records.'
}