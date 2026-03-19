// components/settings/production-distribution/sections/AlertsCostsSection.tsx
'use client'

import React from 'react'

interface AlertsCostsSectionProps {
  settings: any
  updateSetting: (key: string, value: any) => void
}

export default function AlertsCostsSection({
  settings,
  updateSetting
}: AlertsCostsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Alerts & Notifications Card */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Alerts & Notifications</h3>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Active Alerts</h4>
          <div className="space-y-2 ml-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.alertLowVolume !== false}
                onChange={e => updateSetting('alertLowVolume', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Low Volume / Production Drop</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.alertMissedSessions !== false}
                onChange={e => updateSetting('alertMissedSessions', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Missed Milking Sessions</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.alertQualityIssues !== false}
                onChange={e => updateSetting('alertQualityIssues', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Quality Issues (SCC, Temp)</span>
            </label>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Delivery Methods</h4>
            <div className="space-y-2 ml-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.deliveryMethodInApp !== false}
                  onChange={e => updateSetting('deliveryMethodInApp', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">In-App Notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.deliveryMethodSMS || false}
                  onChange={e => updateSetting('deliveryMethodSMS', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">SMS Alerts</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.deliveryMethodEmail !== false}
                  onChange={e => updateSetting('deliveryMethodEmail', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Email Alerts</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Production Costs Card */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Costs</h3>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.trackProductionCosts || false}
              onChange={e => updateSetting('trackProductionCosts', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Track Production Costs
            </span>
          </label>

          <p className="text-sm text-gray-600 text-left">
            Enable cost tracking to configure and monitor labor costs, feed expenses, and utility costs per production unit.
          </p>

          {settings.trackProductionCosts && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-gray-900 mb-3">Cost Components</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Labor Cost per Unit (KES)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.laborCostPerUnit ?? 0}
                  onChange={e => updateSetting('laborCostPerUnit', e.target.value === '' ? null : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feed Cost per Unit (KES)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.feedCostPerUnit ?? 0}
                  onChange={e => updateSetting('feedCostPerUnit', e.target.value === '' ? null : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Utilities Cost per Unit (KES)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.utilitiesCostPerUnit ?? 0}
                  onChange={e => updateSetting('utilitiesCostPerUnit', e.target.value === '' ? null : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
