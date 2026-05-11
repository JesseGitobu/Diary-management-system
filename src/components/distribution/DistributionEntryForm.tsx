// src/components/distribution/DistributionEntryForm.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { DistributionSettings } from '@/types/production-distribution-settings'

import { 
  Truck, 
  DollarSign, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  AlertTriangle,
  Calculator,
  CheckCircle,
  Baby,
  Loader2,
  ChevronDown
} from 'lucide-react'

interface Channel {
  id: string
  name: string
  type: 'cooperative' | 'processor' | 'direct' | 'retail' | 'other'
  contact: string
  pricePerLiter: number
  isActive: boolean
  location?: string
  paymentTerms?: string
  isPaidFor?: boolean
  isSystemChannel?: boolean
}

interface DistributionEntryFormProps {
  farmId: string
  channels: Channel[]
  availableVolume: number
  onSuccess: () => void
  isMobile: boolean
  settings: DistributionSettings | null
}

interface FormData {
  channelId: string
  volume: string
  pricePerLiter: string
  recordDate: string
  deliveryDate: string
  deliveryTime: string
  driverName: string
  vehicleNumber: string
  notes: string
  paymentMethod: string
  expectedPaymentDate: string
}

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'mpesa', label: 'M-Pesa', icon: '📱' },
  { value: 'bank', label: 'Bank Transfer', icon: '🏦' },
  { value: 'credit', label: 'Credit (Pay Later)', icon: '📋' }
]

const channelTypeColors = {
  cooperative: 'bg-green-100 text-green-800',
  processor: 'bg-blue-100 text-blue-800',
  direct: 'bg-orange-100 text-orange-800',
  retail: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-800'
}

export function DistributionEntryForm({
  farmId,
  channels,
  availableVolume,
  onSuccess,
  isMobile,
  settings
}: DistributionEntryFormProps) {
  const [formData, setFormData] = useState<FormData>({
    channelId: '',
    volume: '',
    pricePerLiter: '',
    recordDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date().toISOString().split('T')[0],
    deliveryTime: new Date().toTimeString().slice(0, 5),
    driverName: '',
    vehicleNumber: '',
    notes: '',
    paymentMethod: 'mpesa',
    expectedPaymentDate: new Date().toISOString().split('T')[0]
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [calculatedTotal, setCalculatedTotal] = useState(0)
  const [calfFeedingData, setCalfFeedingData] = useState<any>(null)
  const [calfFeedingAdjustments, setCalfFeedingAdjustments] = useState<Map<string, any>>(new Map())
  const [loadingCalfData, setLoadingCalfData] = useState(false)
  const [calfDataError, setCalfDataError] = useState<string | null>(null)
  const [adjustedTotalDailyMilk, setAdjustedTotalDailyMilk] = useState(0)
  const [isCalfSummaryExpanded, setIsCalfSummaryExpanded] = useState(true)
  const [todayProduction, setTodayProduction] = useState(0)
  const [cumulativeAvailable, setCumulativeAvailable] = useState(availableVolume)

  // Initialize defaults based on settings
  useEffect(() => {
    if (settings?.defaultPaymentMethod) {
      setFormData(prev => ({ 
        ...prev, 
        paymentMethod: settings.defaultPaymentMethod as string 
      }))
    }
  }, [settings])

  // Fetch production summary when record date changes
  useEffect(() => {
    const fetchProductionSummary = async () => {
      try {
        const response = await fetch(
          `/api/distribution/production-summary?farmId=${encodeURIComponent(farmId)}&recordDate=${encodeURIComponent(formData.recordDate)}`
        )
        
        if (response.ok) {
          const data = await response.json()
          setTodayProduction(data.todayProduction || 0)
          setCumulativeAvailable(data.cumulativeAvailable || 0)
        }
      } catch (error) {
        console.error('Error fetching production summary:', error)
        // Fallback to passed availableVolume
        setCumulativeAvailable(availableVolume)
      }
    }

    if (formData.recordDate) {
      fetchProductionSummary()
    }
  }, [formData.recordDate, farmId, availableVolume])

  // Filter allowed payment methods
  const allowedPaymentMethods = useMemo(() => {
    if (!settings?.paymentMethodsEnabled) return paymentMethods
    return paymentMethods.filter(method => 
      settings.paymentMethodsEnabled.includes(method.value as 'mpesa' | 'cash' | 'bank' | 'credit')
    )
  }, [settings])

  // Calculate total amount when volume or price changes
  useEffect(() => {
    const volume = parseFloat(formData.volume) || 0
    const price = parseFloat(formData.pricePerLiter) || 0
    setCalculatedTotal(volume * price)
  }, [formData.volume, formData.pricePerLiter])

  // Update price when channel is selected
  useEffect(() => {
    if (formData.channelId) {
      const channel = channels.find(c => c.id === formData.channelId)
      if (channel) {
        setSelectedChannel(channel)
        
        // Prefill price for paid channels
        if (channel.isPaidFor !== false) {
          setFormData(prev => ({
            ...prev,
            pricePerLiter: channel.pricePerLiter.toString()
          }))
        } else {
          // Clear price for unpaid channels
          setFormData(prev => ({
            ...prev,
            pricePerLiter: ''
          }))
        }

        // Handle Calves Feeding channel
        if (channel.isSystemChannel && channel.name === 'Calves Feeding') {
          fetchCalfFeedingData(formData.recordDate)
        } else {
          // Clear calf data for non-calf channels
          setCalfFeedingData(null)
          setCalfDataError(null)
          setFormData(prev => ({
            ...prev,
            volume: ''
          }))
        }
      }
    }
  }, [formData.channelId, channels])

  // Fetch calf feeding data
  const fetchCalfFeedingData = async (date: string) => {
    setLoadingCalfData(true)
    setCalfDataError(null)
    try {
      // Fetch both data and adjustments
      const [dataResponse, adjustmentsResponse] = await Promise.all([
        fetch(`/api/distribution/calf-feeding?date=${encodeURIComponent(date)}`),
        fetch(`/api/distribution/calf-feeding/adjustments?date=${encodeURIComponent(date)}`)
      ])
      
      if (!dataResponse.ok) {
        throw new Error('Failed to fetch calf feeding data')
      }
      
      const result = await dataResponse.json()
      let adjustmentsMap = new Map()
      let adjustedData = result
      
      // Process adjustments if available
      if (adjustmentsResponse.ok) {
        const adjustmentsData = await adjustmentsResponse.json()
        
        // Create a map of animal_id -> adjustments
        adjustmentsData.forEach((adj: any) => {
          adjustmentsMap.set(adj.animal_id, adj)
        })
        
        // Apply adjustments to data
        if (adjustmentsMap.size > 0) {
          adjustedData = applyCalfAdjustments(result, adjustmentsMap)
        }
      }
      
      setCalfFeedingData(result)
      setCalfFeedingAdjustments(adjustmentsMap)
      
      // Auto-fill volume with adjusted total daily milk
      const totalToUse = adjustmentsMap.size > 0 ? adjustedData.totalDailyMilk : result.totalDailyMilk
      setAdjustedTotalDailyMilk(totalToUse || 0)
      
      if (totalToUse) {
        setFormData(prev => ({
          ...prev,
          volume: totalToUse.toString()
        }))
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch calf feeding data'
      setCalfDataError(errorMsg)
      setCalfFeedingData(null)
      setCalfFeedingAdjustments(new Map())
      setAdjustedTotalDailyMilk(0)
    } finally {
      setLoadingCalfData(false)
    }
  }

  // Apply adjustments to calf feeding data
  const applyCalfAdjustments = (originalData: any, adjustmentsMap: Map<string, any>) => {
    const adjustedCalves = originalData.calves.map((calf: any) => {
      const calfAdjustment = adjustmentsMap.get(calf.calfId)
      
      if (!calfAdjustment) return calf
      
      // Apply session adjustments
      const adjustedSessions = calf.feedingSessions.map((session: any) => {
        const sessionAdj = calfAdjustment.adjustments.find(
          (adj: any) => adj.sessionNumber === session.sessionNumber
        )
        
        return {
          ...session,
          milkPerCalf: sessionAdj ? sessionAdj.adjustedAmount : session.milkPerCalf,
          isAdjusted: !!sessionAdj
        }
      })

      const adjustedDailyTotal = adjustedSessions.reduce((sum: number, s: any) => sum + s.milkPerCalf, 0)

      return {
        ...calf,
        feedingSessions: adjustedSessions,
        dailyMilkPerCalf: adjustedDailyTotal,
        isAdjusted: true
      }
    })

    // Recalculate session breakdown with adjusted amounts
    const adjustedSessionBreakdown = originalData.sessionBreakdown.map((session: any) => {
      let totalMilkRequired = 0
      let calfCount = 0

      adjustedCalves.forEach((calf: any) => {
        const calfSession = calf.feedingSessions.find((s: any) => s.sessionNumber === session.sessionNumber)
        if (calfSession) {
          totalMilkRequired += calfSession.milkPerCalf
          calfCount++
        }
      })

      return {
        ...session,
        totalMilkRequired,
        calfCount
      }
    })

    const adjustedTotalDailyMilk = adjustedCalves.reduce(
      (sum: number, calf: any) => sum + calf.dailyMilkPerCalf,
      0
    )

    return {
      ...originalData,
      calves: adjustedCalves,
      sessionBreakdown: adjustedSessionBreakdown,
      totalDailyMilk: adjustedTotalDailyMilk
    }
  }

  // Calculate adjusted daily milk for a specific calf
  const getAdjustedCalfDailyMilk = (calf: any): number => {
    const adjustment = calfFeedingAdjustments.get(calf.calfId)
    
    if (!adjustment) {
      return calf.dailyMilkPerCalf
    }

    // Calculate total from adjusted sessions
    const adjustedSessions = calf.feedingSessions.map((session: any) => {
      const sessionAdj = adjustment.adjustments.find(
        (adj: any) => adj.sessionNumber === session.sessionNumber
      )
      return sessionAdj ? sessionAdj.adjustedAmount : session.milkPerCalf
    })

    return adjustedSessions.reduce((sum: number, milk: number) => sum + milk, 0)
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.channelId) newErrors.channelId = 'Please select a distribution channel'
    if (!formData.recordDate) newErrors.recordDate = 'Please select record date'
    if (!formData.volume) newErrors.volume = 'Please enter volume'
    if (parseFloat(formData.volume) <= 0) newErrors.volume = 'Volume must be greater than 0'
    
    // Check available volume unless overdistribution is allowed
    const canOverdistribute = settings?.allowOverdistribution
    if (!canOverdistribute && parseFloat(formData.volume) > cumulativeAvailable) {
      newErrors.volume = `Volume cannot exceed available ${cumulativeAvailable.toFixed(1)}L`
    }
    
    // Price validation - only required for paid channels
    const isPaid = selectedChannel?.isPaidFor !== false
    if (isPaid) {
      if (!formData.pricePerLiter) newErrors.pricePerLiter = 'Please enter price per liter'
      if (formData.pricePerLiter && parseFloat(formData.pricePerLiter) <= 0) newErrors.pricePerLiter = 'Price must be greater than 0'
    }
    
    // Delivery date - only required if delivery details are needed
    const needsDeliveryDetails = selectedChannel?.type !== 'other'
    if (needsDeliveryDetails && !formData.deliveryDate) newErrors.deliveryDate = 'Please select delivery date'
    
    // Conditional validation based on settings and channel requirements
    const deliveryTrackingEnabled = settings?.enableDeliveryTracking !== false
    if (deliveryTrackingEnabled && needsDeliveryDetails) {
      if (settings?.requireDriverDetails && !formData.driverName.trim()) {
        newErrors.driverName = 'Please enter driver name'
      }
      if (settings?.requireVehicleDetails && !formData.vehicleNumber.trim()) {
        newErrors.vehicleNumber = 'Please enter vehicle number'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      // For unpaid 'other' channels, default price to 0
      const price = formData.pricePerLiter || (selectedChannel?.type === 'other' && selectedChannel?.isPaidFor === false ? '0' : '')
      
      const response = await fetch('/api/distribution/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          ...formData,
          pricePerLiter: parseFloat(price),
          totalAmount: parseFloat(formData.volume) * parseFloat(price),
          status: 'pending'
        })
      })

      if (!response.ok) throw new Error('Failed to create distribution record')

      onSuccess()
    } catch (error) {
      console.error('Error creating distribution record:', error)
      setErrors({ submit: 'Failed to create distribution record. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Determine visibility of sections/fields based on settings
  const showDeliveryDetails = settings?.enableDeliveryTracking !== false
  const showDriver = settings?.requireDriverDetails !== false // Default to showing if settings missing
  const showVehicle = !!settings?.requireVehicleDetails
  const showDeliveryTime = settings?.trackDeliveryTime !== false

  // Determine if selected channel needs delivery and payment details
  const channelNeedsDeliveryDetails = useMemo(() => {
    if (!selectedChannel) return true
    // Other, Direct, and Retail type channels don't need delivery details
    if (selectedChannel.type === 'other' || selectedChannel.type === 'direct' || selectedChannel.type === 'retail') {
      return false
    }
    return true
  }, [selectedChannel])

  const channelIsPaid = useMemo(() => {
    if (!selectedChannel) return true
    return selectedChannel.isPaidFor !== false
  }, [selectedChannel])

  return (
    <div className={`space-y-6 ${isMobile ? '' : 'max-w-2xl mx-auto'}`}>
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Truck className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-blue-600`} />
          <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`}>
            Record Distribution
          </h2>
        </div>
        <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
          Record milk distribution to your channels
        </p>
      </div>

      {/* Available Volume Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Clock className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Today's Production ({formData.recordDate}):</span>
            <strong className="text-blue-600">{todayProduction.toFixed(1)}L</strong>
          </div>
          <div className="flex items-center justify-between border-t border-blue-200 pt-2">
            <span>Available for distribution (Total):</span>
            <strong>{cumulativeAvailable.toFixed(1)}L</strong>
          </div>
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Channel Selection */}
        <Card>
          <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
            <CardTitle className={`${isMobile ? 'text-lg' : ''} flex items-center space-x-2`}>
              <User className="w-5 h-5" />
              <span>Distribution Channel</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="channelId">Select Channel *</Label>
                <Select value={formData.channelId} onValueChange={(value) => handleInputChange('channelId', value)}>
                  <SelectTrigger className={errors.channelId ? 'border-red-300' : ''}>
                    <SelectValue placeholder="Choose distribution channel">
                      {selectedChannel ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{selectedChannel.name}</span>
                          {selectedChannel.type && (
                            <span className={`text-xs px-2 py-1 rounded ${channelTypeColors[selectedChannel.type as keyof typeof channelTypeColors]}`}>
                              {selectedChannel.type}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {channels.filter(c => c.isActive).map(channel => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <div className="flex items-center justify-between w-full gap-3">
                          <div className="flex items-center space-x-2">
                            <span>{channel.name}</span>
                            <Badge className={channelTypeColors[channel.type]}>
                              {channel.type}
                            </Badge>
                          </div>
                          {channel.isPaidFor !== false && (
                            <span className="text-sm text-gray-500">
                              KSh {channel.pricePerLiter}/L
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.channelId && <p className="text-sm text-red-600 mt-1">{errors.channelId}</p>}
              </div>

              {/* Selected Channel Info */}
              {selectedChannel && (
                <>
                  <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{selectedChannel.name}</span>
                      <Badge className={channelTypeColors[selectedChannel.type]}>
                        {selectedChannel.type}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      {selectedChannel.type !== 'other' && (
                        <>
                          <div className="flex items-center space-x-1">
                            <Phone className="w-4 h-4" />
                            <span>{selectedChannel.contact}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4" />
                            <span>KSh {selectedChannel.pricePerLiter}/L</span>
                          </div>
                        </>
                      )}
                      {selectedChannel.type === 'other' && (
                        <span className="text-xs italic">
                          {selectedChannel.isPaidFor ? 'Paid distribution' : 'Unpaid distribution (e.g., animal feed, testing)'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info for Other Channel Type */}
                  {selectedChannel.type === 'other' && (
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700 text-sm">
                        <strong>Other Distribution:</strong> Used for non-sale distribution such as animal feed, testing purposes, or other special arrangements.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Calf Feeding Details */}
                  {selectedChannel.isSystemChannel && selectedChannel.name === 'Calves Feeding' && (
                    <div className="space-y-3">
                      {loadingCalfData && (
                        <Alert className="border-blue-200 bg-blue-50">
                          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                          <AlertDescription className="text-blue-700 text-sm">
                            Loading calf feeding details...
                          </AlertDescription>
                        </Alert>
                      )}

                      {calfDataError && (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-700 text-sm">
                            {calfDataError}
                          </AlertDescription>
                        </Alert>
                      )}

                      {calfFeedingData && !loadingCalfData && (
                        <Card className="border-blue-200 bg-blue-50">
                          <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsCalfSummaryExpanded(!isCalfSummaryExpanded)}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Baby className="w-5 h-5 text-blue-600" />
                                <h4 className="font-semibold text-gray-900">Calf Feeding Summary</h4>
                              </div>
                              <ChevronDown 
                                className={`w-5 h-5 text-blue-600 transition-transform ${isCalfSummaryExpanded ? 'transform rotate-0' : 'transform -rotate-90'}`}
                              />
                            </div>
                          </CardHeader>

                          {isCalfSummaryExpanded && (
                            <CardContent className="p-4 space-y-3 border-t border-blue-200">
                              {/* Key Metrics */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-3 rounded-lg border border-blue-100">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {calfFeedingData.totalCalves}
                                  </div>
                                  <div className="text-xs text-gray-600">Total Calves</div>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-blue-100">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {adjustedTotalDailyMilk.toFixed(1)}L
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {calfFeedingAdjustments.size > 0 ? 'Adjusted Total Daily Milk' : 'Total Daily Milk'}
                                  </div>
                                  {calfFeedingAdjustments.size > 0 && (
                                    <div className="text-xs text-blue-600 mt-1">
                                      Original: {calfFeedingData.totalDailyMilk?.toFixed(1)}L
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Adjustment Notice */}
                              {calfFeedingAdjustments.size > 0 && (
                                <Alert className="border-blue-300 bg-blue-100 py-2 px-3">
                                  <AlertTriangle className="h-3 w-3 text-blue-700 flex-shrink-0" />
                                  <AlertDescription className="text-blue-800 text-xs ml-2">
                                    {calfFeedingAdjustments.size} calf/calves have adjustments applied
                                  </AlertDescription>
                                </Alert>
                              )}

                              {/* Calves List */}
                              {calfFeedingData.calves && calfFeedingData.calves.length > 0 && (
                                <div className="bg-white p-3 rounded-lg border border-blue-100">
                                  <div className="text-sm font-medium text-gray-900 mb-2">Calves Being Fed:</div>
                                  <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {calfFeedingData.calves.map((calf: any, idx: number) => {
                                      const hasAdjustment = calfFeedingAdjustments.has(calf.calfId)
                                      const adjustment = calfFeedingAdjustments.get(calf.calfId)
                                      const adjustedMilk = getAdjustedCalfDailyMilk(calf)
                                      const originalMilk = calf.dailyMilkPerCalf
                                      
                                      return (
                                        <div key={calf.calfId || idx} className={`text-xs flex justify-between items-start ${hasAdjustment ? 'bg-blue-50 p-1.5 rounded' : 'text-gray-600'}`}>
                                          <div className="flex-1">
                                            <span>
                                              <strong>{calf.name}</strong> {calf.tagNumber && `(${calf.tagNumber})`}
                                              {' '}<span className="text-gray-500">{calf.ageInDays}d</span>
                                            </span>
                                            {hasAdjustment && (
                                              <div className="text-xs text-blue-700 mt-0.5">
                                                {adjustment.adjustments.length} session{adjustment.adjustments.length !== 1 ? 's' : ''} adjusted
                                              </div>
                                            )}
                                          </div>
                                          <div className={`font-medium whitespace-nowrap ml-2 flex flex-col items-end ${hasAdjustment ? 'text-blue-700' : ''}`}>
                                            <span>{adjustedMilk.toFixed(1)}L</span>
                                            {hasAdjustment && originalMilk !== adjustedMilk && (
                                              <span className="text-xs text-gray-500 line-through">
                                                {originalMilk.toFixed(1)}L
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Session Breakdown */}
                              {calfFeedingData.sessionBreakdown && calfFeedingData.sessionBreakdown.length > 0 && (
                                <div className="bg-white p-3 rounded-lg border border-blue-100">
                                  <div className="text-sm font-medium text-gray-900 mb-2">Feeding Sessions:</div>
                                  <div className="space-y-1">
                                    {calfFeedingData.sessionBreakdown.map((session: any) => (
                                      <div key={session.sessionNumber} className="text-xs text-gray-600 flex justify-between">
                                        <span>Session {session.sessionNumber}:</span>
                                        <span className="font-medium">{session.totalMilkRequired?.toFixed(1)}L ({session.calfCount} calves)</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Volume and Pricing */}
        <Card>
          <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
            <CardTitle className={`${isMobile ? 'text-lg' : ''} flex items-center space-x-2`}>
              <Calculator className="w-5 h-5" />
              <span>Volume & Pricing</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="recordDate">Record Date *</Label>
                <Input
                  id="recordDate"
                  type="date"
                  value={formData.recordDate}
                  onChange={(e) => handleInputChange('recordDate', e.target.value)}
                  className={errors.recordDate ? 'border-red-300' : ''}
                />
                {errors.recordDate && <p className="text-sm text-red-600 mt-1">{errors.recordDate}</p>}
              </div>

              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <div>
                  <Label htmlFor="volume">Volume (Liters) *</Label>
                  <Input
                    id="volume"
                    type="number"
                    step="0.1"
                    min="0"
                    max={settings?.allowOverdistribution ? undefined : cumulativeAvailable}
                    value={formData.volume}
                    onChange={(e) => handleInputChange('volume', e.target.value)}
                    placeholder="Enter volume in liters"
                    className={errors.volume ? 'border-red-300' : ''}
                  />
                  {errors.volume && <p className="text-sm text-red-600 mt-1">{errors.volume}</p>}
                </div>

                {channelIsPaid && (
                  <div>
                    <Label htmlFor="pricePerLiter">Price per Liter (KSh) *</Label>
                    <Input
                      id="pricePerLiter"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.pricePerLiter}
                      onChange={(e) => handleInputChange('pricePerLiter', e.target.value)}
                      placeholder="Enter price per liter"
                      className={errors.pricePerLiter ? 'border-red-300' : ''}
                    />
                    {errors.pricePerLiter && <p className="text-sm text-red-600 mt-1">{errors.pricePerLiter}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Total Calculation */}
            {calculatedTotal > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-green-800">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-900">
                    KSh {calculatedTotal.toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-green-600 mt-1">
                  {formData.volume}L × KSh {formData.pricePerLiter}/L
                </div>
              </div>
            )}

            {/* Info for Unpaid Other Channels */}
            {selectedChannel?.type === 'other' && selectedChannel?.isPaidFor === false && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700">
                  This is an unpaid distribution (e.g., animal feed, testing). Price per liter is optional.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Delivery Details */}
        {showDeliveryDetails && channelNeedsDeliveryDetails && (
          <Card>
            <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
              <CardTitle className={`${isMobile ? 'text-lg' : ''} flex items-center space-x-2`}>
                <Truck className="w-5 h-5" />
                <span>Delivery Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                  <div>
                    <Label htmlFor="deliveryDate">Delivery Date *</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                      className={errors.deliveryDate ? 'border-red-300' : ''}
                    />
                    {errors.deliveryDate && <p className="text-sm text-red-600 mt-1">{errors.deliveryDate}</p>}
                  </div>

                  {showDeliveryTime && (
                    <div>
                      <Label htmlFor="deliveryTime">Delivery Time</Label>
                      <Input
                        id="deliveryTime"
                        type="time"
                        value={formData.deliveryTime}
                        onChange={(e) => handleInputChange('deliveryTime', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                  {showDriver && (
                    <div>
                      <Label htmlFor="driverName">Driver Name {settings?.requireDriverDetails && '*'}</Label>
                      <Input
                        id="driverName"
                        type="text"
                        value={formData.driverName}
                        onChange={(e) => handleInputChange('driverName', e.target.value)}
                        placeholder="Enter driver's name"
                        className={errors.driverName ? 'border-red-300' : ''}
                      />
                      {errors.driverName && <p className="text-sm text-red-600 mt-1">{errors.driverName}</p>}
                    </div>
                  )}

                  {showVehicle && (
                    <div>
                      <Label htmlFor="vehicleNumber">Vehicle Number {settings?.requireVehicleDetails && '*'}</Label>
                      <Input
                        id="vehicleNumber"
                        type="text"
                        value={formData.vehicleNumber}
                        onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                        placeholder="e.g., KCA 123A"
                        className={errors.vehicleNumber ? 'border-red-300' : ''}
                      />
                      {errors.vehicleNumber && <p className="text-sm text-red-600 mt-1">{errors.vehicleNumber}</p>}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Details */}
        {channelIsPaid && (
          <Card>
            <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
              <CardTitle className={`${isMobile ? 'text-lg' : ''} flex items-center space-x-2`}>
                <DollarSign className="w-5 h-5" />
                <span>Payment Details</span>
              </CardTitle>
            </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => handleInputChange('paymentMethod', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedPaymentMethods.map(method => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center space-x-2">
                          <span>{method.icon}</span>
                          <span>{method.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expectedPaymentDate">Expected Payment Date</Label>
                <Input
                  id="expectedPaymentDate"
                  type="date"
                  value={formData.expectedPaymentDate}
                  onChange={(e) => handleInputChange('expectedPaymentDate', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          </Card>
        )}

        {/* Additional Notes */}
        <Card>
          <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
            <CardTitle className={`${isMobile ? 'text-lg' : ''}`}>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional notes about the delivery..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Error Alert */}
        {errors.submit && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {errors.submit}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Buttons */}
        <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'flex-row space-x-4'} pt-4`}>
          <Button
            type="submit"
            disabled={isSubmitting || (!settings?.allowOverdistribution && cumulativeAvailable <= 0)}
            className={`${isMobile ? 'w-full' : 'flex-1'} h-12`}
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Recording Distribution...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Record Distribution</span>
              </div>
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
            className={`${isMobile ? 'w-full' : ''} h-12`}
          >
            Cancel
          </Button>
        </div>

        {/* Quick Actions for Mobile */}
        {isMobile && cumulativeAvailable > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-gray-900">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('volume', Math.min(50, cumulativeAvailable).toString())}
              >
                Set 50L
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('volume', Math.min(100, cumulativeAvailable).toString())}
              >
                Set 100L
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('volume', (cumulativeAvailable / 2).toString())}
              >
                Half Available
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('volume', cumulativeAvailable.toString())}
              >
                All Available
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}