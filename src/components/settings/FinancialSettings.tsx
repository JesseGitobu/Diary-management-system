'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Modal } from '@/components/ui/Modal'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import {
  ArrowLeft,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Save,
  Smartphone,
  CreditCard,
  Banknote,
  TrendingUp,
  Building2
} from 'lucide-react'

interface Buyer {
  id: string
  name: string
  contact_person?: string
  phone?: string
  email?: string
  default_price_per_liter: number
  payment_terms: 'cash' | 'credit_7' | 'credit_14' | 'credit_30'
  preferred_payment_method: 'cash' | 'mpesa' | 'bank_transfer' | 'cheque'
  is_active: boolean
}

interface FinancialSettings {
  // Default Pricing
  default_milk_price_per_liter: number
  currency: 'KSH' | 'USD'
  price_updates_automatic: boolean
  
  // Payment Tracking
  enable_payment_tracking: boolean
  default_payment_method: 'cash' | 'mpesa' | 'bank_transfer' | 'cheque'
  mpesa_business_number?: string
  bank_account_name?: string
  bank_account_number?: string
  bank_name?: string
  
  // Financial Reporting
  enable_profit_tracking: boolean
  include_feed_costs: boolean
  include_labor_costs: boolean
  include_vet_costs: boolean
  include_equipment_costs: boolean
  
  // Tax Settings
  enable_tax_tracking: boolean
  vat_rate: number
  business_registration_number?: string
  
  buyers: Buyer[]
}

interface FinancialSettingsProps {
  farmId: string
  userRole: string
  initialSettings: FinancialSettings
}

export function FinancialSettings({ farmId, userRole, initialSettings }: FinancialSettingsProps) {
  const router = useRouter()
  const { isMobile } = useDeviceInfo()
  const [settings, setSettings] = useState<FinancialSettings>(initialSettings)
  const [loading, setLoading] = useState(false)
  const [showBuyerModal, setShowBuyerModal] = useState(false)
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null)

  const canEdit = ['farm_owner', 'farm_manager'].includes(userRole)

  const handleBack = () => {
    router.push(`/dashboard/settings`)
  }

  const handleInputChange = (key: keyof FinancialSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/farms/${farmId}/financial-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error('Failed to update financial settings')
      }

      alert('Financial settings saved successfully!')
    } catch (error) {
      console.error('Error updating financial settings:', error)
      alert('Failed to update financial settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddBuyer = () => {
    setSelectedBuyer(null)
    setShowBuyerModal(true)
  }

  const handleEditBuyer = (buyer: Buyer) => {
    setSelectedBuyer(buyer)
    setShowBuyerModal(true)
  }

  const handleDeleteBuyer = (buyerId: string) => {
    if (!confirm('Are you sure you want to delete this buyer?')) return
    
    setSettings(prev => ({
      ...prev,
      buyers: prev.buyers.filter(b => b.id !== buyerId)
    }))
  }

  const handleBuyerSaved = (buyer: Buyer) => {
    if (selectedBuyer) {
      // Update existing buyer
      setSettings(prev => ({
        ...prev,
        buyers: prev.buyers.map(b => b.id === buyer.id ? buyer : b)
      }))
    } else {
      // Add new buyer
      setSettings(prev => ({
        ...prev,
        buyers: [...prev.buyers, buyer]
      }))
    }
    setShowBuyerModal(false)
  }

  const formatCurrency = (amount: number) => {
    return settings.currency === 'KSH' ? `KSh ${amount}` : `$${amount}`
  }

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
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Financial Settings
            </h1>
            <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
              Configure pricing, payments, and financial tracking
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Default Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Milk Pricing</span>
            </CardTitle>
            <CardDescription>
              Set default milk prices and currency preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={settings.currency}
                  onValueChange={(value) => handleInputChange('currency', value)}
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
                <Label htmlFor="default-price">Default Price per Liter</Label>
                <Input
                  id="default-price"
                  type="number"
                  value={settings.default_milk_price_per_liter}
                  onChange={(e) => handleInputChange('default_milk_price_per_liter', parseFloat(e.target.value) || 0)}
                  disabled={!canEdit}
                  min="0"
                  step="0.50"
                />
              </div>
              
              <div className="flex items-end">
                <div className="w-full">
                  <Label className="flex items-center space-x-2">
                    <Switch
                      checked={settings.price_updates_automatic}
                      onCheckedChange={(value) => handleInputChange('price_updates_automatic', value)}
                      disabled={!canEdit}
                    />
                    <span>Automatic Price Updates</span>
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Update prices based on market trends
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buyers Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span>Milk Buyers</span>
                </CardTitle>
                <CardDescription>
                  Manage your milk buyers and their specific pricing
                </CardDescription>
              </div>
              {canEdit && (
                <Button onClick={handleAddBuyer} className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Buyer</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {settings.buyers.length > 0 ? (
              <div className="space-y-3">
                {settings.buyers.map((buyer) => (
                  <div
                    key={buyer.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{buyer.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          buyer.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {buyer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Price: {formatCurrency(buyer.default_price_per_liter)}/liter</p>
                        <p>Payment: {buyer.payment_terms.replace('_', ' ')} • {buyer.preferred_payment_method}</p>
                        {buyer.contact_person && <p>Contact: {buyer.contact_person}</p>}
                      </div>
                    </div>
                    
                    {canEdit && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditBuyer(buyer)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBuyer(buyer.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No buyers configured yet</p>
                {canEdit && (
                  <Button onClick={handleAddBuyer}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Buyer
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="w-5 h-5" />
              <span>Payment Settings</span>
            </CardTitle>
            <CardDescription>
              Configure payment methods and tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Enable Payment Tracking</Label>
                <p className="text-sm text-gray-600">Track payments received from buyers</p>
              </div>
              <Switch
                checked={settings.enable_payment_tracking}
                onCheckedChange={(value) => handleInputChange('enable_payment_tracking', value)}
                disabled={!canEdit}
              />
            </div>
            
            {settings.enable_payment_tracking && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div>
                  <Label htmlFor="default-payment">Default Payment Method</Label>
                  <Select
                    value={settings.default_payment_method}
                    onValueChange={(value) => handleInputChange('default_payment_method', value)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* M-Pesa Settings */}
                {(settings.default_payment_method === 'mpesa' || 
                  settings.buyers.some(b => b.preferred_payment_method === 'mpesa')) && (
                  <div>
                    <Label htmlFor="mpesa-number">M-Pesa Business Number</Label>
                    <Input
                      id="mpesa-number"
                      value={settings.mpesa_business_number || ''}
                      onChange={(e) => handleInputChange('mpesa_business_number', e.target.value)}
                      disabled={!canEdit}
                      placeholder="e.g., 123456"
                    />
                  </div>
                )}
                
                {/* Bank Details */}
                {(settings.default_payment_method === 'bank_transfer' || 
                  settings.buyers.some(b => b.preferred_payment_method === 'bank_transfer')) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="bank-name">Bank Name</Label>
                      <Input
                        id="bank-name"
                        value={settings.bank_name || ''}
                        onChange={(e) => handleInputChange('bank_name', e.target.value)}
                        disabled={!canEdit}
                        placeholder="e.g., KCB Bank"
                      />
                    </div>
                    <div>
                      <Label htmlFor="account-name">Account Name</Label>
                      <Input
                        id="account-name"
                        value={settings.bank_account_name || ''}
                        onChange={(e) => handleInputChange('bank_account_name', e.target.value)}
                        disabled={!canEdit}
                        placeholder="Account holder name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="account-number">Account Number</Label>
                      <Input
                        id="account-number"
                        value={settings.bank_account_number || ''}
                        onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                        disabled={!canEdit}
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Reporting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Financial Reporting</span>
            </CardTitle>
            <CardDescription>
              Configure what costs to track for profit calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Enable Profit Tracking</Label>
                <p className="text-sm text-gray-600">Calculate profit by tracking costs</p>
              </div>
              <Switch
                checked={settings.enable_profit_tracking}
                onCheckedChange={(value) => handleInputChange('enable_profit_tracking', value)}
                disabled={!canEdit}
              />
            </div>
            
            {settings.enable_profit_tracking && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-900">Include in Cost Calculations:</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Feed Costs</Label>
                    <Switch
                      checked={settings.include_feed_costs}
                      onCheckedChange={(value) => handleInputChange('include_feed_costs', value)}
                      disabled={!canEdit}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Labor Costs</Label>
                    <Switch
                      checked={settings.include_labor_costs}
                      onCheckedChange={(value) => handleInputChange('include_labor_costs', value)}
                      disabled={!canEdit}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Veterinary Costs</Label>
                    <Switch
                      checked={settings.include_vet_costs}
                      onCheckedChange={(value) => handleInputChange('include_vet_costs', value)}
                      disabled={!canEdit}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Equipment & Maintenance Costs</Label>
                    <Switch
                      checked={settings.include_equipment_costs}
                      onCheckedChange={(value) => handleInputChange('include_equipment_costs', value)}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Tax Settings</span>
            </CardTitle>
            <CardDescription>
              Configure tax tracking and business information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Enable Tax Tracking</Label>
                <p className="text-sm text-gray-600">Track VAT and business taxes</p>
              </div>
              <Switch
                checked={settings.enable_tax_tracking}
                onCheckedChange={(value) => handleInputChange('enable_tax_tracking', value)}
                disabled={!canEdit}
              />
            </div>
            
            {settings.enable_tax_tracking && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vat-rate">VAT Rate (%)</Label>
                    <Input
                      id="vat-rate"
                      type="number"
                      value={settings.vat_rate}
                      onChange={(e) => handleInputChange('vat_rate', parseFloat(e.target.value) || 0)}
                      disabled={!canEdit}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="business-reg">Business Registration Number</Label>
                    <Input
                      id="business-reg"
                      value={settings.business_registration_number || ''}
                      onChange={(e) => handleInputChange('business_registration_number', e.target.value)}
                      disabled={!canEdit}
                      placeholder="e.g., PVT-123456789"
                    />
                  </div>
                </div>
              </div>
            )}
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
              <span>{loading ? 'Saving...' : 'Save Settings'}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Buyer Modal */}
      <BuyerModal
        isOpen={showBuyerModal}
        onClose={() => setShowBuyerModal(false)}
        buyer={selectedBuyer}
        currency={settings.currency}
        onBuyerSaved={handleBuyerSaved}
      />
    </div>
  )
}

interface BuyerModalProps {
  isOpen: boolean
  onClose: () => void
  buyer: Buyer | null
  currency: string
  onBuyerSaved: (buyer: Buyer) => void
}

function BuyerModal({ isOpen, onClose, buyer, currency, onBuyerSaved }: BuyerModalProps) {
  const [formData, setFormData] = useState<Omit<Buyer, 'id'>>({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    default_price_per_liter: 0,
    payment_terms: 'cash',
    preferred_payment_method: 'cash',
    is_active: true
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!buyer

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (buyer) {
        setFormData({
          name: buyer.name,
          contact_person: buyer.contact_person || '',
          phone: buyer.phone || '',
          email: buyer.email || '',
          default_price_per_liter: buyer.default_price_per_liter,
          payment_terms: buyer.payment_terms,
          preferred_payment_method: buyer.preferred_payment_method,
          is_active: buyer.is_active
        })
      } else {
        setFormData({
          name: '',
          contact_person: '',
          phone: '',
          email: '',
          default_price_per_liter: 0,
          payment_terms: 'cash',
          preferred_payment_method: 'cash',
          is_active: true
        })
      }
      setErrors({})
    }
  }, [isOpen, buyer])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Buyer name is required'
    }

    if (formData.default_price_per_liter <= 0) {
      newErrors.default_price_per_liter = 'Price must be greater than 0'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const savedBuyer: Buyer = {
        id: buyer?.id || `buyer_${Date.now()}`,
        ...formData
      }
      
      onBuyerSaved(savedBuyer)
      onClose()
    } catch (error) {
      console.error('Error saving buyer:', error)
      alert(`Failed to ${isEditing ? 'update' : 'add'} buyer. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {isEditing ? 'Edit Buyer' : 'Add New Buyer'}
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buyer-name">Buyer Name *</Label>
              <Input
                id="buyer-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'border-red-500' : ''}
                placeholder="e.g., Brookside Dairy"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contact-person">Contact Person</Label>
              <Input
                id="contact-person"
                value={formData.contact_person}
                onChange={(e) => handleInputChange('contact_person', e.target.value)}
                placeholder="e.g., John Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buyer-phone">Phone Number</Label>
              <Input
                id="buyer-phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={errors.phone ? 'border-red-500' : ''}
                placeholder="+254712345678"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <Label htmlFor="buyer-email">Email Address</Label>
              <Input
                id="buyer-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? 'border-red-500' : ''}
                placeholder="contact@buyer.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price-per-liter">Price per Liter ({currency}) *</Label>
              <Input
                id="price-per-liter"
                type="number"
                value={formData.default_price_per_liter}
                onChange={(e) => handleInputChange('default_price_per_liter', parseFloat(e.target.value) || 0)}
                className={errors.default_price_per_liter ? 'border-red-500' : ''}
                min="0"
                step="0.50"
              />
              {errors.default_price_per_liter && (
                <p className="text-red-500 text-sm mt-1">{errors.default_price_per_liter}</p>
              )}
            </div>

            <div>
              <Label htmlFor="payment-terms">Payment Terms</Label>
              <Select
                value={formData.payment_terms}
                onValueChange={(value) => handleInputChange('payment_terms', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash on Delivery</SelectItem>
                  <SelectItem value="credit_7">7 Days Credit</SelectItem>
                  <SelectItem value="credit_14">14 Days Credit</SelectItem>
                  <SelectItem value="credit_30">30 Days Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment-method">Preferred Payment Method</Label>
              <Select
                value={formData.preferred_payment_method}
                onValueChange={(value) => handleInputChange('preferred_payment_method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(value) => handleInputChange('is_active', value)}
              />
              <Label>Active Buyer</Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Buyer' : 'Add Buyer')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}