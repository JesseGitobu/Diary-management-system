// components/settings/production-distribution/sections/AnimalEligibilitySection.tsx
'use client'

import React from 'react'

interface AnimalEligibilitySectionProps {
  settings: any
  updateSetting: (key: string, value: any) => void
}

export default function AnimalEligibilitySection({
  settings,
  updateSetting
}: AnimalEligibilitySectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Animal Eligibility Filters</h3>

      <div className="space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.autoFilterEligibleAnimals !== false}
            onChange={e => updateSetting('autoFilterEligibleAnimals', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">
            Auto-filter Eligible Animals
          </span>
        </label>

        <div className="border-t pt-4 space-y-4">
          <h4 className="font-medium text-gray-900">Eligible Statuses</h4>
          <div className="space-y-2 ml-4">
            {['lactating', 'heifer', 'served', 'steaming_dry', 'open_dry'].map(status => {
              const statusLabel = {
                lactating: 'Lactating',
                heifer: 'Heifer',
                served: 'Served',
                steaming_dry: 'Steaming Dry',
                open_dry: 'Open Dry'
              }[status]
              
              const isChecked = (settings.eligibleProductionStatuses || ['lactating']).includes(status)
              
              return (
                <label key={status} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      let newStatuses = [...(settings.eligibleProductionStatuses || [])]
                      if (e.target.checked) {
                        if (!newStatuses.includes(status)) {
                          newStatuses.push(status)
                        }
                      } else {
                        newStatuses = newStatuses.filter(s => s !== status)
                      }
                      updateSetting('eligibleProductionStatuses', newStatuses)
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{statusLabel}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Age (Months)
          </label>
          <input
            type="number"
            min="0"
            value={settings.minAnimalAgeMonths ?? 15}
            onChange={e => updateSetting('minAnimalAgeMonths', e.target.value === '' ? null : parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Days in Milk / DIM
          </label>
          <input
            type="number"
            min="0"
            value={settings.maxDaysInMilk ?? 305}
            onChange={e => updateSetting('maxDaysInMilk', e.target.value === '' ? null : parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="border-t pt-4 space-y-2">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.excludeSickAnimals !== false}
              onChange={e => updateSetting('excludeSickAnimals', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Exclude Sick Animals
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.excludeTreatmentWithdrawal !== false}
              onChange={e => updateSetting('excludeTreatmentWithdrawal', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Exclude Animals in Treatment Withdrawal
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
