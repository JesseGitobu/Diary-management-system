// components/settings/production-distribution/ProductionDistributionSettings.tsx

'use client'

import React, { useState } from 'react'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { Button } from '@/components/ui/Button'
import {
  Droplets,
  Truck,
  ArrowLeft,
  AlertTriangle,
  Info
} from 'lucide-react'
import ProductionSettingsTab from './ProductionSettingsTab'
import DistributionSettingsTab from './DistributionSettingsTab'

interface ProductionDistributionSettingsProps {
  farmId: string
  userRole: string
  productionSettings: any
  distributionSettings: any
  farmName: string
}

export default function ProductionDistributionSettings({
  farmId,
  userRole,
  productionSettings,
  distributionSettings,
  farmName
}: ProductionDistributionSettingsProps) {
  const { isMobile } = useDeviceInfo()
  const [activeTab, setActiveTab] = useState('production')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const handleBack = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        `⚠️ Unsaved Changes\n\nYou have unsaved changes. Are you sure you want to leave?`
      )
      if (!confirmed) return
    }
    window.history.back()
  }

  return (
    <div className={`${isMobile ? 'px-4 py-4' : 'dashboard-container'} pb-20 lg:pb-6`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button variant="ghost" onClick={handleBack} className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Settings</span>
          </Button>
        </div>

        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            {activeTab === 'production' ? (
              <Droplets className="w-5 h-5 text-blue-600" />
            ) : (
              <Truck className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div>
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Production & Distribution
            </h1>
            <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
              Configure production tracking and distribution settings for {farmName}
            </p>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Alert */}
      {hasUnsavedChanges && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Unsaved Changes</p>
              <p className="text-sm text-yellow-700">You have unsaved changes. Remember to save before leaving.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('production')}
            className={`px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'production'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              Production Settings
            </div>
          </button>
          <button
            onClick={() => setActiveTab('distribution')}
            className={`px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'distribution'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Distribution Settings
            </div>
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-2 text-sm text-blue-900">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            {activeTab === 'production' ? (
              <>
                <strong>Production Settings:</strong> Configure how milk production is tracked, what quality 
                parameters are recorded, and how data is displayed in charts and reports.
              </>
            ) : (
              <>
                <strong>Distribution Settings:</strong> Configure distribution channels, pricing models, 
                delivery tracking, payment methods, and inventory management.
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'production' && (
        <ProductionSettingsTab
          farmId={farmId}
          userRole={userRole}
          initialSettings={productionSettings}
          farmName={farmName}
          onUnsavedChanges={setHasUnsavedChanges}
        />
      )}

      {activeTab === 'distribution' && (
        <DistributionSettingsTab
          farmId={farmId}
          userRole={userRole}
          initialSettings={distributionSettings}
          farmName={farmName}
          onUnsavedChanges={setHasUnsavedChanges}
        />
      )}
    </div>
  )
}