'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { DistributionSettings } from '@/types/production-distribution-settings'

import { 
  Plus, 
  Users, 
  Phone, 
  MapPin, 
  DollarSign, 
  Edit, 
  Trash2, 
  Save,
  X,
  Building2,
  Truck,
  Store,
  UserCheck,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface Channel {
  id: string
  name: string
  type: 'cooperative' | 'processor' | 'direct' | 'retail' | 'other'
  contact: string | null
  pricePerLiter: number | null
  isActive: boolean
  location?: string | null
  paymentTerms?: string | null
  notes?: string | null
  email?: string | null
  contactPerson?: string | null
  isPaidFor?: boolean
  metadata?: {
    storeType?: string
    customerCount?: string
    retailOutlets?: string
    deliveryOptions?: string
    salesMethod?: string
    customerType?: string
    salesFrequency?: string
    buyerDetails?: string
    useReason?: string
    customReason?: string
    authorizationPerson?: string
  }
}

interface ChannelManagerProps {
  farmId: string
  channels: Channel[]
  onSuccess: () => void
  isMobile: boolean
  settings: DistributionSettings | null
}

interface FormData {
  name: string
  type: 'cooperative' | 'processor' | 'direct' | 'retail' | 'other'
  contact: string
  email: string
  contactPerson: string
  pricePerLiter: string
  location: string
  paymentTerms: string
  notes: string
  isActive: boolean
  // Retail specific
  storeType?: string
  customerCount?: string
  retailOutlets?: string
  deliveryOptions?: string
  // Direct Sales specific
  salesMethod?: string
  customerType?: string
  salesFrequency?: string
  buyerDetails?: string
  // Other specific
  useReason?: string
  customReason?: string
  authorizationPerson?: string
  isPaidFor?: boolean
}

const channelTypes = [
  {
    value: 'cooperative',
    label: 'Cooperative',
    icon: Building2,
    description: 'Farmer cooperative societies',
    color: 'bg-green-100 text-green-800'
  },
  {
    value: 'processor',
    label: 'Processor',
    icon: Truck,
    description: 'Milk processing companies',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    value: 'direct',
    label: 'Direct Sale',
    icon: UserCheck,
    description: 'Direct to consumer sales',
    color: 'bg-orange-100 text-orange-800'
  },
  {
    value: 'retail',
    label: 'Retail',
    icon: Store,
    description: 'Retail shops and outlets',
    color: 'bg-purple-100 text-purple-800'
  },
  {
    value: 'other',
    label: 'Other',
    icon: Users,
    description: 'Other distribution channels',
    color: 'bg-gray-100 text-gray-800'
  }
]

const paymentTermsOptions = [
  'Immediate Payment',
  'Weekly Payment',
  'Bi-weekly Payment',
  'Monthly Payment',
  'Net 30 Days',
  'Net 60 Days',
  'Upon Delivery',
  'Custom Terms'
]

export function ChannelManager({
  farmId,
  channels: initialChannels,
  onSuccess,
  isMobile,
  settings
}: ChannelManagerProps) {
  const [channels, setChannels] = useState(initialChannels)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Determine allowed channel types from settings
  const allowedChannelTypes = useMemo(() => {
    if (!settings?.channelTypesEnabled) return channelTypes
    return channelTypes.filter(t => settings.channelTypesEnabled.includes(t.value as 'cooperative' | 'processor' | 'direct' | 'retail' | 'other'))
  }, [settings])

  // Check channel limit
  const isChannelLimitReached = useMemo(() => {
    if (!settings?.maxActiveChannels) return false
    const activeChannels = channels.filter(c => c.isActive).length
    return activeChannels >= settings.maxActiveChannels
  }, [channels, settings])

  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'cooperative',
    contact: '',
    email: '',
    contactPerson: '',
    pricePerLiter: '',
    location: '',
    paymentTerms: 'Monthly Payment',
    notes: '',
    isActive: true,
    storeType: '',
    customerCount: '',
    retailOutlets: '',
    deliveryOptions: '',
    salesMethod: '',
    customerType: '',
    salesFrequency: '',
    buyerDetails: '',
    useReason: 'home',
    customReason: '',
    authorizationPerson: '',
    isPaidFor: true
  })

  const resetForm = () => {
    // Set default type to first available
    const defaultType = allowedChannelTypes[0]?.value || 'cooperative' as any
    setFormData({
      name: '',
      type: defaultType,
      contact: '',
      email: '',
      contactPerson: '',
      pricePerLiter: '',
      location: '',
      paymentTerms: 'Monthly Payment',
      notes: '',
      isActive: true,
      storeType: '',
      customerCount: '',
      retailOutlets: '',
      deliveryOptions: '',
      salesMethod: '',
      customerType: '',
      salesFrequency: '',
      buyerDetails: '',
      useReason: 'home',
      customReason: '',
      authorizationPerson: '',
      isPaidFor: true
    })
    setErrors({})
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Channel name is required'
    if (!formData.contact.trim() && formData.type !== 'other') newErrors.contact = 'Contact number is required'
    
    // Price and payment terms only required for paid Other type or other types (not unpaid Other)
    if (formData.type !== 'other' || formData.isPaidFor) {
      if (!formData.pricePerLiter) newErrors.pricePerLiter = 'Price per liter is required'
      if (formData.pricePerLiter && parseFloat(formData.pricePerLiter) <= 0) newErrors.pricePerLiter = 'Price must be greater than 0'
    }
    
    // Email validation only if not Direct Sales and email is provided
    if (formData.email && formData.type !== 'direct' && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Type-specific validation
    if (formData.type === 'retail') {
      if (!formData.storeType) newErrors.storeType = 'Store type is required'
    }

    if (formData.type === 'direct') {
      if (!formData.salesMethod) newErrors.salesMethod = 'Sales method is required'
      if (!formData.customerType) newErrors.customerType = 'Customer type is required'
      if (!formData.salesFrequency) newErrors.salesFrequency = 'Sales frequency is required'
    }

    if (formData.type === 'other') {
      if (!formData.contactPerson.trim()) newErrors.contactPerson = 'Person collecting is required'
      if (formData.useReason === 'custom' && !(formData.customReason || '').trim()) {
        newErrors.customReason = 'Please specify the reason'
      }
      if (!(formData.authorizationPerson || '').trim()) newErrors.authorizationPerson = 'Authorization person is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const url = editingChannel 
        ? `/api/distribution/channels/${editingChannel.id}`
        : '/api/distribution/channels'
      
      const method = editingChannel ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          ...formData,
          pricePerLiter: parseFloat(formData.pricePerLiter)
        })
      })

      if (!response.ok) throw new Error('Failed to save channel')

      const savedChannel = await response.json()

      if (editingChannel) {
        setChannels(prev => prev.map(c => c.id === editingChannel.id ? savedChannel : c))
      } else {
        setChannels(prev => [...prev, savedChannel])
      }

      setShowAddForm(false)
      setEditingChannel(null)
      resetForm()
      onSuccess()
    } catch (error) {
      console.error('Error saving channel:', error)
      setErrors({ submit: 'Failed to save channel. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel)
    setFormData({
      name: channel.name,
      type: channel.type,
      contact: channel.contact || '',
      email: channel.email || '',
      contactPerson: channel.contactPerson || '',
      pricePerLiter: channel.pricePerLiter ? channel.pricePerLiter.toString() : '',
      location: channel.location || '',
      paymentTerms: channel.paymentTerms || 'Monthly Payment',
      notes: channel.notes || '',
      isActive: channel.isActive,
      storeType: '',
      customerCount: '',
      retailOutlets: '',
      deliveryOptions: '',
      salesMethod: '',
      customerType: '',
      salesFrequency: '',
      buyerDetails: '',
      useReason: 'home',
      customReason: '',
      authorizationPerson: '',
      isPaidFor: true
    })
    setShowAddForm(true)
  }

  const handleDelete = async (channelId: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) return

    try {
      const response = await fetch(`/api/distribution/channels/${channelId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete channel')

      setChannels(prev => prev.filter(c => c.id !== channelId))
    } catch (error) {
      console.error('Error deleting channel:', error)
      alert('Failed to delete channel. Please try again.')
    }
  }

  const handleToggleActive = async (channelId: string, isActive: boolean) => {
    // Check limit before enabling
    if (isActive && isChannelLimitReached) {
      alert(`Cannot enable channel. Maximum active channels limit (${settings?.maxActiveChannels}) reached.`)
      return
    }

    try {
      const response = await fetch(`/api/distribution/channels/${channelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      })

      if (!response.ok) throw new Error('Failed to update channel status')

      setChannels(prev => prev.map(c => 
        c.id === channelId ? { ...c, isActive } : c
      ))
    } catch (error) {
      console.error('Error updating channel status:', error)
    }
  }

  const getChannelTypeConfig = (type: string) => {
    return channelTypes.find(t => t.value === type) || channelTypes[0]
  }

  const renderMetadataDetails = (channel: Channel) => {
    const metadata = channel.metadata || {}
    
    if (channel.type === 'retail') {
      return (
        <div className="space-y-2">
          {metadata.storeType && <div><span className="font-medium text-gray-700">Store Type:</span> <span className="text-gray-600">{metadata.storeType}</span></div>}
          {metadata.customerCount && <div><span className="font-medium text-gray-700">Daily Customers:</span> <span className="text-gray-600">{metadata.customerCount}</span></div>}
          {metadata.retailOutlets && <div><span className="font-medium text-gray-700">Outlets:</span> <span className="text-gray-600">{metadata.retailOutlets}</span></div>}
          {metadata.deliveryOptions && <div><span className="font-medium text-gray-700">Delivery:</span> <span className="text-gray-600">{metadata.deliveryOptions}</span></div>}
        </div>
      )
    }
    
    if (channel.type === 'direct') {
      return (
        <div className="space-y-2">
          {metadata.salesMethod && <div><span className="font-medium text-gray-700">Sales Method:</span> <span className="text-gray-600">{metadata.salesMethod}</span></div>}
          {metadata.customerType && <div><span className="font-medium text-gray-700">Customer Type:</span> <span className="text-gray-600">{metadata.customerType}</span></div>}
          {metadata.salesFrequency && <div><span className="font-medium text-gray-700">Frequency:</span> <span className="text-gray-600">{metadata.salesFrequency}</span></div>}
          {metadata.buyerDetails && <div><span className="font-medium text-gray-700">Buyer Details:</span> <span className="text-gray-600">{metadata.buyerDetails}</span></div>}
        </div>
      )
    }
    
    if (channel.type === 'other') {
      return (
        <div className="space-y-2">
          {metadata.useReason && <div><span className="font-medium text-gray-700">Use Reason:</span> <span className="text-gray-600">{metadata.useReason}</span></div>}
          {metadata.customReason && <div><span className="font-medium text-gray-700">Custom Reason:</span> <span className="text-gray-600">{metadata.customReason}</span></div>}
          {metadata.authorizationPerson && <div><span className="font-medium text-gray-700">Authorization Person:</span> <span className="text-gray-600">{metadata.authorizationPerson}</span></div>}
          <div><span className="font-medium text-gray-700">Payment Status:</span> <span className="text-gray-600">{channel.isPaidFor ? 'Paid For' : 'Unpaid For'}</span></div>
        </div>
      )
    }
    
    return null
  }

  return (
    <div className={`space-y-6 ${isMobile ? '' : 'max-w-4xl mx-auto'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 flex items-center space-x-2`}>
            <Users className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-blue-600`} />
            <span>Distribution Channels</span>
          </h2>
          <p className={`text-gray-600 mt-1 ${isMobile ? 'text-sm' : ''}`}>
            Manage your milk distribution partners and pricing
          </p>
        </div>
        
        {settings?.enableChannelManagement !== false && (
          <Button
            onClick={() => {
              if (isChannelLimitReached && !editingChannel) {
                alert(`Maximum active channels limit (${settings?.maxActiveChannels}) reached.`)
                return
              }
              resetForm()
              setEditingChannel(null)
              setShowAddForm(true)
            }}
            className={isMobile ? 'p-3' : ''}
            disabled={isChannelLimitReached && !editingChannel}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isMobile ? 'Add' : 'Add Channel'}
          </Button>
        )}
      </div>
      
      {isChannelLimitReached && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
             Maximum active channels limit ({settings?.maxActiveChannels}) reached. Disable an existing channel to add a new one.
          </AlertDescription>
        </Alert>
      )}

      {/* Add/Edit Form Modal */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChannel ? 'Edit Channel' : 'Add New Channel'}
            </DialogTitle>
            <DialogDescription>
              {editingChannel ? 'Update channel information' : 'Add a new distribution channel'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pr-4">
            {/* Channel Type Selection */}
            <div>
              <Label htmlFor="type">Channel Type *</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a channel type">
                    {formData.type ? (() => {
                      const selected = allowedChannelTypes.find(t => t.value === formData.type)
                      const Icon = selected?.icon
                      return selected ? (
                        <div className="flex items-center space-x-2">
                          {Icon && <Icon className="w-4 h-4" />}
                          <span>{selected.label}</span>
                        </div>
                      ) : null
                    })() : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {allowedChannelTypes.map(type => {
                    const Icon = type.icon
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4" />
                          <div>
                            <div>{type.label}</div>
                            <div className="text-xs text-gray-500">{type.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Channel Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={
                    formData.type === 'cooperative' ? 'e.g., Murang\'a Dairy Cooperative' :
                    formData.type === 'processor' ? 'e.g., Kenya Milk Industries' :
                    formData.type === 'retail' ? 'e.g., Nairobi Supermarket' :
                    formData.type === 'direct' ? 'e.g., Direct Buyer Name' :
                    'e.g., Other Channel'
                  }
                  className={errors.name ? 'border-red-300' : ''}
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="contactPerson">
                  {formData.type === 'other' ? 'Person collecting *' : 'Contact Person'}
                </Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  placeholder={formData.type === 'other' ? 'Person authorized to receive milk' : 'Contact person name'}
                  className={formData.type === 'other' && errors.contactPerson ? 'border-red-300' : ''}
                />
                {formData.type === 'other' && errors.contactPerson && <p className="text-sm text-red-600 mt-1">{errors.contactPerson}</p>}
              </div>
            </div>

            {/* Retail Specific Fields */}
            {formData.type === 'retail' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <Label htmlFor="storeType">Store Type *</Label>
                  <Select value={formData.storeType || ''} onValueChange={(value) => handleInputChange('storeType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select store type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supermarket">Supermarket</SelectItem>
                      <SelectItem value="convenience_store">Convenience Store</SelectItem>
                      <SelectItem value="kiosk">Kiosk</SelectItem>
                      <SelectItem value="restaurant">Restaurant/Cafe</SelectItem>
                      <SelectItem value="hotel">Hotel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customerCount">Approximate Daily Customers</Label>
                  <Input
                    id="customerCount"
                    type="number"
                    value={formData.customerCount || ''}
                    onChange={(e) => handleInputChange('customerCount', e.target.value)}
                    placeholder="e.g., 500"
                  />
                </div>
                <div>
                  <Label htmlFor="retailOutlets">Number of Retail Outlets</Label>
                  <Input
                    id="retailOutlets"
                    type="number"
                    value={formData.retailOutlets || ''}
                    onChange={(e) => handleInputChange('retailOutlets', e.target.value)}
                    placeholder="e.g., 1"
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryOptions">Preferred Delivery Schedule</Label>
                  <Select value={formData.deliveryOptions || ''} onValueChange={(value) => handleInputChange('deliveryOptions', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="twice_weekly">Twice Weekly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Direct Sales Specific Fields */}
            {formData.type === 'direct' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div>
                  <Label htmlFor="salesMethod">Sales Method *</Label>
                  <Select value={formData.salesMethod || ''} onValueChange={(value) => handleInputChange('salesMethod', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Farm Pickup</SelectItem>
                      <SelectItem value="delivery">Farm Delivery</SelectItem>
                      <SelectItem value="both">Both Pickup & Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customerType">Customer Type *</Label>
                  <Select value={formData.customerType || ''} onValueChange={(value) => handleInputChange('customerType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual Customers</SelectItem>
                      <SelectItem value="households">Households</SelectItem>
                      <SelectItem value="institutions">Institutions/Organizations</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="salesFrequency">Sales Frequency *</Label>
                  <Select value={formData.salesFrequency || ''} onValueChange={(value) => handleInputChange('salesFrequency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="alternate_days">Alternate Days</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="as_needed">As Needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="buyerDetails">Buyer Details</Label>
                  <Input
                    id="buyerDetails"
                    value={formData.buyerDetails || ''}
                    onChange={(e) => handleInputChange('buyerDetails', e.target.value)}
                    placeholder="e.g., Primary buyers, buyer preferences"
                  />
                </div>
              </div>
            )}

            {/* Other Specific Fields */}
            {formData.type === 'other' && (
              <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <Label htmlFor="useReason">Use Reason *</Label>
                  <Select value={formData.useReason || 'home'} onValueChange={(value) => handleInputChange('useReason', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home Use</SelectItem>
                      <SelectItem value="kitchen">Kitchen Use</SelectItem>
                      <SelectItem value="wastage">Wastage/Spillage</SelectItem>
                      <SelectItem value="individual">Individual Use</SelectItem>
                      <SelectItem value="custom">Other (Please Specify)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.useReason === 'custom' && (
                  <div>
                    <Label htmlFor="customReason">Please Specify Reason *</Label>
                    <Input
                      id="customReason"
                      value={formData.customReason || ''}
                      onChange={(e) => handleInputChange('customReason', e.target.value)}
                      placeholder="e.g., Animal feed, testing, etc."
                      className={errors.customReason ? 'border-red-300' : ''}
                    />
                    {errors.customReason && <p className="text-sm text-red-600 mt-1">{errors.customReason}</p>}
                  </div>
                )}
                <div>
                  <Label htmlFor="authorizationPerson">Authorization Person *</Label>
                  <Input
                    id="authorizationPerson"
                    value={formData.authorizationPerson || ''}
                    onChange={(e) => handleInputChange('authorizationPerson', e.target.value)}
                    placeholder="Person approving this use"
                    className={errors.authorizationPerson ? 'border-red-300' : ''}
                  />
                  {errors.authorizationPerson && <p className="text-sm text-red-600 mt-1">{errors.authorizationPerson}</p>}
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPaidFor"
                    checked={formData.isPaidFor}
                    onCheckedChange={(checked) => handleInputChange('isPaidFor', checked)}
                  />
                  <Label htmlFor="isPaidFor">
                    {formData.isPaidFor ? 'Paid For' : 'Unpaid For'}
                  </Label>
                </div>
              </div>
            )}

            {/* Contact Information - Hide for Other type */}
            {formData.type !== 'other' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact">Phone Number *</Label>
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) => handleInputChange('contact', e.target.value)}
                    placeholder="e.g., +254700123456"
                    className={errors.contact ? 'border-red-300' : ''}
                  />
                  {errors.contact && <p className="text-sm text-red-600 mt-1">{errors.contact}</p>}
                </div>

                <div>
                  <Label htmlFor="email">Email Address{formData.type === 'direct' ? '' : ''}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@example.com"
                    className={errors.email && formData.type !== 'direct' ? 'border-red-300' : ''}
                  />
                  {errors.email && formData.type !== 'direct' && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                </div>
              </div>
            )}

            {/* Pricing and Terms - Hide for unpaid Other type */}
            {!(formData.type === 'other' && !formData.isPaidFor) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pricePerLiter">Price per Liter (KSh) *</Label>
                  <Input
                    id="pricePerLiter"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pricePerLiter}
                    onChange={(e) => handleInputChange('pricePerLiter', e.target.value)}
                    placeholder="e.g., 45.00"
                    className={errors.pricePerLiter ? 'border-red-300' : ''}
                  />
                  {errors.pricePerLiter && <p className="text-sm text-red-600 mt-1">{errors.pricePerLiter}</p>}
                </div>

                <div>
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Select value={formData.paymentTerms} onValueChange={(value) => handleInputChange('paymentTerms', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTermsOptions.map(term => (
                        <SelectItem key={term} value={term}>
                          {term}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Location - Hide for Other type */}
            {formData.type !== 'other' && (
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., Murang'a Town, Central Kenya"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional information about this channel..."
                rows={3}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
              <Label htmlFor="isActive">Active Channel</Label>
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

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-12"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="w-5 h-5" />
                    <span>{editingChannel ? 'Update Channel' : 'Add Channel'}</span>
                  </div>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingChannel(null)
                  resetForm()
                }}
                className="flex-1 h-12"
              >
                <X className="w-5 h-5 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Channels List */}
      <div className={`${isMobile ? 'max-h-[500px]' : 'max-h-[600px]'} overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 space-y-4`}>
        {channels.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No distribution channels yet</p>
              <p className="text-gray-400 text-sm mb-4">Add your first distribution channel to get started</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Channel
              </Button>
            </CardContent>
          </Card>
        ) : (
          channels.map((channel) => {
            const typeConfig = getChannelTypeConfig(channel.type)
            const TypeIcon = typeConfig.icon

            return (
              <Card key={channel.id} className={`${!channel.isActive ? 'opacity-60' : ''} hover:shadow-lg transition-shadow`}>
                <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                  {isMobile ? (
                    /* Mobile Layout */
                    <div className="space-y-4">
                      {/* Header with Type and Status */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <TypeIcon className="w-5 h-5 text-gray-600" />
                            <h3 className="font-bold text-lg text-gray-900">{channel.name}</h3>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={typeConfig.color}>
                              {typeConfig.label}
                            </Badge>
                            {!channel.isActive && (
                              <Badge className="bg-red-100 text-red-800">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={channel.isActive}
                          onCheckedChange={(checked) => handleToggleActive(channel.id, checked)}
                          size="sm"
                        />
                      </div>

                      {/* Price Section */}
                      {channel.pricePerLiter !== null && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <div className="text-sm text-gray-600 font-medium">Price per Liter</div>
                          <div className="text-2xl font-bold text-green-600">KSh {channel.pricePerLiter}</div>
                        </div>
                      )}

                      {/* Contact & Person Section */}
                      {(channel.contact || channel.contactPerson) && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-2">
                          <div className="text-sm font-medium text-gray-700">Contact Information</div>
                          {channel.contact && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700">{channel.contact}</span>
                            </div>
                          )}
                          {channel.contactPerson && (
                            <div className="flex items-center space-x-2 text-sm">
                              <UserCheck className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700">{channel.contactPerson}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Type-Specific Details */}
                      {renderMetadataDetails(channel) && (
                        <div className={`p-3 rounded-lg border ${
                          channel.type === 'retail' ? 'bg-blue-50 border-blue-200' :
                          channel.type === 'direct' ? 'bg-orange-50 border-orange-200' :
                          'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="text-sm font-medium text-gray-700 mb-2">Details</div>
                          <div className="text-sm space-y-1">
                            {renderMetadataDetails(channel)}
                          </div>
                        </div>
                      )}

                      {/* Email & Location */}
                      <div className="space-y-2 text-sm">
                        {channel.email && (
                          <div><span className="font-medium text-gray-700">Email:</span> <span className="text-gray-600">{channel.email}</span></div>
                        )}
                        {channel.location && (
                          <div className="flex items-start space-x-2">
                            <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                            <span className="text-gray-600">{channel.location}</span>
                          </div>
                        )}
                        {channel.paymentTerms && (
                          <div className="flex items-start space-x-2">
                            <DollarSign className="w-4 h-4 text-gray-500 mt-0.5" />
                            <span className="text-gray-600">{channel.paymentTerms}</span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {channel.notes && (
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          <div className="text-sm font-medium text-gray-700">Notes</div>
                          <div className="text-sm text-gray-600 mt-1">{channel.notes}</div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(channel)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(channel.id)}
                          className="text-red-600 hover:text-red-700 flex-1"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Desktop Layout */
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between border-b pb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <TypeIcon className="w-8 h-8 text-gray-600" />
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{channel.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={typeConfig.color}>
                                  {typeConfig.label}
                                </Badge>
                                {!channel.isActive && (
                                  <Badge className="bg-red-100 text-red-800">
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={channel.isActive}
                            onCheckedChange={(checked) => handleToggleActive(channel.id, checked)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(channel)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(channel.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Content Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        {/* Left Column - Contact & Person */}
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Information</div>
                            <div className="mt-2 space-y-2">
                              {channel.contact && (
                                <div className="flex items-center space-x-2 text-sm">
                                  <Phone className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-700">{channel.contact}</span>
                                </div>
                              )}
                              {channel.contactPerson && (
                                <div className="flex items-center space-x-2 text-sm">
                                  <UserCheck className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-700">{channel.contactPerson}</span>
                                </div>
                              )}
                              {!channel.contact && !channel.contactPerson && (
                                <span className="text-sm text-gray-400">No contact info</span>
                              )}
                            </div>
                          </div>

                          {channel.email && (
                            <div>
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</div>
                              <div className="text-sm text-gray-700 mt-1">{channel.email}</div>
                            </div>
                          )}

                          {channel.location && (
                            <div>
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</div>
                              <div className="flex items-start space-x-2 text-sm mt-1">
                                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700">{channel.location}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Middle Column - Pricing & Terms */}
                        <div className="space-y-3 bg-green-50 p-4 rounded-lg border border-green-200">
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pricing</div>
                            {channel.pricePerLiter !== null ? (
                              <div className="text-3xl font-bold text-green-600 mt-2">KSh {channel.pricePerLiter}</div>
                            ) : (
                              <div className="text-sm text-gray-600 mt-2">No price set</div>
                            )}
                          </div>

                          {channel.paymentTerms && (
                            <div className="pt-3 border-t border-green-200">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Terms</div>
                              <div className="flex items-center space-x-2 text-sm mt-2">
                                <DollarSign className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-700">{channel.paymentTerms}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column - Type-Specific Details */}
                        {renderMetadataDetails(channel) && (
                          <div className={`p-4 rounded-lg border ${
                            channel.type === 'retail' ? 'bg-blue-50 border-blue-200' :
                            channel.type === 'direct' ? 'bg-orange-50 border-orange-200' :
                            'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              {channel.type === 'retail' ? 'Retail Details' :
                               channel.type === 'direct' ? 'Direct Sales Details' :
                               'Other Details'}
                            </div>
                            <div className="mt-3 space-y-2 text-sm">
                              {renderMetadataDetails(channel)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Notes Section */}
                      {channel.notes && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-4">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Additional Notes</div>
                          <div className="text-sm text-gray-700 mt-2">{channel.notes}</div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Summary Stats */}
      {channels.length > 0 && (
        <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-4`}>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {channels.length}
              </div>
              <div className="text-sm text-gray-500">Total Channels</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {channels.filter(c => c.isActive).length}
              </div>
              <div className="text-sm text-gray-500">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                KSh {(channels.filter(c => c.isActive).reduce((sum, c) => sum + (c.pricePerLiter || 0), 0) / Math.max(channels.filter(c => c.isActive).length, 1)) || 0}
              </div>
              <div className="text-sm text-gray-500">Avg Price</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Array.from(new Set(channels.map(c => c.type))).length}
              </div>
              <div className="text-sm text-gray-500">Channel Types</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}