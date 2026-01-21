// components/settings/production-distribution/ProductionSettingsTab.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import {
  Activity,
  Clock,
  Droplets,
  BarChart3,
  AlertTriangle,
  Info,
  Save,
  RotateCcw,
  Target,
  TrendingUp,
  AlertCircle,
  Lock
} from 'lucide-react'
import { getDefaultProductionSettings } from '@/types/production-distribution-settings'

interface ProductionSettingsTabProps {
  farmId: string
  userRole: string
  initialSettings: any
  farmName: string
  onUnsavedChanges: (hasChanges: boolean) => void
}

export default function ProductionSettingsTab({
  farmId,
  userRole,
  initialSettings,
  farmName,
  onUnsavedChanges
}: ProductionSettingsTabProps) {
  const { isMobile } = useDeviceInfo()
  const [settings, setSettings] = useState(initialSettings || getDefaultProductionSettings())
  const [isLoading, setIsLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('tracking')
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
    if (!window.confirm('Save these production settings?')) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/production', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId, settings })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      toast.success('Production settings saved successfully!', {
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
    if (!window.confirm('Reset all production settings to defaults?')) return
    setSettings(getDefaultProductionSettings())
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

  // Determine if quality tab should be visible
  const isQualityTabVisible = ['advanced', 'quality_focused'].includes(settings.productionTrackingMode)

  const sections = [
    { id: 'tracking', label: 'Tracking Mode', icon: Activity },
    { id: 'sessions', label: 'Sessions', icon: Clock },
    ...(isQualityTabVisible ? [{ id: 'quality', label: 'Quality', icon: Droplets }] : []),
    { id: 'charts', label: 'Charts', icon: BarChart3 }
  ]

  // Reset activeSection if it becomes invalid
  useEffect(() => {
    if (activeSection === 'quality' && !isQualityTabVisible) {
      setActiveSection('tracking')
    }
  }, [isQualityTabVisible, activeSection])

  // Handle session toggle
  const handleSessionToggle = (session: string, checked: boolean) => {
    let updated = checked
      ? [...settings.enabledSessions, session]
      : settings.enabledSessions.filter((s: string) => s !== session)

    if (!settings.allowMultipleSessionsPerDay && checked) {
      updated = [session]
    }

    updateSetting('enabledSessions', updated)
  }

  const handleMultipleSessionsToggle = (checked: boolean) => {
    updateSetting('allowMultipleSessionsPerDay', checked)
    if (!checked && settings.enabledSessions.length > 1) {
      updateSetting('enabledSessions', [settings.enabledSessions[0]])
    }
  }

  const validateSessionTime = (session: string, newTime: string) => {
    const sessionOrder = ['morning', 'afternoon', 'evening']
    const currentSessionIndex = sessionOrder.indexOf(session)
    const currentHour = parseInt(newTime.split(':')[0])
    const currentMinute = parseInt(newTime.split(':')[1]) || 0
    const currentTotalMinutes = currentHour * 60 + currentMinute

    if (currentSessionIndex > 0) {
      const prevSession = sessionOrder[currentSessionIndex - 1]
      if (settings.enabledSessions.includes(prevSession)) {
        const prevTime = settings.sessionTimes[prevSession]
        const prevHour = parseInt(prevTime.split(':')[0])
        const prevMinute = parseInt(prevTime.split(':')[1]) || 0
        const prevTotalMinutes = prevHour * 60 + prevMinute
        const diffMinutes = currentTotalMinutes - prevTotalMinutes

        if (diffMinutes < settings.sessionIntervalHours * 60) {
          toast.error(
            `Minimum ${settings.sessionIntervalHours} hour(s) required between sessions`,
            { duration: 4000 }
          )
          return false
        }
      }
    }
    return true
  }

  const handleSessionTimeChange = (session: string, newTime: string) => {
    if (validateSessionTime(session, newTime)) {
      updateSetting('sessionTimes', {
        ...settings.sessionTimes,
        [session]: newTime
      })
    }
  }

  return (
    <div className="space-y-6">
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

      {!isQualityTabVisible && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <div>
              <strong>Quality Parameters Hidden:</strong> The Quality tab is only available when using "Advanced" or "Quality Focused" tracking modes.
            </div>
          </div>
        </div>
      )}

      {activeSection === 'tracking' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Production Tracking Mode
              </CardTitle>
              <CardDescription>Choose how production data is tracked and recorded</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'basic', label: 'Basic', desc: 'Volume only - fastest entry', time: '< 30 sec' },
                  { value: 'advanced', label: 'Advanced', desc: 'Volume + optional quality', time: '1-2 min' },
                  { value: 'quality_focused', label: 'Quality Focused', desc: 'Required quality parameters', time: '2-3 min' }
                ].map(mode => (
                  <label
                    key={mode.value}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      settings.productionTrackingMode === mode.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="trackingMode"
                      value={mode.value}
                      checked={settings.productionTrackingMode === mode.value}
                      onChange={(e) => updateSetting('productionTrackingMode', e.target.value)}
                      className="sr-only"
                    />
                    <div className="font-medium text-gray-900">{mode.label}</div>
                    <div className="text-sm text-gray-500 mt-1">{mode.desc}</div>
                    <div className="text-xs text-gray-400 mt-2">Entry time: {mode.time}</div>
                  </label>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Production Unit</Label>
                  <Select
                    value={settings.productionUnit}
                    onValueChange={(value) => updateSetting('productionUnit', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="liters">Liters (L)</SelectItem>
                      <SelectItem value="gallons">Gallons (gal)</SelectItem>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Recording Method</Label>
                  <Select
                    value={settings.defaultRecordingMethod}
                    onValueChange={(value) => updateSetting('defaultRecordingMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                      <SelectItem value="automated">Automated (Sensors)</SelectItem>
                      <SelectItem value="hybrid">Hybrid (Both)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <label className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Enable Production Tracking</div>
                  <div className="text-sm text-gray-500">Turn on/off the entire production module</div>
                </div>
                <Switch
                  checked={settings.enableProductionTracking}
                  onCheckedChange={(checked) => updateSetting('enableProductionTracking', checked)}
                />
              </label>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === 'sessions' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Milking Sessions Configuration
              </CardTitle>
              <CardDescription>Configure milking sessions and schedules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-3 block">Enabled Sessions</Label>
                <div className="space-y-2">
                  {['morning', 'afternoon', 'evening'].map(session => (
                    <label key={session} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.enabledSessions.includes(session)}
                        onChange={(e) => handleSessionToggle(session, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="capitalize">{session}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Session Times */}
              <div>
                <Label className="mb-2 block">Session Times</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['morning', 'afternoon', 'evening'].map(session => (
                    settings.enabledSessions.includes(session) && (
                      <div key={session}>
                        <label className="block text-sm text-gray-600 mb-1 capitalize">{session}</label>
                        <Input
                          type="time"
                          value={settings.sessionTimes[session]}
                          onChange={(e) => handleSessionTimeChange(session, e.target.value)}
                        />
                      </div>
                    )
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Allow Multiple Sessions Per Day</div>
                    <div className="text-sm text-gray-500">Record more than one session per animal daily</div>
                  </div>
                  <Switch
                    checked={settings.allowMultipleSessionsPerDay}
                    onCheckedChange={handleMultipleSessionsToggle}
                  />
                </label>

                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Require Session Time Recording</div>
                    <div className="text-sm text-gray-500">Make time input mandatory</div>
                  </div>
                  <Switch
                    checked={settings.requireSessionTimeRecording}
                    onCheckedChange={(checked) => updateSetting('requireSessionTimeRecording', checked)}
                  />
                </label>
              </div>

              {/* Smart Session Banner Configuration - NEW SECTION */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  Smart Session Banner
                </h3>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                    <div>
                      <div className="font-medium">Enable Live Session Banner</div>
                      <div className="text-sm text-gray-500">
                        Show a dynamic banner on the dashboard during milking times
                      </div>
                    </div>
                    <Switch
                      checked={settings.enableSmartSessionBanner}
                      onCheckedChange={(checked) => updateSetting('enableSmartSessionBanner', checked)}
                    />
                  </label>

                  {settings.enableSmartSessionBanner && (
                    <div className="p-3 bg-slate-50 border rounded-lg">
                      <Label>Late Entry Threshold (minutes)</Label>
                      <div className="flex gap-4 items-center mt-2">
                        <Input
                          type="number"
                          min="15"
                          max="240"
                          className="w-32"
                          value={settings.sessionLateThresholdMinutes}
                          onChange={(e) => updateSetting('sessionLateThresholdMinutes', parseInt(e.target.value))}
                        />
                        <span className="text-sm text-gray-500">
                          minutes after session start
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        After this time, the session banner will indicate a late entry.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Session Interval (hours)</Label>
                <Input
                  type="number"
                  min="4"
                  max="12"
                  value={settings.sessionIntervalHours}
                  onChange={(e) => updateSetting('sessionIntervalHours', parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quality Section */}
      {activeSection === 'quality' && isQualityTabVisible && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Fat Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Track Fat Content</Label>
                <Switch
                  checked={settings.trackFatContent}
                  onCheckedChange={(checked) => updateSetting('trackFatContent', checked)}
                />
              </div>
              {settings.trackFatContent && (
                <>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.fatContentRequired}
                      onChange={(e) => updateSetting('fatContentRequired', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Make Required</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-sm">Min (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.fatContentMinThreshold}
                        onChange={(e) => updateSetting('fatContentMinThreshold', parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Target (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.fatContentTarget}
                        onChange={(e) => updateSetting('fatContentTarget', parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Max (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.fatContentMaxThreshold}
                        onChange={(e) => updateSetting('fatContentMaxThreshold', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

           <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Protein Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Track Protein Content</Label>
                <Switch
                  checked={settings.trackProteinContent}
                  onCheckedChange={(checked) => updateSetting('trackProteinContent', checked)}
                />
              </div>
              {settings.trackProteinContent && (
                <>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.proteinContentRequired}
                      onChange={(e) => updateSetting('proteinContentRequired', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Make Required</span>
                  </label>
                   <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-sm">Min (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.proteinContentMinThreshold}
                        onChange={(e) => updateSetting('proteinContentMinThreshold', parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Target (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.proteinContentTarget}
                        onChange={(e) => updateSetting('proteinContentTarget', parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Max (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.proteinContentMaxThreshold}
                        onChange={(e) => updateSetting('proteinContentMaxThreshold', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                Somatic Cell Count (SCC)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Track SCC</Label>
                <Switch
                  checked={settings.trackSomaticCellCount}
                  onCheckedChange={(checked) => updateSetting('trackSomaticCellCount', checked)}
                />
              </div>
               {settings.trackSomaticCellCount && (
                <>
                   <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.sccRequired}
                      onChange={(e) => updateSetting('sccRequired', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Make Required</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-sm">Target</Label>
                      <Input
                        type="number"
                        value={settings.sccTarget}
                        onChange={(e) => updateSetting('sccTarget', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Alert Level</Label>
                      <Input
                        type="number"
                        value={settings.sccAlertThreshold}
                        onChange={(e) => updateSetting('sccAlertThreshold', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Critical Level</Label>
                      <Input
                        type="number"
                        value={settings.sccCriticalThreshold}
                        onChange={(e) => updateSetting('sccCriticalThreshold', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </>
               )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {activeSection === 'charts' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Charts & Visualization
              </CardTitle>
              <CardDescription>Configure how production data is displayed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Chart Display Mode</Label>
                <Select
                  value={settings.chartDisplayMode}
                  onValueChange={(value) => updateSetting('chartDisplayMode', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="combined">Combined (Volume + Quality)</SelectItem>
                    <SelectItem value="volume_only">Volume Only</SelectItem>
                    <SelectItem value="quality_only">Quality Only</SelectItem>
                    <SelectItem value="separate">Separate Charts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Default Chart Period (days)</Label>
                <Input
                  type="number"
                  min="7"
                  max="365"
                  value={settings.defaultChartPeriod}
                  onChange={(e) => updateSetting('defaultChartPeriod', parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                {settings.chartDisplayMode !== 'quality_only' && (
                  <label className="flex items-center justify-between p-3 border rounded-lg">
                    <span>Show Volume Chart</span>
                    <Switch
                      checked={settings.showVolumeChart}
                      onCheckedChange={(checked) => updateSetting('showVolumeChart', checked)}
                    />
                  </label>
                )}

                {settings.chartDisplayMode !== 'volume_only' && (
                  <label className="flex items-center justify-between p-3 border rounded-lg">
                    <span>Show Fat & Protein Chart</span>
                    <Switch
                      checked={settings.showFatProteinChart}
                      onCheckedChange={(checked) => updateSetting('showFatProteinChart', checked)}
                    />
                  </label>
                )}

                {[
                  { key: 'showTrendLines', label: 'Show Trend Lines' },
                  { key: 'showAverages', label: 'Show Average Lines' },
                  { key: 'showTargets', label: 'Show Target Lines' },
                  { key: 'enableChartExport', label: 'Enable Chart Export' }
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <span>{item.label}</span>
                    <Switch
                      checked={settings[item.key]}
                      onCheckedChange={(checked) => updateSetting(item.key, checked)}
                    />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex items-center justify-between'} pt-6 border-t`}>
        <div className={`flex items-center space-x-2 text-sm text-gray-600 ${isMobile ? 'w-full order-2' : ''}`}>
          <Info className="h-4 w-4" />
          <span>Changes will apply to future production entries</span>
        </div>
        
        <div className={`flex ${isMobile ? 'flex-col space-y-2 w-full order-1' : 'space-x-3'}`}>
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className={`hover:bg-red-50 hover:border-red-200 hover:text-red-700 ${isMobile ? 'w-full' : ''}`}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className={`bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center ${isMobile ? 'w-full' : ''}`}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}