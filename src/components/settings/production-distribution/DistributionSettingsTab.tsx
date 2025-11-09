// components/settings/production-distribution/DistributionSettingsTab.tsx

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import {
  Truck,
  Users,
  DollarSign,
  Package,
  CreditCard,
  CheckCircle,
  Info,
  Save,
  RotateCcw,
  Bell,
  BarChart3
} from 'lucide-react'
import { getDefaultDistributionSettings } from '@/types/production-distribution-settings'

interface DistributionSettingsTabProps {
  farmId: string
  userRole: string
  initialSettings: any
  farmName: string
  onUnsavedChanges: (hasChanges: boolean) => void
}

export default function DistributionSettingsTab({
  farmId,
  userRole,
  initialSettings,
  farmName,
  onUnsavedChanges
}: DistributionSettingsTabProps) {
  const [settings, setSettings] = useState(initialSettings || getDefaultDistributionSettings())
  const [isLoading, setIsLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('general')
  const isInitialLoad = useRef(true)

  useEffect(() => {
    if (initialSettings && isInitialLoad.current) {
      setSettings(initialSettings)
      setTimeout(() => {
        isInitialLoad.current = false
      }, 100)
    }
  }, [initialSettings])

  useEffect(() => {
    if (!isInitialLoad.current) {
      onUnsavedChanges(true)
    }
  }, [settings, onUnsavedChanges])

  const handleSave = async () => {
    if (!window.confirm('Save these distribution settings?')) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/distribution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId, settings })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      toast.success('Distribution settings saved successfully!', {
        duration: 4000,
        position: 'top-right'
      })
      onUnsavedChanges(false)
    } catch (error) {
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        duration: 6000,
        position: 'top-right'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetToDefaults = () => {
    if (!window.confirm('Reset all distribution settings to defaults?')) return
    setSettings(getDefaultDistributionSettings())
    toast.success('Settings reset to defaults', { duration: 3000 })
  }

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }))
  }

  const InfoBox = ({ children }: { children: React.ReactNode }) => (
    <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>{children}</div>
    </div>
  )

  const sections = [
    { id: 'general', label: 'General', icon: Truck },
    { id: 'channels', label: 'Channels', icon: Users },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'delivery', label: 'Delivery', icon: Package },
    { id: 'payment', label: 'Payment', icon: CreditCard }
  ]

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map(section => {
          const Icon = section.icon
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {section.label}
              </div>
            </button>
          )
        })}
      </div>

      {/* General Settings Section */}
      {activeSection === 'general' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                General Distribution Settings
              </CardTitle>
              <CardDescription>Basic distribution tracking configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Enable Distribution Tracking</div>
                  <div className="text-sm text-gray-500">Turn on/off distribution module</div>
                </div>
                <Switch
                  checked={settings.enableDistributionTracking}
                  onCheckedChange={(checked) => updateSetting('enableDistributionTracking', checked)}
                />
              </label>

              <div>
                <Label>Distribution Model</Label>
                <Select
                  value={settings.distributionModel}
                  onValueChange={(value) => updateSetting('distributionModel', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_channel">Single Channel</SelectItem>
                    <SelectItem value="multi_channel">Multi-Channel</SelectItem>
                    <SelectItem value="cooperative">Cooperative</SelectItem>
                    <SelectItem value="processor">Processor</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">How you distribute milk to buyers</p>
              </div>

              <div>
                <Label>Default Distribution Frequency</Label>
                <Select
                  value={settings.defaultDistributionFrequency}
                  onValueChange={(value) => updateSetting('defaultDistributionFrequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_session">Per Milking Session</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="on_demand">On Demand</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Low Inventory Threshold (Liters)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.lowInventoryThresholdLiters}
                    onChange={(e) => updateSetting('lowInventoryThresholdLiters', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">Alert when below this amount</p>
                </div>

                <div>
                  <Label>Reserve Volume (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={settings.reserveVolumePercent}
                    onChange={(e) => updateSetting('reserveVolumePercent', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">Reserve for emergencies</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Alert on Low Inventory</span>
                  <Switch
                    checked={settings.alertLowInventory}
                    onCheckedChange={(checked) => updateSetting('alertLowInventory', checked)}
                  />
                </label>

                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Track Available Volume</span>
                  <Switch
                    checked={settings.trackAvailableVolume}
                    onCheckedChange={(checked) => updateSetting('trackAvailableVolume', checked)}
                  />
                </label>

                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Auto-deduct from Inventory</span>
                  <Switch
                    checked={settings.autoDeductFromInventory}
                    onCheckedChange={(checked) => updateSetting('autoDeductFromInventory', checked)}
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Channel Management Section */}
      {activeSection === 'channels' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Channel Management
              </CardTitle>
              <CardDescription>Configure distribution channel settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Enable Channel Management</div>
                  <div className="text-sm text-gray-500">Manage multiple distribution channels</div>
                </div>
                <Switch
                  checked={settings.enableChannelManagement}
                  onCheckedChange={(checked) => updateSetting('enableChannelManagement', checked)}
                />
              </label>

              <label className="flex items-center justify-between p-3 border rounded-lg">
                <span>Allow Multiple Channels</span>
                <Switch
                  checked={settings.allowMultipleChannels}
                  onCheckedChange={(checked) => updateSetting('allowMultipleChannels', checked)}
                />
              </label>

              <div>
                <Label>Maximum Active Channels</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.maxActiveChannels}
                  onChange={(e) => updateSetting('maxActiveChannels', parseInt(e.target.value))}
                />
              </div>

              <div>
                <Label>Enabled Channel Types</Label>
                <div className="space-y-2 mt-2">
                  {['cooperative', 'processor', 'direct', 'retail'].map(type => (
                    <label key={type} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.channelTypesEnabled.includes(type)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...settings.channelTypesEnabled, type]
                            : settings.channelTypesEnabled.filter((t: string) => t !== type)
                          updateSetting('channelTypesEnabled', updated)
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Track Channel Performance</div>
                  <div className="text-sm text-gray-500">Monitor volume, payment, and quality metrics</div>
                </div>
                <Switch
                  checked={settings.trackChannelPerformance}
                  onCheckedChange={(checked) => updateSetting('trackChannelPerformance', checked)}
                />
              </label>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pricing Settings Section */}
      {activeSection === 'pricing' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Pricing Configuration
              </CardTitle>
              <CardDescription>Configure pricing models and rates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Pricing Model</Label>
                <Select
                  value={settings.pricingModel}
                  onValueChange={(value) => updateSetting('pricingModel', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="per_channel">Per Channel</SelectItem>
                    <SelectItem value="dynamic">Dynamic Pricing</SelectItem>
                    <SelectItem value="quality_based">Quality-Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Default Price per Liter (KSh)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.defaultPricePerLiter}
                    onChange={(e) => updateSetting('defaultPricePerLiter', parseFloat(e.target.value))}
                  />
                </div>

                <div>
                  <Label>Currency</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(value) => updateSetting('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KES">KES (Kenyan Shilling)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <label className="flex items-center justify-between p-3 border rounded-lg">
                <span>Allow Channel Custom Pricing</span>
                <Switch
                  checked={settings.allowChannelCustomPricing}
                  onCheckedChange={(checked) => updateSetting('allowChannelCustomPricing', checked)}
                />
              </label>

              {/* Quality-Based Pricing */}
              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Quality-Based Pricing</Label>
                  <Switch
                    checked={settings.enableQualityBasedPricing}
                    onCheckedChange={(checked) => updateSetting('enableQualityBasedPricing', checked)}
                  />
                </div>

                {settings.enableQualityBasedPricing && (
                  <>
                    <div>
                      <Label>Quality Premium (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={settings.qualityPremiumPercent}
                        onChange={(e) => updateSetting('qualityPremiumPercent', parseInt(e.target.value))}
                      />
                      <p className="text-xs text-gray-500 mt-1">Additional % for high-quality milk</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-sm">Min Fat (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={settings.qualityThresholdFat}
                          onChange={(e) => updateSetting('qualityThresholdFat', parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Min Protein (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={settings.qualityThresholdProtein}
                          onChange={(e) => updateSetting('qualityThresholdProtein', parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Max SCC</Label>
                        <Input
                          type="number"
                          value={settings.qualityThresholdScc}
                          onChange={(e) => updateSetting('qualityThresholdScc', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Include Tax in Pricing</span>
                  <Switch
                    checked={settings.includeTaxInPricing}
                    onCheckedChange={(checked) => updateSetting('includeTaxInPricing', checked)}
                  />
                </label>

                {settings.includeTaxInPricing && (
                  <div>
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={settings.taxRatePercent}
                      onChange={(e) => updateSetting('taxRatePercent', parseFloat(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delivery Management Section */}
      {activeSection === 'delivery' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Delivery Management
              </CardTitle>
              <CardDescription>Configure delivery tracking and logistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between p-3 border rounded-lg">
                <span>Enable Delivery Tracking</span>
                <Switch
                  checked={settings.enableDeliveryTracking}
                  onCheckedChange={(checked) => updateSetting('enableDeliveryTracking', checked)}
                />
              </label>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Require Driver Details</span>
                  <Switch
                    checked={settings.requireDriverDetails}
                    onCheckedChange={(checked) => updateSetting('requireDriverDetails', checked)}
                  />
                </label>

                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Require Vehicle Details</span>
                  <Switch
                    checked={settings.requireVehicleDetails}
                    onCheckedChange={(checked) => updateSetting('requireVehicleDetails', checked)}
                  />
                </label>

                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Track Delivery Time</span>
                  <Switch
                    checked={settings.trackDeliveryTime}
                    onCheckedChange={(checked) => updateSetting('trackDeliveryTime', checked)}
                  />
                </label>

                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Require Delivery Confirmation</span>
                  <Switch
                    checked={settings.requireDeliveryConfirmation}
                    onCheckedChange={(checked) => updateSetting('requireDeliveryConfirmation', checked)}
                  />
                </label>
              </div>

              {settings.requireDeliveryConfirmation && (
                <div>
                  <Label>Confirmation Method</Label>
                  <Select
                    value={settings.confirmationMethod}
                    onValueChange={(value) => updateSetting('confirmationMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="signature">Signature</SelectItem>
                      <SelectItem value="photo">Photo</SelectItem>
                      <SelectItem value="code">Confirmation Code</SelectItem>
                      <SelectItem value="gps">GPS Location</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Max Delivery Radius (km)</Label>
                  <Input
                    type="number"
                    value={settings.maxDeliveryRadiusKm}
                    onChange={(e) => updateSetting('maxDeliveryRadiusKm', parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <Label>Preferred Delivery Time</Label>
                  <Select
                    value={settings.preferredDeliveryTime}
                    onValueChange={(value) => updateSetting('preferredDeliveryTime', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                      <SelectItem value="any">Any Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Management Section */}
      {activeSection === 'payment' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Payment Management
              </CardTitle>
              <CardDescription>Configure payment methods and terms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Enabled Payment Methods</Label>
                <div className="space-y-2 mt-2">
                  {[
                    { value: 'cash', label: 'Cash' },
                    { value: 'mpesa', label: 'M-Pesa' },
                    { value: 'bank', label: 'Bank Transfer' },
                    { value: 'credit', label: 'Credit (Pay Later)' }
                  ].map(method => (
                    <label key={method.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.paymentMethodsEnabled.includes(method.value)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...settings.paymentMethodsEnabled, method.value]
                            : settings.paymentMethodsEnabled.filter((m: string) => m !== method.value)
                          updateSetting('paymentMethodsEnabled', updated)
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Default Payment Method</Label>
                <Select
                  value={settings.defaultPaymentMethod}
                  onValueChange={(value) => updateSetting('defaultPaymentMethod', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Credit Management</Label>
                  <Switch
                    checked={settings.enableCreditManagement}
                    onCheckedChange={(checked) => updateSetting('enableCreditManagement', checked)}
                  />
                </div>

                {settings.enableCreditManagement && (
                  <>
                    <div>
                      <Label>Default Credit Period (days)</Label>
                      <Input
                        type="number"
                        value={settings.defaultCreditPeriodDays}
                        onChange={(e) => updateSetting('defaultCreditPeriodDays', parseInt(e.target.value))}
                      />
                    </div>

                    <div>
                      <Label>Max Credit Limit (KSh)</Label>
                      <Input
                        type="number"
                        value={settings.maxCreditLimit || ''}
                        onChange={(e) => updateSetting('maxCreditLimit', parseFloat(e.target.value))}
                        placeholder="Optional"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Enable Payment Reminders</span>
                  <Switch
                    checked={settings.enablePaymentReminders}
                    onCheckedChange={(checked) => updateSetting('enablePaymentReminders', checked)}
                  />
                </label>

                {settings.enablePaymentReminders && (
                  <div>
                    <Label>Reminder Days Before Due</Label>
                    <Input
                      type="number"
                      value={settings.paymentReminderDaysBeforeDue}
                      onChange={(e) => updateSetting('paymentReminderDaysBeforeDue', parseInt(e.target.value))}
                    />
                  </div>
                )}
              </div>

              <InfoBox>
                <strong>Payment Terms:</strong> Credit management allows customers to pay later. 
                Set appropriate credit limits based on customer trust and payment history.
              </InfoBox>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Info className="h-4 w-4" />
          <span>Changes will apply to future distributions</span>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}