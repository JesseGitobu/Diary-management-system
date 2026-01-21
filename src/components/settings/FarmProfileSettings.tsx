// src/components/settings/FarmProfileSettings.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  Ruler,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface FarmProfileSettingsProps {
  farmId: string | null // Allow null for new farms
  userRole: string
  initialData: {
    name: string
    owner_name: string
    owner_phone: string
    owner_email: string
    farm_size_acres: number
    total_cows: number
    farm_type: 'Dairy Cattle' | 'Dairy Goat' | 'Mixed Dairy'
    county: string
    sub_county: string
    village: string
    preferred_currency: 'KSH' | 'USD'
    preferred_volume_unit: 'liters' | 'gallons'
    description?: string
  }
  isNewFarm?: boolean
}

export function FarmProfileSettings({ 
  farmId, 
  userRole, 
  initialData,
  isNewFarm = false 
}: FarmProfileSettingsProps) {
  const router = useRouter()
  const { isMobile } = useDeviceInfo()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Kenyan counties for location dropdown
  const kenyanCounties = [
    'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
    'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
    'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
    'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a',
    'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
    'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia',
    'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
  ]

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    // Clear success message when user makes changes
    if (saveSuccess) {
      setSaveSuccess(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Farm name is required'
    }

    if (!formData.owner_name.trim()) {
      newErrors.owner_name = 'Owner name is required'
    }

    if (!formData.owner_phone.trim()) {
      newErrors.owner_phone = 'Owner phone is required'
    } else if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.owner_phone)) {
      newErrors.owner_phone = 'Please enter a valid phone number'
    }

    if (!formData.owner_email.trim()) {
      newErrors.owner_email = 'Owner email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.owner_email)) {
      newErrors.owner_email = 'Please enter a valid email address'
    }

    if (formData.farm_size_acres <= 0) {
      newErrors.farm_size_acres = 'Farm size must be greater than 0'
    }

    if (formData.total_cows < 0) {
      newErrors.total_cows = 'Number of cows cannot be negative'
    }

    if (!formData.county) {
      newErrors.county = 'County is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      // Scroll to first error
      const firstError = Object.keys(errors)[0]
      const element = document.getElementById(firstError)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setLoading(true)
    setSaveSuccess(false)

    try {
      // Use 'new' as farmId if creating a new farm, otherwise use existing farmId
      const effectiveFarmId = farmId || 'new'
      
      console.log('🔄 Saving farm profile...', { farmId: effectiveFarmId, isNewFarm })

      const response = await fetch(`/api/farms/${effectiveFarmId}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update farm profile')
      }

      console.log('✅ Profile saved successfully:', data)

      // Show success message
      setSaveSuccess(true)

      // If this was a new farm, redirect to dashboard with the new farm ID
      if (data.isNewFarm && data.farmId) {
        console.log('🔄 New farm created, redirecting to dashboard...')
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1500)
      } else {
        // Just refresh the page data for existing farms
        setTimeout(() => {
          router.refresh()
        }, 1500)
      }
      
    } catch (error) {
      console.error('❌ Error saving farm profile:', error)
      alert(error instanceof Error ? error.message : 'Failed to save farm profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (isNewFarm) {
      router.push('/dashboard')
    } else {
      router.push('/dashboard/settings')
    }
  }

  const canEdit = ['farm_owner', 'farm_manager'].includes(userRole)

  // Load synced values from `farm_profiles` if available for this farm
  useEffect(() => {
    if (!farmId) return

    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch(`/api/farms/${farmId}/farm-profile`)
        if (!res.ok) return
        const json = await res.json()
        const profile = json.data || json
        if (cancelled || !profile) return

        // Map farm_profiles fields to this form's shape
        const mapped: Partial<typeof formData> = {}
        if (profile.farm_name) mapped.name = profile.farm_name
        if (profile.herd_size !== undefined && profile.herd_size !== null) mapped.total_cows = profile.herd_size
        // if (profile.location) {
        //   const parts = profile.location.split(',').map((s: string) => s.trim())
        //   if (parts[0]) mapped.county = parts[0]
        //   if (parts[1]) mapped.sub_county = parts[1]
        //   if (parts[2]) mapped.village = parts[2]
        // }

        if (Object.keys(mapped).length > 0) {
          setFormData(prev => ({ ...prev, ...mapped }))
        }
      } catch (err) {
        console.warn('Failed to load farm_profiles for farm:', farmId, err)
      }
    })()

    return () => { cancelled = true }
  }, [farmId])

  return (
    <div className={`
      ${isMobile ? 'px-4 py-4' : 'dashboard-container'} 
      pb-20 lg:pb-6
    `}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isNewFarm ? 'Back to Dashboard' : 'Back to Settings'}</span>
          </Button>
        </div>
        
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              {isNewFarm ? 'Set Up Your Farm' : 'Farm Profile'}
            </h1>
            <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
              {isNewFarm 
                ? 'Complete your farm information to get started'
                : 'Manage your farm\'s basic information and preferences'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <p className="text-green-800 font-medium">
              {isNewFarm ? 'Farm created successfully!' : 'Changes saved successfully!'}
            </p>
            <p className="text-green-700 text-sm">
              {isNewFarm ? 'Redirecting to your dashboard...' : 'Your farm profile has been updated.'}
            </p>
          </div>
        </div>
      )}

      {/* New Farm Notice */}
      {isNewFarm && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-blue-800 font-medium">Welcome! Let's set up your farm</p>
            <p className="text-blue-700 text-sm">
              Fill in your farm details below. You can always update this information later from Settings.
            </p>
          </div>
        </div>
      )}

      {/* Permission Warning */}
      {!canEdit && !isNewFarm && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">Read-only Access</p>
            <p className="text-yellow-700 text-sm">
              You can view farm profile information but cannot make changes. Contact the farm owner for edit access.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5" />
              <span>Basic Information</span>
            </CardTitle>
            <CardDescription>
              Essential details about your farm
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Farm Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={!canEdit && !isNewFarm}
                  className={errors.name ? 'border-red-500' : ''}
                  placeholder="e.g., Green Valley Dairy Farm"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="farm_type">Farm Type</Label>
                <Select
                  value={formData.farm_type}
                  onValueChange={(value) => handleInputChange('farm_type', value)}
                  disabled={!canEdit && !isNewFarm}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dairy Cattle">Dairy Cattle</SelectItem>
                    <SelectItem value="Dairy Goat">Dairy Goat</SelectItem>
                    <SelectItem value="Mixed Dairy">Mixed Dairy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Farm Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={!canEdit && !isNewFarm}
                placeholder="Brief description of your farm (optional)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Owner Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Owner Information</span>
            </CardTitle>
            <CardDescription>
              Contact details for the farm owner
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owner_name">Owner Name *</Label>
                <Input
                  id="owner_name"
                  value={formData.owner_name}
                  onChange={(e) => handleInputChange('owner_name', e.target.value)}
                  disabled={!canEdit && !isNewFarm}
                  className={errors.owner_name ? 'border-red-500' : ''}
                  placeholder="e.g., John Doe"
                />
                {errors.owner_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.owner_name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="owner_phone">Phone Number *</Label>
                <Input
                  id="owner_phone"
                  value={formData.owner_phone}
                  onChange={(e) => handleInputChange('owner_phone', e.target.value)}
                  disabled={!canEdit && !isNewFarm}
                  placeholder="+254712345678"
                  className={errors.owner_phone ? 'border-red-500' : ''}
                />
                {errors.owner_phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.owner_phone}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="owner_email">Email Address *</Label>
              <Input
                id="owner_email"
                type="email"
                value={formData.owner_email}
                onChange={(e) => handleInputChange('owner_email', e.target.value)}
                disabled={!canEdit && !isNewFarm}
                className={errors.owner_email ? 'border-red-500' : ''}
                placeholder="owner@example.com"
              />
              {errors.owner_email && (
                <p className="text-red-500 text-sm mt-1">{errors.owner_email}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Farm Size & Capacity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Ruler className="w-5 h-5" />
              <span>Farm Size & Capacity</span>
            </CardTitle>
            <CardDescription>
              Physical dimensions and livestock capacity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="farm_size_acres">Farm Size (Acres) *</Label>
                <Input
                  id="farm_size_acres"
                  type="number"
                  value={formData.farm_size_acres}
                  onChange={(e) => handleInputChange('farm_size_acres', parseFloat(e.target.value) || 0)}
                  disabled={!canEdit && !isNewFarm}
                  min="0"
                  step="0.1"
                  className={errors.farm_size_acres ? 'border-red-500' : ''}
                />
                {errors.farm_size_acres && (
                  <p className="text-red-500 text-sm mt-1">{errors.farm_size_acres}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="total_cows">Total Number of Cows</Label>
                <Input
                  id="total_cows"
                  type="number"
                  value={formData.total_cows}
                  onChange={(e) => handleInputChange('total_cows', parseInt(e.target.value) || 0)}
                  disabled={!canEdit && !isNewFarm}
                  min="0"
                  className={errors.total_cows ? 'border-red-500' : ''}
                />
                {errors.total_cows && (
                  <p className="text-red-500 text-sm mt-1">{errors.total_cows}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Location</span>
            </CardTitle>
            <CardDescription>
              Geographic location for regional insights and services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="county">County *</Label>
                <Select
                  value={formData.county}
                  onValueChange={(value) => handleInputChange('county', value)}
                  disabled={!canEdit && !isNewFarm}
                >
                  <SelectTrigger className={errors.county ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select county" />
                  </SelectTrigger>
                  <SelectContent>
                    {kenyanCounties.map((county) => (
                      <SelectItem key={county} value={county}>
                        {county}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.county && (
                  <p className="text-red-500 text-sm mt-1">{errors.county}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="sub_county">Sub-County/Location</Label>
                <Input
                  id="sub_county"
                  value={formData.sub_county}
                  onChange={(e) => handleInputChange('sub_county', e.target.value)}
                  disabled={!canEdit && !isNewFarm}
                  placeholder="e.g., Kikuyu"
                />
              </div>
              
              <div>
                <Label htmlFor="village">Village/Ward</Label>
                <Input
                  id="village"
                  value={formData.village}
                  onChange={(e) => handleInputChange('village', e.target.value)}
                  disabled={!canEdit && !isNewFarm}
                  placeholder="e.g., Kinoo"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Unit Preferences</CardTitle>
            <CardDescription>
              Choose your preferred units for measurements and currency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preferred_currency">Preferred Currency</Label>
                <Select
                  value={formData.preferred_currency}
                  onValueChange={(value) => handleInputChange('preferred_currency', value)}
                  disabled={!canEdit && !isNewFarm}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KSH">Kenyan Shilling (KSh)</SelectItem>
                    <SelectItem value="USD">US Dollar ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="preferred_volume_unit">Volume Unit</Label>
                <Select
                  value={formData.preferred_volume_unit}
                  onValueChange={(value) => handleInputChange('preferred_volume_unit', value)}
                  disabled={!canEdit && !isNewFarm}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="liters">Liters</SelectItem>
                    <SelectItem value="gallons">Gallons</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        {(canEdit || isNewFarm) && (
          <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex justify-end space-x-3'}`}>
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              className={isMobile ? 'w-full' : ''}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className={`bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2 ${isMobile ? 'w-full' : ''}`}
            >
              <Save className="w-4 h-4" />
              <span>
                {loading 
                  ? 'Saving...' 
                  : isNewFarm 
                    ? 'Create Farm' 
                    : 'Save Changes'
                }
              </span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}