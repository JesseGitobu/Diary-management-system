// src/components/distribution/DistributionStatsCards.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { 
  TrendingUp, 
  Truck,
  DollarSign,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

interface DistributionStatsCardsProps {
  stats: Array<{
    title: string
    value: string | number
    icon: React.ComponentType<any>
    color: string
    bgColor: string
    description: string
    trend?: string
    isGood?: boolean
  }>
  availableVolume: number
  totalChannels: number
}

export function DistributionStatsCards({ stats, availableVolume, totalChannels }: DistributionStatsCardsProps) {
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

    const scrollAmount = 208 // Width of card + gap (w-48 + gap)
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

  // Determine overall distribution status
  const overallStatus = availableVolume > 0 ? 'Ready' : (totalChannels > 0 ? 'Distributed' : 'No Data')
  const isStatusGood = availableVolume > 0 || totalChannels > 0

  if (isMobile) {
    return (
      <div className="w-full space-y-4">
        {/* Header with Navigation Arrows */}
        <div className="flex items-center justify-between px-4 sm:px-0">
          <h2 className="font-semibold text-gray-900 text-base">Distribution Overview</h2>
          
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
            {stats.map((stat) => {
              const IconComponent = stat.icon
              
              return (
                <Card
                  key={stat.title}
                  className={cn(
                    "flex-shrink-0 w-48 shadow-sm transition-all duration-200",
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

                  <CardContent className="space-y-2">
                    {/* Value with Status */}
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <div className="text-2xl font-bold text-gray-900">
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
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Dot Indicators */}
        {stats.length > 0 && (
          <div className="flex justify-center gap-1.5">
            {stats.map((_, index) => {
              const cardWidth = 208 // w-48 + gap
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
                {availableVolume > 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 font-medium text-sm">Ready</span>
                  </>
                ) : totalChannels > 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    <span className="text-blue-600 font-medium text-sm">Distributed</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-600 font-medium text-sm">No Data</span>
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
        Distribution Overview
      </h2>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-0">
        {stats.map((stat) => {
          const IconComponent = stat.icon
          
          return (
            <Card
              key={stat.title}
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

              <CardContent className="space-y-2">
                {/* Value with Status */}
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold text-gray-900">
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
                Overall Distribution Status:
              </span>
            </div>
            <div className="flex items-center gap-2">
              {availableVolume > 0 ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-semibold">Ready</span>
                </>
              ) : totalChannels > 0 ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  <span className="text-blue-600 font-semibold">Distributed</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <span className="text-yellow-600 font-semibold">No Data</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
