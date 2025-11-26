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
  CheckCircle
} from 'lucide-react'

interface Channel {
  id: string
  name: string
  type: 'cooperative' | 'processor' | 'direct' | 'retail'
  contact: string
  pricePerLiter: number
  isActive: boolean
  location?: string
  paymentTerms?: string
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
  retail: 'bg-purple-100 text-purple-800'
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

  // Initialize defaults based on settings
  useEffect(() => {
    if (settings?.defaultPaymentMethod) {
      setFormData(prev => ({ 
        ...prev, 
        paymentMethod: settings.defaultPaymentMethod as string 
      }))
    }
  }, [settings])

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
        setFormData(prev => ({
          ...prev,
          pricePerLiter: channel.pricePerLiter.toString()
        }))
      }
    }
  }, [formData.channelId, channels])

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
    if (!formData.volume) newErrors.volume = 'Please enter volume'
    if (parseFloat(formData.volume) <= 0) newErrors.volume = 'Volume must be greater than 0'
    
    // Check available volume unless overdistribution is allowed
    const canOverdistribute = settings?.allowOverdistribution
    if (!canOverdistribute && parseFloat(formData.volume) > availableVolume) {
      newErrors.volume = `Volume cannot exceed available ${availableVolume.toFixed(1)}L`
    }
    
    if (!formData.pricePerLiter) newErrors.pricePerLiter = 'Please enter price per liter'
    if (parseFloat(formData.pricePerLiter) <= 0) newErrors.pricePerLiter = 'Price must be greater than 0'
    if (!formData.deliveryDate) newErrors.deliveryDate = 'Please select delivery date'
    
    // Conditional validation based on settings
    const deliveryTrackingEnabled = settings?.enableDeliveryTracking !== false
    if (deliveryTrackingEnabled) {
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
      const response = await fetch('/api/distribution/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          ...formData,
          totalAmount: calculatedTotal,
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
        <AlertDescription className="flex items-center justify-between">
          <span>Available for distribution: <strong>{availableVolume.toFixed(1)}L</strong></span>
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
                    <SelectValue placeholder="Choose distribution channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.filter(c => c.isActive).map(channel => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-2">
                            <span>{channel.name}</span>
                            <Badge className={channelTypeColors[channel.type]}>
                              {channel.type}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-500">
                            KSh {channel.pricePerLiter}/L
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.channelId && <p className="text-sm text-red-600 mt-1">{errors.channelId}</p>}
              </div>

              {/* Selected Channel Info */}
              {selectedChannel && (
                <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{selectedChannel.name}</span>
                    <Badge className={channelTypeColors[selectedChannel.type]}>
                      {selectedChannel.type}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Phone className="w-4 h-4" />
                      <span>{selectedChannel.contact}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4" />
                      <span>KSh {selectedChannel.pricePerLiter}/L</span>
                    </div>
                  </div>
                </div>
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
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <div>
                <Label htmlFor="volume">Volume (Liters) *</Label>
                <Input
                  id="volume"
                  type="number"
                  step="0.1"
                  min="0"
                  max={settings?.allowOverdistribution ? undefined : availableVolume}
                  value={formData.volume}
                  onChange={(e) => handleInputChange('volume', e.target.value)}
                  placeholder="Enter volume in liters"
                  className={errors.volume ? 'border-red-300' : ''}
                />
                {errors.volume && <p className="text-sm text-red-600 mt-1">{errors.volume}</p>}
              </div>

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
          </CardContent>
        </Card>

        {/* Delivery Details */}
        {showDeliveryDetails && (
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
            disabled={isSubmitting || (!settings?.allowOverdistribution && availableVolume <= 0)}
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
        {isMobile && availableVolume > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-gray-900">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('volume', Math.min(50, availableVolume).toString())}
              >
                Set 50L
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('volume', Math.min(100, availableVolume).toString())}
              >
                Set 100L
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('volume', (availableVolume / 2).toString())}
              >
                Half Available
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleInputChange('volume', availableVolume.toString())}
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