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
  ChevronDown,
  Plus,
  X,
  Trash2
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
  editRecord?: any
}

interface ChannelEntry {
  id: string
  channelId: string
  volume: string
  pricePerLiter: string
  deliveryDate: string
  deliveryTime: string
  driverName: string
  vehicleNumber: string
  notes: string
  paymentMethod: string
  expectedPaymentDate: string
}

interface FormData {
  recordDate: string
  entries: ChannelEntry[]
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
  settings,
  editRecord
}: DistributionEntryFormProps) {
  const [formData, setFormData] = useState<FormData>(() => {
    if (editRecord) {
      return {
        recordDate: editRecord.distribution_date || new Date().toISOString().split('T')[0],
        entries: editRecord.deliveries ? [{
          id: editRecord.id,
          channelId: editRecord.distribution_channels?.id || '',
          volume: editRecord.quantity_distributed?.toString() || '',
          pricePerLiter: editRecord.unit_price?.toString() || '',
          deliveryDate: editRecord.deliveries[0]?.delivery_date || editRecord.distribution_date || '',
          deliveryTime: editRecord.deliveries[0]?.delivery_time || '',
          driverName: editRecord.deliveries[0]?.driver_name || '',
          vehicleNumber: editRecord.deliveries[0]?.vehicle_number || '',
          notes: editRecord.notes || '',
          paymentMethod: editRecord.paymentMethod || 'mpesa',
          expectedPaymentDate: ''
        }] : [{
          id: editRecord.id,
          channelId: editRecord.distribution_channels?.id || '',
          volume: editRecord.quantity_distributed?.toString() || '',
          pricePerLiter: editRecord.unit_price?.toString() || '',
          deliveryDate: editRecord.distribution_date || '',
          deliveryTime: '',
          driverName: '',
          vehicleNumber: '',
          notes: editRecord.notes || '',
          paymentMethod: 'mpesa',
          expectedPaymentDate: ''
        }]
      }
    }
    return {
      recordDate: new Date().toISOString().split('T')[0],
      entries: []
    }
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [entryErrors, setEntryErrors] = useState<Record<string, Record<string, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const [todayProduction, setTodayProduction] = useState(0)
  const [cumulativeAvailable, setCumulativeAvailable] = useState(availableVolume)
  
  // Calf feeding data per entry
  const [calfFeedingData, setCalfFeedingData] = useState<Record<string, any>>({})
  const [calfFeedingAdjustments, setCalfFeedingAdjustments] = useState<Record<string, Map<string, any>>>({})
  const [loadingCalfData, setLoadingCalfData] = useState<Record<string, boolean>>({})
  const [calfDataError, setCalfDataError] = useState<Record<string, string | null>>({})
  const [isCalfSummaryExpanded, setIsCalfSummaryExpanded] = useState<Record<string, boolean>>({})

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

  // Generate unique ID for entries
  const generateEntryId = () => `entry-${Date.now()}-${Math.random()}`

  // Add a new channel entry
  const addChannelEntry = () => {
    const newEntry: ChannelEntry = {
      id: generateEntryId(),
      channelId: '',
      volume: '',
      pricePerLiter: '',
      deliveryDate: formData.recordDate,
      deliveryTime: new Date().toTimeString().slice(0, 5),
      driverName: '',
      vehicleNumber: '',
      notes: '',
      paymentMethod: settings?.defaultPaymentMethod || 'mpesa',
      expectedPaymentDate: formData.recordDate
    }
    setFormData(prev => ({
      ...prev,
      entries: [...prev.entries, newEntry]
    }))
    setExpandedEntryId(newEntry.id)
  }

  // Remove a channel entry
  const removeChannelEntry = (entryId: string) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.filter(e => e.id !== entryId)
    }))
    // Clear errors for this entry
    setEntryErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[entryId]
      return newErrors
    })
    if (expandedEntryId === entryId) {
      setExpandedEntryId(null)
    }
  }

  // Update a channel entry field
  const updateEntry = (entryId: string, field: keyof ChannelEntry, value: string) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.map(entry =>
        entry.id === entryId ? { ...entry, [field]: value } : entry
      )
    }))
    // Clear error for this field
    if (entryErrors[entryId]?.[field]) {
      setEntryErrors(prev => ({
        ...prev,
        [entryId]: {
          ...prev[entryId],
          [field]: ''
        }
      }))
    }

    // Handle calf feeding channel selection
    if (field === 'channelId') {
      const selectedChannel = channels.find(c => c.id === value)
      
      // Pre-fill price for paid channels
      if (selectedChannel && selectedChannel.isPaidFor !== false) {
        updateEntry(entryId, 'pricePerLiter', selectedChannel.pricePerLiter.toString())
      } else if (selectedChannel) {
        // Clear price for unpaid channels
        updateEntry(entryId, 'pricePerLiter', '')
      }
      
      if (selectedChannel?.isSystemChannel && selectedChannel.name === 'Calves Feeding') {
        // Fetch calf feeding data for this entry
        fetchCalfFeedingData(entryId, formData.recordDate)
      } else {
        // Clear calf data for non-calf channels
        setCalfFeedingData(prev => {
          const newData = { ...prev }
          delete newData[entryId]
          return newData
        })
        setCalfDataError(prev => {
          const newErr = { ...prev }
          delete newErr[entryId]
          return newErr
        })
        setCalfFeedingAdjustments(prev => {
          const newAdj = { ...prev }
          delete newAdj[entryId]
          return newAdj
        })
      }
    }
  }

  // Get channel details
  const getChannelDetails = (channelId: string): Channel | null => {
    return channels.find(c => c.id === channelId) || null
  }

  // Calculate total for an entry
  const getEntryTotal = (entry: ChannelEntry): number => {
    const volume = parseFloat(entry.volume) || 0
    const price = parseFloat(entry.pricePerLiter) || 0
    return volume * price
  }

  // Calculate cumulative volume
  const cumulativeVolume = useMemo(() => {
    return formData.entries.reduce((sum, entry) => sum + (parseFloat(entry.volume) || 0), 0)
  }, [formData.entries])

  // Check if over-distributed
  const isOverDistributed = useMemo(() => {
    return cumulativeVolume > cumulativeAvailable
  }, [cumulativeVolume, cumulativeAvailable])

  // Fetch calf feeding data
  const fetchCalfFeedingData = async (entryId: string, date: string) => {
    setLoadingCalfData(prev => ({ ...prev, [entryId]: true }))
    setCalfDataError(prev => ({ ...prev, [entryId]: null }))
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
      
      setCalfFeedingData(prev => ({ ...prev, [entryId]: result }))
      setCalfFeedingAdjustments(prev => ({ ...prev, [entryId]: adjustmentsMap }))
      
      // Auto-fill volume with adjusted total daily milk
      const totalToUse = adjustmentsMap.size > 0 ? adjustedData.totalDailyMilk : result.totalDailyMilk
      if (totalToUse) {
        updateEntry(entryId, 'volume', totalToUse.toString())
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch calf feeding data'
      setCalfDataError(prev => ({ ...prev, [entryId]: errorMsg }))
      setCalfFeedingData(prev => {
        const newData = { ...prev }
        delete newData[entryId]
        return newData
      })
      setCalfFeedingAdjustments(prev => {
        const newAdj = { ...prev }
        delete newAdj[entryId]
        return newAdj
      })
    } finally {
      setLoadingCalfData(prev => ({ ...prev, [entryId]: false }))
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
  const getAdjustedCalfDailyMilk = (entryId: string, calf: any): number => {
    const adjustmentsMap = calfFeedingAdjustments[entryId]
    if (!adjustmentsMap) {
      return calf.dailyMilkPerCalf
    }

    const adjustment = adjustmentsMap.get(calf.calfId)
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    const newEntryErrors: Record<string, Record<string, string>> = {}

    // Validate record date
    if (!formData.recordDate) {
      newErrors.recordDate = 'Please select record date'
    }

    // Validate at least one entry
    if (formData.entries.length === 0) {
      newErrors.entries = 'Please add at least one distribution channel'
    }

    // Validate each entry
    formData.entries.forEach(entry => {
      const entryErrors: Record<string, string> = {}
      const selectedChannel = getChannelDetails(entry.channelId)

      // Channel validation
      if (!entry.channelId) {
        entryErrors.channelId = 'Please select a channel'
      }

      // Volume validation
      if (!entry.volume || entry.volume.trim() === '') {
        entryErrors.volume = 'Please enter volume'
      } else {
        const volumeNum = parseFloat(entry.volume)
        if (isNaN(volumeNum) || volumeNum <= 0) {
          entryErrors.volume = 'Volume must be a valid number greater than 0'
        }
      }

      // Price validation - only required for paid channels
      const isPaid = selectedChannel?.isPaidFor !== false
      if (isPaid) {
        if (!entry.pricePerLiter || entry.pricePerLiter.trim() === '') {
          entryErrors.pricePerLiter = 'Please enter price per liter'
        } else {
          const priceNum = parseFloat(entry.pricePerLiter)
          if (isNaN(priceNum) || priceNum < 0) {
            entryErrors.pricePerLiter = 'Price must be a valid number'
          }
        }
      }

      // Delivery date - only required if delivery details needed
      const needsDeliveryDetails = selectedChannel?.type !== 'other' && selectedChannel?.type !== 'direct' && selectedChannel?.type !== 'retail'
      if (needsDeliveryDetails && !entry.deliveryDate) {
        entryErrors.deliveryDate = 'Please select delivery date'
      }

      // Conditional delivery details validation
      const deliveryTrackingEnabled = settings?.enableDeliveryTracking !== false
      if (deliveryTrackingEnabled && needsDeliveryDetails) {
        if (settings?.requireDriverDetails && !entry.driverName.trim()) {
          entryErrors.driverName = 'Please enter driver name'
        }
        if (settings?.requireVehicleDetails && !entry.vehicleNumber.trim()) {
          entryErrors.vehicleNumber = 'Please enter vehicle number'
        }
      }

      // Payment method validation - only required if paid
      if (isPaid) {
        if (!entry.paymentMethod || entry.paymentMethod.trim() === '') {
          entryErrors.paymentMethod = 'Please select a payment method'
        }
      }

      if (Object.keys(entryErrors).length > 0) {
        newEntryErrors[entry.id] = entryErrors
      }
    })

    setErrors(newErrors)
    setEntryErrors(newEntryErrors)
    return Object.keys(newErrors).length === 0 && Object.keys(newEntryErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      // Create distribution records for all entries
      const records = formData.entries.map(entry => {
        const selectedChannel = getChannelDetails(entry.channelId)
        const isPaid = selectedChannel?.isPaidFor !== false

        // Parse and validate volume
        const volume = parseFloat(entry.volume)
        if (isNaN(volume)) {
          throw new Error(`Invalid volume for ${selectedChannel?.name}: ${entry.volume}`)
        }

        // Parse and validate price
        let pricePerLiter = 0
        if (isPaid) {
          const parsedPrice = parseFloat(entry.pricePerLiter)
          if (isNaN(parsedPrice) || parsedPrice < 0) {
            throw new Error(`Invalid price for ${selectedChannel?.name}: ${entry.pricePerLiter}`)
          }
          pricePerLiter = parsedPrice
        } else {
          // For unpaid channels, price is 0
          pricePerLiter = 0
        }

        const totalAmount = volume * pricePerLiter

        // Build base record object
        const record: any = {
          farmId,
          recordDate: formData.recordDate,
          channelId: entry.channelId,
          volume,
          pricePerLiter,
          totalAmount,
          notes: entry.notes?.trim() || '',
          status: 'pending'
        }

        // Add delivery details if needed
        const needsDeliveryDetails = selectedChannel?.type !== 'other' && selectedChannel?.type !== 'direct' && selectedChannel?.type !== 'retail'
        const deliveryTrackingEnabled = settings?.enableDeliveryTracking !== false
        
        if (deliveryTrackingEnabled && needsDeliveryDetails) {
          record.deliveryDate = entry.deliveryDate || null
          record.deliveryTime = entry.deliveryTime?.trim() || null
          record.driverName = entry.driverName?.trim() || null
          record.vehicleNumber = entry.vehicleNumber?.trim() || null
        } else {
          // Set null for delivery fields if not needed
          record.deliveryDate = null
          record.deliveryTime = null
          record.driverName = null
          record.vehicleNumber = null
        }

        // Add payment details if paid
        if (isPaid) {
          record.paymentMethod = entry.paymentMethod?.trim() || 'mpesa'
          record.expectedPaymentDate = entry.expectedPaymentDate || formData.recordDate
        } else {
          // Set null for payment fields if not paid
          record.paymentMethod = null
          record.expectedPaymentDate = null
        }

        return record
      })

      // Submit records - Use PUT if editing, POST if creating
      const isEditing = editRecord && editRecord.id
      const method = isEditing ? 'PUT' : 'POST'
      const endpoint = isEditing ? `/api/distribution/records/${editRecord.id}` : '/api/distribution/records'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? records[0] : { records })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'create'} distribution records (${response.status})`)
      }

      onSuccess()
    } catch (error) {
      console.error('Error submitting distribution records:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit distribution records. Please try again.'
      setErrors({ submit: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Determine visibility of sections/fields based on settings
  const showDeliveryDetails = settings?.enableDeliveryTracking !== false
  const showDriver = settings?.requireDriverDetails !== false
  const showVehicle = !!settings?.requireVehicleDetails
  const showDeliveryTime = settings?.trackDeliveryTime !== false

  return (
    <div className={`space-y-6 ${isMobile ? '' : 'max-w-4xl mx-auto'}`}>
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Truck className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-blue-600`} />
          <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`}>
            {editRecord ? 'Edit Distribution Record' : 'Record Distribution'}
          </h2>
        </div>
        <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
          {editRecord ? 'Update milk distribution details' : 'Record milk distribution to multiple channels'}
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
          <div className="flex items-center justify-between border-t border-blue-200 pt-2">
            <span>Allocated in this batch:</span>
            <strong className={isOverDistributed ? 'text-red-600' : 'text-green-600'}>
              {cumulativeVolume.toFixed(1)}L
            </strong>
          </div>
        </AlertDescription>
      </Alert>

      {/* Over-distribution Warning */}
      {isOverDistributed && !settings?.allowOverdistribution && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            <strong>Warning:</strong> Total allocation ({cumulativeVolume.toFixed(1)}L) exceeds available volume ({cumulativeAvailable.toFixed(1)}L)
          </AlertDescription>
        </Alert>
      )}

      {isOverDistributed && settings?.allowOverdistribution && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Over-distribution allowed: Total allocation exceeds available volume by {(cumulativeVolume - cumulativeAvailable).toFixed(1)}L
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Record Date */}
        <Card>
          <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
            <CardTitle className={`${isMobile ? 'text-lg' : ''} flex items-center space-x-2`}>
              <Clock className="w-5 h-5" />
              <span>Distribution Date</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="recordDate">Record Date for all entries *</Label>
              <Input
                id="recordDate"
                type="date"
                value={formData.recordDate}
                onChange={(e) => setFormData(prev => ({ ...prev, recordDate: e.target.value }))}
                className={errors.recordDate ? 'border-red-300' : ''}
              />
              {errors.recordDate && <p className="text-sm text-red-600 mt-1">{errors.recordDate}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Channel Entries */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold flex items-center space-x-2`}>
              <User className="w-5 h-5" />
              <span>Distribution Channels ({formData.entries.length})</span>
            </h3>
            <Button
              type="button"
              onClick={addChannelEntry}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Channel</span>
            </Button>
          </div>

          {errors.entries && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {errors.entries}
              </AlertDescription>
            </Alert>
          )}

          {/* No Entries Message */}
          {formData.entries.length === 0 && (
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="pt-6 pb-6 text-center">
                <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No channels added yet</p>
                <p className="text-sm text-gray-400 mt-1">Click "Add Channel" to start recording distributions</p>
              </CardContent>
            </Card>
          )}

          {/* Channel Entry Cards */}
          {formData.entries.map((entry, index) => {
            const selectedChannel = getChannelDetails(entry.channelId)
            const entryTotal = getEntryTotal(entry)
            const isExpanded = expandedEntryId === entry.id
            const entryErr = entryErrors[entry.id] || {}

            const needsDeliveryDetails = selectedChannel?.type !== 'other' && selectedChannel?.type !== 'direct' && selectedChannel?.type !== 'retail'
            const isPaid = selectedChannel?.isPaidFor !== false

            return (
              <Card key={entry.id} className={`${entryErr && Object.keys(entryErr).length > 0 ? 'border-red-300' : ''}`}>
                <div
                  className="cursor-pointer"
                  onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {selectedChannel ? (
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-gray-900">{selectedChannel.name}</h4>
                              <Badge className={channelTypeColors[selectedChannel.type]}>
                                {selectedChannel.type}
                              </Badge>
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">Select a channel...</p>
                          )}
                          {entry.volume && (
                            <p className="text-sm text-gray-600 mt-1">
                              {entry.volume}L
                              {isPaid && entry.pricePerLiter && (
                                <span> • KSh {entryTotal.toLocaleString()}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {Object.keys(entryErr).length > 0 && (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        )}
                        <ChevronDown
                          className={`w-5 h-5 text-gray-600 transition-transform ${
                            isExpanded ? 'transform rotate-0' : 'transform -rotate-90'
                          }`}
                        />
                      </div>
                    </div>
                  </CardHeader>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <CardContent className="pt-4 border-t space-y-6">
                    {/* Channel Selection */}
                    <div>
                      <Label htmlFor={`channel-${entry.id}`}>Select Channel *</Label>
                      <Select value={entry.channelId} onValueChange={(value) => updateEntry(entry.id, 'channelId', value)}>
                        <SelectTrigger className={entryErr.channelId ? 'border-red-300' : ''}>
                          {entry.channelId ? (
                            selectedChannel ? (
                              <div className="flex items-center gap-2 w-full">
                                <span>{selectedChannel.name}</span>
                                <Badge className={channelTypeColors[selectedChannel.type]}>
                                  {selectedChannel.type}
                                </Badge>
                              </div>
                            ) : (
                              <span>Choose distribution channel</span>
                            )
                          ) : (
                            <span className="text-gray-500">Choose distribution channel</span>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {channels.filter(c => c.isActive).map(channel => (
                            <SelectItem key={channel.id} value={channel.id}>
                              <div className="flex items-center justify-between gap-3">
                                <span>{channel.name}</span>
                                <Badge className={channelTypeColors[channel.type]}>
                                  {channel.type}
                                </Badge>
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
                      {entryErr.channelId && <p className="text-sm text-red-600 mt-1">{entryErr.channelId}</p>}
                    </div>

                    {/* Calf Feeding Details */}
                    {selectedChannel?.isSystemChannel && selectedChannel.name === 'Calves Feeding' && (
                      <div className="space-y-3">
                        {loadingCalfData[entry.id] && (
                          <Alert className="border-blue-200 bg-blue-50">
                            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                            <AlertDescription className="text-blue-700 text-sm">
                              Loading calf feeding details...
                            </AlertDescription>
                          </Alert>
                        )}

                        {calfDataError[entry.id] && (
                          <Alert className="border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-700 text-sm">
                              {calfDataError[entry.id]}
                            </AlertDescription>
                          </Alert>
                        )}

                        {calfFeedingData[entry.id] && !loadingCalfData[entry.id] && (
                          <Card className="border-blue-200 bg-blue-50">
                            <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsCalfSummaryExpanded(prev => ({ ...prev, [entry.id]: !prev[entry.id] }))}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Baby className="w-5 h-5 text-blue-600" />
                                  <h4 className="font-semibold text-gray-900">Calf Feeding Summary</h4>
                                </div>
                                <ChevronDown 
                                  className={`w-5 h-5 text-blue-600 transition-transform ${isCalfSummaryExpanded[entry.id] ? 'transform rotate-0' : 'transform -rotate-90'}`}
                                />
                              </div>
                            </CardHeader>

                            {isCalfSummaryExpanded[entry.id] && (
                              <CardContent className="p-4 space-y-3 border-t border-blue-200">
                                {/* Key Metrics */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-white p-3 rounded-lg border border-blue-100">
                                    <div className="text-2xl font-bold text-blue-600">
                                      {calfFeedingData[entry.id].totalCalves}
                                    </div>
                                    <div className="text-xs text-gray-600">Total Calves</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-blue-100">
                                    <div className="text-2xl font-bold text-blue-600">
                                      {calfFeedingAdjustments[entry.id]?.size > 0 
                                        ? calfFeedingData[entry.id].calves.reduce((sum: number, calf: any) => sum + getAdjustedCalfDailyMilk(entry.id, calf), 0).toFixed(1)
                                        : calfFeedingData[entry.id].totalDailyMilk?.toFixed(1)}L
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {calfFeedingAdjustments[entry.id]?.size > 0 ? 'Adjusted Total Daily Milk' : 'Total Daily Milk'}
                                    </div>
                                    {calfFeedingAdjustments[entry.id]?.size > 0 && (
                                      <div className="text-xs text-blue-600 mt-1">
                                        Original: {calfFeedingData[entry.id].totalDailyMilk?.toFixed(1)}L
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Adjustment Notice */}
                                {calfFeedingAdjustments[entry.id]?.size > 0 && (
                                  <Alert className="border-blue-300 bg-blue-100 py-2 px-3">
                                    <AlertTriangle className="h-3 w-3 text-blue-700 flex-shrink-0" />
                                    <AlertDescription className="text-blue-800 text-xs ml-2">
                                      {calfFeedingAdjustments[entry.id].size} calf/calves have adjustments applied
                                    </AlertDescription>
                                  </Alert>
                                )}

                                {/* Calves List */}
                                {calfFeedingData[entry.id].calves && calfFeedingData[entry.id].calves.length > 0 && (
                                  <div className="bg-white p-3 rounded-lg border border-blue-100">
                                    <div className="text-sm font-medium text-gray-900 mb-2">Calves Being Fed:</div>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {calfFeedingData[entry.id].calves.map((calf: any, idx: number) => {
                                        const hasAdjustment = calfFeedingAdjustments[entry.id]?.has(calf.calfId)
                                        const adjustment = calfFeedingAdjustments[entry.id]?.get(calf.calfId)
                                        const adjustedMilk = getAdjustedCalfDailyMilk(entry.id, calf)
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
                                                  {adjustment?.adjustments.length} session{adjustment?.adjustments.length !== 1 ? 's' : ''} adjusted
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
                                {calfFeedingData[entry.id].sessionBreakdown && calfFeedingData[entry.id].sessionBreakdown.length > 0 && (
                                  <div className="bg-white p-3 rounded-lg border border-blue-100">
                                    <div className="text-sm font-medium text-gray-900 mb-2">Feeding Sessions:</div>
                                    <div className="space-y-1">
                                      {calfFeedingData[entry.id].sessionBreakdown.map((session: any) => (
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

                    {/* Volume & Pricing */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Volume & Pricing</h4>
                      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                        <div>
                          <Label htmlFor={`volume-${entry.id}`}>Volume (Liters) *</Label>
                          <Input
                            id={`volume-${entry.id}`}
                            type="number"
                            step="0.1"
                            min="0"
                            value={entry.volume}
                            onChange={(e) => updateEntry(entry.id, 'volume', e.target.value)}
                            placeholder="Enter volume"
                            className={entryErr.volume ? 'border-red-300' : ''}
                          />
                          {entryErr.volume && <p className="text-sm text-red-600 mt-1">{entryErr.volume}</p>}
                        </div>

                        {isPaid && (
                          <div>
                            <Label htmlFor={`price-${entry.id}`}>Price per Liter (KSh) *</Label>
                            <Input
                              id={`price-${entry.id}`}
                              type="number"
                              step="0.01"
                              min="0"
                              value={entry.pricePerLiter}
                              onChange={(e) => updateEntry(entry.id, 'pricePerLiter', e.target.value)}
                              placeholder="Enter price"
                              className={entryErr.pricePerLiter ? 'border-red-300' : ''}
                            />
                            {entryErr.pricePerLiter && <p className="text-sm text-red-600 mt-1">{entryErr.pricePerLiter}</p>}
                          </div>
                        )}
                      </div>

                      {/* Total Calculation */}
                      {entryTotal > 0 && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-green-800">Entry Total:</span>
                            <span className="font-bold text-green-900">
                              KSh {entryTotal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delivery Details */}
                    {showDeliveryDetails && needsDeliveryDetails && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Delivery Details</h4>
                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                          <div>
                            <Label htmlFor={`delivery-date-${entry.id}`}>Delivery Date *</Label>
                            <Input
                              id={`delivery-date-${entry.id}`}
                              type="date"
                              value={entry.deliveryDate}
                              onChange={(e) => updateEntry(entry.id, 'deliveryDate', e.target.value)}
                              className={entryErr.deliveryDate ? 'border-red-300' : ''}
                            />
                            {entryErr.deliveryDate && <p className="text-sm text-red-600 mt-1">{entryErr.deliveryDate}</p>}
                          </div>

                          {showDeliveryTime && (
                            <div>
                              <Label htmlFor={`delivery-time-${entry.id}`}>Delivery Time</Label>
                              <Input
                                id={`delivery-time-${entry.id}`}
                                type="time"
                                value={entry.deliveryTime}
                                onChange={(e) => updateEntry(entry.id, 'deliveryTime', e.target.value)}
                              />
                            </div>
                          )}
                        </div>

                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                          {showDriver && (
                            <div>
                              <Label htmlFor={`driver-${entry.id}`}>Driver Name {settings?.requireDriverDetails && '*'}</Label>
                              <Input
                                id={`driver-${entry.id}`}
                                type="text"
                                value={entry.driverName}
                                onChange={(e) => updateEntry(entry.id, 'driverName', e.target.value)}
                                placeholder="Driver name"
                                className={entryErr.driverName ? 'border-red-300' : ''}
                              />
                              {entryErr.driverName && <p className="text-sm text-red-600 mt-1">{entryErr.driverName}</p>}
                            </div>
                          )}

                          {showVehicle && (
                            <div>
                              <Label htmlFor={`vehicle-${entry.id}`}>Vehicle Number {settings?.requireVehicleDetails && '*'}</Label>
                              <Input
                                id={`vehicle-${entry.id}`}
                                type="text"
                                value={entry.vehicleNumber}
                                onChange={(e) => updateEntry(entry.id, 'vehicleNumber', e.target.value)}
                                placeholder="e.g., KCA 123A"
                                className={entryErr.vehicleNumber ? 'border-red-300' : ''}
                              />
                              {entryErr.vehicleNumber && <p className="text-sm text-red-600 mt-1">{entryErr.vehicleNumber}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Payment Details */}
                    {isPaid && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Payment Details</h4>
                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                          <div>
                            <Label htmlFor={`payment-method-${entry.id}`}>Payment Method</Label>
                            <Select value={entry.paymentMethod} onValueChange={(value) => updateEntry(entry.id, 'paymentMethod', value)}>
                              <SelectTrigger>
                                {entry.paymentMethod ? (
                                  (() => {
                                    const selectedMethod = allowedPaymentMethods.find(m => m.value === entry.paymentMethod)
                                    return selectedMethod ? (
                                      <div className="flex items-center space-x-2">
                                        <span>{selectedMethod.icon}</span>
                                        <span>{selectedMethod.label}</span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-500">Select payment method</span>
                                    )
                                  })()
                                ) : (
                                  <span className="text-gray-500">Select payment method</span>
                                )}
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
                            <Label htmlFor={`payment-date-${entry.id}`}>Expected Payment Date</Label>
                            <Input
                              id={`payment-date-${entry.id}`}
                              type="date"
                              value={entry.expectedPaymentDate}
                              onChange={(e) => updateEntry(entry.id, 'expectedPaymentDate', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <Label htmlFor={`notes-${entry.id}`}>Notes</Label>
                      <Textarea
                        id={`notes-${entry.id}`}
                        value={entry.notes}
                        onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                        placeholder="Any additional notes..."
                        rows={2}
                      />
                    </div>

                    {/* Remove Button */}
                    <div className="pt-4 border-t">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => removeChannelEntry(entry.id)}
                        className="flex items-center space-x-2 w-full"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Remove This Channel</span>
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>

        {/* Error Alert */}
        {errors.submit && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {errors.submit}
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Section */}
        {formData.entries.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="w-5 h-5" />
                <span>Batch Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Channels</p>
                  <p className="text-2xl font-bold text-blue-600">{formData.entries.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Volume</p>
                  <p className="text-2xl font-bold text-blue-600">{cumulativeVolume.toFixed(1)}L</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    KSh {formData.entries.reduce((sum, entry) => sum + getEntryTotal(entry), 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Remaining Volume</p>
                  <p className={`text-2xl font-bold ${(cumulativeAvailable - cumulativeVolume) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {(cumulativeAvailable - cumulativeVolume).toFixed(1)}L
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Buttons */}
        <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'flex-row space-x-4'} pt-4`}>
          <Button
            type="submit"
            disabled={isSubmitting || formData.entries.length === 0}
            className={`${isMobile ? 'w-full' : 'flex-1'} h-12`}
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{editRecord ? 'Updating' : 'Recording'} {formData.entries.length} Distribution{formData.entries.length !== 1 ? 's' : ''}...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>{editRecord ? 'Update Distribution' : 'Record All Distributions'}</span>
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
      </form>
    </div>
  )
}
