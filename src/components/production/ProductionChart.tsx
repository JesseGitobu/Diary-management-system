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

interface ProductionChartProps {
  data: Array<{
    record_date: string
    total_milk_volume: number
    average_fat_content: number
    average_protein_content: number
    animals_milked: number
  }>
  isMobile?: boolean
}

export function ProductionChart({ data, isMobile }: ProductionChartProps) {
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
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p>No production data available</p>
          <p className="text-sm mt-1">Start recording milk production to see trends</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Volume Chart */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-4">Daily Milk Volume (Liters)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              formatter={(value: number) => [value.toFixed(1) + 'L', 'Volume']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Bar 
              dataKey="volume" 
              fill="#16a34a" 
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Quality Charts */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-4">Milk Quality (%)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, 6]}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                value.toFixed(2) + '%', 
                name === 'fat' ? 'Fat Content' : 'Protein Content'
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="fat" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="fat"
            />
            <Line 
              type="monotone" 
              dataKey="protein" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="protein"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}