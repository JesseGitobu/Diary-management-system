'use client'

import { useState } from 'react'
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
  AlertCircle
} from 'lucide-react'

interface FarmProfileSettingsProps {
  farmId: string
  userRole: string
  initialData: {
    name: string
    owner_name: string
    owner_phone: string
    owner_email: string
    farm_size_acres: number
    total_cows: number
    farm_type: 'Dairy' | 'cooperative' | 'commercial'
    county: string
    sub_county: string
    village: string
    preferred_currency: 'KSH' | 'USD'
    preferred_volume_unit: 'liters' | 'gallons'
    description?: string
  }
}

export function FarmProfileSettings({ farmId, userRole, initialData }: FarmProfileSettingsProps) {
  const router = useRouter()
  const { isMobile } = useDeviceInfo()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})

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
    if (!validateForm()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/farms/${farmId}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to update farm profile')
      }

      // Show success message or redirect
      router.push(`/farms/${farmId}/settings`)
    } catch (error) {
      console.error('Error updating farm profile:', error)
      alert('Failed to update farm profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push(`/dashboard/settings`)
  }

  const canEdit = ['farm_owner', 'farm_manager'].includes(userRole)

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
            <span>Back to Settings</span>
          </Button>
        </div>
        
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Farm Profile
            </h1>
            <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
              Manage your farm's basic information and preferences
            </p>
          </div>
        </div>
      </div>

      {/* Permission Warning */}
      {!canEdit && (
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
                <Label htmlFor="farm-name">Farm Name *</Label>
                <Input
                  id="farm-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={!canEdit}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="farm-type">Farm Type</Label>
                <Select
                  value={formData.farm_type}
                  onValueChange={(value) => handleInputChange('farm_type', value)}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smallholder">Smallholder Farm</SelectItem>
                    <SelectItem value="cooperative">Cooperative Farm</SelectItem>
                    <SelectItem value="commercial">Commercial/Large-scale</SelectItem>
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
                disabled={!canEdit}
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
                <Label htmlFor="owner-name">Owner Name *</Label>
                <Input
                  id="owner-name"
                  value={formData.owner_name}
                  onChange={(e) => handleInputChange('owner_name', e.target.value)}
                  disabled={!canEdit}
                  className={errors.owner_name ? 'border-red-500' : ''}
                />
                {errors.owner_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.owner_name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="owner-phone">Phone Number *</Label>
                <Input
                  id="owner-phone"
                  value={formData.owner_phone}
                  onChange={(e) => handleInputChange('owner_phone', e.target.value)}
                  disabled={!canEdit}
                  placeholder="+254712345678"
                  className={errors.owner_phone ? 'border-red-500' : ''}
                />
                {errors.owner_phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.owner_phone}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="owner-email">Email Address *</Label>
              <Input
                id="owner-email"
                type="email"
                value={formData.owner_email}
                onChange={(e) => handleInputChange('owner_email', e.target.value)}
                disabled={!canEdit}
                className={errors.owner_email ? 'border-red-500' : ''}
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
                <Label htmlFor="farm-size">Farm Size (Acres) *</Label>
                <Input
                  id="farm-size"
                  type="number"
                  value={formData.farm_size_acres}
                  onChange={(e) => handleInputChange('farm_size_acres', parseFloat(e.target.value) || 0)}
                  disabled={!canEdit}
                  min="0"
                  step="0.1"
                  className={errors.farm_size_acres ? 'border-red-500' : ''}
                />
                {errors.farm_size_acres && (
                  <p className="text-red-500 text-sm mt-1">{errors.farm_size_acres}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="total-cows">Total Number of Cows</Label>
                <Input
                  id="total-cows"
                  type="number"
                  value={formData.total_cows}
                  onChange={(e) => handleInputChange('total_cows', parseInt(e.target.value) || 0)}
                  disabled={!canEdit}
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
                  disabled={!canEdit}
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
                <Label htmlFor="sub-county">Sub-County</Label>
                <Input
                  id="sub-county"
                  value={formData.sub_county}
                  onChange={(e) => handleInputChange('sub_county', e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g., Kikuyu"
                />
              </div>
              
              <div>
                <Label htmlFor="village">Village/Ward</Label>
                <Input
                  id="village"
                  value={formData.village}
                  onChange={(e) => handleInputChange('village', e.target.value)}
                  disabled={!canEdit}
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
                <Label htmlFor="currency">Preferred Currency</Label>
                <Select
                  value={formData.preferred_currency}
                  onValueChange={(value) => handleInputChange('preferred_currency', value)}
                  disabled={!canEdit}
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
                <Label htmlFor="volume-unit">Volume Unit</Label>
                <Select
                  value={formData.preferred_volume_unit}
                  onValueChange={(value) => handleInputChange('preferred_volume_unit', value)}
                  disabled={!canEdit}
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
        {canEdit && (
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}