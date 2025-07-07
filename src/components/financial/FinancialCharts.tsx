'use client'

import { useMemo } from 'react'

interface FinancialChartsProps {
  monthlyData?: any[]
  data?: Record<string, number>
  type: 'monthly' | 'expenses' | 'income'
}

export function FinancialCharts({ monthlyData, data, type }: FinancialChartsProps) {
  if (type === 'monthly' && monthlyData) {
    return <MonthlyChart data={monthlyData} />
  }
  
  if ((type === 'expenses' || type === 'income') && data) {
    return <CategoryChart data={data} type={type} />
  }
  
  return <div className="text-center py-8 text-gray-500">No data available</div>
}

function MonthlyChart({ data }: { data: any[] }) {
  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => Math.max(d.income, d.expenses)))
  }, [data])
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Income</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Expenses</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Profit</span>
        </div>
      </div>
      
      <div className="space-y-2">
        {data.map((month) => (
          <div key={month.month} className="flex items-center space-x-2">
            <div className="w-12 text-xs text-gray-600">
              {month.monthName.slice(0, 3)}
            </div>
            
            <div className="flex-1 relative h-8 bg-gray-100 rounded">
              {/* Income bar */}
              <div
                className="absolute left-0 top-0 h-4 bg-green-500 rounded"
                style={{
                  width: `${maxValue > 0 ? (month.income / maxValue) * 100 : 0}%`
                }}
              />
              
              {/* Expense bar */}
              <div
                className="absolute left-0 bottom-0 h-4 bg-red-500 rounded"
                style={{
                  width: `${maxValue > 0 ? (month.expenses / maxValue) * 100 : 0}%`
                }}
              />
              
              {/* Profit line */}
              <div
                className={`absolute top-1/2 transform -translate-y-1/2 w-1 h-6 ${
                  month.profit >= 0 ? 'bg-blue-500' : 'bg-orange-500'
                }`}
                style={{
                  left: `${maxValue > 0 ? (Math.abs(month.profit) / maxValue) * 100 : 0}%`
                }}
              />
            </div>
            
            <div className="w-20 text-xs text-gray-600 text-right">
              ${month.profit >= 0 ? '+' : ''}
              {(month.profit / 1000).toFixed(1)}k
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CategoryChart({ data, type }: { data: Record<string, number>, type: 'expenses' | 'income' }) {
  const sortedData = useMemo(() => {
    return Object.entries(data)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8) // Show top 8 categories
  }, [data])
  
  const total = useMemo(() => {
    return Object.values(data).reduce((sum, value) => sum + value, 0)
  }, [data])
  
  const colors = type === 'expenses' 
    ? ['bg-red-500', 'bg-red-400', 'bg-red-300', 'bg-red-200', 'bg-red-100', 'bg-pink-500', 'bg-pink-400', 'bg-pink-300']
    : ['bg-green-500', 'bg-green-400', 'bg-green-300', 'bg-green-200', 'bg-green-100', 'bg-emerald-500', 'bg-emerald-400', 'bg-emerald-300']
  
  if (total === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No {type} data available
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      {sortedData.map(([category, amount], index) => (
        <div key={category} className="flex items-center space-x-3">
          <div className={`w-3 h-3 ${colors[index]} rounded-full`} />
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="capitalize">
                {category.replace('_', ' ')}
              </span>
              <span className="font-medium">
                ${(amount / 1000).toFixed(1)}k
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className={`h-2 ${colors[index]} rounded-full`}
                style={{
                  width: `${(amount / total) * 100}%`
                }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {((amount / total) * 100).toFixed(1)}% of total
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}