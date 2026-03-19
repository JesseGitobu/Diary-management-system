// components/settings/production-distribution/sections/ReportsChartsSection.tsx
'use client'

import React from 'react'

interface ReportsChartsSectionProps {
  settings: any
  updateSetting: (key: string, value: any) => void
}

export default function ReportsChartsSection({
  settings,
  updateSetting
}: ReportsChartsSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Reports & Visualization</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Chart Period
          </label>
          <select
            value={settings.defaultChartPeriod || '30days'}
            onChange={e => updateSetting('defaultChartPeriod', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7days">Last 7 days</option>
            <option value="14days">Last 14 days</option>
            <option value="30days">Last 30 days</option>
            <option value="60days">Last 60 days</option>
            <option value="90days">Last 90 days</option>
            <option value="year">Last year</option>
          </select>
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chart Display Mode
          </label>
          <select
            value={settings.chartDisplayMode || 'line'}
            onChange={e => updateSetting('chartDisplayMode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="area">Area Chart</option>
            <option value="combination">Combination Chart</option>
          </select>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Chart Features</h4>
          <div className="space-y-2 ml-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.showTrendLines !== false}
                onChange={e => updateSetting('showTrendLines', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Show Trend Lines</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.showAverages !== false}
                onChange={e => updateSetting('showAverages', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Show Averages</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.showTargets !== false}
                onChange={e => updateSetting('showTargets', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Show Targets</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.enableChartExport !== false}
                onChange={e => updateSetting('enableChartExport', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Enable Chart Export</span>
            </label>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Automated Reports</h4>
          <div className="space-y-2 ml-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.enableWeeklyReports !== false}
                onChange={e => updateSetting('enableWeeklyReports', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Enable Weekly Reports</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.enableMonthlyReports !== false}
                onChange={e => updateSetting('enableMonthlyReports', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Enable Monthly Reports</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
