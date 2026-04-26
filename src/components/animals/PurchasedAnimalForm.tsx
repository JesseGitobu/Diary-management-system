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
import { Info, Heart, Calendar, Droplets, Activity, AlertTriangle, ChevronDown, ChevronUp, Syringe, UserCheck, Baby, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { CollapsibleFormSection } from './CollapsibleFormSection'
import {
  countBasicInfoFields,
  countPurchaseInfoFields,
  countCurrentStatusFields,
  countHeiferFields,
  countServedFields,
  countLactatingFields,
  countSteamingDryCowsFields,
  countOpenDryCowsFields,
  countAdditionalInfoFields,
} from '@/lib/utils/formFieldCounters'

interface ServiceRecord {
  cycle_number: number
  service_date: string
  service_method: string
  bull_name: string
  bull_code: string
  semen_type: string
  ai_technician: string
  service_outcome: string
  steaming_date: string
  expected_calving_date: string
  actual_calving_date: string
  calving_outcome: string
  calving_time: string
  colostrum_produced: string
  days_in_milk: string
}

function emptyRecord(cycle: number): ServiceRecord {
  return {
    cycle_number: cycle,
    service_date: '',
    service_method: '',
    bull_name: '',
    bull_code: '',
    semen_type: '',
    ai_technician: '',
    service_outcome: '',
    steaming_date: '',
    expected_calving_date: '',
    actual_calving_date: '',
    calving_outcome: '',
    calving_time: '',
    colostrum_produced: '',
    days_in_milk: '',
  }
}
import { TagGenerationSection } from './TagGenerationSection'
import {
  getProductionStatusDisplay,
  getProductionStatusBadgeColor,
} from '@/lib/utils/productionStatusUtils'
import { getCustomAttributesForTag } from '@/lib/utils/animalTagAttributes'

// Coerce empty string / null / NaN → undefined so optional number fields never
// fail Zod when the HTML input is left blank (DOM value is always a string "").
const optNum = z.preprocess(
  (v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? undefined : Number(v),
  z.number().positive().optional()
)

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
  production_status: z.enum(['calf', 'heifer', 'served', 'lactating', 'steaming_dry_cows', 'open_culling_dry_cows', 'bull']).optional(),
  purchase_weight: optNum,
  weight: optNum,
  purchase_price: optNum,
  seller_info: z.string().optional(),
  notes: z.string().optional(),

  // Conditional fields
  mother_daily_production: optNum,
  mother_lactation_number: optNum,
  mother_peak_production: optNum,
  service_date: z.string().optional(),
  service_method: z.string().optional(),
  expected_calving_date: z.string().optional(),
  current_daily_production: optNum,
  days_in_milk: optNum,
  lactation_number: optNum,

  autoGenerateTag: z.boolean().optional(),
}).refine(
  (data) => {
    // ✅ Only steaming_dry_cows requires expected_calving_date (they're pregnant)
    if (data.production_status === 'steaming_dry_cows') {
      return !!data.expected_calving_date && data.expected_calving_date.trim().length > 0
    }
    return true
  },
  {
    message: 'Expected calving date is required for steaming dry cows',
    path: ['expected_calving_date'], // Show error on this field
  }
).refine(
  (data) => {
    // ✅ Breeding cycle number is REQUIRED for served, steaming_dry_cows, open_culling_dry_cows, and lactating animals
    if (data.production_status === 'served' || data.production_status === 'steaming_dry_cows' || data.production_status === 'open_culling_dry_cows' || data.production_status === 'lactating') {
      return !!data.lactation_number && data.lactation_number > 0
    }
    return true
  },
  {
    message: 'Breeding cycle number is required for animals with reproductive status',
    path: ['lactation_number'], // Show error on this field
  }
)

// Explicit type avoids the TypeScript issue that z.preprocess creates (its input
// type is `unknown`, which breaks zodResolver's generic inference).
type PurchasedAnimalFormData = {
  tag_number?: string
  name?: string
  breed: string
  gender: 'male' | 'female'
  birth_date?: string
  purchase_date: string
  health_status: 'healthy' | 'sick' | 'requires_attention' | 'quarantined'
  production_status?: 'calf' | 'heifer' | 'served' | 'lactating' | 'steaming_dry_cows' | 'open_culling_dry_cows' | 'bull'
  purchase_weight?: number
  weight?: number
  purchase_price?: number
  seller_info?: string
  notes?: string
  mother_daily_production?: number
  mother_lactation_number?: number
  mother_peak_production?: number
  service_date?: string
  service_method?: string
  expected_calving_date?: string
  current_daily_production?: number
  days_in_milk?: number
  lactation_number?: number
  autoGenerateTag?: boolean
}

interface PurchasedAnimalFormProps {
  farmId: string
  onSuccess: (animal: any) => void
  onCancel: () => void
  editingAnimal?: any  // ✅ NEW: Optional animal for edit mode
  isEditMode?: boolean  // ✅ NEW: Flag indicating edit mode
}

export function PurchasedAnimalForm({ farmId, onSuccess, onCancel, editingAnimal, isEditMode = false }: PurchasedAnimalFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productionStatus, setProductionStatus] = useState<string>('')

  // ✅ NEW: Section expansion state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([
    'basic-info',
    'purchase-info',
    'current-status',
    'additional-info'
  ]))

  // ✅ NEW: Auto-calculation states
  const [calculatedProductionStatus, setCalculatedProductionStatus] = useState<string>('')
  const [calculatingStatus, setCalculatingStatus] = useState(false)
  const [matchingCategory, setMatchingCategory] = useState<{ id: string; name: string } | null>(null)
  const [allowedStatuses, setAllowedStatuses] = useState<string[]>([])
  const [canOverrideStatus, setCanOverrideStatus] = useState(false)
  const [ageInMonths, setAgeInMonths] = useState<number>(0)

  // ✅ NEW: Breeding settings and gestation calculation states
  const [breedingSettings, setBreedingSettings] = useState<{ default_gestation: number } | null>(null)
  const [gestationPeriodError, setGestationPeriodError] = useState<string | null>(null)

  // Service records — one entry per breeding cycle
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([])
  const [expandedCycles, setExpandedCycles] = useState<Set<number>>(new Set())

  // ✅ NEW: Production-status-specific state
  const [currentMilkProduction, setCurrentMilkProduction] = useState<number | ''>('')
  const [currentLactationNumber, setCurrentLactationNumber] = useState<number | ''>('')
  const [breedingCycleNumber, setBreedingCycleNumber] = useState<number | ''>('')
  const [lastBreedingCycleNumber, setLastBreedingCycleNumber] = useState<number | ''>('')

  const form = useForm<PurchasedAnimalFormData>({
    resolver: zodResolver(purchasedAnimalSchema)  as any,
    defaultValues: isEditMode && editingAnimal ? {
      tag_number: editingAnimal.tag_number || '',
      name: editingAnimal.name || '',
      breed: editingAnimal.breed || 'holstein',
      gender: editingAnimal.gender || 'female',
      health_status: editingAnimal.health_status || 'healthy',
      production_status: editingAnimal.production_status || undefined,
      purchase_date: editingAnimal.purchase_date || new Date().toISOString().split('T')[0],
      birth_date: editingAnimal.birth_date || '',
      purchase_weight: editingAnimal.purchase_weight || undefined,
      weight: editingAnimal.weight || undefined,
      purchase_price: editingAnimal.purchase_price || undefined,
      seller_info: editingAnimal.seller_info || '',
      notes: editingAnimal.notes || '',
      mother_daily_production: editingAnimal.mother_daily_production || undefined,
      mother_lactation_number: editingAnimal.mother_lactation_number || undefined,
      mother_peak_production: editingAnimal.mother_peak_production || undefined,
      service_date: editingAnimal.service_date || '',
      service_method: editingAnimal.service_method || '',
      expected_calving_date: editingAnimal.expected_calving_date || '',
      current_daily_production: editingAnimal.current_daily_production || undefined,
      days_in_milk: editingAnimal.days_in_milk || undefined,
      lactation_number: editingAnimal.lactation_number || undefined,
      autoGenerateTag: false,
    } : {
      tag_number: '',
      name: '',
      breed: 'holstein',
      gender: 'female',
      health_status: 'healthy',
      production_status: undefined,
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

  // ✅ NEW: Pre-populate production-specific state variables from editingAnimal when in edit mode
  useEffect(() => {
    if (isEditMode && editingAnimal) {
      const status = editingAnimal.production_status || 'calf'

      // Pre-populate production-specific fields based on status
      if (status === 'lactating' || status === 'served' || status === 'steaming_dry_cows') {
        if (editingAnimal.current_daily_production !== null && editingAnimal.current_daily_production !== undefined) {
          setCurrentMilkProduction(editingAnimal.current_daily_production)
        }
        if (editingAnimal.lactation_number !== null && editingAnimal.lactation_number !== undefined) {
          setCurrentLactationNumber(editingAnimal.lactation_number)
        }
      }

      if (status === 'served' || status === 'steaming_dry_cows') {
        if (editingAnimal.lactation_number !== null && editingAnimal.lactation_number !== undefined) {
          setBreedingCycleNumber(editingAnimal.lactation_number)
        }
      }

      if (status === 'open_culling_dry_cows') {
        if (editingAnimal.lactation_number !== null && editingAnimal.lactation_number !== undefined) {
          setLastBreedingCycleNumber(editingAnimal.lactation_number)
        }
      }

      // Pre-populate service records if available
      if (editingAnimal.service_records && Array.isArray(editingAnimal.service_records)) {
        setServiceRecords(editingAnimal.service_records)
        if (editingAnimal.service_records.length > 0) {
          setExpandedCycles(new Set([editingAnimal.service_records.length]))
        }
      }
    }
  }, [isEditMode, editingAnimal])

  // ✅ NEW: Utility function to add days to a date (maintains realistic years, timezone-safe)
  const addDaysToDate = (dateStr: string, days: number): string => {
    if (!dateStr) return ''
    // Parse YYYY-MM-DD string into local time components (avoiding UTC conversion)
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    date.setDate(date.getDate() + days)
    // Format back to YYYY-MM-DD in local time
    const resultYear = date.getFullYear()
    const resultMonth = String(date.getMonth() + 1).padStart(2, '0')
    const resultDay = String(date.getDate()).padStart(2, '0')
    return `${resultYear}-${resultMonth}-${resultDay}`
  }

  // ✅ NEW: Utility function to subtract days from a date (maintains realistic years, timezone-safe)
  const subtractDaysFromDate = (dateStr: string, days: number): string => {
    if (!dateStr) return ''
    // Parse YYYY-MM-DD string into local time components (avoiding UTC conversion)
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    date.setDate(date.getDate() - days)
    // Format back to YYYY-MM-DD in local time
    const resultYear = date.getFullYear()
    const resultMonth = String(date.getMonth() + 1).padStart(2, '0')
    const resultDay = String(date.getDate()).padStart(2, '0')
    return `${resultYear}-${resultMonth}-${resultDay}`
  }

  // ✅ NEW: Utility function to safely parse YYYY-MM-DD string to local Date for display (timezone-safe)
  const parseLocalDate = (dateStr: string): Date => {
    if (!dateStr) return new Date()
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // ✅ NEW: Utility function to format a local date string to display format
  const formatDateDisplay = (dateStr: string, format?: Intl.DateTimeFormatOptions): string => {
    if (!dateStr) return ''
    const date = parseLocalDate(dateStr)
    const defaultFormat: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
    return date.toLocaleDateString('en-US', format || defaultFormat)
  }

  // ✅ NEW: Fetch breeding settings on mount
  useEffect(() => {
    const fetchBreedingSettings = async () => {
      try {
        const response = await fetch(`/api/breeding-settings?farm_id=${farmId}`)
        if (response.ok) {
          const data = await response.json()
          // Access the default_gestation field from the response
          const gestationPeriod = data.default_gestation || 280
          setBreedingSettings({ default_gestation: gestationPeriod })
          console.log('✅ [Form] Breeding settings fetched:', { default_gestation: gestationPeriod })
        } else {
          console.warn('⚠️ [Form] Failed to fetch breeding settings, using default gestation: 280')
          setBreedingSettings({ default_gestation: 280 })
        }
      } catch (error) {
        console.error('❌ [Form] Error fetching breeding settings:', error)
        setBreedingSettings({ default_gestation: 280 })
      }
    }

    if (farmId) {
      fetchBreedingSettings()
    }
  }, [farmId])

  // ✅ NEW: Initialize production status from editingAnimal value in edit mode
  useEffect(() => {
    if (isEditMode && editingAnimal?.production_status) {
      setProductionStatus(editingAnimal.production_status)
    }
  }, [isEditMode, editingAnimal?.production_status])

  // ✅ NEW: Auto-calculate expected_calving_date when service_date changes (for 'served' animals)
  useEffect(() => {
    const subscription = form.watch((data) => {
      const serviceDate = data.service_date
      const currentCalvingDate = data.expected_calving_date
      const status = data.production_status

      if (status === 'served' && serviceDate && breedingSettings) {
        const calculatedCalvingDate = addDaysToDate(serviceDate, breedingSettings.default_gestation)
        
        // Only auto-fill if the expected_calving_date is empty
        if (!currentCalvingDate || currentCalvingDate.trim() === '') {
          form.setValue('expected_calving_date', calculatedCalvingDate, {
            shouldValidate: false,
            shouldDirty: true
          })
          console.log('✅ [Form] Auto-calculated calving date from service date:', {
            serviceDate,
            gestationDays: breedingSettings.default_gestation,
            calculatedCalvingDate
          })
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [breedingSettings, form])

  // ✅ NEW: Auto-calculate service_date when expected_calving_date changes (for 'served' animals)
  useEffect(() => {
    const subscription = form.watch((data) => {
      const expectedCalvingDate = data.expected_calving_date
      const currentServiceDate = data.service_date
      const status = data.production_status

      if (status === 'served' && expectedCalvingDate && breedingSettings) {
        const calculatedServiceDate = subtractDaysFromDate(expectedCalvingDate, breedingSettings.default_gestation)
        
        // Only auto-fill if the service_date is empty
        if (!currentServiceDate || currentServiceDate.trim() === '') {
          form.setValue('service_date', calculatedServiceDate, {
            shouldValidate: false,
            shouldDirty: true
          })
          console.log('✅ [Form] Auto-calculated service date from calving date:', {
            expectedCalvingDate,
            gestationDays: breedingSettings.default_gestation,
            calculatedServiceDate
          })
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [breedingSettings, form])

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
              allowed.push('heifer', 'served', 'lactating', 'steaming_dry_cows', 'open_culling_dry_cows')
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
    if (productionStatusValue !== 'heifer') {
      form.setValue('mother_daily_production', undefined)
      form.setValue('mother_lactation_number', undefined)
      form.setValue('mother_peak_production', undefined)
    }
    
    // Reset production-status-specific state
    setCurrentMilkProduction('')
    setCurrentLactationNumber('')
    setBreedingCycleNumber('')
    setLastBreedingCycleNumber('')
    
    // Clear old conditional fields
    if (productionStatusValue !== 'served' && productionStatusValue !== 'steaming_dry_cows' && productionStatusValue !== 'open_culling_dry_cows') {
      form.setValue('service_date', '')
      form.setValue('service_method', '')
      form.setValue('expected_calving_date', '')
    }
    
    if (productionStatusValue !== 'lactating') {
      form.setValue('current_daily_production', undefined)
      form.setValue('days_in_milk', undefined)
    }
    
    // ✅ NEW: Reset lactation_number only if not needed
    if (productionStatusValue !== 'lactating' && productionStatusValue !== 'served' && productionStatusValue !== 'steaming_dry_cows' && productionStatusValue !== 'open_culling_dry_cows') {
      form.setValue('lactation_number', undefined)
    }
    
    console.log('✅ [Form] Cleared conditional fields for:', productionStatusValue)
  }
}, [productionStatusValue, productionStatus, form])

  // Sync service records array length to lactation_number for relevant statuses
  useEffect(() => {
    const status = form.watch('production_status')
    const cycleCount = form.watch('lactation_number')
    const needsRecords = status === 'lactating' || status === 'served' || status === 'steaming_dry_cows'

    if (!needsRecords || !cycleCount || cycleCount < 1) {
      setServiceRecords([])
      setExpandedCycles(new Set())
      return
    }

    setServiceRecords(prev => {
      const next: ServiceRecord[] = []
      for (let i = 1; i <= cycleCount; i++) {
        next.push(prev.find(r => r.cycle_number === i) ?? emptyRecord(i))
      }
      return next
    })

    // Auto-expand the current (last) cycle
    setExpandedCycles(new Set([cycleCount]))
  }, [form.watch('lactation_number'), form.watch('production_status')])

  // ✅ NEW: Sync service records based on production-status-specific state variables
  useEffect(() => {
    const status = productionStatus
    let cycleCount = 0

    // Determine cycle count based on status and its corresponding state variable
    if (status === 'lactating' && currentLactationNumber !== '') {
      cycleCount = typeof currentLactationNumber === 'number' && currentLactationNumber >= 1 ? currentLactationNumber : 0
    } else if (status === 'served' && currentLactationNumber !== '') {
      cycleCount = typeof currentLactationNumber === 'number' && currentLactationNumber >= 1 ? currentLactationNumber : 0
    } else if (status === 'steaming_dry_cows' && breedingCycleNumber !== '') {
      cycleCount = typeof breedingCycleNumber === 'number' && breedingCycleNumber >= 1 ? breedingCycleNumber : 0
    }

    // If no cycle count, clear service records
    if (!cycleCount || cycleCount < 1) {
      setServiceRecords([])
      setExpandedCycles(new Set())
      return
    }

    // Generate service records based on cycle count
    setServiceRecords(prev => {
      const next: ServiceRecord[] = []
      for (let i = 1; i <= cycleCount; i++) {
        next.push(prev.find(r => r.cycle_number === i) ?? emptyRecord(i))
      }
      return next
    })

    // Auto-expand the current (last) cycle
    setExpandedCycles(new Set([cycleCount]))
  }, [productionStatus, currentLactationNumber, breedingCycleNumber])

  const updateRecord = (cycle: number, field: keyof ServiceRecord, value: string) => {
    setServiceRecords(prev =>
      prev.map(r => r.cycle_number === cycle ? { ...r, [field]: value } : r)
    )
  }

  const toggleCycle = (cycle: number) => {
    setExpandedCycles(prev => {
      const next = new Set(prev)
      next.has(cycle) ? next.delete(cycle) : next.add(cycle)
      return next
    })
  }

  const handleTagChange = (tagNumber: string, autoGenerate: boolean) => {
    form.setValue('tag_number', tagNumber, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    })
    form.setValue('autoGenerateTag', autoGenerate)
    form.clearErrors('tag_number')
  }

  const getCustomAttributesForTagData = () => {
    return getCustomAttributesForTag({
      breed: formData.breed,
      gender: formData.gender,
      source: 'purchased',
      productionStatus: productionStatus || calculatedProductionStatus,
      purchaseDate: formData.purchase_date,
      healthStatus: formData.health_status,
      sellerInfo: formData.seller_info,
    })
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

    // ✅ Validation: Only steaming_dry_cows require expected_calving_date (they're pregnant)
    if (finalProductionStatus === 'steaming_dry_cows' && !data.expected_calving_date) {
      setError('Expected calving date is required for steaming dry cows.')
      form.setError('expected_calving_date', {
        type: 'manual',
        message: 'Expected calving date is required for steaming dry cows'
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      // ✅ UPDATED: Build production-specific fields from state variables
      const productionSpecificData: any = {}

      if (finalProductionStatus === 'heifer') {
        if (data.mother_daily_production || data.mother_lactation_number || data.mother_peak_production) {
          productionSpecificData.mother_production_info = {
            daily_production: data.mother_daily_production,
            lactation_number: data.mother_lactation_number,
            peak_production: data.mother_peak_production,
          }
        }
      } else if (finalProductionStatus === 'served') {
        // ✅ UPDATED: Use state variables for served animals
        if (currentMilkProduction !== '') {
          productionSpecificData.current_daily_production = currentMilkProduction
        }
        if (currentLactationNumber !== '') {
          productionSpecificData.lactation_number = currentLactationNumber
        }
      } else if (finalProductionStatus === 'lactating') {
        // ✅ UPDATED: Use state variables for lactating animals
        if (currentMilkProduction !== '') {
          productionSpecificData.current_daily_production = currentMilkProduction
        }
        if (currentLactationNumber !== '') {
          productionSpecificData.lactation_number = currentLactationNumber
        }
      } else if (finalProductionStatus === 'steaming_dry_cows') {
        // ✅ UPDATED: Use state variable for steaming dry animals
        if (data.expected_calving_date) {
          productionSpecificData.expected_calving_date = data.expected_calving_date
        }
        if (breedingCycleNumber !== '') {
          productionSpecificData.lactation_number = breedingCycleNumber
        }
      } else if (finalProductionStatus === 'open_culling_dry_cows') {
        // ✅ UPDATED: Use state variable for open dry animals
        if (lastBreedingCycleNumber !== '') {
          productionSpecificData.lactation_number = lastBreedingCycleNumber
        }
      }

      // ✅ Build request data with production-specific fields
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
        ...productionSpecificData,
        service_records: serviceRecords.length > 0 ? serviceRecords : undefined,
        farm_id: farmId,
        animal_source: 'purchased_animal',
        production_status: finalProductionStatus,
        status: 'active',
        autoGenerateTag: data.autoGenerateTag,
      }

      console.log('📤 [Form] Final request data:', requestData)
      console.log('📤 [Form] Production status in request:', requestData.production_status)

      // ✅ NEW: Use PUT for edit mode, POST for add mode
      const method = isEditMode ? 'PUT' : 'POST'
      const url = isEditMode ? `/api/animals/${editingAnimal.id}` : '/api/animals'

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
      })

      const result = await response.json()
      console.log('📥 [Form] API Response:', result)

      if (!response.ok) {
        throw new Error(result.error || (isEditMode ? 'Failed to update purchased animal' : 'Failed to add purchased animal'))
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
        <h3 className="text-lg font-semibold text-gray-900">{isEditMode ? 'Edit Animal' : 'Purchased Animal Registration'}</h3>
        <p className="text-sm text-gray-600">{isEditMode ? 'Update animal information' : 'Register an animal acquired from another source'}</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={form.handleSubmit(handleSubmit, (zodErrors) => {
          console.group('❌ [Form] Zod validation FAILED — handleSubmit blocked')
          console.log('Zod errors:', JSON.stringify(zodErrors, null, 2))
          console.log('Current form values:', form.getValues())
          console.groupEnd()
        })}
        className="space-y-6"
        noValidate
      >
        <TagGenerationSection
          farmId={farmId}
          formData={formData}
          onTagChange={handleTagChange}
          customAttributes={getCustomAttributesForTagData()}
          animalSource="purchased_animal"  // ✅ NEW: Specify animal source
        />

        {/* Basic Information */}
        <CollapsibleFormSection
          title="Basic Information"
          icon={<Heart className="h-4 w-4" />}
          filledFieldCount={countBasicInfoFields(formData).filled}
          totalFieldCount={countBasicInfoFields(formData).total}
          isRequired={true}
          defaultExpanded={expandedSections.has('basic-info')}
        >
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
                  <SelectValue>
                    {(() => {
                      const breedMap: Record<string, string> = {
                        'holstein': 'Holstein-Friesian',
                        'jersey': 'Jersey',
                        'guernsey': 'Guernsey',
                        'ayrshire': 'Ayrshire',
                        'brown_swiss': 'Brown Swiss',
                        'crossbred': 'Crossbred',
                        'other': 'Other',
                      }
                      const selectedBreed = form.watch('breed')
                      return breedMap[selectedBreed] || 'Select breed'
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holstein">Holstein-Friesian</SelectItem>
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
                  <SelectValue placeholder="Select gender">
                    {(() => {
                      const genderMap: Record<string, string> = {
                        female: 'Female',
                        male: 'Male',
                      }
                      const selectedGender = form.watch('gender')
                      return genderMap[selectedGender] || 'Select gender'
                    })()}
                  </SelectValue>
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
        </CollapsibleFormSection>

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
        <CollapsibleFormSection
          title="Purchase Information"
          icon={<Calendar className="h-4 w-4" />}
          filledFieldCount={countPurchaseInfoFields(formData).filled}
          totalFieldCount={countPurchaseInfoFields(formData).total}
          isRequired={true}
          defaultExpanded={expandedSections.has('purchase-info')}
        >
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
                {...form.register('purchase_weight', { setValueAs: (v: string) => v === '' || v === null || v === undefined ? undefined : parseFloat(v) })}
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
                {...form.register('weight', { setValueAs: (v: string) => v === '' || v === null || v === undefined ? undefined : parseFloat(v) })}
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
              {...form.register('purchase_price', { setValueAs: (v: string) => v === '' || v === null || v === undefined ? undefined : parseFloat(v) })}
              placeholder="e.g., 1500.00"
            />
          </div>
        </CollapsibleFormSection>

        {/* Status Information */}
        <CollapsibleFormSection
          title="Current Status"
          icon={<Activity className="h-4 w-4" />}
          filledFieldCount={countCurrentStatusFields(formData).filled}
          totalFieldCount={countCurrentStatusFields(formData).total}
          isRequired={true}
          defaultExpanded={expandedSections.has('current-status')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="health_status">Health Status *</Label>
              <Select
                value={form.watch('health_status')}
                onValueChange={(value) => form.setValue('health_status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select health status">
                    {(() => {
                      const healthMap: Record<string, string> = {
                        healthy: 'Healthy',
                        sick: 'Sick',
                        requires_attention: 'Requires Attention',
                        quarantined: 'Quarantined',
                      }
                      const selectedHealth = form.watch('health_status')
                      return healthMap[selectedHealth] || 'Select health status'
                    })()}
                  </SelectValue>
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
                      <SelectValue placeholder="Select production status">
                        {(() => {
                          const status = form.watch('production_status') || calculatedProductionStatus
                          return status ? getProductionStatusDisplay(status, formData.gender) : 'Select production status'
                        })()}
                      </SelectValue>
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
        </CollapsibleFormSection>

        {/* Conditional Fields Based on Production Status */}
        {productionStatus === 'heifer' && (
          <CollapsibleFormSection
            title="Heifer Information - Mother's Production"
            icon={<Heart className="h-4 w-4" />}
            filledFieldCount={countHeiferFields(formData).filled}
            totalFieldCount={countHeiferFields(formData).total}
            isRequired={false}
            defaultExpanded={expandedSections.has('heifer')}
          >
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
                  {...form.register('mother_daily_production', { setValueAs: (v: string) => v === '' || v === null || v === undefined ? undefined : parseFloat(v) })}
                  placeholder="e.g., 25.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mother_lactation_number">Mother's Lactation Number</Label>
                <Input
                  id="mother_lactation_number"
                  type="number"
                  min="1"
                  {...form.register('mother_lactation_number', { setValueAs: (v: string) => v === '' || v === null || v === undefined ? undefined : parseFloat(v) })}
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
                  {...form.register('mother_peak_production', { setValueAs: (v: string) => v === '' || v === null || v === undefined ? undefined : parseFloat(v) })}
                  placeholder="e.g., 45.0"
                />
              </div>
            </div>
          </CollapsibleFormSection>
        )}

        {/* ✅ UPDATED: Served Status - Shows Milk Production + Lactation Number */}
        {productionStatus === 'served' && (
          <CollapsibleFormSection
            title="Production & Reproductive Status (Served)"
            icon={<Calendar className="h-4 w-4" />}
            filledFieldCount={countServedFields(formData, currentMilkProduction, currentLactationNumber).filled}
            totalFieldCount={countServedFields(formData, currentMilkProduction, currentLactationNumber).total}
            isRequired={true}
            defaultExpanded={expandedSections.has('served')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">
                  Current Milk Production (L/day) <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">(Avg last 7 days)</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g. 25.5"
                  className="bg-white"
                  value={currentMilkProduction}
                  onChange={e => {
                    const v = e.target.value === '' ? '' : parseFloat(e.target.value)
                    setCurrentMilkProduction(isNaN(v as number) ? '' : v)
                  }}
                />
                <p className="text-xs text-gray-500">
                  Average daily milk production over the last 7 days in liters
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">
                  Current Lactation Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 1, 2, 3 …"
                  className="bg-white"
                  value={currentLactationNumber}
                  onChange={e => {
                    const v = e.target.value === '' ? '' : parseInt(e.target.value, 10)
                    const num = isNaN(v as number) ? '' : v as number
                    setCurrentLactationNumber(num)
                    form.setValue('lactation_number', num === '' ? undefined : num, { shouldValidate: true })
                  }}
                />
                <p className="text-xs text-gray-500">
                  Which lactation cycle is this animal currently in? (1st, 2nd, 3rd, etc.)
                </p>
              </div>
            </div>

            {(currentMilkProduction === '' || currentLactationNumber === '') && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                Enter both milk production and lactation number to unlock service record entry below.
              </div>
            )}
            {form.formState.errors.lactation_number && (
              <p className="text-sm text-red-600 mt-2">{form.formState.errors.lactation_number.message}</p>
            )}
          </CollapsibleFormSection>
        )}

        {/* ✅ UPDATED: Lactating Status - Shows Milk Production + Lactation Number */}
        {productionStatus === 'lactating' && (
          <CollapsibleFormSection
            title="Production & Reproductive Status (Lactating)"
            icon={<Droplets className="h-4 w-4" />}
            filledFieldCount={countLactatingFields(formData, currentMilkProduction, currentLactationNumber).filled}
            totalFieldCount={countLactatingFields(formData, currentMilkProduction, currentLactationNumber).total}
            isRequired={true}
            defaultExpanded={expandedSections.has('lactating')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">
                  Current Milk Production (L/day) <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">(Avg last 7 days)</span>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g. 25.5"
                  className="bg-white"
                  value={currentMilkProduction}
                  onChange={e => {
                    const v = e.target.value === '' ? '' : parseFloat(e.target.value)
                    setCurrentMilkProduction(isNaN(v as number) ? '' : v)
                  }}
                />
                <p className="text-xs text-gray-500">
                  Average daily milk production over the last 7 days in liters
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">
                  Current Lactation Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 1, 2, 3 …"
                  className="bg-white"
                  value={currentLactationNumber}
                  onChange={e => {
                    const v = e.target.value === '' ? '' : parseInt(e.target.value, 10)
                    const num = isNaN(v as number) ? '' : v as number
                    setCurrentLactationNumber(num)
                    form.setValue('lactation_number', num === '' ? undefined : num, { shouldValidate: true })
                  }}
                />
                <p className="text-xs text-gray-500">
                  Which lactation cycle is this animal currently in? (1st, 2nd, 3rd, etc.)
                </p>
              </div>
            </div>

            {(currentMilkProduction === '' || currentLactationNumber === '') && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                Enter both milk production and lactation number to unlock service record entry below.
              </div>
            )}
            {form.formState.errors.lactation_number && (
              <p className="text-sm text-red-600 mt-2">{form.formState.errors.lactation_number.message}</p>
            )}
          </CollapsibleFormSection>
        )}

        {/* ✅ UPDATED: Steaming Dry Status - Shows Current Breeding Cycle Number */}
        {productionStatus === 'steaming_dry_cows' && (
          <CollapsibleFormSection
            title="Production & Reproductive Status (Steaming Dry)"
            icon={<Calendar className="h-4 w-4" />}
            filledFieldCount={countSteamingDryCowsFields(formData, breedingCycleNumber).filled}
            totalFieldCount={countSteamingDryCowsFields(formData, breedingCycleNumber).total}
            isRequired={true}
            defaultExpanded={expandedSections.has('steaming-dry')}
          >
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">
                Current Breeding Cycle Number <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 1, 2, 3 …"
                className="bg-white"
                value={breedingCycleNumber}
                onChange={e => {
                  const v = e.target.value === '' ? '' : parseInt(e.target.value, 10)
                  const num = isNaN(v as number) ? '' : v as number
                  setBreedingCycleNumber(num)
                  form.setValue('lactation_number', num === '' ? undefined : num, { shouldValidate: true })
                }}
              />
              <p className="text-xs text-gray-500">
                Which breeding cycle number is this animal currently in the dry period of?
              </p>
            </div>

            {breedingCycleNumber === '' && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                Enter the current breeding cycle number to unlock service record entry below.
              </div>
            )}
            {form.formState.errors.lactation_number && (
              <p className="text-sm text-red-600 mt-2">{form.formState.errors.lactation_number.message}</p>
            )}
          </CollapsibleFormSection>
        )}

        {/* ✅ UPDATED: Open/Dry Status - Shows Last Breeding Cycle Number */}
        {productionStatus === 'open_culling_dry_cows' && (
          <CollapsibleFormSection
            title="Production & Reproductive Status (Open Dry)"
            icon={<Activity className="h-4 w-4" />}
            filledFieldCount={countOpenDryCowsFields(formData, lastBreedingCycleNumber).filled}
            totalFieldCount={countOpenDryCowsFields(formData, lastBreedingCycleNumber).total}
            isRequired={true}
            defaultExpanded={expandedSections.has('open-dry')}
          >
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">
                Last Breeding Cycle Number <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 1, 2, 3 …"
                className="bg-white"
                value={lastBreedingCycleNumber}
                onChange={e => {
                  const v = e.target.value === '' ? '' : parseInt(e.target.value, 10)
                  const num = isNaN(v as number) ? '' : v as number
                  setLastBreedingCycleNumber(num)
                  form.setValue('lactation_number', num === '' ? undefined : num, { shouldValidate: true })
                }}
              />
              <p className="text-xs text-gray-500">
                What was the last breeding cycle number this open animal completed?
              </p>
            {form.formState.errors.lactation_number && (
              <p className="text-sm text-red-600 mt-2">{form.formState.errors.lactation_number.message}</p>
            )}
            </div>

            {/* Additional context for open dry cows */}
            <div className="mt-4 space-y-4">

              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-800 font-medium">
                  📋 Open Dry Cow Status Explained:
                </p>
                <ul className="text-xs text-gray-700 mt-2 space-y-1 ml-4 list-disc">
                  <li><strong>Not Pregnant:</strong> This animal has not been successfully serviced or is between breeding cycles</li>
                  <li><strong>Available for Breeding:</strong> Can be serviced when ready</li>
                  <li><strong>Dry Period:</strong> Not currently producing milk</li>
                  <li><strong>No Expected Calving Date:</strong> Because the animal is not pregnant</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                <p className="text-sm text-blue-800 font-medium">
                  💡 Next Steps for Open Dry Cows:
                </p>
                <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-4 list-disc">
                  <li>Health check and body condition scoring</li>
                  <li>Plan breeding/service schedule</li>
                  <li>If culling candidate: Define reason (low production, age, health, genetics)</li>
                  <li>If holding for breeding: Monitor for estrus signs</li>
                  <li>Note any special requirements in farm notes</li>
                </ul>
              </div>
            </div>
          </CollapsibleFormSection>
        )}

        {/* ── Service / Calving History (per breeding cycle) ── */}
        {serviceRecords.length > 0 && (
          <div className="space-y-3">
            <div className="border-b pb-2 flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900 flex items-center gap-2">
                <Syringe className="h-4 w-4 text-purple-600" />
                Service &amp; Calving Records
                <span className="text-xs font-normal text-gray-500">
                  ({serviceRecords.length} cycle{serviceRecords.length > 1 ? 's' : ''})
                </span>
              </h4>
              <span className="text-xs text-gray-400">
                Fill in details for each breeding cycle
              </span>
            </div>

            {serviceRecords.map(record => {
              // Only 'served' and 'steaming_dry_cows' have a current cycle (the last one)
              // Lactating animals treat all cycles as previous
              const productionHasCurrentCycle = productionStatus === 'served' || productionStatus === 'steaming_dry_cows'
              const isCurrent = productionHasCurrentCycle && record.cycle_number === serviceRecords.length
              const isExpanded = expandedCycles.has(record.cycle_number)
              const isPrevious = !isCurrent

              return (
                <div
                  key={record.cycle_number}
                  className={`border rounded-lg overflow-hidden ${
                    isCurrent ? 'border-purple-300 shadow-sm' : 'border-gray-200'
                  }`}
                >
                  {/* Cycle header */}
                  <button
                    type="button"
                    onClick={() => toggleCycle(record.cycle_number)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                      isCurrent ? 'bg-purple-50 hover:bg-purple-100' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isCurrent ? 'text-purple-800' : 'text-gray-700'}`}>
                        Cycle {record.cycle_number}
                      </span>
                      {isCurrent ? (
                        <Badge className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5">Current</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5">Previous</Badge>
                      )}
                      {record.service_date && (
                        <span className="text-xs text-gray-500">
                          Serviced: {record.service_date}
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </button>

                  {/* Cycle body */}
                  {isExpanded && (
                    <div className="p-4 space-y-5">
                      {/* Service Details */}
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                          <Syringe className="h-3 w-3" /> Service Details
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Service Date</Label>
                            <Input
                              type="date"
                              value={record.service_date}
                              onChange={e => updateRecord(record.cycle_number, 'service_date', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Service Method</Label>
                            <select
                              value={record.service_method}
                              onChange={e => updateRecord(record.cycle_number, 'service_method', e.target.value)}
                              className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
                            >
                              <option value="">Select method</option>
                              <option value="artificial_insemination">Artificial Insemination (AI)</option>
                              <option value="natural_breeding">Natural Breeding</option>
                              <option value="embryo_transfer">Embryo Transfer</option>
                              <option value="unknown">Unknown</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Bull / Semen Name</Label>
                            <Input
                              placeholder="e.g., Badger-Bluff Farm Fanny"
                              value={record.bull_name}
                              onChange={e => updateRecord(record.cycle_number, 'bull_name', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Bull / Semen Code</Label>
                            <Input
                              placeholder="e.g., 1HO09356"
                              value={record.bull_code}
                              onChange={e => updateRecord(record.cycle_number, 'bull_code', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Type of Semen</Label>
                            <select
                              value={record.semen_type}
                              onChange={e => updateRecord(record.cycle_number, 'semen_type', e.target.value)}
                              className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
                            >
                              <option value="">Select type</option>
                              <option value="conventional">Conventional</option>
                              <option value="sexed_female">Sexed — Female</option>
                              <option value="sexed_male">Sexed — Male</option>
                              <option value="natural">Natural Service</option>
                              <option value="unknown">Unknown</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1">
                              <UserCheck className="h-3 w-3" /> AI Technician
                            </Label>
                            <Input
                              placeholder="Technician name"
                              value={record.ai_technician}
                              onChange={e => updateRecord(record.cycle_number, 'ai_technician', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Service Outcome */}
                        <div className="space-y-1">
                          <Label className="text-xs">Outcome of Service</Label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: 'confirmed_pregnant', label: 'Confirmed Pregnant', icon: <CheckCircle2 className="h-3 w-3" />, color: 'green' },
                              { value: 'not_pregnant', label: 'Not Pregnant', icon: <XCircle className="h-3 w-3" />, color: 'red' },
                              { value: 'pending', label: 'Pending Check', icon: <Clock className="h-3 w-3" />, color: 'yellow' },
                              { value: 'unknown', label: 'Unknown', icon: null, color: 'gray' },
                            ].map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateRecord(record.cycle_number, 'service_outcome', opt.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
                                  record.service_outcome === opt.value
                                    ? opt.color === 'green' ? 'bg-green-100 border-green-400 text-green-800'
                                    : opt.color === 'red' ? 'bg-red-100 border-red-400 text-red-800'
                                    : opt.color === 'yellow' ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                                    : 'bg-gray-200 border-gray-400 text-gray-800'
                                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                                }`}
                              >
                                {opt.icon}
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="space-y-3 border-t pt-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Dates
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Steaming Date</Label>
                            <Input
                              type="date"
                              value={record.steaming_date}
                              onChange={e => updateRecord(record.cycle_number, 'steaming_date', e.target.value)}
                            />
                            <p className="text-xs text-gray-400">When dry-off began</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Expected Calving Date</Label>
                            <Input
                              type="date"
                              value={record.expected_calving_date}
                              onChange={e => updateRecord(record.cycle_number, 'expected_calving_date', e.target.value)}
                            />
                          </div>
                          {isPrevious && (
                            <div className="space-y-1">
                              <Label className="text-xs">Actual Calving Date</Label>
                              <Input
                                type="date"
                                value={record.actual_calving_date}
                                onChange={e => updateRecord(record.cycle_number, 'actual_calving_date', e.target.value)}
                              />
                            </div>
                          )}
                          {isPrevious && (
                            <div className="space-y-1">
                              <Label className="text-xs flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Calving Time
                              </Label>
                              <Input
                                type="time"
                                value={record.calving_time}
                                onChange={e => updateRecord(record.cycle_number, 'calving_time', e.target.value)}
                              />
                              <p className="text-xs text-gray-400">Time calf was born</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Calving outcome — only for completed cycles */}
                      {isPrevious && (
                        <div className="space-y-3 border-t pt-4">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                            <Baby className="h-3 w-3" /> Calving Outcome &amp; Difficulty
                          </p>
                          <div className="space-y-1">
                            <Label className="text-xs">Calving Difficulty</Label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { value: 'easy', label: 'Easy - No issues, quick delivery', color: 'green' },
                                { value: 'normal', label: 'Normal - Standard delivery', color: 'blue' },
                                { value: 'difficult', label: 'Difficult - Hard but unassisted', color: 'yellow' },
                                { value: 'assisted', label: 'Assisted - Required human help', color: 'orange' },
                                { value: 'cesarean', label: 'Cesarean - Surgical delivery', color: 'red' },
                                { value: 'aborted', label: 'Aborted - Pregnancy terminated', color: 'purple' },
                              ].map(opt => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => updateRecord(record.cycle_number, 'calving_outcome', opt.value)}
                                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                                    record.calving_outcome === opt.value
                                      ? opt.color === 'green' ? 'bg-green-100 border-green-400 text-green-800'
                                      : opt.color === 'blue' ? 'bg-blue-100 border-blue-400 text-blue-800'
                                      : opt.color === 'yellow' ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                                      : opt.color === 'orange' ? 'bg-orange-100 border-orange-400 text-orange-800'
                                      : opt.color === 'red' ? 'bg-red-100 border-red-400 text-red-800'
                                      : 'bg-purple-100 border-purple-400 text-purple-800'
                                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs flex items-center gap-1">
                                <Droplets className="h-3 w-3 text-blue-500" /> Colostrum Produced (L)
                              </Label>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="e.g., 6.5"
                                value={record.colostrum_produced}
                                onChange={e => updateRecord(record.cycle_number, 'colostrum_produced', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Days in Milk (this cycle)</Label>
                              <Input
                                type="number"
                                min="0"
                                placeholder="e.g., 305"
                                value={record.days_in_milk}
                                onChange={e => updateRecord(record.cycle_number, 'days_in_milk', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Days in milk for current cycle */}
                      {isCurrent && (
                        <div className="space-y-1 border-t pt-4">
                          <Label className="text-xs">Days in Milk (current)</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="e.g., 120"
                            value={record.days_in_milk}
                            onChange={e => updateRecord(record.cycle_number, 'days_in_milk', e.target.value)}
                          />
                          <p className="text-xs text-gray-400">Days milking since last calving</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Additional Information */}
        <CollapsibleFormSection
          title="Additional Information"
          icon={<Info className="h-4 w-4" />}
          filledFieldCount={countAdditionalInfoFields(formData).filled}
          totalFieldCount={countAdditionalInfoFields(formData).total}
          isRequired={false}
          defaultExpanded={expandedSections.has('additional-info')}
        >
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
        </CollapsibleFormSection>

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
            onClick={() => {
              console.group('🖱️ [Form] Add Animal clicked')
              console.log('tag_number:', formData.tag_number || '(empty — button should be disabled)')
              console.log('loading:', loading)
              console.log('disabled:', loading || !formData.tag_number)
              console.log('form values:', form.getValues())
              console.log('form errors (current):', form.formState.errors)
              console.log('isDirty:', form.formState.isDirty)
              console.log('isValid:', form.formState.isValid)
              console.groupEnd()
            }}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {isEditMode ? 'Updating Animal...' : 'Adding Animal...'}
              </>
            ) : (
              isEditMode ? 'Update Animal' : 'Add Animal'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
