// src/components/breeding/BreedingStatsCards.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { 
  Heart, 
  Baby, 
  TrendingUp, 
  Activity, 
  Calendar,
  Target,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'

interface BreedingStatsCardsProps {
  stats: {
    totalBreedings: number
    heatDetected: number
    currentPregnant: number
    expectedCalvingsThisMonth: number
    conceptionRate: number
  }
}

export function BreedingStatsCards({ stats }: BreedingStatsCardsProps) {
  const { isMobile, isTouch } = useDeviceInfo()

  const statsData = [
    {
      id: 'total-breedings',
      title: 'Total Breedings',
      value: stats.totalBreedings,
      description: 'This month',
      icon: Activity,
      color: 'bg-blue-100 text-blue-600',
      trend: stats.totalBreedings > 0 ? '+' : '',
      isGood: stats.totalBreedings > 0
    },
    {
      id: 'heat-detected',
      title: 'Heat Detected',
      value: stats.heatDetected,
      description: 'Animals in heat',
      icon: Heart,
      color: 'bg-pink-100 text-pink-600',
      trend: stats.heatDetected > 0 ? 'Now' : '',
      isGood: stats.heatDetected > 0
    },
    {
      id: 'current-pregnant',
      title: 'Currently Pregnant',
      value: stats.currentPregnant,
      description: 'Confirmed pregnancies',
      icon: Baby,
      color: 'bg-green-100 text-green-600',
      trend: stats.currentPregnant > 0 ? 'Active' : '',
      isGood: stats.currentPregnant > 0
    },
    {
      id: 'expected-calvings',
      title: 'Expected Calvings',
      value: stats.expectedCalvingsThisMonth,
      description: 'This month',
      icon: Calendar,
      color: 'bg-yellow-100 text-yellow-600',
      trend: stats.expectedCalvingsThisMonth > 0 ? 'Due' : '',
      isGood: stats.expectedCalvingsThisMonth > 0
    },
    {
      id: 'conception-rate',
      title: 'Conception Rate',
      value: `${stats.conceptionRate}%`,
      description: 'Success rate',
      icon: Target,
      color: 'bg-purple-100 text-purple-600',
      trend: stats.conceptionRate >= 70 ? 'Good' : stats.conceptionRate >= 50 ? 'Fair' : 'Low',
      isGood: stats.conceptionRate >= 70
    }
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className={cn(
          "font-semibold text-gray-900",
          isMobile ? "text-lg" : "text-xl"
        )}>
          Breeding Overview
        </h2>
        {isMobile && (
          <p className="text-xs text-gray-500">Swipe to see all stats →</p>
        )}
      </div>

      {/* Horizontal Scrollable Cards Container */}
      <div className={cn(
        "relative",
        isMobile ? "overflow-x-auto scrollbar-hide" : ""
      )}>
        {/* Cards Grid/Flex */}
        <div className={cn(
          isMobile 
            ? "flex space-x-4 pb-2" // Horizontal scroll on mobile
            : "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4" // Grid on desktop
        )}>
          {statsData.map((stat, index) => {
            const IconComponent = stat.icon
            
            return (
              <Card 
                key={stat.id}
                className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  isMobile ? [
                    "flex-shrink-0 w-48", // Fixed width for horizontal scroll
                    "active:scale-95", // Touch feedback
                    isTouch && "cursor-pointer"
                  ] : "hover:scale-105"
                )}
              >
                <CardHeader className={cn(
                  "flex flex-row items-center justify-between space-y-0",
                  isMobile ? "pb-2" : "pb-2"
                )}>
                  <CardTitle className={cn(
                    "font-medium",
                    isMobile ? "text-sm" : "text-sm"
                  )}>
                    {stat.title}
                  </CardTitle>
                  <div className={cn(
                    "rounded-lg flex items-center justify-center",
                    isMobile ? "w-8 h-8" : "w-10 h-10",
                    stat.color
                  )}>
                    <IconComponent className={cn(
                      isMobile ? "w-4 h-4" : "w-5 h-5"
                    )} />
                  </div>
                </CardHeader>
                
                <CardContent className={cn(
                  isMobile ? "pt-0 pb-3" : "pt-0"
                )}>
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <div className={cn(
                        "font-bold",
                        isMobile ? "text-xl" : "text-2xl"
                      )}>
                        {stat.value}
                      </div>
                      
                      {/* Status Indicator */}
                      {stat.trend && (
                        <div className="flex items-center space-x-1">
                          {stat.isGood ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-yellow-500" />
                          )}
                          <span className={cn(
                            "font-medium",
                            isMobile ? "text-xs" : "text-xs",
                            stat.isGood ? "text-green-600" : "text-yellow-600"
                          )}>
                            {stat.trend}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <p className={cn(
                      "text-muted-foreground",
                      isMobile ? "text-xs" : "text-xs"
                    )}>
                      {stat.description}
                    </p>
                  </div>
                  
                  {/* Progress Bar for Conception Rate */}
                  {stat.id === 'conception-rate' && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            stats.conceptionRate >= 70 ? "bg-green-500" :
                            stats.conceptionRate >= 50 ? "bg-yellow-500" : "bg-red-500"
                          )}
                          style={{ width: `${Math.min(stats.conceptionRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Alert indicator for urgent items */}
                  {(stat.id === 'heat-detected' && stats.heatDetected > 0) && (
                    <div className="mt-2 flex items-center space-x-1">
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                      <span className="text-xs text-pink-600 font-medium">
                        Needs attention
                      </span>
                    </div>
                  )}
                  
                  {(stat.id === 'expected-calvings' && stats.expectedCalvingsThisMonth > 0) && (
                    <div className="mt-2 flex items-center space-x-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                      <span className="text-xs text-yellow-600 font-medium">
                        Monitor closely
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        {/* Scroll Indicator Dots for Mobile */}
        {isMobile && (
          <div className="flex justify-center space-x-1 mt-3">
            {statsData.map((_, index) => (
              <div
                key={index}
                className="w-1.5 h-1.5 rounded-full bg-gray-300"
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Summary Row for Mobile */}
      {isMobile && (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900">
                  Overall Status:
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {stats.conceptionRate >= 70 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 font-medium">Good</span>
                  </>
                ) : stats.conceptionRate >= 50 ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-600 font-medium">Fair</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-600 font-medium">Needs Attention</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}