// src/components/distribution/DistributionChart.tsx
'use client'

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart } from 'recharts'

interface DistributionChartProps {
  data: Array<{
    date: string
    volume: number
    revenue: number
    channels: number
  }>
  isMobile: boolean
}

export function DistributionChart({ data, isMobile }: DistributionChartProps) {
  // Format data for charts
  const chartData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-KE', { 
      month: 'short', 
      day: 'numeric' 
    }),
    // Format revenue in thousands for better readability
    revenueK: item.revenue / 1000
  }))

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium text-gray-900">
                {entry.dataKey === 'volume' && `${entry.value}L`}
                {entry.dataKey === 'revenue' && `KSh ${(entry.value * 1000).toLocaleString()}`}
                {entry.dataKey === 'revenueK' && `KSh ${(entry.value * 1000).toLocaleString()}`}
                {entry.dataKey === 'channels' && `${entry.value} channels`}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  // If no data, show empty state
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            📊
          </div>
          <p>No distribution data available</p>
          <p className="text-sm text-gray-400">Start recording distributions to see trends</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Volume and Revenue Combined Chart */}
      <div>
        <h4 className={`font-medium text-gray-900 mb-3 ${isMobile ? 'text-sm' : ''}`}>
          Volume & Revenue Trends
        </h4>
        <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: isMobile ? 11 : 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              yAxisId="volume"
              orientation="left"
              tick={{ fontSize: isMobile ? 11 : 12 }}
              axisLine={false}
              tickLine={false}
              label={{ 
                value: 'Volume (L)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: isMobile ? 11 : 12 }
              }}
            />
            <YAxis 
              yAxisId="revenue"
              orientation="right"
              tick={{ fontSize: isMobile ? 11 : 12 }}
              axisLine={false}
              tickLine={false}
              label={{ 
                value: 'Revenue (K)', 
                angle: 90, 
                position: 'insideRight',
                style: { textAnchor: 'middle', fontSize: isMobile ? 11 : 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Volume as bars */}
            <Bar 
              yAxisId="volume"
              dataKey="volume" 
              fill="#3b82f6" 
              fillOpacity={0.6}
              name="Volume"
              radius={[2, 2, 0, 0]}
            />
            
            {/* Revenue as line */}
            <Line 
              yAxisId="revenue"
              type="monotone" 
              dataKey="revenueK" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              name="Revenue"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Volume Trend */}
      <div>
        <h4 className={`font-medium text-gray-900 mb-3 ${isMobile ? 'text-sm' : ''}`}>
          Daily Volume Distribution
        </h4>
        <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: isMobile ? 11 : 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: isMobile ? 11 : 12 }}
              axisLine={false}
              tickLine={false}
              label={{ 
                value: 'Liters', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: isMobile ? 11 : 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#volumeGradient)"
              name="Volume"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Trend */}
      <div>
        <h4 className={`font-medium text-gray-900 mb-3 ${isMobile ? 'text-sm' : ''}`}>
          Daily Revenue Trend
        </h4>
        <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: isMobile ? 11 : 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: isMobile ? 11 : 12 }}
              axisLine={false}
              tickLine={false}
              label={{ 
                value: 'Revenue (KSh)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: isMobile ? 11 : 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Channel Activity Chart */}
      {chartData.some(d => d.channels > 0) && (
        <div>
          <h4 className={`font-medium text-gray-900 mb-3 ${isMobile ? 'text-sm' : ''}`}>
            Active Channels per Day
          </h4>
          <ResponsiveContainer width="100%" height={isMobile ? 160 : 180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: isMobile ? 11 : 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: isMobile ? 11 : 12 }}
                axisLine={false}
                tickLine={false}
                label={{ 
                  value: 'Channels', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: isMobile ? 11 : 12 }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="channels"
                fill="#8b5cf6"
                radius={[2, 2, 0, 0]}
                name="Active Channels"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance Indicators */}
      <div>
        <h4 className={`font-medium text-gray-900 mb-3 ${isMobile ? 'text-sm' : ''}`}>
          Distribution Performance
        </h4>
        <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: isMobile ? 11 : 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              yAxisId="volume"
              orientation="left"
              tick={{ fontSize: isMobile ? 11 : 12 }}
              axisLine={false}
              tickLine={false}
              label={{ 
                value: 'Volume (L)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: isMobile ? 11 : 12 }
              }}
            />
            <YAxis 
              yAxisId="efficiency"
              orientation="right"
              tick={{ fontSize: isMobile ? 11 : 12 }}
              axisLine={false}
              tickLine={false}
              label={{ 
                value: 'KSh/L', 
                angle: 90, 
                position: 'insideRight',
                style: { textAnchor: 'middle', fontSize: isMobile ? 11 : 12 }
              }}
            />
            <Tooltip 
              content={({ active, payload, label }: any) => {
                if (active && payload && payload.length) {
                  const volumeData = payload.find((p: any) => p.dataKey === 'volume')
                  const revenueData = payload.find((p: any) => p.dataKey === 'revenue')
                  const efficiency = revenueData && volumeData && volumeData.value > 0 
                    ? (revenueData.value / volumeData.value).toFixed(2) 
                    : '0'

                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900 mb-2">{label}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Volume:</span>
                          <span className="font-medium">{volumeData?.value}L</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Revenue:</span>
                          <span className="font-medium">KSh {revenueData?.value.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between border-t pt-1">
                          <span className="text-gray-600">Efficiency:</span>
                          <span className="font-medium text-green-600">KSh {efficiency}/L</span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            
            {/* Volume bars */}
            <Bar 
              yAxisId="volume"
              dataKey="volume" 
              fill="#e0e7ff" 
              fillOpacity={0.8}
              name="Volume"
              radius={[2, 2, 0, 0]}
            />
            
            {/* Efficiency line (Revenue per Liter) */}
            <Line 
              yAxisId="efficiency"
              type="monotone" 
              dataKey={(entry: any) => entry.volume > 0 ? entry.revenue / entry.volume : 0}
              stroke="#f59e0b" 
              strokeWidth={3}
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
              name="Efficiency (KSh/L)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Statistics */}
      <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-4 pt-4 border-t border-gray-200`}>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">
            {chartData.reduce((sum, d) => sum + d.volume, 0).toFixed(1)}L
          </div>
          <div className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Total Volume
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">
            KSh {chartData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
          </div>
          <div className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Total Revenue
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-orange-600">
            {(chartData.reduce((sum, d) => sum + d.volume, 0) / Math.max(chartData.length, 1)).toFixed(1)}L
          </div>
          <div className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Daily Avg
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-purple-600">
            KSh {((chartData.reduce((sum, d) => sum + d.revenue, 0)) / Math.max(chartData.reduce((sum, d) => sum + d.volume, 0), 1)).toFixed(2)}
          </div>
          <div className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Avg Price/L
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h5 className={`font-medium text-blue-900 mb-2 ${isMobile ? 'text-sm' : ''}`}>
          📊 Distribution Insights
        </h5>
        <div className="space-y-2 text-sm text-blue-800">
          {(() => {
            const totalVolume = chartData.reduce((sum, d) => sum + d.volume, 0)
            const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0)
            const avgPrice = totalVolume > 0 ? totalRevenue / totalVolume : 0
            const maxVolumeDay = chartData.reduce((max, d) => d.volume > max.volume ? d : max, chartData[0])
            const maxRevenueDay = chartData.reduce((max, d) => d.revenue > max.revenue ? d : max, chartData[0])
            
            return (
              <>
                <div className="flex items-center justify-between">
                  <span>Best volume day:</span>
                  <span className="font-medium">{maxVolumeDay?.date} ({maxVolumeDay?.volume}L)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Best revenue day:</span>
                  <span className="font-medium">{maxRevenueDay?.date} (KSh {maxRevenueDay?.revenue.toLocaleString()})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Average price per liter:</span>
                  <span className="font-medium">KSh {avgPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Distribution consistency:</span>
                  <span className="font-medium">
                    {chartData.filter(d => d.volume > 0).length}/{chartData.length} days active
                  </span>
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* Chart Navigation for Mobile */}
      {isMobile && (
        <div className="flex justify-center space-x-2 pt-4">
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          </div>
        </div>
      )}
    </div>
  )
}