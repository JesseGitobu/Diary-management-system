// src/components/production/ProductionChart.tsx
'use client'

import { useMemo, useState, useRef } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ReferenceLine,
  Legend,
  ComposedChart
} from 'recharts'
import { ProductionSettings } from '@/types/production-distribution-settings'
import { Button } from '@/components/ui/Button'
import { Download, Target, TrendingUp } from 'lucide-react'

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

interface TargetValues {
  volume?: number
  fat?: number
  protein?: number
}

export function ProductionChart({ data, isMobile, settings }: ProductionChartProps) {
  // Determine device size for finer optimization
  const isVerySmall = typeof window !== 'undefined' && window.innerWidth < 480
  const isSmallMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024
  
  // Helper function to convert period string to days
  const getPeriodDays = (period: string | undefined): number => {
    switch (period) {
      case '7days': return 7
      case '14days': return 14
      case '30days': return 30
      case '60days': return 60
      case '90days': return 90
      case 'year': return 365
      default: return 30
    }
  }

  // Initialize states from settings with defaults
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>(
    (settings?.defaultChartType as 'bar' | 'line' | 'area') || 'bar'
  )
  const [showTrendlines, setShowTrendlines] = useState(
    settings?.showTrendLines !== false
  )
  const [showAverages, setShowAverages] = useState(
    settings?.showAverages !== false
  )
  const [showTargets, setShowTargets] = useState(
    settings?.showTargets !== false
  )
  const [targets, setTargets] = useState<TargetValues>({
    volume: 25,
    fat: 3.8,
    protein: 3.2,
  })
  const [editingTarget, setEditingTarget] = useState<keyof TargetValues | null>(null)
  const [tempTargetValue, setTempTargetValue] = useState('')
  const chartRef = useRef<HTMLDivElement>(null)

  const { chartData, statistics } = useMemo(() => {
    // Get days from settings
    const daysToShow = getPeriodDays(settings?.defaultChartPeriod)
    
    const processed = data
      .slice(-daysToShow) // Use configurable period from settings
      .reverse() // Show chronologically
      .map(item => ({
        date: new Date(item.record_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        volume: item.total_milk_volume,
        fat: item.average_fat_content,
        protein: item.average_protein_content,
        animals: item.animals_milked,
      }))

    // Calculate statistics
    const stats = {
      avgVolume: processed.length > 0 
        ? processed.reduce((sum, item) => sum + item.volume, 0) / processed.length 
        : 0,
      avgFat: processed.length > 0 
        ? processed.reduce((sum, item) => sum + (item.fat || 0), 0) / processed.filter(i => i.fat).length 
        : 0,
      avgProtein: processed.length > 0 
        ? processed.reduce((sum, item) => sum + (item.protein || 0), 0) / processed.filter(i => i.protein).length 
        : 0,
      maxVolume: processed.length > 0 ? Math.max(...processed.map(i => i.volume)) : 0,
      minVolume: processed.length > 0 ? Math.min(...processed.map(i => i.volume)) : 0,
    }

    return { chartData: processed, statistics: stats }
  }, [data, settings?.defaultChartPeriod])

  // Calculate trend line using linear regression
  const trendLineData = useMemo(() => {
    if (chartData.length < 2) return []
    
    const n = chartData.length
    const xValues = Array.from({ length: n }, (_, i) => i)
    const yValues = chartData.map(d => d.volume)
    
    const sumX = xValues.reduce((a, b) => a + b, 0)
    const sumY = yValues.reduce((a, b) => a + b, 0)
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    return chartData.map((item, i) => ({
      ...item,
      trend: slope * i + intercept,
    }))
  }, [chartData])

  const handleExportChart = async () => {
    if (!chartRef.current) return
    
    try {
      const canvas = await (window as any).html2canvas?.(chartRef.current)
      if (canvas) {
        const link = document.createElement('a')
        link.href = canvas.toDataURL('image/png')
        link.download = `production-chart-${new Date().toISOString().split('T')[0]}.png`
        link.click()
      }
    } catch (error) {
      console.error('Error exporting chart:', error)
      alert('Could not export chart. Please try again.')
    }
  }

  const handleTargetSave = (key: keyof TargetValues) => {
    const value = parseFloat(tempTargetValue)
    if (!isNaN(value) && value > 0) {
      setTargets(prev => ({ ...prev, [key]: value }))
      setEditingTarget(null)
      setTempTargetValue('')
    }
  }

  const startEditTarget = (key: keyof TargetValues) => {
    setEditingTarget(key)
    setTempTargetValue(String(targets[key] || ''))
  }

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

  // Determine visibility based on tracking mode and settings
  const trackingMode = settings?.productionTrackingMode || 'basic'
  const isBasicMode = trackingMode === 'basic'
  const isAdvancedMode = trackingMode === 'advanced'
  const isQualityFocused = trackingMode === 'quality_focused'

  // Chart visibility based on tracking mode
  const showVolume = !isBasicMode || (settings?.chartDisplayMode !== 'quality_only' && settings?.showVolumeChart !== false)
  const showQuality = !isBasicMode && (settings?.chartDisplayMode !== 'volume_only' && settings?.showFatProteinChart !== false)
  
  const volumeVisible = showVolume && !isBasicMode ? settings?.showVolumeChart !== false : isBasicMode || showVolume
  const qualityVisible = showQuality && !isBasicMode

  // Features visibility based on tracking mode
  const canShowTargets = !isBasicMode // Targets only available in advanced and quality_focused
  const canShowTrendlines = !isBasicMode // Trendlines only in advanced and quality_focused
  const canShowAverages = !isBasicMode // Averages only in advanced and quality_focused

  // Responsive chart height based on device size
  const chartHeight = isVerySmall ? 220 : isMobile ? 260 : isTablet ? 300 : 350
  
  // Responsive font size
  const axisFontSize = isVerySmall ? 10 : isSmallMobile ? 11 : 12
  const labelFontSize = isVerySmall ? 10 : isSmallMobile ? 11 : 12

  return (
    <div className={`space-y-${isMobile ? '3' : '6'}`}>
      {/* Chart Controls */}
      <div className={`bg-white rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-gray-200 space-y-3`}>
        <div className={`flex flex-col ${isTablet ? 'lg:flex-row' : 'sm:flex-row'} items-start ${isTablet ? 'lg:items-center lg:justify-between' : 'sm:items-center sm:justify-between'} ${isMobile ? 'gap-2' : 'gap-4'}`}>
          {/* Chart Type Selector */}
          <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-700`}>Chart:</span>
            <div className={`flex ${isMobile ? 'gap-1' : 'gap-2'}`}>
              {(['bar', 'line', 'area'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`${isMobile ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} rounded font-medium capitalize transition-all ${
                    chartType === type
                      ? 'bg-farm-green text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Export Button - Only show if enabled in settings */}
          {settings?.enableChartExport !== false && (
            <Button
              onClick={handleExportChart}
              variant="outline"
              size="sm"
              className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'} w-full ${isSmallMobile ? 'sm:w-auto' : 'sm:w-auto'}`}
            >
              <Download className="w-4 h-4" />
              Export Chart
            </Button>
          )}
        </div>

        {/* Feature Toggles */}
        <div className={`flex flex-wrap ${isMobile ? 'gap-2' : 'gap-3'} items-center`}>
          {canShowTrendlines && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTrendlines}
                onChange={(e) => setShowTrendlines(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Trendlines
              </span>
            </label>
          )}
          {canShowAverages && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAverages}
                onChange={(e) => setShowAverages(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700`}>Show Averages</span>
            </label>
          )}
          {canShowTargets && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTargets}
                onChange={(e) => setShowTargets(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 flex items-center gap-1"
              />
              <span className="text-sm text-gray-700 flex items-center gap-1">
                <Target className="w-3 h-3" /> Targets
              </span>
            </label>
          )}
        </div>

        {/* Statistics Summary */}
        <div className={`grid ${isVerySmall ? 'grid-cols-2' : 'grid-cols-2'} ${isSmallMobile ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} ${isTablet ? 'lg:grid-cols-4' : 'md:grid-cols-3'} ${isMobile ? 'gap-1.5 text-xs' : 'gap-2 text-sm'}`}>
          <div className={`bg-blue-50 ${isMobile ? 'p-1.5' : 'p-2'} rounded`}>
            <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Avg Volume</p>
            <p className={`font-bold text-blue-600 ${isMobile ? 'text-sm' : 'text-base'}`}>{statistics.avgVolume.toFixed(1)}L</p>
          </div>
          {!isBasicMode && (
            <>
              <div className={`bg-orange-50 ${isMobile ? 'p-1.5' : 'p-2'} rounded`}>
                <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Avg Fat</p>
                <p className={`font-bold text-orange-600 ${isMobile ? 'text-sm' : 'text-base'}`}>{statistics.avgFat.toFixed(2)}%</p>
              </div>
              <div className={`bg-green-50 ${isMobile ? 'p-1.5' : 'p-2'} rounded`}>
                <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Avg Protein</p>
                <p className={`font-bold text-green-600 ${isMobile ? 'text-sm' : 'text-base'}`}>{statistics.avgProtein.toFixed(2)}%</p>
              </div>
            </>
          )}
          <div className={`bg-purple-50 ${isMobile ? 'p-1.5' : 'p-2'} rounded`}>
            <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Max Volume</p>
            <p className={`font-bold text-purple-600 ${isMobile ? 'text-sm' : 'text-base'}`}>{statistics.maxVolume.toFixed(1)}L</p>
          </div>
        </div>
      </div>

      {/* Targets Configuration - Only show in non-basic modes */}
      {!isBasicMode && canShowTargets && showTargets && (
        <div className={`bg-white rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-gray-200`}>
          <h4 className={`font-semibold text-gray-900 ${isMobile ? 'mb-2 text-xs' : 'mb-3 text-sm'} flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
            <Target className="w-4 h-4" /> Production Targets
          </h4>
          <div className={`grid grid-cols-2 ${isSmallMobile ? 'gap-2' : 'gap-3'} md:grid-cols-3`}>
            {/* Volume Target */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Milk Volume Target (L)</label>
              {editingTarget === 'volume' ? (
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={tempTargetValue}
                    onChange={(e) => setTempTargetValue(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-farm-green"
                    autoFocus
                  />
                  <button
                    onClick={() => handleTargetSave('volume')}
                    className="px-2 py-1 bg-farm-green text-white text-sm rounded hover:bg-farm-green/90"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEditTarget('volume')}
                  className="w-full px-2 py-1 text-left bg-blue-50 text-blue-700 font-semibold rounded hover:bg-blue-100 transition-colors"
                >
                  {targets.volume}L
                </button>
              )}
            </div>

            {/* Fat Target */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Fat Target (%)</label>
              {editingTarget === 'fat' ? (
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={tempTargetValue}
                    onChange={(e) => setTempTargetValue(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-farm-green"
                    autoFocus
                  />
                  <button
                    onClick={() => handleTargetSave('fat')}
                    className="px-2 py-1 bg-farm-green text-white text-sm rounded hover:bg-farm-green/90"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEditTarget('fat')}
                  className="w-full px-2 py-1 text-left bg-orange-50 text-orange-700 font-semibold rounded hover:bg-orange-100 transition-colors"
                >
                  {targets.fat}%
                </button>
              )}
            </div>

            {/* Protein Target */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Protein Target (%)</label>
              {editingTarget === 'protein' ? (
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={tempTargetValue}
                    onChange={(e) => setTempTargetValue(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-farm-green"
                    autoFocus
                  />
                  <button
                    onClick={() => handleTargetSave('protein')}
                    className="px-2 py-1 bg-farm-green text-white text-sm rounded hover:bg-farm-green/90"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEditTarget('protein')}
                  className="w-full px-2 py-1 text-left bg-green-50 text-green-700 font-semibold rounded hover:bg-green-100 transition-colors"
                >
                  {targets.protein}%
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Volume Chart */}
      {volumeVisible && (
        <div className="bg-white rounded-lg p-4 border border-gray-200" ref={chartRef}>
          <h4 className={`font-medium text-gray-900 ${isMobile ? 'mb-3 text-xs' : 'mb-4 text-sm'}`}>Daily Milk Volume ({settings?.productionUnit || 'Liters'})</h4>
          <ResponsiveContainer width="100%" height={chartHeight}>
            {chartType === 'bar' ? (
              <BarChart data={trendLineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  fontSize={axisFontSize}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  fontSize={axisFontSize}
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
                  name="Volume"
                />
                {showAverages && <ReferenceLine y={statistics.avgVolume} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: `Avg: ${statistics.avgVolume.toFixed(1)}L`, position: 'right', fill: '#3b82f6', fontSize: 12 }} />}
                {showTargets && targets.volume && <ReferenceLine y={targets.volume} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Target: ${targets.volume}L`, position: 'right', fill: '#ef4444', fontSize: 12 }} />}
                {showTrendlines && <Line type="monotone" dataKey="trend" stroke="#f59e0b" strokeWidth={2} dot={false} name="Trend" />}
              </BarChart>
            ) : chartType === 'area' ? (
              <AreaChart data={trendLineData}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  fontSize={axisFontSize}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  fontSize={axisFontSize}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip 
                  formatter={(value: number) => [value.toFixed(1) + (settings?.productionUnit === 'kg' ? 'kg' : 'L'), 'Volume']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="volume" stroke="#16a34a" fillOpacity={1} fill="url(#colorVolume)" name="Volume" />
                {showAverages && <ReferenceLine y={statistics.avgVolume} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: `Avg: ${statistics.avgVolume.toFixed(1)}L`, position: 'right', fill: '#3b82f6', fontSize: 12 }} />}
                {showTargets && targets.volume && <ReferenceLine y={targets.volume} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Target: ${targets.volume}L`, position: 'right', fill: '#ef4444', fontSize: 12 }} />}
                {showTrendlines && <Line type="monotone" dataKey="trend" stroke="#f59e0b" strokeWidth={2} dot={false} name="Trend" />}
              </AreaChart>
            ) : (
              <LineChart data={trendLineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  fontSize={axisFontSize}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  fontSize={axisFontSize}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip 
                  formatter={(value: number) => [value.toFixed(1) + (settings?.productionUnit === 'kg' ? 'kg' : 'L'), 'Volume']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#16a34a" 
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  name="Volume"
                />
                {showAverages && <ReferenceLine y={statistics.avgVolume} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: `Avg: ${statistics.avgVolume.toFixed(1)}L`, position: 'right', fill: '#3b82f6', fontSize: 12 }} />}
                {showTargets && targets.volume && <ReferenceLine y={targets.volume} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Target: ${targets.volume}L`, position: 'right', fill: '#ef4444', fontSize: 12 }} />}
                {showTrendlines && <Line type="monotone" dataKey="trend" stroke="#f59e0b" strokeWidth={2} dot={false} name="Trend" />}
              </LineChart>
            )}
          </ResponsiveContainer>
          <div className={`flex justify-center ${isMobile ? 'gap-2 flex-wrap' : 'gap-4'} mt-3 ${isMobile ? 'text-xs' : 'text-xs'} flex-wrap`}>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              <span>Volume</span>
            </div>
            {showAverages && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-blue-500"></div>
                <span>Average</span>
              </div>
            )}
            {showTargets && targets.volume && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-red-500"></div>
                <span>Target</span>
              </div>
            )}
            {showTrendlines && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-amber-500"></div>
                <span>Trend</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Quality Charts */}
      {qualityVisible && (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className={`font-medium text-gray-900 mb-4 ${isMobile ? 'text-xs' : 'text-sm'}`}>Milk Quality (%)</h4>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                fontSize={axisFontSize}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis 
                fontSize={axisFontSize}
                tickLine={false}
                axisLine={false}
                domain={[2, 6]}
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
              <Legend />
              {settings?.trackFatContent && (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="fat" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                    name="Fat"
                  />
                  {showAverages && <ReferenceLine y={statistics.avgFat} stroke="#3b82f6" strokeDasharray="5 5" />}
                  {showTargets && targets.fat && <ReferenceLine y={targets.fat} stroke="#ef4444" strokeDasharray="3 3" />}
                </>
              )}
              {settings?.trackProteinContent && (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="protein" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                    name="Protein"
                  />
                  {showAverages && <ReferenceLine y={statistics.avgProtein} stroke="#f59e0b" strokeDasharray="5 5" />}
                  {showTargets && targets.protein && <ReferenceLine y={targets.protein} stroke="#ef4444" strokeDasharray="3 3" />}
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
          <div className={`flex justify-center ${isMobile ? 'gap-2 flex-wrap' : 'gap-4'} mt-3 ${isMobile ? 'text-xs' : 'text-xs'} flex-wrap`}>
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
            {showAverages && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-0.5 bg-gray-400"></div>
                <span>Average</span>
              </div>
            )}
            {showTargets && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-0.5 bg-red-500"></div>
                <span>Target</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}