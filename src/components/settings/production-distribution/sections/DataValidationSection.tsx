// components/settings/production-distribution/sections/DataValidationSection.tsx
'use client'

import React from 'react'

interface DataValidationSectionProps {
  settings: any
  updateSetting: (key: string, value: any) => void
}

export default function DataValidationSection({
  settings,
  updateSetting
}: DataValidationSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Data Validation Rules</h3>

      <div className="space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.enableDataValidation !== false}
            onChange={e => updateSetting('enableDataValidation', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">
            Enable Data Validation
          </span>
        </label>

        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Volume Limits per Session</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Volume (L)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={settings.volumeMinPerSession ?? 2}
                onChange={e => updateSetting('volumeMinPerSession', e.target.value === '' ? null : parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Volume (L)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={settings.volumeMaxPerSession ?? 50}
                onChange={e => updateSetting('volumeMaxPerSession', e.target.value === '' ? null : parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unusual Volume Deviation (% from average)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={settings.unusualVolumeDeviationPercent ?? 30}
            onChange={e => updateSetting('unusualVolumeDeviationPercent', e.target.value === '' ? null : parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Flag volumes that deviate by this percentage from the animal's average
          </p>
        </div>

        <div className="border-t pt-4 space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.requireNotesForAnomalies !== false}
              onChange={e => updateSetting('requireNotesForAnomalies', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Require notes for anomalies
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.allowRetroactiveEntries !== false}
              onChange={e => updateSetting('allowRetroactiveEntries', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Allow retroactive entries
            </span>
          </label>

          {settings.allowRetroactiveEntries !== false && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum days back to add milking records
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={settings.maxRetroactiveDays ?? 7}
                onChange={e => updateSetting('maxRetroactiveDays', e.target.value === '' ? null : parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
