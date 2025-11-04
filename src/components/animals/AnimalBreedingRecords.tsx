'use client'

import { useState, useEffect } from 'react'
import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import {
  Plus,
  Calendar,
  Heart,
  Baby,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Edit,
  Activity,
  AlertTriangle,
  XCircle,
  Info,
  Sparkles
} from 'lucide-react'
import { format, differenceInDays, addDays, parseISO, differenceInMonths } from 'date-fns'

interface BreedingRecord {
  id: string
  animal_id: string
  breeding_date: string
  breeding_method: 'natural' | 'artificial_insemination'
  sire_id?: string
  sire_tag?: string
  sire_breed?: string
  expected_calving_date?: string
  actual_calving_date?: string
  pregnancy_confirmed: boolean
  pregnancy_check_date?: string
  pregnancy_status: 'pending' | 'confirmed' | 'negative' | 'aborted' | 'completed'
  gestation_period?: number
  breeding_notes?: string
  veterinarian?: string
  breeding_cost?: number
  offspring_count?: number
  offspring_ids?: string[]
  complications?: string
  created_at: string
  updated_at: string
  auto_generated?: boolean
}

interface PregnancyCheck {
  id: string
  breeding_record_id: string
  check_date: string
  check_method: 'palpation' | 'ultrasound' | 'blood_test' | 'visual'
  result: 'positive' | 'negative' | 'inconclusive'
  checked_by: string
  notes?: string
  next_check_date?: string
}

interface BreedingSettings {
  minimumBreedingAgeMonths: number
  defaultGestationPeriod: number
  pregnancyCheckDays: number
  autoSchedulePregnancyCheck: boolean
  postpartumBreedingDelayDays: number
  dryOffBeforeCalvingDays: number
  heatCycleDays: number
  enableHeatDetection: boolean
  enableBreedingAlerts: boolean
}

interface BreedingEligibility {
  eligible: boolean
  reasons: string[]
  warnings: string[]
  ageInMonths: number
  daysSinceCalving?: number
  productionStatus: string
}

interface AnimalBreedingRecordsProps {
  animalId: string
  animal: any
  canAddRecords: boolean
}

export function AnimalBreedingRecords({ animalId, animal, canAddRecords }: AnimalBreedingRecordsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([])
  const [pregnancyChecks, setPregnancyChecks] = useState<PregnancyCheck[]>([])
  const [breedingSettings, setBreedingSettings] = useState<BreedingSettings | null>(null)
  const [breedingEligibility, setBreedingEligibility] = useState<BreedingEligibility | null>(null)
  const [showAddBreedingModal, setShowAddBreedingModal] = useState(false)
  const [showAddCheckModal, setShowAddCheckModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<BreedingRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoGeneratingRecords, setAutoGeneratingRecords] = useState(false)
  const { isMobile } = useDeviceInfo()
  const [autoGenerationState, setAutoGenerationState] = useState<{
    inProgress: boolean
    completed: boolean
    error: string | null
  }>({
    inProgress: false,
    completed: false,
    error: null
  })

  // Form states
  const [breedingForm, setBreedingForm] = useState<{
    breeding_date: string,
    breeding_method: 'natural' | 'artificial_insemination',
    sire_tag: string,
    sire_breed: string,
    veterinarian: string,
    breeding_cost: string,
    breeding_notes: string
  }>({
    breeding_date: format(new Date(), 'yyyy-MM-dd'),
    breeding_method: 'artificial_insemination',
    sire_tag: '',
    sire_breed: '',
    veterinarian: '',
    breeding_cost: '',
    breeding_notes: ''
  })

  const [checkForm, setCheckForm] = useState<{
    check_date: string,
    check_method: 'palpation' | 'ultrasound' | 'blood_test' | 'visual',
    result: 'positive' | 'negative' | 'inconclusive',
    checked_by: string,
    notes: string,
    next_check_date: string
  }>({
    check_date: format(new Date(), 'yyyy-MM-dd'),
    check_method: 'palpation',
    result: 'positive',
    checked_by: '',
    notes: '',
    next_check_date: ''
  })

  // Memoized change handlers to prevent input focus loss
  // Breeding Form Handlers
  const handleBreedingDateChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBreedingForm(prev => ({ ...prev, breeding_date: e.target.value }))
  }, [])

  const handleBreedingMethodChange = React.useCallback((value: 'natural' | 'artificial_insemination') => {
    setBreedingForm(prev => ({ ...prev, breeding_method: value }))
  }, [])

  const handleSireTagChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBreedingForm(prev => ({ ...prev, sire_tag: e.target.value }))
  }, [])

  const handleSireBreedChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBreedingForm(prev => ({ ...prev, sire_breed: e.target.value }))
  }, [])

  const handleVeterinarianChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBreedingForm(prev => ({ ...prev, veterinarian: e.target.value }))
  }, [])

  const handleBreedingCostChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBreedingForm(prev => ({ ...prev, breeding_cost: e.target.value }))
  }, [])

  const handleBreedingNotesChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBreedingForm(prev => ({ ...prev, breeding_notes: e.target.value }))
  }, [])

  // Pregnancy Check Form Handlers
  const handleCheckDateChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCheckForm(prev => ({ ...prev, check_date: e.target.value }))
  }, [])

  const handleCheckMethodChange = React.useCallback((value: 'palpation' | 'ultrasound' | 'blood_test' | 'visual') => {
    setCheckForm(prev => ({ ...prev, check_method: value }))
  }, [])

  const handleCheckResultChange = React.useCallback((value: 'positive' | 'negative' | 'inconclusive') => {
    setCheckForm(prev => ({ ...prev, result: value }))
  }, [])

  const handleCheckedByChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCheckForm(prev => ({ ...prev, checked_by: e.target.value }))
  }, [])

  const handleNextCheckDateChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCheckForm(prev => ({ ...prev, next_check_date: e.target.value }))
  }, [])

  const handleCheckNotesChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCheckForm(prev => ({ ...prev, notes: e.target.value }))
  }, [])

  // Load breeding settings and check eligibility
  useEffect(() => {
    loadBreedingSettings()
    loadBreedingRecords()
  }, [animalId])

  useEffect(() => {
    if (breedingSettings && animal && breedingRecords.length > 0) {
      checkBreedingEligibility()
    }
  }, [breedingSettings, animal, breedingRecords])

  // Auto-generate breeding records based on animal data
  useEffect(() => {
  if (
    breedingSettings && 
    animal?.id && 
    breedingRecords.length === 0 && 
    !autoGenerationState.completed &&
    !autoGenerationState.inProgress
  ) {
    autoGenerateBreedingRecords()
  }
}, [breedingSettings?.defaultGestationPeriod, animal?.id, breedingRecords.length])


  const loadBreedingSettings = async () => {
    try {
      const response = await fetch('/api/breeding-settings')
      const data = await response.json()

      if (data.success) {
        setBreedingSettings(data.settings)
      } else {
        console.error('Failed to load breeding settings:', data.error)
      }
    } catch (err) {
      console.error('Error loading breeding settings:', err)
    }
  }

  const autoGenerateBreedingRecords = async () => {
  // ✅ Add guard clauses
  if (autoGenerationState.inProgress || autoGenerationState.completed) {
    console.log('⏭️ Auto-generation already handled')
    return
  }

  if (!animal || !breedingSettings) {
    console.log('⚠️ Missing required data for auto-generation')
    return
  }

  // Check if animal has breeding-related data
  const shouldGenerateRecord = (
    animal.production_status === 'served' ||
    animal.production_status === 'dry' ||
    animal.production_status === 'lactating' ||
    animal.service_date ||
    animal.expected_calving_date
  )

  if (!shouldGenerateRecord) {
    console.log('ℹ️ No breeding record generation needed')
    setAutoGenerationState({ inProgress: false, completed: true, error: null })
    return
  }

  // ✅ Set in-progress state
  setAutoGenerationState({ inProgress: true, completed: false, error: null })
  console.log('🔄 Starting auto-generation for animal:', animal.tag_number)

  try {
    let breedingData: any = null

    // Determine breeding data based on production status
    if (animal.production_status === 'served' && animal.service_date) {
      breedingData = {
        breeding_date: animal.service_date,
        breeding_method: animal.service_method || 'artificial_insemination',
        expected_calving_date: animal.expected_calving_date || 
          format(addDays(parseISO(animal.service_date), breedingSettings.defaultGestationPeriod), 'yyyy-MM-dd'),
        pregnancy_status: 'pending',
        auto_generated: true, // ✅ Set flag
        expected_production_status: 'served', // ✅ Keep current status
        breeding_notes: '🤖 Auto-generated from registration (Served status)'
      }
    } 
    else if (animal.production_status === 'dry' && animal.expected_calving_date) {
      const expectedDate = parseISO(animal.expected_calving_date)
      const breedingDate = format(
        addDays(expectedDate, -breedingSettings.defaultGestationPeriod),
        'yyyy-MM-dd'
      )

      breedingData = {
        breeding_date: breedingDate,
        breeding_method: animal.service_method || 'artificial_insemination',
        expected_calving_date: animal.expected_calving_date,
        pregnancy_status: 'confirmed',
        pregnancy_confirmed: true,
        pregnancy_check_date: format(
          addDays(parseISO(breedingDate), breedingSettings.pregnancyCheckDays),
          'yyyy-MM-dd'
        ),
        auto_generated: true, // ✅ Set flag
        expected_production_status: 'dry', // ✅ Keep current status
        breeding_notes: '🤖 Auto-generated from registration (Dry/Pregnant status)'
      }
    }
    else if (animal.production_status === 'lactating' && animal.lactation_number) {
      const today = new Date()
      const daysInMilk = animal.days_in_milk || 60

      const calvingDate = format(addDays(today, -daysInMilk), 'yyyy-MM-dd')
      const breedingDate = format(
        addDays(parseISO(calvingDate), -breedingSettings.defaultGestationPeriod),
        'yyyy-MM-dd'
      )

      breedingData = {
        breeding_date: breedingDate,
        breeding_method: 'artificial_insemination',
        expected_calving_date: calvingDate,
        actual_calving_date: calvingDate,
        pregnancy_status: 'completed',
        pregnancy_confirmed: true,
        auto_generated: true, // ✅ Set flag
        expected_production_status: 'lactating', // ✅ Keep current status
        breeding_notes: `🤖 Auto-generated from registration (Lactating L${animal.lactation_number})`
      }
    }

    if (breedingData) {
      const response = await fetch(`/api/animals/${animalId}/breeding-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(breedingData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create breeding record')
      }

      const result = await response.json()
      console.log('✅ Auto-generated breeding record:', result.breedingRecord.id)
      
      // ✅ Reload breeding records
      await loadBreedingRecords()
      
      // ✅ Mark as completed
      setAutoGenerationState({ inProgress: false, completed: true, error: null })
    } else {
      setAutoGenerationState({ inProgress: false, completed: true, error: null })
    }
  } catch (error: any) {
    console.error('❌ Auto-generation failed:', error)
    setAutoGenerationState({ 
      inProgress: false, 
      completed: false, 
      error: error.message 
    })
  }
}

  const checkBreedingEligibility = () => {
    if (!breedingSettings || !animal) return

    const eligibility: BreedingEligibility = {
      eligible: true,
      reasons: [],
      warnings: [],
      ageInMonths: 0,
      productionStatus: animal.production_status || 'unknown'
    }

    // Calculate age in months
    if (animal.birth_date) {
      eligibility.ageInMonths = differenceInMonths(
        new Date(),
        parseISO(animal.birth_date)
      )

      // Check minimum breeding age
      if (eligibility.ageInMonths < breedingSettings.minimumBreedingAgeMonths) {
        eligibility.eligible = false
        eligibility.reasons.push(
          `Animal is too young (${eligibility.ageInMonths} months). Minimum breeding age is ${breedingSettings.minimumBreedingAgeMonths} months.`
        )
      }
    } else {
      eligibility.warnings.push('Date of birth not recorded. Cannot verify age requirement.')
    }

    // Check production status eligibility
    const eligibleStatuses = ['heifer', 'dry', 'lactating', 'served', 'pregnant']
    if (!eligibleStatuses.includes(animal.production_status?.toLowerCase() || '')) {
      eligibility.eligible = false
      eligibility.reasons.push(
        `Production status "${animal.production_status || 'Unknown'}" is not eligible for breeding. Animal must be: Heifer, Dry, Lactating, Served, or Pregnant.`
      )
    }

    // Check if already pregnant
    const activePregnancy = breedingRecords.find(
      record => record.pregnancy_status === 'confirmed' && !record.actual_calving_date
    )
    if (activePregnancy) {
      eligibility.eligible = false
      eligibility.reasons.push('Animal is already pregnant.')
    }

    // Check postpartum delay if recently calved
    const lastCalving = breedingRecords
      .filter(record => record.actual_calving_date)
      .sort((a, b) => new Date(b.actual_calving_date!).getTime() - new Date(a.actual_calving_date!).getTime())[0]

    if (lastCalving?.actual_calving_date) {
      const daysSinceCalving = differenceInDays(
        new Date(),
        parseISO(lastCalving.actual_calving_date)
      )
      eligibility.daysSinceCalving = daysSinceCalving

      if (daysSinceCalving < breedingSettings.postpartumBreedingDelayDays) {
        eligibility.eligible = false
        eligibility.reasons.push(
          `Too soon after calving (${daysSinceCalving} days). Must wait ${breedingSettings.postpartumBreedingDelayDays} days postpartum.`
        )
      }
    }

    // Check health status
    if (animal.health_status === 'sick' || animal.health_status === 'critical') {
      eligibility.eligible = false
      eligibility.reasons.push('Animal health status is not suitable for breeding.')
    }

    // Add warnings for optimal breeding conditions
    if (animal.production_status?.toLowerCase() === 'lactating' && eligibility.eligible) {
      eligibility.warnings.push('Animal is lactating. Monitor milk production after breeding.')
    }

    setBreedingEligibility(eligibility)
  }

  const loadBreedingRecords = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/animals/${animalId}/breeding-records`)
      const data = await response.json()

      if (data.success) {
        setBreedingRecords(data.breedingRecords || [])
        setPregnancyChecks(data.pregnancyChecks || [])
      } else {
        setError('Failed to load breeding records')
        console.error('Error loading breeding records:', data.error)
      }
    } catch (err) {
      setError('Failed to load breeding records')
      console.error('Error loading breeding records:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateExpectedCalvingDate = (breedingDate: string): string => {
    const gestationDays = breedingSettings?.defaultGestationPeriod || 280
    return format(addDays(parseISO(breedingDate), gestationDays), 'yyyy-MM-dd')
  }

  const getDaysToCalving = (expectedDate: string): number => {
    return differenceInDays(parseISO(expectedDate), new Date())
  }

  const getPregnancyStatusBadge = (status: string, isAutoGenerated?: boolean) => {
    const badges = {
      confirmed: <Badge className="bg-green-100 text-green-800">Confirmed Pregnant</Badge>,
      pending: <Badge className="bg-yellow-100 text-yellow-800">Pending Confirmation</Badge>,
      negative: <Badge className="bg-red-100 text-red-800">Not Pregnant</Badge>,
      aborted: <Badge className="bg-red-100 text-red-800">Pregnancy Lost</Badge>,
      completed: <Badge className="bg-blue-100 text-blue-800">Calved</Badge>,
    }

    return (
      <div className="flex items-center gap-2">
        {badges[status as keyof typeof badges] || <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>}
        {isAutoGenerated && (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Sparkles className="w-3 h-3 mr-1" />
            Auto-generated
          </Badge>
        )}
      </div>
    )
  }

  const handleAddBreeding = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/animals/${animalId}/breeding-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          breeding_date: breedingForm.breeding_date,
          breeding_method: breedingForm.breeding_method,
          sire_tag: breedingForm.sire_tag || null,
          sire_breed: breedingForm.sire_breed || null,
          veterinarian: breedingForm.veterinarian || null,
          breeding_cost: breedingForm.breeding_cost || null,
          breeding_notes: breedingForm.breeding_notes || null,
          gestation_period: breedingSettings?.defaultGestationPeriod || 280
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Reload breeding records to get the new one
        await loadBreedingRecords()
        setShowAddBreedingModal(false)
        resetBreedingForm()

        // Show success message (you could add toast notification here)
        console.log('Breeding record created successfully')
      } else {
        setError(data.error || 'Failed to add breeding record')
      }
    } catch (err: any) {
      setError('Failed to add breeding record')
      console.error('Error adding breeding record:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPregnancyCheck = async (recordId: string) => {
    try {
      setLoading(true)

      const response = await fetch(`/api/breeding-records/${recordId}/pregnancy-checks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          check_date: checkForm.check_date,
          check_method: checkForm.check_method,
          result: checkForm.result,
          checked_by: checkForm.checked_by,
          notes: checkForm.notes || null,
          next_check_date: checkForm.next_check_date || null
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Reload breeding records to get updated status
        await loadBreedingRecords()
        setShowAddCheckModal(false)
        resetCheckForm()

        // Show success message
        console.log('Pregnancy check recorded successfully')
      } else {
        setError(data.error || 'Failed to add pregnancy check')
      }
    } catch (err: any) {
      setError('Failed to add pregnancy check')
      console.error('Error adding pregnancy check:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetBreedingForm = () => {
    setBreedingForm({
      breeding_date: format(new Date(), 'yyyy-MM-dd'),
      breeding_method: 'artificial_insemination',
      sire_tag: '',
      sire_breed: '',
      veterinarian: '',
      breeding_cost: '',
      breeding_notes: ''
    })
  }

  const resetCheckForm = () => {
    setCheckForm({
      check_date: format(new Date(), 'yyyy-MM-dd'),
      check_method: 'palpation',
      result: 'positive',
      checked_by: '',
      notes: '',
      next_check_date: ''
    })
  }

  // Calculate breeding statistics
  const breedingStats = {
    totalBreedings: breedingRecords.length,
    confirmedPregnancies: breedingRecords.filter(r => r.pregnancy_status === 'confirmed').length,
    successRate: breedingRecords.length > 0
      ? Math.round((breedingRecords.filter(r => r.pregnancy_confirmed).length / breedingRecords.length) * 100)
      : 0,
    currentPregnancy: breedingRecords.find(r => r.pregnancy_status === 'confirmed' && !r.actual_calving_date),
    lastCalving: breedingRecords
      .filter(r => r.actual_calving_date)
      .sort((a, b) => new Date(b.actual_calving_date!).getTime() - new Date(a.actual_calving_date!).getTime())[0]
  }

  if (loading && !autoGenerationState.inProgress) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading breeding records...</p>
      </div>
    </div>
  )
}

// Add this BEFORE the main return
if (autoGenerationState.inProgress) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Generating breeding history...</p>
        <p className="text-sm text-gray-500 mt-2">This will only take a moment</p>
      </div>
    </div>
  )
}

  return (
    <div className="space-y-6">
      {/* Auto-generation indicator */}
      {autoGeneratingRecords && (
        <Alert className="border-purple-200 bg-purple-50">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
            <div>
              <h4 className="font-semibold text-purple-900">Generating breeding records...</h4>
              <p className="text-sm text-purple-700">
                Creating breeding history based on registration data
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Breeding Eligibility Alert */}
      {breedingEligibility && (
        <Alert className={breedingEligibility.eligible ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <div className="flex items-start space-x-3">
            {breedingEligibility.eligible ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className="font-semibold mb-2">
                {breedingEligibility.eligible ? 'Eligible for Breeding' : 'Not Eligible for Breeding'}
              </h4>
              <div className="space-y-1 text-sm">
                <p><strong>Age:</strong> {breedingEligibility.ageInMonths} months</p>
                <p><strong>Production Status:</strong> {breedingEligibility.productionStatus}</p>
                {breedingEligibility.daysSinceCalving !== undefined && (
                  <p><strong>Days Since Calving:</strong> {breedingEligibility.daysSinceCalving}</p>
                )}

                {!breedingEligibility.eligible && breedingEligibility.reasons.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-red-200">
                    <p className="font-medium text-red-800">Reasons:</p>
                    <ul className="list-disc list-inside space-y-1 text-red-700">
                      {breedingEligibility.reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {breedingEligibility.warnings.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-yellow-200">
                    <p className="font-medium text-yellow-800">Warnings:</p>
                    <ul className="list-disc list-inside space-y-1 text-yellow-700">
                      {breedingEligibility.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Alert>
      )}

      {/* Breeding Settings Info */}
      {breedingSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Info className="w-5 h-5 mr-2 text-blue-600" />
              Active Breeding Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Min. Breeding Age</p>
                <p className="font-semibold">{breedingSettings.minimumBreedingAgeMonths} months</p>
              </div>
              <div>
                <p className="text-gray-600">Gestation Period</p>
                <p className="font-semibold">{breedingSettings.defaultGestationPeriod} days</p>
              </div>
              <div>
                <p className="text-gray-600">In-Calf Check</p>
                <p className="font-semibold">{breedingSettings.pregnancyCheckDays} days post-breeding</p>
              </div>
              <div>
                <p className="text-gray-600">Postpartum Delay</p>
                <p className="font-semibold">{breedingSettings.postpartumBreedingDelayDays} days</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {breedingSettings.autoSchedulePregnancyCheck && (
                <Badge variant="outline" className="bg-blue-50">Auto-schedule checks enabled</Badge>
              )}
              {breedingSettings.enableHeatDetection && (
                <Badge variant="outline" className="bg-purple-50">Heat detection enabled</Badge>
              )}
              {breedingSettings.enableBreedingAlerts && (
                <Badge variant="outline" className="bg-green-50">Breeding alerts enabled</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Breedings</p>
                <p className="text-2xl font-bold">{breedingStats.totalBreedings}</p>
              </div>
              <Heart className="w-8 h-8 text-pink-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">{breedingStats.successRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold">{breedingStats.confirmedPregnancies}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Status</p>
                <p className="text-lg font-bold">
                  {breedingStats.currentPregnancy ? 'Pregnant' : 'Open'}
                </p>
              </div>
              <Baby className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Pregnancy Card (if pregnant) */}
      {breedingStats.currentPregnancy && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Baby className="w-5 h-5 mr-2" />
              Current Pregnancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-blue-800">Breeding Date</p>
                <p className="font-semibold text-blue-900">
                  {format(parseISO(breedingStats.currentPregnancy.breeding_date), 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-800">Expected Calving</p>
                <p className="font-semibold text-blue-900">
                  {breedingStats.currentPregnancy.expected_calving_date
                    ? format(parseISO(breedingStats.currentPregnancy.expected_calving_date), 'MMM dd, yyyy')
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-800">Days to Calving</p>
                <p className="font-semibold text-blue-900">
                  {breedingStats.currentPregnancy.expected_calving_date
                    ? `${getDaysToCalving(breedingStats.currentPregnancy.expected_calving_date)} days`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="records">
            Breeding Records ({breedingRecords.length})
          </TabsTrigger>
          <TabsTrigger value="checks">
            Pregnancy Checks ({pregnancyChecks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Breeding History</CardTitle>
                <CardDescription>Complete breeding timeline for this animal</CardDescription>
              </div>
              {canAddRecords && breedingEligibility?.eligible && (
                <Button onClick={() => setShowAddBreedingModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Record Breeding
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {breedingRecords.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Heart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No breeding records yet</p>
                  {canAddRecords && breedingEligibility?.eligible && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowAddBreedingModal(true)}
                    >
                      Record First Breeding
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {breedingRecords.map((record) => (
                    <div
                      key={record.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="font-semibold">
                              {format(parseISO(record.breeding_date), 'MMMM dd, yyyy')}
                            </span>
                            {getPregnancyStatusBadge(record.pregnancy_status, record.auto_generated)}
                          </div>
                          <p className="text-sm text-gray-600">
                            {record.breeding_method === 'artificial_insemination'
                              ? 'Artificial Insemination'
                              : 'Natural Breeding'}
                          </p>
                        </div>
                        {canAddRecords && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRecord(record)
                              setShowEditModal(true)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {record.sire_tag && (
                          <div>
                            <p className="text-gray-600">Sire</p>
                            <p className="font-medium">{record.sire_tag}</p>
                          </div>
                        )}
                        {record.expected_calving_date && (
                          <div>
                            <p className="text-gray-600">Expected Calving</p>
                            <p className="font-medium">
                              {format(parseISO(record.expected_calving_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        )}
                        {record.veterinarian && (
                          <div>
                            <p className="text-gray-600">Veterinarian</p>
                            <p className="font-medium">{record.veterinarian}</p>
                          </div>
                        )}
                        {record.breeding_cost && (
                          <div>
                            <p className="text-gray-600">Cost</p>
                            <p className="font-medium">KES {record.breeding_cost.toLocaleString()}</p>
                          </div>
                        )}
                      </div>

                      {record.breeding_notes && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-gray-700">{record.breeding_notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle>All Breeding Records</CardTitle>
              <CardDescription>Detailed view of all breeding attempts</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Similar content as overview but with more details */}
              <p className="text-gray-500 text-center py-8">
                Detailed breeding records view - similar to overview with expanded details
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checks">
          <Card>
            <CardHeader>
              <CardTitle>Pregnancy Checks</CardTitle>
              <CardDescription>All pregnancy confirmation checks</CardDescription>
            </CardHeader>
            <CardContent>
              {pregnancyChecks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No pregnancy checks recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {pregnancyChecks.map((check) => (
                    <div key={check.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">
                          {format(parseISO(check.check_date), 'MMM dd, yyyy')}
                        </span>
                        <Badge className={
                          check.result === 'positive' ? 'bg-green-100 text-green-800' :
                            check.result === 'negative' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                        }>
                          {check.result}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{check.check_method} - {check.checked_by}</p>
                      {check.notes && (
                        <p className="text-sm text-gray-700 mt-2">{check.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Breeding Modal */}
      <Modal isOpen={showAddBreedingModal} onClose={() => setShowAddBreedingModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Record New Breeding</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="breeding_date">Breeding Date *</Label>
              <Input
                id="breeding_date"
                type="date"
                value={breedingForm.breeding_date}
                onChange={handleBreedingDateChange}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div>
              <Label htmlFor="breeding_method">Breeding Method *</Label>
              <Select
                value={breedingForm.breeding_method}
                onValueChange={handleBreedingMethodChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="artificial_insemination">Artificial Insemination (AI)</SelectItem>
                  <SelectItem value="natural">Natural Breeding</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sire_tag">Sire Tag/ID</Label>
                <Input
                  id="sire_tag"
                  value={breedingForm.sire_tag}
                  onChange={handleSireTagChange}
                  placeholder="e.g., BULL001"
                />
              </div>
              <div>
                <Label htmlFor="sire_breed">Sire Breed</Label>
                <Input
                  id="sire_breed"
                  value={breedingForm.sire_breed}
                  onChange={handleSireBreedChange}
                  placeholder="e.g., Holstein"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="veterinarian">Veterinarian/Technician</Label>
                <Input
                  id="veterinarian"
                  value={breedingForm.veterinarian}
                  onChange={handleVeterinarianChange}
                  placeholder="Name"
                />
              </div>
              <div>
                <Label htmlFor="breeding_cost">Cost (KES)</Label>
                <Input
                  id="breeding_cost"
                  type="number"
                  value={breedingForm.breeding_cost}
                  onChange={handleBreedingCostChange}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="breeding_notes">Notes</Label>
              <Textarea
                id="breeding_notes"
                value={breedingForm.breeding_notes}
                onChange={handleBreedingNotesChange}
                placeholder="Additional notes about the breeding"
                rows={3}
              />
            </div>

            {breedingSettings?.autoSchedulePregnancyCheck && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  A pregnancy check will be automatically scheduled for {breedingSettings.pregnancyCheckDays} days after breeding
                  ({format(addDays(parseISO(breedingForm.breeding_date), breedingSettings.pregnancyCheckDays), 'MMM dd, yyyy')})
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowAddBreedingModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddBreeding}>
              Record Breeding
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Pregnancy Check Modal */}
      <Modal isOpen={showAddCheckModal} onClose={() => setShowAddCheckModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Add Pregnancy Check</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="check_date">Check Date *</Label>
              <Input
                id="check_date"
                type="date"
                value={checkForm.check_date}
                onChange={handleCheckDateChange}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div>
              <Label htmlFor="check_method">Check Method *</Label>
              <Select
                value={checkForm.check_method}
                onValueChange={handleCheckMethodChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="palpation">Rectal Palpation</SelectItem>
                  <SelectItem value="ultrasound">Ultrasound</SelectItem>
                  <SelectItem value="blood_test">Blood Test</SelectItem>
                  <SelectItem value="visual">Visual Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="result">Result *</Label>
              <Select
                value={checkForm.result}
                onValueChange={handleCheckResultChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Positive (Pregnant)</SelectItem>
                  <SelectItem value="negative">Negative (Not Pregnant)</SelectItem>
                  <SelectItem value="inconclusive">Inconclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="checked_by">Checked By *</Label>
              <Input
                id="checked_by"
                value={checkForm.checked_by}
                onChange={handleCheckedByChange}
                placeholder="Veterinarian or technician name"
                required
              />
            </div>

            <div>
              <Label htmlFor="next_check_date">Next Check Date</Label>
              <Input
                id="next_check_date"
                type="date"
                value={checkForm.next_check_date}
                onChange={handleNextCheckDateChange}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div>
              <Label htmlFor="check_notes">Notes</Label>
              <Textarea
                id="check_notes"
                value={checkForm.notes}
                onChange={handleCheckNotesChange}
                placeholder="Additional observations or notes"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowAddCheckModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedRecord && handleAddPregnancyCheck(selectedRecord.id)}
              disabled={!checkForm.checked_by}
            >
              Add Check
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Breeding Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Update Breeding Record</h2>

          {selectedRecord && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Editing breeding record for {format(parseISO(selectedRecord.breeding_date), 'MMMM dd, yyyy')}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Current Status</Label>
                  <div className="mt-1">
                    {getPregnancyStatusBadge(selectedRecord.pregnancy_status)}
                  </div>
                </div>
                <div>
                  <Label>Breeding Method</Label>
                  <p className="mt-1 text-sm">
                    {selectedRecord.breeding_method === 'artificial_insemination'
                      ? 'Artificial Insemination'
                      : 'Natural Breeding'
                    }
                  </p>
                </div>
              </div>

              {/* Update Status Options */}
              <div className="border-t pt-4">
                <Label className="text-base font-medium">Update Status</Label>
                <div className="mt-2 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedRecord(selectedRecord)
                      setShowEditModal(false)
                      setShowAddCheckModal(true)
                    }}
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    Add Pregnancy Check
                  </Button>

                  {selectedRecord.pregnancy_status === 'confirmed' && (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-blue-600"
                      onClick={() => {
                        // Handle calving record
                        setShowEditModal(false)
                      }}
                    >
                      <Baby className="w-4 h-4 mr-2" />
                      Record Calving
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600"
                    onClick={() => {
                      // Handle abort/end pregnancy
                      setBreedingRecords(prev => prev.map(record =>
                        record.id === selectedRecord.id
                          ? { ...record, pregnancy_status: 'aborted' }
                          : record
                      ))
                      setShowEditModal(false)
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Mark as Aborted
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}