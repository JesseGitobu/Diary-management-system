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
  type: 'cooperative' | 'processor' | 'direct' | 'retail'
  contact: string
  pricePerLiter: number
  isActive: boolean
  location?: string
  paymentTerms?: string
  notes?: string
  email?: string
  contactPerson?: string
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
  type: 'cooperative' | 'processor' | 'direct' | 'retail'
  contact: string
  email: string
  contactPerson: string
  pricePerLiter: string
  location: string
  paymentTerms: string
  notes: string
  isActive: boolean
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
    return channelTypes.filter(t => settings.channelTypesEnabled.includes(t.value as 'cooperative' | 'processor' | 'direct' | 'retail'))
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
    isActive: true
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
      isActive: true
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
    if (!formData.contact.trim()) newErrors.contact = 'Contact number is required'
    if (!formData.pricePerLiter) newErrors.pricePerLiter = 'Price per liter is required'
    if (parseFloat(formData.pricePerLiter) <= 0) newErrors.pricePerLiter = 'Price must be greater than 0'
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
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
      contact: channel.contact,
      email: channel.email || '',
      contactPerson: channel.contactPerson || '',
      pricePerLiter: channel.pricePerLiter.toString(),
      location: channel.location || '',
      paymentTerms: channel.paymentTerms || 'Monthly Payment',
      notes: channel.notes || '',
      isActive: channel.isActive
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

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="border-blue-200">
          <CardHeader className={`${isMobile ? 'pb-3' : ''}`}>
            <CardTitle className={`${isMobile ? 'text-lg' : ''}`}>
              {editingChannel ? 'Edit Channel' : 'Add New Channel'}
            </CardTitle>
            <CardDescription>
              {editingChannel ? 'Update channel information' : 'Add a new distribution channel'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Channel Type Selection */}
              <div>
                <Label htmlFor="type">Channel Type *</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value as any)}>
                  <SelectTrigger>
                    <SelectValue />
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
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <div>
                  <Label htmlFor="name">Channel Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Murang'a Dairy Cooperative"
                    className={errors.name ? 'border-red-300' : ''}
                  />
                  {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                    placeholder="Contact person name"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
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
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@example.com"
                    className={errors.email ? 'border-red-300' : ''}
                  />
                  {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                </div>
              </div>

              {/* Pricing and Terms */}
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
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

              {/* Location */}
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., Murang'a Town, Central Kenya"
                />
              </div>

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
              <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'flex-row space-x-4'} pt-4`}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${isMobile ? 'w-full' : 'flex-1'} h-12`}
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
                  className={`${isMobile ? 'w-full' : ''} h-12`}
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Channels List */}
      <div className="space-y-4">
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
              <Card key={channel.id} className={`${!channel.isActive ? 'opacity-60' : ''}`}>
                <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                  {isMobile ? (
                    /* Mobile Layout */
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <TypeIcon className="w-5 h-5 text-gray-600" />
                            <h3 className="font-medium text-gray-900">{channel.name}</h3>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
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
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={channel.isActive}
                            onCheckedChange={(checked) => handleToggleActive(channel.id, checked)}
                            size="sm"
                          />
                        </div>
                      </div>

                      {/* Price */}
                      <div className="bg-green-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">
                          KSh {channel.pricePerLiter}
                        </div>
                        <div className="text-sm text-green-700">per liter</div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{channel.contact}</span>
                        </div>
                        {channel.contactPerson && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <UserCheck className="w-4 h-4" />
                            <span>{channel.contactPerson}</span>
                          </div>
                        )}
                        {channel.location && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>{channel.location}</span>
                          </div>
                        )}
                        {channel.paymentTerms && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <DollarSign className="w-4 h-4" />
                            <span>{channel.paymentTerms}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2 pt-2">
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
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Desktop Layout */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <TypeIcon className="w-8 h-8 text-gray-600" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900">{channel.name}</h3>
                            <Badge className={typeConfig.color}>
                              {typeConfig.label}
                            </Badge>
                            {!channel.isActive && (
                              <Badge className="bg-red-100 text-red-800">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <div className="flex items-center space-x-1">
                              <Phone className="w-4 h-4" />
                              <span>{channel.contact}</span>
                            </div>
                            {channel.contactPerson && (
                              <div className="flex items-center space-x-1">
                                <UserCheck className="w-4 h-4" />
                                <span>{channel.contactPerson}</span>
                              </div>
                            )}
                            {channel.location && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>{channel.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            KSh {channel.pricePerLiter}
                          </div>
                          <div className="text-sm text-gray-500">per liter</div>
                        </div>

                        <div className="flex items-center space-x-3">
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
                KSh {channels.filter(c => c.isActive).reduce((sum, c) => sum + c.pricePerLiter, 0) / Math.max(channels.filter(c => c.isActive).length, 1) || 0}
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