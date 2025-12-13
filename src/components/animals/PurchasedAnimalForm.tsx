// src/components/animals/PurchasedAnimalForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Info, Heart, Calendar, Droplets, Activity, AlertTriangle } from 'lucide-react'
import { TagGenerationSection } from './TagGenerationSection'
import {
  getProductionStatusDisplay,
  getProductionStatusBadgeColor,
} from '@/lib/utils/productionStatusUtils'

// Updated validation schema
const purchasedAnimalSchema = z.object({
  tag_number: z.string().optional(),
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
  production_status: z.enum(['calf', 'heifer', 'served', 'lactating', 'dry', 'bull']).optional(),
  purchase_weight: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  purchase_price: z.number().positive().optional(),
  seller_info: z.string().optional(),
  notes: z.string().optional(),

  // Conditional fields
  mother_daily_production: z.number().positive().optional(),
  mother_lactation_number: z.number().positive().optional(),
  mother_peak_production: z.number().positive().optional(),
  service_date: z.string().optional(),
  service_method: z.string().optional(),
  expected_calving_date: z.string().optional(),
  current_daily_production: z.number().positive().optional(),
  days_in_milk: z.number().positive().optional(),
  lactation_number: z.number().positive().optional(),

  autoGenerateTag: z.boolean().optional(),
}).refine(
  (data) => {
    // ✅ If production status is 'dry', expected_calving_date is required
    if (data.production_status === 'dry') {
      return !!data.expected_calving_date && data.expected_calving_date.trim().length > 0
    }
    return true
  },
  {
    message: 'Expected calving date is required for dry animals',
    path: ['expected_calving_date'], // Show error on this field
  }
)

type PurchasedAnimalFormData = z.infer<typeof purchasedAnimalSchema>

interface PurchasedAnimalFormProps {
  farmId: string
  onSuccess: (animal: any) => void
  onCancel: () => void
}

export function PurchasedAnimalForm({ farmId, onSuccess, onCancel }: PurchasedAnimalFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productionStatus, setProductionStatus] = useState<string>('')

  // ✅ NEW: Auto-calculation states
  const [calculatedProductionStatus, setCalculatedProductionStatus] = useState<string>('')
  const [calculatingStatus, setCalculatingStatus] = useState(false)
  const [matchingCategory, setMatchingCategory] = useState<{ id: string; name: string } | null>(null)
  const [allowedStatuses, setAllowedStatuses] = useState<string[]>([])
  const [canOverrideStatus, setCanOverrideStatus] = useState(false)
  const [ageInMonths, setAgeInMonths] = useState<number>(0)

  const form = useForm<PurchasedAnimalFormData>({
    resolver: zodResolver(purchasedAnimalSchema),
    defaultValues: {
      tag_number: '',
      name: '',
      breed: 'holstein',
      gender: 'female',
      health_status: 'healthy',
      production_status: undefined, // ✅ Start undefined
      purchase_date: new Date().toISOString().split('T')[0],
      birth_date: '',
      purchase_weight: undefined,
      weight: undefined,
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
      autoGenerateTag: true,
    },
  })

  const formData = form.watch()
  const productionStatusValue = form.watch('production_status')

  // ✅ NEW: Auto-calculate production status based on birth date and gender
  useEffect(() => {
    const calculateProductionStatus = async () => {
      const birthDate = form.watch('birth_date')
      const gender = form.watch('gender')

      if (!birthDate || !gender) {
        setCalculatedProductionStatus('')
        setAllowedStatuses([])
        setCanOverrideStatus(false)
        setAgeInMonths(0)
        return
      }

      setCalculatingStatus(true)
      try {
        const response = await fetch('/api/animals/calculate-production-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            birth_date: birthDate,
            gender: gender,
            farm_id: farmId
          })
        })

        if (response.ok) {
          const data = await response.json()
          setCalculatedProductionStatus(data.production_status)
          setMatchingCategory(data.matching_category)

          // Calculate age in months
          const birth = new Date(birthDate)
          const now = new Date()
          const ageInDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))
          const months = Math.floor(ageInDays / 30)
          setAgeInMonths(months)

          // ✅ Determine allowed production statuses based on age
          const allowed: string[] = []

          if (gender === 'female') {
            if (months < 6) {
              // Too young - only calf
              allowed.push('calf')
              setCanOverrideStatus(false)
            } else if (months < 15) {
              // 6-15 months - heifer, but could be served
              allowed.push('heifer', 'served')
              setCanOverrideStatus(true)
            } else {
              // 15+ months - can be anything
              allowed.push('heifer', 'served', 'lactating', 'dry')
              setCanOverrideStatus(true)
            }
          } else {
            // Male
            if (months < 6) {
              allowed.push('calf')
              setCanOverrideStatus(false)
            } else {
              allowed.push('bull')
              setCanOverrideStatus(false)
            }
          }

          setAllowedStatuses(allowed)

          // Auto-set production status if not already set or if not allowed
          const currentStatus = form.watch('production_status')
          if (!currentStatus || !allowed.includes(currentStatus)) {
            form.setValue('production_status', data.production_status as any)
            setProductionStatus(data.production_status)
          }

          console.log(`✅ [Form] Production status calculated:`, {
            calculated: data.production_status,
            ageMonths: months,
            allowed,
            canOverride: allowed.length > 1
          })
        }
      } catch (error) {
        console.error('❌ [Form] Error calculating production status:', error)
        setCalculatedProductionStatus('')
        setAllowedStatuses([])
      } finally {
        setCalculatingStatus(false)
      }
    }

    calculateProductionStatus()
  }, [form.watch('birth_date'), form.watch('gender'), farmId])

  useEffect(() => {
  if (productionStatusValue && productionStatusValue !== productionStatus) {
    console.log('🔄 [Form] Production status changed:', {
      old: productionStatus,
      new: productionStatusValue
    })
    
    setProductionStatus(productionStatusValue)
    
    // Clear conditional fields when production status changes
    // ⚠️ IMPORTANT: Only clear if actually changing
    if (productionStatusValue !== 'heifer') {
      form.setValue('mother_daily_production', undefined)
      form.setValue('mother_lactation_number', undefined)
      form.setValue('mother_peak_production', undefined)
    }
    
    if (productionStatusValue !== 'served' && productionStatusValue !== 'dry') {
      form.setValue('service_date', '')
      form.setValue('service_method', '')
      // ⚠️ CRITICAL: Don't clear expected_calving_date if dry
      if (productionStatusValue !== 'dry' as PurchasedAnimalFormData['production_status']) {
        form.setValue('expected_calving_date', '')
      }
    }
    
    if (productionStatusValue !== 'lactating') {
      form.setValue('current_daily_production', undefined)
      form.setValue('days_in_milk', undefined)
      form.setValue('lactation_number', undefined)
    }
    
    console.log('✅ [Form] Cleared conditional fields for:', productionStatusValue)
  }
}, [productionStatusValue, productionStatus, form])

  const handleTagChange = (tagNumber: string, autoGenerate: boolean) => {
    form.setValue('tag_number', tagNumber, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    })
    form.setValue('autoGenerateTag', autoGenerate)
    form.clearErrors('tag_number')
  }

  const getCustomAttributesForTag = () => {
    return [
      { name: 'Breed Group', value: formData.breed || 'Unknown' },
      { name: 'Production Stage', value: calculatedProductionStatus || formData.production_status || 'Unknown' },
      { name: 'Source', value: 'Purchased' },
      { name: 'Gender', value: formData.gender || 'Unknown' },
      ...(formData.seller_info ? [{ name: 'Seller', value: formData.seller_info.substring(0, 10) }] : [])
    ]
  }

  const handleSubmit = async (data: PurchasedAnimalFormData) => {
    if (!data.tag_number || data.tag_number.trim().length === 0) {
      setError('Tag number is required. Please enable auto-generation or enter a manual tag number.')
      return
    }

    // Determine final production status
    const finalProductionStatus = data.production_status || calculatedProductionStatus

    console.log('🔍 [Form] Final production status:', finalProductionStatus)
    console.log('🔍 [Form] Form production status:', data.production_status)
    console.log('🔍 [Form] Calculated production status:', calculatedProductionStatus)

    // ✅ Validation for dry animals
    if (finalProductionStatus === 'dry' && !data.expected_calving_date) {
      setError('Expected calving date is required for dry animals.')
      form.setError('expected_calving_date', {
        type: 'manual',
        message: 'Expected calving date is required for dry animals'
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      // ✅ FIX: Prepare conditional data ONLY - don't override production_status here
      const conditionalData: any = {}

      // Add conditional fields based on production status
      if (finalProductionStatus === 'heifer') {
        if (data.mother_daily_production || data.mother_lactation_number || data.mother_peak_production) {
          conditionalData.mother_production_info = {
            daily_production: data.mother_daily_production,
            lactation_number: data.mother_lactation_number,
            peak_production: data.mother_peak_production,
          }
        }
      } else if (finalProductionStatus === 'served') {
        if (data.service_date) conditionalData.service_date = data.service_date
        if (data.service_method) conditionalData.service_method = data.service_method
        if (data.expected_calving_date) conditionalData.expected_calving_date = data.expected_calving_date
      } else if (finalProductionStatus === 'lactating') {
        if (data.current_daily_production) conditionalData.current_daily_production = data.current_daily_production
        if (data.days_in_milk) conditionalData.days_in_milk = data.days_in_milk
        if (data.lactation_number) conditionalData.lactation_number = data.lactation_number
      } else if (finalProductionStatus === 'dry') {
        // ✅ CRITICAL: For dry animals, ONLY add expected_calving_date
        if (data.expected_calving_date) {
          conditionalData.expected_calving_date = data.expected_calving_date
        }
      }

      // ✅ Build request data - production_status should NOT be overridden
      const requestData = {
        tag_number: data.tag_number?.trim(),
        name: data.name,
        breed: data.breed,
        gender: data.gender,
        birth_date: data.birth_date,
        purchase_date: data.purchase_date,
        health_status: data.health_status,
        purchase_weight: data.purchase_weight,
        weight: data.weight,
        purchase_price: data.purchase_price,
        seller_info: data.seller_info,
        notes: data.notes,
        ...conditionalData, // Add conditional fields
        farm_id: farmId,
        animal_source: 'purchased_animal',
        production_status: finalProductionStatus, // ✅ Use the correct final status
        status: 'active',
        autoGenerateTag: data.autoGenerateTag,
      }

      console.log('📤 [Form] Final request data:', requestData)
      console.log('📤 [Form] Production status in request:', requestData.production_status)

      const response = await fetch('/api/animals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
      })

      const result = await response.json()
      console.log('📥 [Form] API Response:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add purchased animal')
      }

      if (result.generatedTagNumber) {
        console.log(`✅ [Form] Animal registered with tag: ${result.generatedTagNumber}`)
      }

      onSuccess(result)

    } catch (err: any) {
      console.error('❌ [Form] Submit error:', err)
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
        <TagGenerationSection
          farmId={farmId}
          formData={formData}
          onTagChange={handleTagChange}
          customAttributes={getCustomAttributesForTag()}
        />

        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 border-b pb-2">Basic Information</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Animal Name (Optional)</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="e.g., Bella, Queen"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">
                Birth Date
                <span className="text-xs text-orange-600 ml-2">
                  (Used to calculate production status)
                </span>
              </Label>
              <Input
                id="birth_date"
                type="date"
                {...form.register('birth_date')}
                error={form.formState.errors.birth_date?.message}
              />
              <p className="text-xs text-gray-500">
                If known - helps determine appropriate production status
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>

        {/* ✅ AUTO-CALCULATED PRODUCTION STATUS DISPLAY */}
        {calculatingStatus ? (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-center">
              <LoadingSpinner size="sm" className="mr-2" />
              <span className="text-sm text-blue-700">Calculating production status...</span>
            </div>
          </div>
        ) : (formData.birth_date && formData.gender && calculatedProductionStatus) && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  {canOverrideStatus ? 'Suggested Production Status' : 'Auto-assigned Production Status'}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {matchingCategory
                    ? `Based on "${matchingCategory.name}" category (${ageInMonths} months old)`
                    : `Based on age (${ageInMonths} months old) and ${formData.gender} default rules`
                  }
                </p>
                {canOverrideStatus && (
                  <p className="text-xs text-green-600 mt-1 italic">
                    💡 You can override this selection below based on the animal's actual status
                  </p>
                )}
                {formData.gender === 'male' && (
                  <p className="text-xs text-green-600 mt-1 italic">
                    ℹ️ Male animals are categorized as either Calves or Bulls
                  </p>
                )}
              </div>
              <Badge className={`${getProductionStatusBadgeColor(calculatedProductionStatus)} px-3 py-1`}>
                {getProductionStatusDisplay(calculatedProductionStatus, formData.gender)}
              </Badge>
            </div>
          </div>
        )}

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
              <Label htmlFor="purchase_weight">
                Purchase Weight (kg)
                <span className="text-xs text-gray-500 ml-2">
                  (At purchase - historical)
                </span>
              </Label>
              <Input
                id="purchase_weight"
                type="number"
                step="0.1"
                min="0"
                {...form.register('purchase_weight', { valueAsNumber: true })}
                placeholder="e.g., 450"
              />
              <p className="text-xs text-gray-500">
                Weight at time of purchase
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">
                Current Weight (kg)
                <span className="text-xs text-orange-500 ml-2">
                  (Optional - if different)
                </span>
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                {...form.register('weight', { valueAsNumber: true })}
                placeholder="e.g., 480"
              />
              <p className="text-xs text-gray-500">
                💡 If purchased over 30 days ago and you don't provide this, you'll be prompted later
              </p>
            </div>
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

            {/* ✅ CONDITIONAL PRODUCTION STATUS SELECTOR */}
            <div className="space-y-2">
              <Label htmlFor="production_status">
                Production Status {canOverrideStatus ? '' : '*'}
                {!formData.birth_date && (
                  <span className="text-xs text-orange-600 ml-2">
                    (Provide birth date for auto-calculation)
                  </span>
                )}
              </Label>
              {!formData.birth_date ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800">
                      Please provide birth date first for accurate production status calculation
                    </p>
                  </div>
                </div>
              ) : !canOverrideStatus ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800 font-medium">
                    {getProductionStatusDisplay(calculatedProductionStatus, formData.gender)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Auto-set based on age ({ageInMonths} months old)
                  </p>
                </div>
              ) : (
                <>
                  <Select
                    value={form.watch('production_status') || calculatedProductionStatus}
                    onValueChange={(value) => form.setValue('production_status', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select production status" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedStatuses.map(status => (
                        <SelectItem key={status} value={status}>
                          {getProductionStatusDisplay(status, formData.gender)}
                          {status === calculatedProductionStatus && ' (Suggested)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Choose based on the animal's current reproductive/production state
                  </p>
                </>
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
                <h4 className="font-medium text-blue-900">Mother's Production Information (Optional)</h4>
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service_date">Service Date</Label>
                  <Input
                    id="service_date"
                    type="date"
                    {...form.register('service_date')}
                  />
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
              </div>
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

              {/* ✅ REQUIRED: Expected Calving Date */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expected_calving_date">
                    Expected Calving Date *
                    <span className="text-xs text-red-600 ml-2">(Required for dry animals)</span>
                  </Label>
                  <Input
                    id="expected_calving_date"
                    type="date"
                    {...form.register('expected_calving_date')}
                    min={new Date().toISOString().split('T')[0]} // Can't be in the past
                    className={form.formState.errors.expected_calving_date ? 'border-red-500' : ''}
                  />
                  {form.formState.errors.expected_calving_date && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {form.formState.errors.expected_calving_date.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    When is this animal expected to calve?
                  </p>
                </div>

                {/* ✅ Calculate and show dry period duration */}
                {form.watch('expected_calving_date') && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">Dry Period Information:</p>
                        <p className="mt-1">
                          Expected calving: {form.watch('expected_calving_date') ? new Date(form.watch('expected_calving_date') as string).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : ''}
                        </p>
                        {(() => {
                          const expectedDate = form.watch('expected_calving_date')
                          const calvingDate = expectedDate ? new Date(expectedDate) : new Date()
                          const today = new Date()
                          const daysUntilCalving = Math.ceil((calvingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

                          return (
                            <>
                              <p className="mt-1">
                                Days until calving: <span className="font-semibold">{daysUntilCalving} days</span>
                              </p>
                              {daysUntilCalving < 0 && (
                                <p className="mt-1 text-red-600 font-medium">
                                  ⚠️ This date is in the past. Please update the calving date or production status.
                                </p>
                              )}
                              {daysUntilCalving > 0 && daysUntilCalving < 30 && (
                                <p className="mt-1 text-orange-600 font-medium">
                                  ⚠️ Calving is approaching soon! Ensure close monitoring.
                                </p>
                              )}
                              {daysUntilCalving >= 30 && daysUntilCalving <= 60 && (
                                <p className="mt-1 text-green-600">
                                  ✓ Typical dry period duration (30-60 days)
                                </p>
                              )}
                              {daysUntilCalving > 60 && (
                                <p className="mt-1 text-amber-600">
                                  💡 Dry period is longer than typical (60+ days)
                                </p>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">
                    <strong>Dry Period Guidelines:</strong>
                  </p>
                  <ul className="text-xs text-gray-600 mt-2 space-y-1 ml-4 list-disc">
                    <li>Typical dry period: 60 days (about 2 months)</li>
                    <li>Allows the cow to rest and prepare for next lactation</li>
                    <li>Critical for udder health and future milk production</li>
                    <li>Monitor body condition and adjust feeding accordingly</li>
                  </ul>
                </div>
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
            disabled={loading || !formData.tag_number}
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
