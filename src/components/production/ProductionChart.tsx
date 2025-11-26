// src/components/production/ProductionChart.tsx
'use client'

import { useMemo } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import { ProductionSettings } from '@/types/production-distribution-settings'

interface ProductionChartProps {
  data: Array<{
    record_date: string
    total_milk_volume: number
    average_fat_content: number
    average_protein_content: number
    animals_milked: number
  }>
  isMobile?: boolean
  settings: ProductionSettings | null
}

export function ProductionChart({ data, isMobile, settings }: ProductionChartProps) {
  const chartData = useMemo(() => {
    return data
      .slice(-30) // Last 30 days
      .reverse() // Show chronologically
      .map(item => ({
        date: new Date(item.record_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        volume: item.total_milk_volume,
        fat: item.average_fat_content,
        protein: item.average_protein_content,
        animals: item.animals_milked,
      }))
  }, [data])
  
  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="font-medium">No production data available</p>
          <p className="text-sm mt-1 text-gray-400">Start recording milk production to see trends</p>
        </div>
      </div>
    )
  }

  // Determine visibility based on settings
  const showVolume = settings ? (settings.chartDisplayMode !== 'quality_only' && settings.showVolumeChart) : true
  const showQuality = settings ? (settings.chartDisplayMode !== 'volume_only' && settings.showFatProteinChart) : true
  
  // If undefined settings (e.g. loading or error), default to showing both
  const volumeVisible = showVolume !== false
  const qualityVisible = showQuality !== false && (settings?.productionTrackingMode !== 'basic')

  return (
    <div className="space-y-6">
      {/* Volume Chart */}
      {volumeVisible && (
        <div className="bg-white rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-4 px-2">Daily Milk Volume ({settings?.productionUnit || 'Liters'})</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280' }}
              />
              <Tooltip 
                formatter={(value: number) => [value.toFixed(1) + (settings?.productionUnit === 'kg' ? 'kg' : 'L'), 'Volume']}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar 
                dataKey="volume" 
                fill="#16a34a" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* Quality Charts - Only if not basic mode and enabled in settings */}
      {qualityVisible && (
        <div className="bg-white rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-4 px-2">Milk Quality (%)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[2, 6]} // Optimized domain for typical milk stats
                tick={{ fill: '#6b7280' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  value.toFixed(2) + '%', 
                  name === 'fat' ? 'Fat Content' : 'Protein Content'
                ]}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              {settings?.trackFatContent && (
                <Line 
                  type="monotone" 
                  dataKey="fat" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  name="fat"
                />
              )}
              {settings?.trackProteinContent && (
                <Line 
                  type="monotone" 
                  dataKey="protein" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  name="protein"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2 text-xs">
            {settings?.trackFatContent && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Fat</span>
              </div>
            )}
            {settings?.trackProteinContent && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span>Protein</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}