// src/components/animals/AnimalBreedingRecords.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import {
  Plus,
  Calendar,
  Heart,
  Baby,
  CheckCircle,
  TrendingUp,
  Edit,
  Activity,
  AlertTriangle,
  XCircle,
  Info,
  Sparkles,
  BellRing,
  Syringe,
  Stethoscope,
  MoreHorizontal,
  Clock,
  Timer
} from 'lucide-react'
import { format, differenceInDays, addDays, parseISO, differenceInMonths, differenceInHours, differenceInMinutes } from 'date-fns'

// Import standardized breeding forms
import { HeatDetectionForm } from '@/components/breeding/HeatDetectionForm'
import { InseminationForm } from '@/components/breeding/InseminationForm'
import { PregnancyCheckForm } from '@/components/breeding/PregnancyCheckForm'
import { CalvingEventForm } from '@/components/breeding/CalvingEventForm'

interface BreedingRecord {
  id: string
  animal_id: string
  breeding_date: string
  breeding_method: 'natural' | 'artificial_insemination'
  sire_tag?: string
  expected_calving_date?: string
  actual_calving_date?: string
  pregnancy_confirmed: boolean
  pregnancy_status: 'pending' | 'confirmed' | 'negative' | 'aborted' | 'completed'
  breeding_notes?: string
  veterinarian?: string
  breeding_cost?: number
  auto_generated?: boolean
}

interface PregnancyCheck {
  id: string
  breeding_record_id: string
  check_date: string
  check_method: string
  result: 'positive' | 'negative' | 'inconclusive'
  checked_by: string
  notes?: string
}

// Added interface for Heat Events
interface HeatEvent {
  id: string
  animal_id: string
  event_date: string
  heat_signs: string[]
  heat_action_taken?: string
  created_at?: string
}

interface BreedingSettings {
  minimumBreedingAgeMonths: number
  defaultGestationPeriod: number
  pregnancyCheckDays: number
  autoSchedulePregnancyCheck: boolean
  postpartumBreedingDelayDays: number
}

interface BreedingEligibility {
  eligible: boolean
  reasons: string[]
  warnings: string[]
  ageInMonths: number
  daysSinceCalving?: number
  productionStatus: string
  isReadyForFirstService?: boolean 
  isReadyForReService?: boolean
}

interface AnimalBreedingRecordsProps {
  animalId: string
  animal: any
  farmId: string 
  canAddRecords: boolean
}

type ModalType = 'heat_detection' | 'insemination' | 'pregnancy_check' | 'calving' | null

export function AnimalBreedingRecords({ animalId, animal, farmId, canAddRecords }: AnimalBreedingRecordsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([])
  const [pregnancyChecks, setPregnancyChecks] = useState<PregnancyCheck[]>([])
  const [heatEvents, setHeatEvents] = useState<HeatEvent[]>([]) // New state for heat events
  const [breedingSettings, setBreedingSettings] = useState<BreedingSettings | null>(null)
  const [breedingEligibility, setBreedingEligibility] = useState<BreedingEligibility | null>(null)
  
  // UI State
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date()) // For live timer updates
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isMobile } = useDeviceInfo()

  useEffect(() => {
    loadBreedingSettings()
    loadBreedingRecords()
    
    // Update timer every minute for the banner
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [animalId])

  useEffect(() => {
    if (breedingSettings && animal) {
      checkBreedingEligibility()
    }
  }, [breedingSettings, animal, breedingRecords])

  const loadBreedingSettings = async () => {
    try {
      const response = await fetch('/api/breeding-settings')
      const data = await response.json()
      if (data.success) {
        setBreedingSettings(data.settings)
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    }
  }

  const loadBreedingRecords = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/animals/${animalId}/breeding-records`)
      const data = await response.json()
      if (data.success) {
        const sortedRecords = (data.breedingRecords || []).sort((a: BreedingRecord, b: BreedingRecord) => 
          new Date(b.breeding_date).getTime() - new Date(a.breeding_date).getTime()
        )
        setBreedingRecords(sortedRecords)
        setPregnancyChecks(data.pregnancyChecks || [])
        
        // Assuming the API returns heatEvents, or we sort them if they are in a different structure
        // If your API doesn't return this yet, you'd need to update the endpoint or fetch specifically
        // For now, we handle the data structure safely:
        const sortedHeat = (data.heatEvents || []).sort((a: HeatEvent, b: HeatEvent) => 
          new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
        )
        setHeatEvents(sortedHeat)
      }
    } catch (err) {
      setError('Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  const checkBreedingEligibility = () => {
    if (!breedingSettings || !animal) return

    const eligibility: BreedingEligibility = {
      eligible: true,
      reasons: [],
      warnings: [],
      ageInMonths: 0,
      productionStatus: animal.production_status || 'unknown',
      isReadyForFirstService: false,
      isReadyForReService: false
    }

    if (animal.birth_date) {
      eligibility.ageInMonths = differenceInMonths(new Date(), parseISO(animal.birth_date))
      if (eligibility.ageInMonths < breedingSettings.minimumBreedingAgeMonths) {
        eligibility.eligible = false
        eligibility.reasons.push(`Too young (${eligibility.ageInMonths}m). Min: ${breedingSettings.minimumBreedingAgeMonths}m.`)
      }
    }

    const eligibleStatuses = ['heifer', 'dry', 'lactating', 'served', 'pregnant']
    if (!eligibleStatuses.includes(animal.production_status?.toLowerCase() || '')) {
      eligibility.eligible = false
      eligibility.reasons.push(`Status "${animal.production_status}" is not eligible.`)
    }

    const activePregnancy = breedingRecords.find(r => r.pregnancy_status === 'confirmed' && !r.actual_calving_date)
    if (activePregnancy) {
      eligibility.eligible = false
      eligibility.reasons.push('Animal is already pregnant.')
    }

    const lastCalving = breedingRecords
      .filter(record => record.actual_calving_date)
      .sort((a, b) => new Date(b.actual_calving_date!).getTime() - new Date(a.actual_calving_date!).getTime())[0]

    if (lastCalving?.actual_calving_date) {
      const daysSinceCalving = differenceInDays(new Date(), parseISO(lastCalving.actual_calving_date))
      eligibility.daysSinceCalving = daysSinceCalving
      if (daysSinceCalving < breedingSettings.postpartumBreedingDelayDays) {
        eligibility.eligible = false
        eligibility.reasons.push(`In waiting period (${daysSinceCalving} days). Wait ${breedingSettings.postpartumBreedingDelayDays} days.`)
      }
    }

    if (eligibility.eligible) {
      if (animal.production_status?.toLowerCase() === 'heifer' && breedingRecords.length === 0) {
        eligibility.isReadyForFirstService = true
      }
      
      const latest = breedingRecords[0]
      const isPending = latest?.pregnancy_status === 'pending'
      
      if (['lactating', 'dry'].includes(animal.production_status?.toLowerCase()) && !activePregnancy && !isPending) {
         if (!lastCalving || (eligibility.daysSinceCalving && eligibility.daysSinceCalving >= breedingSettings.postpartumBreedingDelayDays)) {
             eligibility.isReadyForReService = true
         }
      }
    }

    setBreedingEligibility(eligibility)
  }

  const handleEventCreated = async () => {
    await loadBreedingRecords()
    setActiveModal(null)
  }

  const getDaysToCalving = (expectedDate: string): number => {
    return differenceInDays(parseISO(expectedDate), new Date())
  }

  // --- Breeding Window Logic ---
  const getBreedingWindowStatus = () => {
    // 1. Get most recent heat event
    const lastHeat = heatEvents[0]
    if (!lastHeat) return null

    // 2. Check if a breeding record has happened AFTER this heat
    const breedingAfterHeat = breedingRecords.find(record => 
      new Date(record.breeding_date) >= new Date(lastHeat.event_date)
    )
    if (breedingAfterHeat) return null // Cycle completed

    // 3. Calculate hours elapsed
    const heatDate = new Date(lastHeat.event_date)
    const hoursElapsed = differenceInHours(currentTime, heatDate)
    
    // 4. Define Windows (Standard: 12-18hr optimal, 24hr max)
    if (hoursElapsed > 36) return null // Heat window strictly closed

    let status = 'unknown'
    let color = 'gray'
    let message = ''
    let subMessage = ''
    
    if (hoursElapsed < 8) {
      status = 'early'
      color = 'blue'
      message = 'Heat Detected - Too Early to Breed'
      subMessage = `Wait approx. ${12 - hoursElapsed} more hours for optimal conception.`
    } else if (hoursElapsed >= 8 && hoursElapsed < 12) {
      status = 'approaching'
      color = 'yellow'
      message = 'Approaching Optimal Window'
      subMessage = 'Prepare for insemination soon.'
    } else if (hoursElapsed >= 12 && hoursElapsed <= 18) {
      status = 'optimal'
      color = 'green'
      message = 'OPTIMAL BREEDING WINDOW'
      subMessage = 'Highest chance of conception. Breed now!'
    } else if (hoursElapsed > 18 && hoursElapsed <= 24) {
      status = 'late'
      color = 'orange'
      message = 'Late Window - Breed Immediately'
      subMessage = 'Conception chances decreasing.'
    } else {
      status = 'expired'
      color = 'red'
      message = 'Breeding Window Expired'
      subMessage = 'Consult vet or wait for next heat cycle.'
    }

    return { status, color, message, subMessage, hoursElapsed }
  }

  const getPregnancyStatusBadge = (status: string, isAutoGenerated?: boolean) => {
    const badges = {
      confirmed: <Badge className="bg-green-100 text-green-800">Confirmed Pregnant</Badge>,
      pending: <Badge className="bg-yellow-100 text-yellow-800">Served (Pending)</Badge>,
      negative: <Badge className="bg-red-100 text-red-800">Not Pregnant</Badge>,
      aborted: <Badge className="bg-red-100 text-red-800">Pregnancy Lost</Badge>,
      completed: <Badge className="bg-blue-100 text-blue-800">Calved</Badge>,
    }
    return (
      <div className="flex items-center gap-2">
        {badges[status as keyof typeof badges] || <Badge>Unknown</Badge>}
        {isAutoGenerated && (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Sparkles className="w-3 h-3 mr-1" /> Auto
          </Badge>
        )}
      </div>
    )
  }

  const latestRecord = breedingRecords[0]
  const isPendingCheck = latestRecord?.pregnancy_status === 'pending'
  const currentPregnancy = breedingRecords.find(r => r.pregnancy_status === 'confirmed' && !r.actual_calving_date)

  const breedingStats = {
    totalBreedings: breedingRecords.length,
    confirmedPregnancies: breedingRecords.filter(r => r.pregnancy_status === 'confirmed').length,
    successRate: breedingRecords.length > 0
      ? Math.round((breedingRecords.filter(r => r.pregnancy_confirmed).length / breedingRecords.length) * 100)
      : 0,
    currentStatus: currentPregnancy ? 'Pregnant' : isPendingCheck ? 'Served' : 'Open',
  }

  const renderActionButtons = () => {
    if (!canAddRecords) return null

    if (breedingStats.currentStatus === 'Pregnant') {
      return (
        <div className="flex gap-2">
          <Button onClick={() => setActiveModal('calving')} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Baby className="w-4 h-4 mr-2"/> Record Calving
          </Button>
          <div className="relative">
            <Button variant="outline" onClick={() => setShowDropdown(!showDropdown)}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-20">
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                  onClick={() => {
                    setActiveModal('heat_detection') 
                    setShowDropdown(false)
                  }}
                >
                  <AlertTriangle className="w-3 h-3 inline mr-2"/> Mark as Aborted
                </button>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (breedingStats.currentStatus === 'Served') {
      return (
        <div className="flex gap-2">
          <Button onClick={() => setActiveModal('pregnancy_check')} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Stethoscope className="w-4 h-4 mr-2"/> Pregnancy Check
          </Button>
          <div className="relative">
            <Button variant="outline" onClick={() => setShowDropdown(!showDropdown)}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-20">
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    setActiveModal('calving') 
                    setShowDropdown(false)
                  }}
                >
                  Record Calving
                </button>
                <div className="border-t my-1"></div>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setActiveModal('heat_detection') 
                    setShowDropdown(false)
                  }}
                >
                  Mark as Failed (Heat)
                </button>
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="flex gap-2">
        <Button 
          onClick={() => setActiveModal('heat_detection')} 
          variant="outline" 
          className="text-pink-600 border-pink-200 hover:bg-pink-50"
        >
          <Heart className="w-4 h-4 mr-2"/> Record Heat
        </Button>
        <Button 
          onClick={() => setActiveModal('insemination')} 
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Syringe className="w-4 h-4 mr-2"/> Record Breeding
        </Button>
      </div>
    )
  }

  // Calculate banner content
  const breedingWindow = getBreedingWindowStatus()

  if (loading) return <div className="text-center py-12">Loading breeding data...</div>

  return (
    <div className="space-y-6">
      
      {/* 1. HEAT CYCLE BANNER (Priority) */}
      {breedingWindow && breedingEligibility?.eligible && (
        <div className="mb-6">
           <div className={cn(
             "p-4 border-l-4 rounded-r-lg shadow-sm animate-in fade-in slide-in-from-top-2 duration-300",
             breedingWindow.color === 'blue' && "bg-blue-50 border-blue-500",
             breedingWindow.color === 'yellow' && "bg-yellow-50 border-yellow-500",
             breedingWindow.color === 'green' && "bg-green-50 border-green-500 ring-2 ring-green-200", // Highlight optimal
             breedingWindow.color === 'orange' && "bg-orange-50 border-orange-500",
             breedingWindow.color === 'red' && "bg-red-50 border-red-500",
           )}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                {breedingWindow.color === 'green' ? (
                  <Timer className="h-8 w-8 text-green-600 mt-1 animate-pulse" />
                ) : (
                  <Clock className={cn(
                    "h-6 w-6 mt-1",
                    breedingWindow.color === 'blue' ? "text-blue-600" :
                    breedingWindow.color === 'orange' ? "text-orange-600" :
                    "text-gray-600"
                  )} />
                )}
                
                <div>
                  <h3 className={cn(
                    "text-lg font-bold flex items-center gap-2",
                    breedingWindow.color === 'green' ? "text-green-900" : "text-gray-900"
                  )}>
                    {breedingWindow.message}
                    {breedingWindow.color === 'green' && <Badge className="bg-green-600 text-white animate-pulse">Best Time</Badge>}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                     <p className="text-sm font-medium">
                       {breedingWindow.hoursElapsed} hours since heat detected
                     </p>
                     <span className="hidden sm:inline text-gray-400">•</span>
                     <p className="text-sm text-gray-700">{breedingWindow.subMessage}</p>
                  </div>
                </div>
              </div>
              
              {/* Action buttons specifically for the window */}
              {breedingWindow.status !== 'expired' && (
                <div className="flex gap-2">
                   <Button 
                    onClick={() => setActiveModal('insemination')} 
                    className={cn(
                      "text-white shadow-md",
                      breedingWindow.color === 'green' ? "bg-green-600 hover:bg-green-700 w-full md:w-auto" : 
                      breedingWindow.color === 'orange' ? "bg-orange-600 hover:bg-orange-700" :
                      "bg-blue-600 hover:bg-blue-700"
                    )}
                  >
                    <Syringe className="w-4 h-4 mr-2"/> 
                    {breedingWindow.color === 'green' ? "Inseminate Now" : "Record Breeding"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. STANDARD NOTIFICATION (Only if no active heat window) */}
      {!breedingWindow && breedingEligibility && breedingEligibility.eligible && (breedingEligibility.isReadyForFirstService || breedingEligibility.isReadyForReService) && (
        <div className="mb-6">
             <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <BellRing className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold text-green-900">
                      {breedingEligibility.isReadyForFirstService ? 'Heifer Ready for Service' : 'Ready for Breeding'}
                    </h3>
                    <p className="text-sm text-green-800 mt-1">
                      {breedingEligibility.isReadyForFirstService 
                        ? `Heifer is ${breedingEligibility.ageInMonths} months old. Monitor for heat signs.` 
                        : `Animal is open and past waiting period. Eligible for service.`}
                    </p>
                  </div>
                </div>
                {renderActionButtons()}
              </div>
            </div>
        </div>
      )}

      {/* Warnings */}
      {!breedingEligibility?.eligible && (
         <Alert className="border-red-200 bg-red-50">
           <XCircle className="h-4 w-4 text-red-600" />
           <AlertDescription className="text-red-800 ml-2">
             <strong>Not eligible:</strong> {breedingEligibility?.reasons.join(', ')}
           </AlertDescription>
         </Alert>
      )}

      {/* Settings Summary */}
      {breedingSettings && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center text-gray-700">
              <Info className="w-4 h-4 mr-2 text-blue-600"/> Breeding Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-gray-500">Min. Age</p><p className="font-semibold">{breedingSettings.minimumBreedingAgeMonths} mo</p></div>
              <div><p className="text-gray-500">Gestation</p><p className="font-semibold">{breedingSettings.defaultGestationPeriod} days</p></div>
              <div><p className="text-gray-500">Check Due</p><p className="font-semibold">{breedingSettings.pregnancyCheckDays} days post-AI</p></div>
              <div><p className="text-gray-500">Wait Period</p><p className="font-semibold">{breedingSettings.postpartumBreedingDelayDays} days</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 p-4">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase font-semibold">Total</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-bold">{breedingStats.totalBreedings}</span>
                <Heart className="h-5 w-5 text-pink-500 opacity-70"/>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 p-4">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase font-semibold">Success</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-bold">{breedingStats.successRate}%</span>
                <TrendingUp className="h-5 w-5 text-green-500 opacity-70"/>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 p-4">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase font-semibold">Confirmed</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-bold">{breedingStats.confirmedPregnancies}</span>
                <CheckCircle className="h-5 w-5 text-blue-500 opacity-70"/>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 p-4">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase font-semibold">Current</span>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xl font-bold ${
                  breedingStats.currentStatus === 'Pregnant' ? 'text-purple-600' : 
                  breedingStats.currentStatus === 'Served' ? 'text-blue-600' : 'text-gray-700'
                }`}>
                  {breedingStats.currentStatus}
                </span>
                <Baby className="h-5 w-5 text-purple-500 opacity-70"/>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pregnancy Details */}
      {currentPregnancy && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-blue-900 text-lg">
              <Baby className="w-5 h-5 mr-2" />
              Current Pregnancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-blue-800">Breeding Date</p>
                <p className="font-semibold text-blue-900">
                  {format(parseISO(currentPregnancy.breeding_date), 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-800">Expected Calving</p>
                <p className="font-semibold text-blue-900">
                  {currentPregnancy.expected_calving_date
                    ? format(parseISO(currentPregnancy.expected_calving_date), 'MMM dd, yyyy')
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-800">Days to Calving</p>
                <p className="font-semibold text-blue-900">
                  {currentPregnancy.expected_calving_date
                    ? `${getDaysToCalving(currentPregnancy.expected_calving_date)} days`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="checks">Checks</TabsTrigger>
          </TabsList>
          
          <div>{renderActionButtons()}</div>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {breedingRecords.length === 0 && heatEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                  <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No breeding records found.</p>
                  {canAddRecords && breedingEligibility?.eligible && (
                    <Button variant="outline" onClick={() => setActiveModal('insemination')} className="mt-2 text-blue-600">
                      Record first service
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Show latest Heat Event if it's the most recent activity */}
                  {heatEvents.length > 0 && (!breedingRecords[0] || new Date(heatEvents[0].event_date) > new Date(breedingRecords[0].breeding_date)) && (
                     <div key={`heat-${heatEvents[0].id}`} className="border rounded-lg p-4 bg-pink-50 border-pink-100">
                       <div className="flex items-start justify-between">
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <Activity className="w-4 h-4 text-pink-500" />
                               <span className="font-semibold text-gray-900">
                                 {format(parseISO(heatEvents[0].event_date), 'MMMM dd, yyyy')}
                               </span>
                               <Badge variant="outline" className="bg-white text-pink-700 border-pink-200">Heat Detected</Badge>
                            </div>
                            <p className="text-sm text-gray-600 ml-6">
                               Signs: {heatEvents[0].heat_signs.join(', ')}
                            </p>
                         </div>
                       </div>
                     </div>
                  )}

                  {breedingRecords.slice(0, 5).map((record) => (
                    <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                         <div>
                           <div className="flex items-center gap-2 mb-1">
                             <Calendar className="w-4 h-4 text-gray-500"/>
                             <span className="font-semibold text-gray-900">
                               {format(parseISO(record.breeding_date), 'MMMM dd, yyyy')}
                             </span>
                             {getPregnancyStatusBadge(record.pregnancy_status, record.auto_generated)}
                           </div>
                           <p className="text-sm text-gray-600 ml-6">
                             {record.breeding_method === 'artificial_insemination' ? 'Artificial Insemination' : 'Natural Service'}
                             {record.sire_tag && ` • Sire: ${record.sire_tag}`}
                           </p>
                         </div>
                         
                         {canAddRecords && record.pregnancy_status === 'pending' && (
                           <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setActiveModal('pregnancy_check')}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                           >
                             <Stethoscope className="w-3 h-3 mr-1"/> Check
                           </Button>
                         )}
                      </div>
                      
                      {(record.expected_calving_date || record.breeding_notes) && (
                        <div className="mt-3 ml-6 pt-2 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500">
                          {record.expected_calving_date && (
                             <span>Expected Calving: {format(parseISO(record.expected_calving_date), 'MMM dd, yyyy')}</span>
                          )}
                          {record.breeding_notes && <span className="italic truncate">{record.breeding_notes}</span>}
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
             <CardHeader><CardTitle>Full History</CardTitle></CardHeader>
             <CardContent>
               <div className="space-y-4">
                  {/* Interleave Heat Events if desired, currently showing breeding records */}
                  {breedingRecords.map((record) => (
                    <div key={record.id} className="flex justify-between border-b pb-2">
                       <div>
                         <p className="font-medium">{format(parseISO(record.breeding_date), 'MMM dd, yyyy')}</p>
                         <p className="text-xs text-gray-500">{record.breeding_method}</p>
                       </div>
                       {getPregnancyStatusBadge(record.pregnancy_status)}
                    </div>
                  ))}
               </div>
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checks">
          <Card>
             <CardHeader><CardTitle>Pregnancy Checks</CardTitle></CardHeader>
             <CardContent>
               {pregnancyChecks.length === 0 ? <p className="text-gray-500">No checks recorded.</p> : (
                 <div className="space-y-4">
                    {pregnancyChecks.map((check) => (
                      <div key={check.id} className="flex justify-between border-b pb-2">
                         <div>
                           <p className="font-medium">{format(parseISO(check.check_date), 'MMM dd, yyyy')}</p>
                           <p className="text-xs text-gray-500">{check.check_method}</p>
                         </div>
                         <Badge className={check.result === 'positive' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                           {check.result}
                         </Badge>
                      </div>
                    ))}
                 </div>
               )}
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Unified Modal */}
      {activeModal && (
        <Modal 
          isOpen={true} 
          onClose={() => setActiveModal(null)} 
          className={cn(isMobile ? "max-w-full h-full m-0 rounded-none" : "max-w-2xl")}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {activeModal === 'heat_detection' && 'Record Heat Detection'}
                {activeModal === 'insemination' && 'Record Insemination'}
                {activeModal === 'pregnancy_check' && 'Record Pregnancy Check'}
                {activeModal === 'calving' && 'Record Calving Event'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)}>✕</Button>
            </div>
            
            {activeModal === 'heat_detection' && (
              <HeatDetectionForm 
                farmId={farmId} 
                onEventCreated={handleEventCreated} 
                onCancel={() => setActiveModal(null)}
                preSelectedAnimalId={animalId} 
              />
            )}
            
            {activeModal === 'insemination' && (
              <InseminationForm 
                farmId={farmId} 
                onEventCreated={handleEventCreated} 
                onCancel={() => setActiveModal(null)}
                preSelectedAnimalId={animalId} 
              />
            )}
            
            {activeModal === 'pregnancy_check' && (
              <PregnancyCheckForm 
                farmId={farmId} 
                onEventCreated={handleEventCreated} 
                onCancel={() => setActiveModal(null)}
                preSelectedAnimalId={animalId} 
              />
            )}
            
            {activeModal === 'calving' && (
              <CalvingEventForm 
                farmId={farmId} 
                onEventCreated={handleEventCreated} 
                onCancel={() => setActiveModal(null)}
                preSelectedAnimalId={animalId} 
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}