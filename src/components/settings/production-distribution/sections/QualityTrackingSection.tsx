// components/settings/production-distribution/sections/QualityTrackingSection.tsx
'use client'

import React from 'react'

interface QualityTrackingSectionProps {
  settings: any
  updateSetting: (key: string, value: any) => void
}

export default function QualityTrackingSection({
  settings,
  updateSetting
}: QualityTrackingSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Milk Quality Tracking</h3>

      <div className="space-y-6">
        {/* Quality Tracking Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quality Tracking Level
          </label>
          <select
            value={settings.qualityTrackingLevel || 'basic'}
            onChange={e => updateSetting('qualityTrackingLevel', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">None</option>
            <option value="basic">Basic (Key Metrics Only)</option>
            <option value="detailed">Detailed (All Parameters)</option>
          </select>
        </div>

        {/* Fat Content */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Fat Content Tracking</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Threshold (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={settings.fatContentMinThreshold ?? 3.5}
                  onChange={e => updateSetting('fatContentMinThreshold', e.target.value === '' ? null : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={settings.fatContentTarget ?? 4.0}
                  onChange={e => updateSetting('fatContentTarget', e.target.value === '' ? null : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Protein Content */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Protein Content Tracking</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Threshold (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={settings.proteinContentMinThreshold ?? 3.0}
                  onChange={e => updateSetting('proteinContentMinThreshold', e.target.value === '' ? null : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={settings.proteinContentTarget ?? 3.3}
                  onChange={e => updateSetting('proteinContentTarget', e.target.value === '' ? null : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Somatic Cell Count */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Somatic Cell Count (SCC) Tracking</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target (cells/mL)
              </label>
              <input
                type="number"
                min="0"
                value={settings.sccTarget ?? 200000}
                onChange={e => updateSetting('sccTarget', e.target.value === '' ? null : parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alert Threshold (cells/mL)
              </label>
              <input
                type="number"
                min="0"
                value={settings.sccAlertThreshold ?? 400000}
                onChange={e => updateSetting('sccAlertThreshold', e.target.value === '' ? null : parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Critical Threshold (cells/mL)
              </label>
              <input
                type="number"
                min="0"
                value={settings.sccCriticalThreshold ?? 750000}
                onChange={e => updateSetting('sccCriticalThreshold', e.target.value === '' ? null : parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
