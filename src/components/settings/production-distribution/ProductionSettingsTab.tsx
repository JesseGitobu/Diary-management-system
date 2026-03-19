// components/settings/production-distribution/ProductionSettingsTab.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { Button } from '@/components/ui/Button'
import {
  Activity,
  Clock,
  Droplets,
  BarChart3,
  AlertTriangle,
  Info,
  Save,
  RotateCcw,
  Lock
} from 'lucide-react'
import { getDefaultProductionSettings } from '@/types/production-distribution-settings'
import { saveSettings } from '@/lib/utils/settings-handlers'
import GeneralSessionsSection from './sections/GeneralSessionsSection'
import QualityTrackingSection from './sections/QualityTrackingSection'
import AnimalEligibilitySection from './sections/AnimalEligibilitySection'
import DataValidationSection from './sections/DataValidationSection'
import ReportsChartsSection from './sections/ReportsChartsSection'
import AlertsCostsSection from './sections/AlertsCostsSection'

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
    if (!window.confirm('Save these production settings?')) return

    setIsLoading(true)
    try {
      await saveSettings('/api/settings/production', farmId, settings, () => {
        onUnsavedChanges(false)
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
    setSettings((prev: any) => {
      const updated = { ...prev, [key]: value }
      return updated
    })
  }

  // Determine if quality tab should be visible
  const isQualityTabVisible = ['advanced', 'quality_focused'].includes(settings.productionTrackingMode)

  const sections = [
    { id: 'general', label: 'General & Sessions', icon: Activity },
    { id: 'quality', label: 'Quality Tracking', icon: Droplets },
    { id: 'eligibility', label: 'Animal Eligibility', icon: Activity },
    { id: 'validation', label: 'Data Validation', icon: BarChart3 },
    { id: 'reports', label: 'Reports & Charts', icon: BarChart3 },
    { id: 'alerts', label: 'Alerts & Costs', icon: AlertTriangle }
  ]

  // Reset activeSection if it becomes invalid
  useEffect(() => {
    if (activeSection === 'quality' && !isQualityTabVisible) {
      setActiveSection('general')
    }
  }, [isQualityTabVisible, activeSection])

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
              <strong>Advanced Features Hidden:</strong> Some features are only available when using "Advanced" or "Quality Focused" tracking modes.
            </div>
          </div>
        </div>
      )}

      {activeSection === 'general' && (
        <GeneralSessionsSection settings={settings} updateSetting={updateSetting} />
      )}

      {activeSection === 'quality' && (
        <QualityTrackingSection settings={settings} updateSetting={updateSetting} />
      )}

      {activeSection === 'eligibility' && (
        <AnimalEligibilitySection settings={settings} updateSetting={updateSetting} />
      )}

      {activeSection === 'validation' && (
        <DataValidationSection settings={settings} updateSetting={updateSetting} />
      )}

      {activeSection === 'reports' && (
        <ReportsChartsSection settings={settings} updateSetting={updateSetting} />
      )}

      {activeSection === 'alerts' && (
        <AlertsCostsSection settings={settings} updateSetting={updateSetting} />
      )}

      {/* Action Buttons */}
      <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex items-center justify-between'} pt-6 border-t`}>
        <div className={`flex items-center space-x-2 text-sm text-gray-600 ${isMobile ? 'w-full order-2' : ''}`}>
          <Info className="h-4 w-4" />
          <span>Settings will apply to future production entries</span>
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