'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Info, Heart, Calendar, Droplets } from 'lucide-react'

// Validation schema for purchased animal
const purchasedAnimalSchema = z.object({
  tag_number: z.string().min(1, 'Tag number is required'),
  name: z.string().optional(),
  breed: z.string().min(1, 'Breed is required'),
  gender: z.enum(['male', 'female'], {
    required_error: 'Gender is required',
  }),
  birth_date: z.string().optional(),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  health_status: z.enum(['healthy', 'sick', 'requires_attention', 'quarantined'], {
    required_error: 'Health status is required',
  }),
  production_status: z.enum(['heifer', 'served', 'lactating', 'dry'], {
    required_error: 'Production status is required',
  }),
  purchase_weight: z.number().positive().optional(),
  purchase_price: z.number().positive().optional(),
  seller_info: z.string().optional(),
  notes: z.string().optional(),
  
  // Conditional fields based on production status
  mother_daily_production: z.number().positive().optional(),
  mother_lactation_number: z.number().positive().optional(),
  mother_peak_production: z.number().positive().optional(),
  service_date: z.string().optional(),
  service_method: z.string().optional(),
  expected_calving_date: z.string().optional(),
  current_daily_production: z.number().positive().optional(),
  days_in_milk: z.number().positive().optional(),
  lactation_number: z.number().positive().optional(),
})

type PurchasedAnimalFormData = z.infer<typeof purchasedAnimalSchema>

interface PurchasedAnimalFormProps {
  farmId: string
  onSuccess: (animal: any) => void
  onCancel: () => void
}

export function PurchasedAnimalForm({ farmId, onSuccess, onCancel }: PurchasedAnimalFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productionStatus, setProductionStatus] = useState<string>('heifer')
  
  const form = useForm<PurchasedAnimalFormData>({
    resolver: zodResolver(purchasedAnimalSchema),
    defaultValues: {
      tag_number: '',
      name: '',
      breed: 'holstein',
      gender: 'female',
      health_status: 'healthy',
      production_status: 'heifer',
      purchase_date: new Date().toISOString().split('T')[0],
      birth_date: '',
      purchase_weight: undefined,
      purchase_price: undefined,
      seller_info: '',
      notes: '',
      mother_daily_production: undefined,
      mother_lactation_number: undefined,
      mother_peak_production: undefined,
      service_date: '',
      service_method: '',
      expected_calving_date: '',
      current_daily_production: undefined,
      days_in_milk: undefined,
      lactation_number: undefined,
    },
  })
  
  // Watch production status changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'production_status') {
        setProductionStatus(value.production_status || 'heifer')
        // Clear conditional fields when production status changes
        form.setValue('mother_daily_production', undefined)
        form.setValue('mother_lactation_number', undefined)
        form.setValue('mother_peak_production', undefined)
        form.setValue('service_date', '')
        form.setValue('service_method', '')
        form.setValue('expected_calving_date', '')
        form.setValue('current_daily_production', undefined)
        form.setValue('days_in_milk', undefined)
        form.setValue('lactation_number', undefined)
      }
    })
    return () => subscription.unsubscribe()
  }, [form])
  
  const handleSubmit = async (data: PurchasedAnimalFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      // Prepare conditional data based on production status
      const conditionalData: any = {}
      
      if (data.production_status === 'heifer') {
        if (data.mother_daily_production || data.mother_lactation_number || data.mother_peak_production) {
          conditionalData.mother_production_info = {
            daily_production: data.mother_daily_production,
            lactation_number: data.mother_lactation_number,
            peak_production: data.mother_peak_production,
          }
        }
      } else if (data.production_status === 'served') {
        conditionalData.service_date = data.service_date
        conditionalData.service_method = data.service_method
        conditionalData.expected_calving_date = data.expected_calving_date
      } else if (data.production_status === 'lactating') {
        conditionalData.current_daily_production = data.current_daily_production
        conditionalData.days_in_milk = data.days_in_milk
        conditionalData.lactation_number = data.lactation_number
      }
      
      const response = await fetch('/api/animals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          ...data,
          ...conditionalData,
          farm_id: farmId,
          animal_source: 'purchased_animal',
          weight: data.purchase_weight,
          status: 'active',
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add purchased animal')
      }
      
      const result = await response.json()
      onSuccess(result.animal)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Purchased Animal Registration</h3>
        <p className="text-sm text-gray-600">Register an animal acquired from another source</p>
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 border-b pb-2">Basic Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tag_number">Tag Number *</Label>
              <Input
                id="tag_number"
                {...form.register('tag_number')}
                error={form.formState.errors.tag_number?.message}
                placeholder="e.g., P001, PF24-001"
              />
              <p className="text-xs text-gray-500">Unique identifier for this animal</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Animal Name (Optional)</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="e.g., Bella, Queen"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
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
                  <SelectItem value="brown_swiss">Brown Swiss</SelectItem>
                  <SelectItem value="crossbred">Crossbred</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.breed && (
                <p className="text-sm text-red-600">{form.formState.errors.breed.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={form.watch('gender')}
                onValueChange={(value) => form.setValue('gender', value as 'male' | 'female')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.gender && (
                <p className="text-sm text-red-600">{form.formState.errors.gender.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birth_date">Birth Date</Label>
              <Input
                id="birth_date"
                type="date"
                {...form.register('birth_date')}
                error={form.formState.errors.birth_date?.message}
              />
              <p className="text-xs text-gray-500">If known</p>
            </div>
          </div>
        </div>
        
        {/* Purchase Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 border-b pb-2">Purchase Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_date">Purchase Date *</Label>
              <Input
                id="purchase_date"
                type="date"
                {...form.register('purchase_date')}
                error={form.formState.errors.purchase_date?.message}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="seller_info">Seller Information</Label>
              <Input
                id="seller_info"
                {...form.register('seller_info')}
                placeholder="e.g., Smith Farm, Auction House"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_weight">Purchase Weight (kg)</Label>
              <Input
                id="purchase_weight"
                type="number"
                step="0.1"
                min="0"
                {...form.register('purchase_weight', { valueAsNumber: true })}
                placeholder="e.g., 450"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Purchase Price</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                min="0"
                {...form.register('purchase_price', { valueAsNumber: true })}
                placeholder="e.g., 1500.00"
              />
            </div>
          </div>
        </div>
        
        {/* Status Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 border-b pb-2">Current Status</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="health_status">Health Status *</Label>
              <Select
                value={form.watch('health_status')}
                onValueChange={(value) => form.setValue('health_status', value as any)}
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
              {form.formState.errors.health_status && (
                <p className="text-sm text-red-600">{form.formState.errors.health_status.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="production_status">Production Status *</Label>
              <Select
                value={form.watch('production_status')}
                onValueChange={(value) => form.setValue('production_status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select production status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="heifer">Heifer</SelectItem>
                  <SelectItem value="served">Served</SelectItem>
                  <SelectItem value="lactating">Lactating</SelectItem>
                  <SelectItem value="dry">Dry</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.production_status && (
                <p className="text-sm text-red-600">{form.formState.errors.production_status.message}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Conditional Fields Based on Production Status */}
        {productionStatus === 'heifer' && (
          <Card className="border-l-4 border-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Mother's Production Information</h4>
                <Info className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-sm text-blue-700 mb-4">
                Information about the mother's production can help predict this heifer's future performance.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mother_daily_production">Mother's Daily Production (L)</Label>
                  <Input
                    id="mother_daily_production"
                    type="number"
                    step="0.1"
                    min="0"
                    {...form.register('mother_daily_production', { valueAsNumber: true })}
                    placeholder="e.g., 25.5"
                  />
                  <p className="text-xs text-gray-500">Average daily milk production</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mother_lactation_number">Mother's Lactation Number</Label>
                  <Input
                    id="mother_lactation_number"
                    type="number"
                    min="1"
                    {...form.register('mother_lactation_number', { valueAsNumber: true })}
                    placeholder="e.g., 3"
                  />
                  <p className="text-xs text-gray-500">Which lactation this data is from</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mother_peak_production">Mother's Peak Production (L)</Label>
                  <Input
                    id="mother_peak_production"
                    type="number"
                    step="0.1"
                    min="0"
                    {...form.register('mother_peak_production', { valueAsNumber: true })}
                    placeholder="e.g., 45.0"
                  />
                  <p className="text-xs text-gray-500">Highest daily production recorded</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {productionStatus === 'served' && (
          <Card className="border-l-4 border-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium text-purple-900">Service Information</h4>
                <Info className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-sm text-purple-700 mb-4">
                Details about breeding service and expected calving.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service_date">Service Date</Label>
                  <Input
                    id="service_date"
                    type="date"
                    {...form.register('service_date')}
                  />
                  <p className="text-xs text-gray-500">Date of breeding service</p>
                </div>
                <div className="space-y-2">
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
                      <SelectItem value="embryo_transfer">Embryo Transfer</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_calving_date">Expected Calving Date</Label>
                  <Input
                    id="expected_calving_date"
                    type="date"
                    {...form.register('expected_calving_date')}
                  />
                  <p className="text-xs text-gray-500">Estimated due date</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {productionStatus === 'lactating' && (
          <Card className="border-l-4 border-green-500">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Droplets className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-green-900">Current Production Information</h4>
                <Info className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-sm text-green-700 mb-4">
                Current milk production details for this lactating animal.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current_daily_production">Current Daily Production (L)</Label>
                  <Input
                    id="current_daily_production"
                    type="number"
                    step="0.1"
                    min="0"
                    {...form.register('current_daily_production', { valueAsNumber: true })}
                    placeholder="e.g., 28.5"
                  />
                  <p className="text-xs text-gray-500">Current daily milk production</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="days_in_milk">Days in Milk</Label>
                  <Input
                    id="days_in_milk"
                    type="number"
                    min="0"
                    {...form.register('days_in_milk', { valueAsNumber: true })}
                    placeholder="e.g., 150"
                  />
                  <p className="text-xs text-gray-500">Days since calving</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lactation_number">Lactation Number</Label>
                  <Input
                    id="lactation_number"
                    type="number"
                    min="1"
                    {...form.register('lactation_number', { valueAsNumber: true })}
                    placeholder="e.g., 2"
                  />
                  <p className="text-xs text-gray-500">Current lactation number</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {productionStatus === 'dry' && (
          <Card className="border-l-4 border-gray-500">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-5 h-5 text-gray-600" />
                <h4 className="font-medium text-gray-900">Dry Period Information</h4>
                <Info className="w-4 h-4 text-gray-500" />
              </div>
              <p className="text-sm text-gray-700 mb-4">
                This animal is currently in the dry period (not producing milk). 
                This is normal preparation for the next lactation.
              </p>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> Dry period typically lasts 60 days before the next calving. 
                  You can update the production status when calving occurs.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Additional Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 border-b pb-2">Additional Information</h4>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent resize-none"
              placeholder="Any additional information about the purchased animal (health history, production records, special requirements, etc.)"
            />
            <p className="text-xs text-gray-500">
              Include any relevant information about the animal's history, health, or special care requirements
            </p>
          </div>
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
          variant="primary"
            size="default"
            primary={true}
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Adding Animal...
              </>
            ) : (
              'Add Animal'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}