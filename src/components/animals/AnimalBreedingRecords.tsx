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
import { format, differenceInDays, addDays, parseISO, differenceInMonths, differenceInHours, differenceInMinutes, startOfDay, isSameDay, isAfter } from 'date-fns'

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
  created_at?: string // Added to support sorting by entry time
}

interface PregnancyCheck {
  id: string
  breeding_record_id: string
  check_date: string
  check_method?: string
  examination_method?: string
  result: 'positive' | 'negative' | 'inconclusive'
  checked_by?: string
  veterinarian_name?: string
  notes?: string
  estimated_due_date?: string
  created_at?: string
}

interface HeatEvent {
  id: string
  animal_id: string
  event_date: string
  heat_signs: string[]
  heat_action_taken?: string
  created_at?: string
}

interface CalvingEvent {
  id: string
  animal_id: string
  event_date: string
  estimated_due_date?: string
  calving_outcome?: string
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

interface InseminationEvent {
  id: string
  animal_id: string
  event_date: string
  insemination_method: string
  semen_bull_code?: string
  technician_name?: string
  created_at?: string
}

export function AnimalBreedingRecords({ animalId, animal, farmId, canAddRecords }: AnimalBreedingRecordsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([])
  const [pregnancyChecks, setPregnancyChecks] = useState<PregnancyCheck[]>([])
  const [heatEvents, setHeatEvents] = useState<HeatEvent[]>([])
  const [inseminationEvents, setInseminationEvents] = useState<InseminationEvent[]>([])
  const [calvingEvents, setCalvingEvents] = useState<CalvingEvent[]>([])
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
        // --- UPDATED SORTING LOGIC ---
        // Sorts by created_at first. If created_at is missing, falls back to the event date.
        // This ensures the banners react to the most recently entered data.

        const sortedRecords = (data.breedingRecords || []).sort((a: BreedingRecord, b: BreedingRecord) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : new Date(a.breeding_date).getTime();
          const timeB = b.created_at ? new Date(b.created_at).getTime() : new Date(b.breeding_date).getTime();
          return timeB - timeA; // Newest entry first
        })
        setBreedingRecords(sortedRecords)
        
        setPregnancyChecks(data.pregnancyChecks || [])
        
        const sortedHeat = (data.heatEvents || []).sort((a: HeatEvent, b: HeatEvent) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : new Date(a.event_date).getTime();
          const timeB = b.created_at ? new Date(b.created_at).getTime() : new Date(b.event_date).getTime();
          return timeB - timeA; // Newest entry first
        })
        setHeatEvents(sortedHeat)

        const sortedInsemination = (data.inseminationEvents || []).sort((a: InseminationEvent, b: InseminationEvent) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : new Date(a.event_date).getTime();
          const timeB = b.created_at ? new Date(b.created_at).getTime() : new Date(b.event_date).getTime();
          return timeB - timeA; // Newest entry first
        })
        setInseminationEvents(sortedInsemination)

        const sortedCalving = (data.calvingEvents || []).sort((a: CalvingEvent, b: CalvingEvent) => {
          const timeA = new Date(a.event_date).getTime();
          const timeB = new Date(b.event_date).getTime();
          return timeB - timeA; // Newest event date first
        })
        setCalvingEvents(sortedCalving)
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

    // Check for active pregnancy based on current records state
    const activePregnancy = breedingRecords.find(r => r.pregnancy_status === 'confirmed' && !r.actual_calving_date)
    if (activePregnancy) {
      eligibility.eligible = false
      eligibility.reasons.push('Animal is already pregnant.')
    }

    // Check for calving events - from both legacy records AND breeding_events table
    let lastCalving = breedingRecords
      .filter(record => record.actual_calving_date)
      .sort((a, b) => new Date(b.actual_calving_date!).getTime() - new Date(a.actual_calving_date!).getTime())[0]

    // Also check breeding_events calvings (newer system)
    if (calvingEvents.length > 0) {
      const lastBreedingEventCalving = calvingEvents[0]
      const calvingDate = parseISO(lastBreedingEventCalving.event_date)
      
      if (!lastCalving) {
        lastCalving = {
          id: lastBreedingEventCalving.id,
          animal_id: animalId,
          breeding_date: '',
          breeding_method: 'natural',
          actual_calving_date: lastBreedingEventCalving.event_date,
          pregnancy_confirmed: true,
          pregnancy_status: 'completed'
        }
      } else {
        // Compare and use the more recent one
        const legacyCalvingDate = parseISO(lastCalving.actual_calving_date!)
        if (calvingDate > legacyCalvingDate) {
          lastCalving.actual_calving_date = lastBreedingEventCalving.event_date
        }
      }
    }

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
    // 0. CHECK FOR POST-CALVING RECOVERY WINDOW (HIGHEST PRIORITY)
    // If animal has recently calved, show recovery window instead of pregnancy
    const lastCalving = calvingEvents[0]
    if (lastCalving) {
      const calvingDate = parseISO(lastCalving.event_date)
      const daysSinceCalving = differenceInDays(currentTime, calvingDate)
      const postpartumDelayDays = breedingSettings?.postpartumBreedingDelayDays || 60

      // Show post-calving recovery window
      if (daysSinceCalving < postpartumDelayDays) {
        const daysRemaining = postpartumDelayDays - daysSinceCalving
        return {
          status: 'post_calving',
          color: 'blue',
          message: `Post-Calving Recovery (${daysRemaining} days remaining)`,
          subMessage: `Calved on ${format(calvingDate, 'MMMM dd, yyyy')}. Ready to rebreed in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`,
          action: 'none',
          daysRemaining
        }
      }
      
      // After recovery period, show ready to rebreed
      if (daysSinceCalving >= postpartumDelayDays) {
        return {
          status: 'ready_rebreed',
          color: 'green',
          message: 'Ready to Rebreed',
          subMessage: `${daysSinceCalving} days since calving. Animal ready for heat detection.`,
          action: 'none',
          daysSinceCalving
        }
      }
    }

    // 1. Check for Confirmed Pregnancy + Calving Window (SECOND PRIORITY)
    // Check both legacy breedingRecords AND event-driven pregnancy checks
    const confirmedPregnancy = breedingRecords.find(r => r.pregnancy_status === 'confirmed' && !r.actual_calving_date)
    
    // Also check for positive pregnancy check from breeding_events table (event-driven)
    const latestInsemination = inseminationEvents[0]
    const positivePregnancyCheck = latestInsemination && pregnancyChecks.find(check => {
      const checkDate = parseISO(check.check_date)
      const inseminationDate = parseISO(latestInsemination.event_date)
      return isAfter(checkDate, inseminationDate) && check.result === 'positive'
    })
    
    // Use either confirmed pregnancy from records or positive pregnancy check
    const pregnancyConfirmed = confirmedPregnancy || positivePregnancyCheck
    
    if (pregnancyConfirmed) {
      // Get the due date from the insemination event (estimated_due_date was auto-calculated)
      let dueDate = confirmedPregnancy?.expected_calving_date 
        ? parseISO(confirmedPregnancy.expected_calving_date) 
        : null
      
      // If not found in breedingRecords, check for estimated_due_date in calvingEvents or calculate from insemination
      if (!dueDate && latestInsemination && positivePregnancyCheck) {
        // Look for calving event with estimated due date
        const calvingWithDueDate = calvingEvents.find(e => e.estimated_due_date)
        if (calvingWithDueDate && calvingWithDueDate.estimated_due_date) {
          dueDate = parseISO(calvingWithDueDate.estimated_due_date)
        } else {
          // Calculate from insemination date + gestation period
          const gestationDays = breedingSettings?.defaultGestationPeriod || 280
          dueDate = addDays(parseISO(latestInsemination.event_date), gestationDays)
        }
      }
      
      if (dueDate) {
        const daysUntilDue = differenceInDays(dueDate, currentTime)
        const hoursUntilDue = differenceInHours(dueDate, currentTime)
        
        // Show calving banner 7 days before and 7 days after due date
        if (daysUntilDue >= -7 && daysUntilDue <= 7) {
          let status = 'calving'
          let color = 'purple'
          let message = ''
          let subMessage = ''
          
          if (daysUntilDue > 1) {
            message = `Calving Due in ${daysUntilDue} days`
            subMessage = `Expected: ${format(dueDate, 'MMMM dd, yyyy')}`
          } else if (daysUntilDue === 1) {
            message = 'Calving Due Tomorrow'
            subMessage = `Expected: ${format(dueDate, 'MMMM dd, yyyy')}`
          } else if (daysUntilDue === 0) {
            message = 'Due Today'
            subMessage = `Expected: ${format(dueDate, 'MMMM dd, yyyy')}`
          } else if (daysUntilDue > -1) {
            const minsOverdue = Math.floor(hoursUntilDue % 1 * 60)
            message = `Overdue by ${Math.abs(hoursUntilDue)} hours`
            subMessage = 'Monitor closely and contact veterinarian if needed'
          } else {
            message = `Overdue by ${Math.abs(daysUntilDue)} days`
            subMessage = 'Monitor closely and contact veterinarian if needed'
          }
          
          return { status, color, message, subMessage, action: 'calving', daysUntilDue, hoursUntilDue }
        }
      }
      
      // If not in calving window, show "Current Pregnancy" banner
      if (dueDate) {
        const daysUntilDue = differenceInDays(dueDate, currentTime)
        return {
          status: 'pregnant',
          color: 'purple',
          message: 'Current Pregnancy',
          subMessage: `Estimated calving: ${format(dueDate, 'MMMM dd, yyyy')} (${daysUntilDue} days away)`,
          action: 'none',
          daysUntilDue
        }
      }
      
      return null // Pregnant but no due date set
    }

    // 1. Check for Pending Insemination (Second Priority) - Event-driven from breeding_events table
    if (latestInsemination) {
      // Check if a pregnancy check event exists AFTER this insemination
      const pregnancyCheckAfterInsemination = pregnancyChecks.find(check => {
        const checkDate = parseISO(check.check_date)
        const inseminationDate = parseISO(latestInsemination.event_date)
        // Only count pregnancy checks that came AFTER the insemination
        return isAfter(checkDate, inseminationDate)
      })
      
      // If a pregnancy check already exists, don't show this banner
      // (pregnancy status should be handled by confirmed/not confirmed logic)
      if (!pregnancyCheckAfterInsemination) {
        const daysSinceInsemination = differenceInDays(currentTime, parseISO(latestInsemination.event_date))
        const minWaitDays = breedingSettings?.pregnancyCheckDays || 30
        const maxGestationDays = breedingSettings?.defaultGestationPeriod || 280
        
        // Don't show banner if days since insemination exceeds gestation period
        // (indicates pregnancy would have been confirmed or failed by now)
        if (daysSinceInsemination > maxGestationDays) {
          return null
        }
        
        if (daysSinceInsemination >= minWaitDays) {
          return {
            status: 'ready_for_check',
            color: 'blue',
            message: 'Ready for Pregnancy Check',
            subMessage: `${daysSinceInsemination} days since insemination. Check now recommended.`,
            action: 'check',
            daysElapsed: daysSinceInsemination
          }
        } else {
          return {
            status: 'waiting',
            color: 'gray',
            message: 'Inseminated - Waiting Period',
            subMessage: `${minWaitDays - daysSinceInsemination} more days until pregnancy check is recommended.`,
            action: 'none',
            daysElapsed: daysSinceInsemination
          }
        }
      }
    }

    // 2. Heat Detection Window (Third Priority)
    const lastHeat = heatEvents[0]
    if (lastHeat) {
      const heatDate = parseISO(lastHeat.event_date)
      const heatDateStart = startOfDay(heatDate)
      
      // Check if insemination happened after heat
      const inseminationAfterHeat = inseminationEvents.find(event => {
        const inseminationDateTime = parseISO(event.event_date)
        const inseminationDateStart = startOfDay(inseminationDateTime)
        return isSameDay(inseminationDateStart, heatDateStart) || isAfter(inseminationDateStart, heatDateStart)
      })

      if (inseminationAfterHeat) return null // Heat cycle completed

      // Check if breeding happened after heat
      const breedingAfterHeat = breedingRecords.find(record => {
        const breedingDateTime = parseISO(record.breeding_date)
        const breedingDateStart = startOfDay(breedingDateTime)
        return isSameDay(breedingDateStart, heatDateStart) || isAfter(breedingDateStart, heatDateStart)
      })

      if (breedingAfterHeat) return null // Heat cycle completed

      // Calculate hours elapsed
      const heatDateTime = parseISO(lastHeat.event_date)
      const hoursElapsed = differenceInHours(currentTime, heatDateTime)
      
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

      return { status, color, message, subMessage, action: 'breed', hoursElapsed }
    }

    return null // No active breeding event
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
  
  // Also check for positive pregnancy check from event-driven pregnancy checks
  const latestInsemination = inseminationEvents[0]
  const positivePregnancyCheckConfirmed = latestInsemination && pregnancyChecks.find(check => {
    const checkDate = parseISO(check.check_date)
    const inseminationDate = parseISO(latestInsemination.event_date)
    return isAfter(checkDate, inseminationDate) && check.result === 'positive'
  })

  const breedingStats = {
    totalBreedings: breedingRecords.length ,
    confirmedPregnancies: breedingRecords.filter(r => r.pregnancy_status === 'confirmed').length ,
    successRate: (breedingRecords.length + calvingEvents.length) > 0
      ? Math.round(((breedingRecords.filter(r => r.pregnancy_confirmed).length + calvingEvents.length) / (breedingRecords.length + calvingEvents.length)) * 100)
      : 0,
    currentStatus: (() => {
      // Check post-calving recovery first
      const lastCalving = calvingEvents[0]
      if (lastCalving) {
        const calvingDate = parseISO(lastCalving.event_date)
        const daysSinceCalving = differenceInDays(new Date(), calvingDate)
        const postpartumDelayDays = breedingSettings?.postpartumBreedingDelayDays || 60
        
        if (daysSinceCalving < postpartumDelayDays) {
          return 'Lactating'
        }
      }
      
      // Then check pregnancy
      return (currentPregnancy || positivePregnancyCheckConfirmed) ? 'Pregnant' : isPendingCheck ? 'Served' : 'Open'
    })(),
  }

  const renderActionButtons = () => {
    if (!canAddRecords) return null

    // CHECK FOR POST-CALVING RECOVERY PERIOD FIRST
    // Hide all buttons during recovery, regardless of status
    const lastCalving = calvingEvents[0]
    if (lastCalving) {
      const calvingDate = parseISO(lastCalving.event_date)
      const daysSinceCalving = differenceInDays(new Date(), calvingDate)
      const postpartumDelayDays = breedingSettings?.postpartumBreedingDelayDays || 60

      // During recovery period, don't show any action buttons
      if (daysSinceCalving < postpartumDelayDays) {
        return null
      }
    }

    // Check if there's a recent insemination without a pregnancy check
    const latestInsemination = inseminationEvents[0]
    const hasUnresolvedInsemination = latestInsemination && !pregnancyChecks.find(check => {
      const checkDate = parseISO(check.check_date)
      const inseminationDate = parseISO(latestInsemination.event_date)
      return isAfter(checkDate, inseminationDate)
    })

    if (breedingStats.currentStatus === 'Pregnant') {
      return (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => setActiveModal('calving')} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white">
            <Baby className="w-4 h-4 mr-2"/> Record Calving
          </Button>
          <div className="relative w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowDropdown(!showDropdown)}>
              <MoreHorizontal className="w-4 h-4" />
              <span className="sm:hidden ml-2">Options</span>
            </Button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-full sm:w-48 bg-white rounded-md shadow-lg border z-20">
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

    if (breedingStats.currentStatus === 'Served' || hasUnresolvedInsemination) {
      return (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => setActiveModal('pregnancy_check')} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
            <Stethoscope className="w-4 h-4 mr-2"/> Pregnancy Check
          </Button>
          <div className="relative w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowDropdown(!showDropdown)}>
              <MoreHorizontal className="w-4 h-4" />
              <span className="sm:hidden ml-2">Options</span>
            </Button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-full sm:w-48 bg-white rounded-md shadow-lg border z-20">
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

    // Check for breeding eligibility before showing Open status buttons
    if (!breedingEligibility?.eligible) {
      return null
    }

    return (
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Button 
          onClick={() => setActiveModal('heat_detection')} 
          variant="outline" 
          className="w-full sm:w-auto text-pink-600 border-pink-200 hover:bg-pink-50"
        >
          <Heart className="w-4 h-4 mr-2"/> Record Heat
        </Button>
        <Button 
          onClick={() => setActiveModal('insemination')} 
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
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
      
      {/* 1. STATUS BANNER (Heat or Pending Check) */}
      {breedingWindow && (
        <div className="mb-6">
           <div className={cn(
             "p-4 border-l-4 rounded-r-lg shadow-sm animate-in fade-in slide-in-from-top-2 duration-300",
             breedingWindow.color === 'blue' && "bg-blue-50 border-blue-500",
             breedingWindow.color === 'yellow' && "bg-yellow-50 border-yellow-500",
             breedingWindow.color === 'green' && "bg-green-50 border-green-500 ring-2 ring-green-200", 
             breedingWindow.color === 'orange' && "bg-orange-50 border-orange-500",
             breedingWindow.color === 'red' && "bg-red-50 border-red-500",
             breedingWindow.color === 'gray' && "bg-gray-50 border-gray-500",
           )}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                {breedingWindow.color === 'green' ? (
                  <Timer className="h-8 w-8 text-green-600 mt-1 animate-pulse" />
                ) : breedingWindow.status === 'ready_for_check' ? (
                  <Stethoscope className="h-6 w-6 mt-1 text-blue-600" />
                ) : breedingWindow.status === 'waiting' ? (
                  <Clock className="h-6 w-6 mt-1 text-gray-600" />
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
                    breedingWindow.color === 'green' ? "text-green-900" : 
                    breedingWindow.color === 'gray' ? "text-gray-900" : "text-gray-900"
                  )}>
                    {breedingWindow.message}
                    {breedingWindow.color === 'green' && <Badge className="bg-green-600 text-white animate-pulse">Best Time</Badge>}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                     <p className="text-sm font-medium">
                       {breedingWindow.action === 'breed' && `${breedingWindow.hoursElapsed} hours since heat detected`}
                     </p>
                     {breedingWindow.action === 'breed' && <span className="hidden sm:inline text-gray-400">•</span>}
                     <p className="text-sm text-gray-700">{breedingWindow.subMessage}</p>
                  </div>
                </div>
              </div>
              
              {/* Action buttons specifically for the window */}
              {breedingWindow.action === 'breed' && breedingWindow.status !== 'expired' && (
                <div className="flex gap-2 w-full md:w-auto">
                   <Button 
                    onClick={() => setActiveModal('insemination')} 
                    className={cn(
                      "text-white shadow-md w-full md:w-auto",
                      breedingWindow.color === 'green' ? "bg-green-600 hover:bg-green-700" : 
                      breedingWindow.color === 'orange' ? "bg-orange-600 hover:bg-orange-700" :
                      "bg-blue-600 hover:bg-blue-700"
                    )}
                  >
                    <Syringe className="w-4 h-4 mr-2"/> 
                    {breedingWindow.color === 'green' ? "Inseminate Now" : "Record Breeding"}
                  </Button>
                </div>
              )}

              {/* Action button for Pregnancy Check */}
              {breedingWindow.action === 'check' && (
                <div className="flex gap-2 w-full md:w-auto">
                   <Button 
                    onClick={() => setActiveModal('pregnancy_check')} 
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md w-full md:w-auto"
                  >
                    <Stethoscope className="w-4 h-4 mr-2"/> 
                    Confirm Pregnancy
                  </Button>
                </div>
              )}

              {/* Action button for Calving */}
              {breedingWindow.action === 'calving' && (
                <div className="flex gap-2 w-full md:w-auto">
                   <Button 
                    onClick={() => setActiveModal('calving')} 
                    className="bg-purple-600 hover:bg-purple-700 text-white shadow-md w-full md:w-auto"
                  >
                    <Baby className="w-4 h-4 mr-2"/> 
                    Record Calving
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. STANDARD NOTIFICATION (Only if no active banner) */}
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
                <div className="w-full md:w-auto">
                   {renderActionButtons()}
                </div>
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
        {/* Mobile Optimized Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="checks">Checks</TabsTrigger>
          </TabsList>
          
          <div className="w-full sm:w-auto">
            {renderActionButtons()}
          </div>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {breedingRecords.length === 0 && heatEvents.length === 0 && inseminationEvents.length === 0 && pregnancyChecks.length === 0 ? (
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
                  {/* Combine and sort all events (heat, insemination, pregnancy checks, breeding records, calving) by creation date */}
                  {[
                    ...heatEvents.map(e => ({ type: 'heat', date: e.event_date, created: e.created_at, data: e })),
                    ...inseminationEvents.map(e => ({ type: 'insemination', date: e.event_date, created: e.created_at, data: e })),
                    ...pregnancyChecks.map(e => ({ type: 'pregnancy_check', date: e.check_date, created: e.created_at, data: e })),
                    ...breedingRecords.map(e => ({ type: 'breeding', date: e.breeding_date, created: e.created_at, data: e })),
                    ...calvingEvents.map(e => ({ type: 'calving', date: e.event_date, created: e.created_at, data: e }))
                  ]
                    .sort((a, b) => {
                      const timeA = new Date(a.date).getTime()
                      const timeB = new Date(b.date).getTime()
                      return timeB - timeA // Newest first (by event date)
                    })
                    .slice(0, 10) // Show top 10 recent activities
                    .map((item) => {
                      // Heat Event
                      if (item.type === 'heat') {
                        const heat = item.data as HeatEvent
                        const createdTime = heat.created_at ? parseISO(heat.created_at) : parseISO(heat.event_date)
                        return (
                          <div key={`heat-${heat.id}`} className="border rounded-lg p-4 bg-pink-50 border-pink-100">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Activity className="w-4 h-4 text-pink-500 flex-shrink-0" />
                                  <span className="font-semibold text-gray-900">
                                    {format(parseISO(heat.event_date), 'MMMM dd, yyyy • h:mm a')}
                                  </span>
                                  <Badge variant="outline" className="bg-white text-pink-700 border-pink-200">Heat Detected</Badge>
                                </div>
                                <p className="text-sm text-gray-600 ml-6 mb-2">
                                  Signs: {heat.heat_signs?.join(', ') || 'No signs recorded'}
                                </p>
                                <p className="text-xs text-gray-500 ml-6">
                                  Added: {format(createdTime, 'MMM dd, yyyy • h:mm a')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      }

                      // Insemination Event
                      if (item.type === 'insemination') {
                        const insem = item.data as InseminationEvent
                        const createdTime = insem.created_at ? parseISO(insem.created_at) : parseISO(insem.event_date)
                        return (
                          <div key={`insem-${insem.id}`} className="border rounded-lg p-4 bg-green-50 border-green-100">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Syringe className="w-4 h-4 text-green-600 flex-shrink-0" />
                                  <span className="font-semibold text-gray-900">
                                    {format(parseISO(insem.event_date), 'MMMM dd, yyyy • h:mm a')}
                                  </span>
                                  <Badge variant="outline" className="bg-white text-green-700 border-green-200">Insemination</Badge>
                                </div>
                                <p className="text-sm text-gray-600 ml-6 mb-2">
                                  Method: {insem.insemination_method}
                                  {insem.technician_name && ` • Technician: ${insem.technician_name}`}
                                </p>
                                <p className="text-xs text-gray-500 ml-6">
                                  Added: {format(createdTime, 'MMM dd, yyyy • h:mm a')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      }

                      // Pregnancy Check Event
                      if (item.type === 'pregnancy_check') {
                        const check = item.data as PregnancyCheck
                        const createdTime = check.created_at ? parseISO(check.created_at) : parseISO(check.check_date)
                        const resultColor = check.result === 'positive' ? 'bg-green-100 text-green-800' : check.result === 'negative' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        return (
                          <div key={`check-${check.id}`} className="border rounded-lg p-4 bg-blue-50 border-blue-100">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Stethoscope className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <span className="font-semibold text-gray-900">
                                    {format(parseISO(check.check_date), 'MMMM dd, yyyy • h:mm a')}
                                  </span>
                                  <Badge className={resultColor}>
                                    {check.result === 'positive' ? '✓ Positive' : check.result === 'negative' ? '✗ Negative' : 'Inconclusive'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 ml-6 mb-2">
                                  Method: {check.check_method}
                                  {check.checked_by && ` • Checked by: ${check.checked_by}`}
                                  {check.notes && ` • Notes: ${check.notes}`}
                                </p>
                                <p className="text-xs text-gray-500 ml-6">
                                  Added: {format(createdTime, 'MMM dd, yyyy • h:mm a')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      }

                      // Breeding Record
                      if (item.type === 'breeding') {
                        const record = item.data as BreedingRecord
                        const createdTime = record.created_at ? parseISO(record.created_at) : parseISO(record.breeding_date)
                        return (
                          <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0"/>
                                  <span className="font-semibold text-gray-900">
                                    {format(parseISO(record.breeding_date), 'MMMM dd, yyyy')}
                                  </span>
                                  {getPregnancyStatusBadge(record.pregnancy_status, record.auto_generated)}
                                </div>
                                <p className="text-sm text-gray-600 ml-6 mb-2">
                                  {record.breeding_method === 'artificial_insemination' ? 'Artificial Insemination' : 'Natural Service'}
                                  {record.sire_tag && ` • Sire: ${record.sire_tag}`}
                                  {record.veterinarian && ` • Veterinarian: ${record.veterinarian}`}
                                </p>
                                {(record.expected_calving_date || record.breeding_notes) && (
                                  <div className="ml-6 pt-2 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500 mb-2">
                                    {record.expected_calving_date && (
                                      <span>Expected Calving: {format(parseISO(record.expected_calving_date), 'MMM dd, yyyy')}</span>
                                    )}
                                    {record.breeding_notes && <span className="italic truncate">{record.breeding_notes}</span>}
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 ml-6">
                                  Added: {format(createdTime, 'MMM dd, yyyy • h:mm a')}
                                </p>
                              </div>
                              
                              {canAddRecords && record.pregnancy_status === 'pending' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => setActiveModal('pregnancy_check')}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50 flex-shrink-0 ml-4"
                                >
                                  <Stethoscope className="w-3 h-3 mr-1"/> Check
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      }

                      // Calving Event
                      if (item.type === 'calving') {
                        const calving = item.data as CalvingEvent
                        const createdTime = calving.created_at ? parseISO(calving.created_at) : parseISO(calving.event_date)
                        return (
                          <div key={`calving-${calving.id}`} className="border rounded-lg p-4 bg-purple-50 border-purple-100">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Baby className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                  <span className="font-semibold text-gray-900">
                                    {format(parseISO(calving.event_date), 'MMMM dd, yyyy • h:mm a')}
                                  </span>
                                  <Badge variant="outline" className="bg-white text-purple-700 border-purple-200">Calving</Badge>
                                </div>
                                {(calving.estimated_due_date || calving.calving_outcome) && (
                                  <div className="ml-6 pt-2 border-t border-purple-100 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                                    {calving.estimated_due_date && (
                                      <span>Expected Due: {format(parseISO(calving.estimated_due_date), 'MMM dd, yyyy')}</span>
                                    )}
                                    {calving.calving_outcome && (
                                      <span>Outcome: <span className="font-semibold">{calving.calving_outcome}</span></span>
                                    )}
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 ml-6">
                                  Added: {format(createdTime, 'MMM dd, yyyy • h:mm a')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      }
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records">
          <Card>
             <CardHeader>
               <CardTitle>Full Breeding History</CardTitle>
               <CardDescription>Complete record of all breeding events and history</CardDescription>
             </CardHeader>
             <CardContent>
               {breedingRecords.length === 0 && heatEvents.length === 0 && inseminationEvents.length === 0 && pregnancyChecks.length === 0 && calvingEvents.length === 0 ? (
                 <div className="text-center py-12 text-gray-500">
                   <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                   <p>No breeding history recorded.</p>
                 </div>
               ) : (
                 <div className="space-y-4">
                   {/* Combine and sort all events by date (chronological order) */}
                   {[
                     ...heatEvents.map(e => ({ type: 'heat', date: parseISO(e.event_date), created: e.created_at, data: e })),
                     ...inseminationEvents.map(e => ({ type: 'insemination', date: parseISO(e.event_date), created: e.created_at, data: e })),
                     ...pregnancyChecks.map(e => ({ type: 'pregnancy_check', date: parseISO(e.check_date), created: e.created_at, data: e })),
                     ...breedingRecords.map(e => ({ type: 'breeding', date: parseISO(e.breeding_date), created: e.created_at, data: e })),
                     ...calvingEvents.map(e => ({ type: 'calving', date: parseISO(e.event_date), created: e.created_at, data: e }))
                   ]
                     .sort((a, b) => b.date.getTime() - a.date.getTime()) // Newest first
                     .map((item, index) => {
                       // Heat Event
                       if (item.type === 'heat') {
                         const heat = item.data as HeatEvent
                         return (
                           <div key={`heat-${heat.id}`} className="border rounded-lg p-4 bg-pink-50 border-pink-100 hover:shadow-md transition-shadow">
                             <div className="flex items-start justify-between">
                               <div className="flex-1">
                                 <div className="flex items-center gap-2 mb-2">
                                   <Activity className="w-5 h-5 text-pink-600 flex-shrink-0" />
                                   <span className="font-semibold text-gray-900">Heat Detection</span>
                                   <Badge className="bg-pink-100 text-pink-800">Heat</Badge>
                                 </div>
                                 <div className="ml-7 space-y-2 text-sm">
                                   <p><span className="font-medium text-gray-700">Date:</span> {format(parseISO(heat.event_date), 'MMMM dd, yyyy • h:mm a')}</p>
                                   <p><span className="font-medium text-gray-700">Signs:</span> {heat.heat_signs?.join(', ') || 'No signs recorded'}</p>
                                   {heat.heat_action_taken && <p><span className="font-medium text-gray-700">Action:</span> {heat.heat_action_taken}</p>}
                                   <p className="text-xs text-gray-500 pt-1">Recorded: {format(heat.created_at ? parseISO(heat.created_at) : parseISO(heat.event_date), 'MMM dd, yyyy • h:mm a')}</p>
                                 </div>
                               </div>
                             </div>
                           </div>
                         )
                       }

                       // Insemination Event
                       if (item.type === 'insemination') {
                         const insem = item.data as InseminationEvent
                         return (
                           <div key={`insem-${insem.id}`} className="border rounded-lg p-4 bg-green-50 border-green-100 hover:shadow-md transition-shadow">
                             <div className="flex items-start justify-between">
                               <div className="flex-1">
                                 <div className="flex items-center gap-2 mb-2">
                                   <Syringe className="w-5 h-5 text-green-600 flex-shrink-0" />
                                   <span className="font-semibold text-gray-900">Insemination</span>
                                   <Badge className="bg-green-100 text-green-800">Insemination</Badge>
                                 </div>
                                 <div className="ml-7 space-y-2 text-sm">
                                   <p><span className="font-medium text-gray-700">Date:</span> {format(parseISO(insem.event_date), 'MMMM dd, yyyy • h:mm a')}</p>
                                   <p><span className="font-medium text-gray-700">Method:</span> {insem.insemination_method}</p>
                                   {insem.semen_bull_code && <p><span className="font-medium text-gray-700">Semen Bull Code:</span> {insem.semen_bull_code}</p>}
                                   {insem.technician_name && <p><span className="font-medium text-gray-700">Technician:</span> {insem.technician_name}</p>}
                                   <p className="text-xs text-gray-500 pt-1">Recorded: {format(insem.created_at ? parseISO(insem.created_at) : parseISO(insem.event_date), 'MMM dd, yyyy • h:mm a')}</p>
                                 </div>
                               </div>
                             </div>
                           </div>
                         )
                       }

                       // Pregnancy Check Event
                       if (item.type === 'pregnancy_check') {
                         const check = item.data as PregnancyCheck
                         const resultColor = check.result === 'positive' ? 'bg-green-100 text-green-800' : check.result === 'negative' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                         return (
                           <div key={`check-${check.id}`} className="border rounded-lg p-4 bg-blue-50 border-blue-100 hover:shadow-md transition-shadow">
                             <div className="flex items-start justify-between">
                               <div className="flex-1">
                                 <div className="flex items-center gap-2 mb-2">
                                   <Stethoscope className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                   <span className="font-semibold text-gray-900">Pregnancy Check</span>
                                   <Badge className={resultColor}>
                                     {check.result === 'positive' ? '✓ Positive' : check.result === 'negative' ? '✗ Negative' : 'Inconclusive'}
                                   </Badge>
                                 </div>
                                 <div className="ml-7 space-y-2 text-sm">
                                   <p><span className="font-medium text-gray-700">Check Date:</span> {format(parseISO(check.check_date), 'MMMM dd, yyyy • h:mm a')}</p>
                                   <p><span className="font-medium text-gray-700">Method:</span> {check.check_method}</p>
                                   {check.checked_by && <p><span className="font-medium text-gray-700">Checked by:</span> {check.checked_by}</p>}
                                   {check.notes && <p><span className="font-medium text-gray-700">Notes:</span> {check.notes}</p>}
                                   <p className="text-xs text-gray-500 pt-1">Recorded: {format(check.created_at ? parseISO(check.created_at) : parseISO(check.check_date), 'MMM dd, yyyy • h:mm a')}</p>
                                 </div>
                               </div>
                             </div>
                           </div>
                         )
                       }

                       // Breeding Record
                       if (item.type === 'breeding') {
                         const record = item.data as BreedingRecord
                         return (
                           <div key={record.id} className="border rounded-lg p-4 bg-white border-gray-200 hover:shadow-md transition-shadow">
                             <div className="flex items-start justify-between">
                               <div className="flex-1">
                                 <div className="flex items-center gap-2 mb-2">
                                   <Calendar className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                   <span className="font-semibold text-gray-900">Breeding Record</span>
                                   {getPregnancyStatusBadge(record.pregnancy_status, record.auto_generated)}
                                 </div>
                                 <div className="ml-7 space-y-2 text-sm">
                                   <p><span className="font-medium text-gray-700">Breeding Date:</span> {format(parseISO(record.breeding_date), 'MMMM dd, yyyy')}</p>
                                   <p><span className="font-medium text-gray-700">Method:</span> {record.breeding_method === 'artificial_insemination' ? 'Artificial Insemination' : 'Natural Service'}</p>
                                   {record.sire_tag && <p><span className="font-medium text-gray-700">Sire Tag:</span> {record.sire_tag}</p>}
                                   {record.veterinarian && <p><span className="font-medium text-gray-700">Veterinarian:</span> {record.veterinarian}</p>}
                                   {record.expected_calving_date && <p><span className="font-medium text-gray-700">Expected Calving:</span> {format(parseISO(record.expected_calving_date), 'MMMM dd, yyyy')}</p>}
                                   {record.actual_calving_date && <p><span className="font-medium text-gray-700">Actual Calving:</span> {format(parseISO(record.actual_calving_date), 'MMMM dd, yyyy')}</p>}
                                   {record.breeding_notes && <p><span className="font-medium text-gray-700">Notes:</span> {record.breeding_notes}</p>}
                                   {record.breeding_cost && <p><span className="font-medium text-gray-700">Cost:</span> ${record.breeding_cost.toFixed(2)}</p>}
                                   <p className="text-xs text-gray-500 pt-1">Recorded: {format(record.created_at ? parseISO(record.created_at) : parseISO(record.breeding_date), 'MMM dd, yyyy • h:mm a')}</p>
                                 </div>
                               </div>
                             </div>
                           </div>
                         )
                       }

                       // Calving Event
                       if (item.type === 'calving') {
                         const calving = item.data as CalvingEvent
                         return (
                           <div key={`calving-${calving.id}`} className="border rounded-lg p-4 bg-purple-50 border-purple-100 hover:shadow-md transition-shadow">
                             <div className="flex items-start justify-between">
                               <div className="flex-1">
                                 <div className="flex items-center gap-2 mb-2">
                                   <Baby className="w-5 h-5 text-purple-600 flex-shrink-0" />
                                   <span className="font-semibold text-gray-900">Calving Event</span>
                                   <Badge className="bg-purple-100 text-purple-800">Calving</Badge>
                                 </div>
                                 <div className="ml-7 space-y-2 text-sm">
                                   <p><span className="font-medium text-gray-700">Calving Date:</span> {format(parseISO(calving.event_date), 'MMMM dd, yyyy • h:mm a')}</p>
                                   {calving.estimated_due_date && <p><span className="font-medium text-gray-700">Estimated Due Date:</span> {format(parseISO(calving.estimated_due_date), 'MMMM dd, yyyy')}</p>}
                                   {calving.calving_outcome && <p><span className="font-medium text-gray-700">Outcome:</span> {calving.calving_outcome}</p>}
                                   <p className="text-xs text-gray-500 pt-1">Recorded: {format(calving.created_at ? parseISO(calving.created_at) : parseISO(calving.event_date), 'MMM dd, yyyy • h:mm a')}</p>
                                 </div>
                               </div>
                             </div>
                           </div>
                         )
                       }
                     })}
                 </div>
               )}
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checks">
          <Card>
             <CardHeader>
               <CardTitle>Pregnancy Checks</CardTitle>
               <CardDescription>Complete record of all pregnancy examinations</CardDescription>
             </CardHeader>
             <CardContent>
               {pregnancyChecks.length === 0 ? (
                 <p className="text-gray-500 text-center py-8">No pregnancy checks recorded.</p>
               ) : (
                 <div className="space-y-4">
                    {pregnancyChecks.map((check) => (
                      <div key={check.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                         <div className="space-y-3">
                           {/* Header Row */}
                           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                             <div className="flex items-start gap-3">
                               <Stethoscope className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                               <div>
                                 <p className="font-semibold text-gray-900">
                                   {format(parseISO(check.check_date), 'MMMM dd, yyyy • h:mm a')}
                                 </p>
                                 <p className="text-sm text-gray-600 mt-1">Pregnancy Check</p>
                               </div>
                             </div>
                             <Badge className={
                               check.result === 'positive' 
                                 ? 'bg-green-100 text-green-800 border-green-300' 
                                 : check.result === 'negative'
                                 ? 'bg-red-100 text-red-800 border-red-300'
                                 : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                             }>
                               {check.result === 'positive' ? '✓ Positive' : check.result === 'negative' ? '✗ Negative' : 'Inconclusive'}
                             </Badge>
                           </div>

                           {/* Details Grid */}
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-7 pt-2 border-t border-blue-200">
                             {/* Examination Method */}
                             {check.examination_method && (
                               <div>
                                 <p className="text-xs font-semibold text-gray-600 uppercase">Examination Method</p>
                                 <p className="text-sm text-gray-900 mt-1 capitalize">
                                   {check.examination_method.replace(/_/g, ' ')}
                                 </p>
                               </div>
                             )}

                             {/* Veterinarian */}
                             {check.veterinarian_name && (
                               <div>
                                 <p className="text-xs font-semibold text-gray-600 uppercase">Examined By</p>
                                 <p className="text-sm text-gray-900 mt-1">{check.veterinarian_name}</p>
                               </div>
                             )}

                             {/* Estimated Due Date */}
                             {check.estimated_due_date && (
                               <div>
                                 <p className="text-xs font-semibold text-gray-600 uppercase">Estimated Due Date</p>
                                 <p className="text-sm text-gray-900 mt-1">
                                   {format(parseISO(check.estimated_due_date), 'MMMM dd, yyyy')}
                                 </p>
                               </div>
                             )}

                             {/* Days to Due */}
                             {check.result === 'positive' && check.estimated_due_date && (
                               <div>
                                 <p className="text-xs font-semibold text-gray-600 uppercase">Days to Calving</p>
                                 <p className="text-sm text-gray-900 mt-1">
                                   {differenceInDays(parseISO(check.estimated_due_date), new Date())} days remaining
                                 </p>
                               </div>
                             )}
                           </div>

                           {/* Notes */}
                           {check.notes && (
                             <div className="ml-7 pt-2 border-t border-blue-200">
                               <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Notes</p>
                               <p className="text-sm text-gray-700 bg-white rounded p-2 border border-blue-100">
                                 {check.notes}
                               </p>
                             </div>
                           )}

                           {/* Recorded Timestamp */}
                           <div className="ml-7 text-xs text-gray-500 pt-2 border-t border-blue-200">
                             Recorded: {check.created_at ? format(parseISO(check.created_at), 'MMMM dd, yyyy • h:mm a') : 'N/A'}
                           </div>
                         </div>
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