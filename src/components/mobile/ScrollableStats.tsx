// Scrollable Stats Component
// src/components/mobile/ScrollableStats.tsx

'use client'

import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'

interface StatCard {
  title: string
  value: number | string
  subtitle: string
  icon: LucideIcon
  color: string
  bgColor: string
  trend?: {
    value: number
    isPositive: boolean
    label: string
  }
  onClick?: () => void
}

interface ScrollableStatsProps {
  stats: StatCard[]
  className?: string
  showTrends?: boolean
}

export function ScrollableStats({ 
  stats, 
  className = '',
  showTrends = false 
}: ScrollableStatsProps) {
  const { isMobile } = useDeviceInfo()

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`flex space-x-4 overflow-x-auto pb-2 scrollbar-hide ${
          isMobile ? 'snap-x snap-mandatory' : ''
        }`}
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card 
              key={index} 
              className={`flex-shrink-0 transition-all duration-200 ${
                isMobile 
                  ? 'w-36 snap-start' 
                  : 'w-auto flex-1'
              } ${
                stat.onClick 
                  ? 'cursor-pointer hover:shadow-md hover:scale-105' 
                  : ''
              }`}
              onClick={stat.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium truncate pr-2">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor} flex-shrink-0`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`font-bold ${stat.color} ${
                  isMobile ? 'text-xl' : 'text-xl md:text-2xl'
                }`}>
                  {typeof stat.value === 'number' && stat.value >= 1000 
                    ? `${(stat.value / 1000).toFixed(1)}k`
                    : stat.value
                  }
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {stat.subtitle}
                </p>
                
                {/* Trend Indicator */}
                {showTrends && stat.trend && (
                  <div className={`flex items-center mt-1 text-xs ${
                    stat.trend.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span className="mr-1">
                      {stat.trend.isPositive ? '↗' : '↘'}
                    </span>
                    <span>{Math.abs(stat.trend.value)}%</span>
                    <span className="text-gray-500 ml-1 truncate">
                      {stat.trend.label}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {/* Scroll indicator for mobile */}
      {isMobile && stats.length > 2 && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none z-10" />
      )}
      
      {/* Scroll dots indicator */}
      {isMobile && stats.length > 3 && (
        <div className="flex justify-center mt-2 space-x-1">
          {Array.from({ length: Math.ceil(stats.length / 2) }).map((_, index) => (
            <div
              key={index}
              className="w-2 h-2 rounded-full bg-gray-300"
            />
          ))}
        </div>
      )}
    </div>
  )
}
