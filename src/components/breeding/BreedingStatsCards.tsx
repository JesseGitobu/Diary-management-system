// src/components/breeding/BreedingStatsCards.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // Check scroll position
  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
      setScrollPosition(scrollLeft)
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [stats])

  // Smooth scroll function
  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return

    const scrollAmount = 280 // Width of card + gap
    const newScrollLeft =
      direction === 'left'
        ? containerRef.current.scrollLeft - scrollAmount
        : containerRef.current.scrollLeft + scrollAmount

    containerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    })

    // Update scroll state after animation
    setTimeout(checkScroll, 300)
  }

  // Handle scroll event for dot indicators
  const handleScroll = () => {
    checkScroll()
  }

  // Get color value from Tailwind class
  const getColorValue = (colorClass: string): string => {
    const colorMap: { [key: string]: string } = {
      'bg-blue-100': '#3b82f6',
      'bg-pink-100': '#ec4899',
      'bg-green-100': '#10b981',
      'bg-yellow-100': '#f59e0b',
      'bg-purple-100': '#a855f7',
      'bg-indigo-100': '#6366f1',
    }
    return colorMap[colorClass] || '#3b82f6'
  }

  const statsData = [
    {
      id: 'total-breedings',
      title: 'Total Breedings',
      value: stats.totalBreedings,
      description: 'This month',
      icon: Activity,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-100 text-blue-600',
      trend: stats.totalBreedings > 0 ? '+' : '',
      isGood: stats.totalBreedings > 0
    },
    {
      id: 'heat-detected',
      title: 'Heat Detected',
      value: stats.heatDetected,
      description: 'Animals in heat',
      icon: Heart,
      color: 'bg-pink-500',
      bgColor: 'bg-pink-100 text-pink-600',
      trend: stats.heatDetected > 0 ? 'Now' : '',
      isGood: stats.heatDetected > 0,
      alert: stats.heatDetected > 0
    },
    {
      id: 'current-pregnant',
      title: 'In-calf Animals',
      value: stats.currentPregnant,
      description: 'Confirmed pregnancies',
      icon: Baby,
      color: 'bg-green-500',
      bgColor: 'bg-green-100 text-green-600',
      trend: stats.currentPregnant > 0 ? 'Active' : '',
      isGood: stats.currentPregnant > 0
    },
    {
      id: 'expected-calvings',
      title: 'Expected Calvings',
      value: stats.expectedCalvingsThisMonth,
      description: 'This month',
      icon: Calendar,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-100 text-yellow-600',
      trend: stats.expectedCalvingsThisMonth > 0 ? 'Due' : '',
      isGood: stats.expectedCalvingsThisMonth > 0,
      alert: stats.expectedCalvingsThisMonth > 0
    },
    {
      id: 'conception-rate',
      title: 'Conception Rate',
      value: `${stats.conceptionRate}%`,
      description: 'Success rate',
      icon: Target,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-100 text-purple-600',
      trend: stats.conceptionRate >= 70 ? 'Good' : stats.conceptionRate >= 50 ? 'Fair' : 'Low',
      isGood: stats.conceptionRate >= 70,
      showProgress: true
    }
  ]

  if (isMobile) {
    return (
      <div className="w-full space-y-4">
        {/* Header with Navigation Arrows */}
        <div className="flex items-center justify-between px-4 sm:px-0">
          <h2 className="font-semibold text-gray-900 text-base">Breeding Overview</h2>
          
          {/* Navigation Arrows */}
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={cn(
                "p-2 rounded-lg transition-all",
                canScrollLeft
                  ? "text-dairy-primary hover:bg-dairy-primary/10 active:scale-95"
                  : "text-gray-300 cursor-not-allowed"
              )}
              aria-label="Scroll left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={cn(
                "p-2 rounded-lg transition-all",
                canScrollRight
                  ? "text-dairy-primary hover:bg-dairy-primary/10 active:scale-95"
                  : "text-gray-300 cursor-not-allowed"
              )}
              aria-label="Scroll right"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="overflow-x-auto scrollbar-hide px-4 sm:px-0"
        >
          <div className="flex gap-3 pb-2">
            {statsData.map((stat, index) => {
              const IconComponent = stat.icon
              
              return (
                <Card
                  key={stat.id}
                  className={cn(
                    "flex-shrink-0 w-64 shadow-sm transition-all duration-200",
                    isTouch && "active:scale-95"
                  )}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="font-medium text-sm line-clamp-2">
                      {stat.title}
                    </CardTitle>
                    <div className={cn(
                      "w-8 h-8 rounded-lg text-white flex-shrink-0 flex items-center justify-center",
                      stat.color
                    )}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Value with Status */}
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <div className="text-3xl font-bold text-gray-900">
                          {stat.value}
                        </div>
                        
                        {/* Status Indicator */}
                        {stat.trend && (
                          <div className="flex items-center gap-1">
                            {stat.isGood ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-yellow-500" />
                            )}
                            <span className={cn(
                              "font-medium text-xs",
                              stat.isGood ? "text-green-600" : "text-yellow-600"
                            )}>
                              {stat.trend}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600">
                        {stat.description}
                      </p>
                    </div>

                    {/* Progress Bar for Conception Rate */}
                    {stat.showProgress && (
                      <div className="pt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={cn(
                              "h-2 rounded-full transition-all duration-300",
                              stats.conceptionRate >= 70 ? "bg-green-500" :
                              stats.conceptionRate >= 50 ? "bg-yellow-500" : "bg-red-500"
                            )}
                            style={{ width: `${Math.min(stats.conceptionRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Alert Indicators */}
                    {stat.alert && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                        <span className="text-xs text-pink-600 font-medium">
                          Needs attention
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Dot Indicators */}
        {statsData.length > 0 && (
          <div className="flex justify-center gap-1.5">
            {statsData.map((_, index) => {
              const cardWidth = 280 // w-64 + gap
              const isActive = Math.round(scrollPosition / cardWidth) === index
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (containerRef.current) {
                      containerRef.current.scrollTo({
                        left: index * cardWidth,
                        behavior: 'smooth'
                      })
                      setTimeout(checkScroll, 300)
                    }
                  }}
                  className={cn(
                    "rounded-full transition-all duration-200",
                    isActive
                      ? "bg-dairy-primary scale-125 w-2.5 h-2.5"
                      : "bg-gray-300 hover:bg-gray-400 w-2 h-2"
                  )}
                  aria-label={`Go to stat ${index + 1}`}
                />
              )
            })}
          </div>
        )}

        {/* Summary Status */}
        <Card className="bg-gradient-to-r from-dairy-primary/5 to-dairy-primary/10 border-dairy-primary/20 mx-4 sm:mx-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-dairy-primary" />
                <span className="font-medium text-gray-900 text-sm">
                  Overall Status:
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {stats.conceptionRate >= 70 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 font-medium text-sm">Good</span>
                  </>
                ) : stats.conceptionRate >= 50 ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-600 font-medium text-sm">Fair</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-600 font-medium text-sm">Needs Attention</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Desktop View - Grid Layout
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <h2 className="font-semibold text-gray-900 text-lg px-4 sm:px-0">
        Breeding Overview
      </h2>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 px-4 sm:px-0">
        {statsData.map((stat) => {
          const IconComponent = stat.icon
          
          return (
            <Card
              key={stat.id}
              className="shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="font-medium text-sm">
                  {stat.title}
                </CardTitle>
                <div className={cn(
                  "w-10 h-10 rounded-lg text-white flex items-center justify-center",
                  stat.color
                )}>
                  <IconComponent className="w-5 h-5" />
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Value with Status */}
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-bold text-gray-900">
                      {stat.value}
                    </div>
                    
                    {/* Status Indicator */}
                    {stat.trend && (
                      <div className="flex items-center gap-1">
                        {stat.isGood ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className={cn(
                          "font-medium text-xs",
                          stat.isGood ? "text-green-600" : "text-yellow-600"
                        )}>
                          {stat.trend}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-600">
                    {stat.description}
                  </p>
                </div>

                {/* Progress Bar for Conception Rate */}
                {stat.showProgress && (
                  <div className="pt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={cn(
                          "h-2 rounded-full transition-all duration-300",
                          stats.conceptionRate >= 70 ? "bg-green-500" :
                          stats.conceptionRate >= 50 ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${Math.min(stats.conceptionRate, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Alert Indicators */}
                {stat.alert && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                    <span className="text-xs text-pink-600 font-medium">
                      Needs attention
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary Status Card */}
      <Card className="bg-gradient-to-r from-dairy-primary/5 to-dairy-primary/10 border-dairy-primary/20 px-4 sm:px-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-dairy-primary" />
              <span className="font-medium text-gray-900">
                Overall Breeding Status:
              </span>
            </div>
            <div className="flex items-center gap-2">
              {stats.conceptionRate >= 70 ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-semibold">Excellent</span>
                </>
              ) : stats.conceptionRate >= 50 ? (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <span className="text-yellow-600 font-semibold">Fair - Monitor</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-600 font-semibold">Needs Attention</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}